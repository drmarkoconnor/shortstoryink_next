"""Actual project UI + HTTP + migrated isolated PostgreSQL, synthetic sessions only.
This is not a Netlify Identity sign-in test. Never sends real email.
"""
import json, os, re, time, traceback, uuid, zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE=os.environ.get('PROJECT_BROWSER_BASE','http://127.0.0.1:3100')
OUT=Path('artifacts/projects/browser'); OUT.mkdir(parents=True,exist_ok=True)
checks=[]

def passed(name):
    checks.append(name); print('PASS:',name,flush=True)

def call(ctx, action, pid, data=None):
    r=ctx.request.post(BASE+'/api/project-browser-test',headers={'Origin':BASE},data={'action':action,'projectId':pid,'input':data or {}},timeout=60000)
    assert r.status==200, (action,r.status,r.text())
    return r.json()

def mutate(ctx, action, pid, data=None):
    state=call(ctx,'state',pid)
    return call(ctx,action,pid,{'requestId':str(uuid.uuid4()),'structureVersion':state['project']['structureVersion'],'contentVersion':state['project']['contentVersion'],**(data or {})})

def context(browser, role='writer', **kw):
    c=browser.new_context(**kw)
    c.add_cookies([{'name':'project_fixture_role','value':role,'url':BASE}])
    return c

def seed(ctx, label):
    pid=str(uuid.uuid4()); call(ctx,'create',pid,{'title':'Browser novel '+label})
    ids={}
    for title,kind,body in [('Opening scene','section','An old beginning.\n\nThe second paragraph.'),('River scene','section','At the river she changed her mind.'),('Part Two','folder','')]:
        nid=str(uuid.uuid4()); ids[title]=nid
        mutate(ctx,'add',pid,{'nodeId':nid,'parentId':None,'title':title,'kind':kind,'body':body,'synopsis':'A private planning synopsis.','status':'Draft'})
    return pid,ids

def open_node(page,nid):
    page.locator('[data-tree-node="'+nid+'"]').click()
    field=page.get_by_role('textbox',name='Manuscript',exact=True)
    expect(field).to_be_visible(timeout=30000)
    expect(field).to_have_attribute('contenteditable','true')
    expect(page.get_by_text('Opening the paragraph editor…',exact=True)).not_to_be_visible()

def end_of_manuscript(page):
    field=page.get_by_role('textbox',name='Manuscript',exact=True)
    field.click();field.press('ControlOrMeta+End')
    # Native selectionchange is asynchronous. Do not type Enter against the
    # previous ProseMirror selection or mistake the wrong paragraph for a Tab bug.
    page.wait_for_function('''() => {
        const editor=document.querySelector('[role="textbox"][aria-label="Manuscript"]')?.editor
        return editor && editor.state.selection.empty &&
            editor.state.selection.to === editor.state.doc.content.size - 1
    }''',timeout=5000)

def fill_manuscript(page,text):
    field=page.get_by_role('textbox',name='Manuscript',exact=True)
    field.click();page.keyboard.press('ControlOrMeta+A')
    paragraphs=text.replace('\r\n','\n').split('\n\n')
    for index,paragraph in enumerate(paragraphs):
        if index:page.keyboard.press('Enter')
        for j,line in enumerate(paragraph.split('\n')):
            if j:page.keyboard.press('Shift+Enter')
            if line:page.keyboard.insert_text(line)
    if not text:page.keyboard.press('Backspace')

def saved(page):
    expect(page.get_by_text('Saved to your account',exact=True)).to_be_visible(timeout=20000)

with sync_playwright() as p:
    engines=os.environ.get('PROJECT_TEST_BROWSERS','chromium').split(',')
    for engine in engines:
        kwargs={'headless':True}
        if engine=='chromium' and os.environ.get('CHROMIUM_EXECUTABLE'): kwargs['executable_path']=os.environ['CHROMIUM_EXECUTABLE']
        browser=getattr(p,engine).launch(**kwargs)
        c=context(browser,viewport={'width':1440,'height':1000}); page=c.new_page(); errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('dialog',lambda dialog:dialog.accept())
        pid,ids=seed(c,engine); a=ids['Opening scene']; b=ids['River scene']; folder=ids['Part Two']
        try:
            page.goto(BASE+'/project-browser-test?projectId='+pid,wait_until='networkidle',timeout=60000)
            expect(page.get_by_role('heading',name='Browser novel '+engine,exact=True)).to_be_visible(timeout=30000)
            page.screenshot(path=str(OUT/(engine+'-cards.png')),full_page=True)
            open_node(page,a)
            exact='Eleanor kept the letter.\n\n  She had not decided whether to open it. Café, “quotes”, and an em dash — intact.'
            fill_manuscript(page,exact); saved(page)
            assert call(c,'section',pid,{'nodeId':a})['body']==exact
            page.reload(wait_until='networkidle');open_node(page,a);expect(page.get_by_role('textbox',name='Manuscript',exact=True)).to_contain_text('Eleanor kept the letter.')
            passed(engine+': cloud acknowledgement, exact text and reload persistence')
            field=page.get_by_role('textbox',name='Manuscript',exact=True)
            end_of_manuscript(page);page.keyboard.press('Enter')
            expect(field.locator('p')).to_have_count(3)
            page.keyboard.insert_text('“I will stay,” she said.');page.keyboard.press('Shift+Enter');page.keyboard.insert_text('For one more night.')
            page.keyboard.press('Tab');expect(field).to_be_focused();saved(page)
            paragraph_doc=call(c,'section',pid,{'nodeId':a})['document']
            assert paragraph_doc['content'][-1]['attrs']['firstLineIndent']=='indent', paragraph_doc
            assert call(c,'section',pid,{'nodeId':a})['body']==exact+'\n\n“I will stay,” she said.\nFor one more night.'
            assert any(x['type']=='hardBreak' for x in paragraph_doc['content'][-1]['content'])
            page.keyboard.press('Shift+Tab');expect(field).to_be_focused();saved(page)
            assert call(c,'section',pid,{'nodeId':a})['document']['content'][-1]['attrs']['firstLineIndent']=='none'
            page.keyboard.press('ControlOrMeta+z');saved(page)
            assert call(c,'section',pid,{'nodeId':a})['document']['content'][-1]['attrs']['firstLineIndent']=='indent'
            page.keyboard.press('Escape');expect(page.get_by_role('button',name='Indent paragraph',exact=True)).to_be_focused()
            expect(page.get_by_role('tree',name='Manuscript structure')).to_be_visible()
            page.screenshot(path=str(OUT/(engine+'-paragraphs-and-tree.png')),full_page=True)
            fill_manuscript(page,exact);saved(page)
            passed(engine+': Enter/soft break, Tab/Shift+Tab, undo, keyboard exit and persistent tree')

            page.get_by_label('Section title',exact=True).fill('')
            expect(page.get_by_text('Not saved — retry or download your copy',exact=True)).to_be_visible(timeout=20000)
            page.get_by_label('Section title',exact=True).fill('Opening scene')
            page.get_by_role('button',name='Save / retry',exact=True).click();saved(page)
            passed(engine+': rejected save can be corrected without a stuck retry payload')

            before=len(call(c,'history',pid,{'nodeId':a})); dropped={'done':False}
            def lose_ack(route):
                payload=route.request.post_data_json
                if payload and payload.get('action')=='save' and not dropped['done']:
                    dropped['done']=True; route.fetch(); route.abort('failed')
                else: route.continue_()
            page.route('**/api/project-browser-test',lose_ack)
            fill_manuscript(page,exact+'\n\nA saved ending despite the dropped response.')
            expect(page.get_by_text('Not saved — retry or download your copy',exact=True)).to_be_visible(timeout=20000)
            page.get_by_role('button',name='Save / retry',exact=True).click();saved(page)
            page.unroute('**/api/project-browser-test',lose_ack)
            assert len(call(c,'history',pid,{'nodeId':a}))==before+1
            passed(engine+': lost acknowledgement retries once without duplicating revisions')

            c2=context(browser,viewport={'width':1100,'height':850}); other=c2.new_page()
            other.goto(BASE+'/project-browser-test?projectId='+pid,wait_until='networkidle');open_node(other,a)
            fill_manuscript(page,'A laptop version.');saved(page)
            fill_manuscript(other,'An iPad version.');expect(other.get_by_role('heading',name='Both versions are preserved')).to_be_visible(timeout=20000)
            other.screenshot(path=str(OUT/(engine+'-conflict.png')),full_page=True)
            other.get_by_role('button',name='Continue with my version',exact=True).click();saved(other)
            assert call(c,'section',pid,{'nodeId':a})['body']=='An iPad version.'
            history=call(c,'history',pid,{'nodeId':a});assert any(r['reason']=='conflict' for r in history)
            c2.close();page.reload(wait_until='networkidle');open_node(page,a)
            passed(engine+': separate browser sessions preserve and resolve both conflicting drafts')

            page.get_by_role('button',name='Snapshots',exact=True).click()
            panel=page.get_by_role('region',name='Snapshots')
            panel.get_by_label('Snapshot name (optional)',exact=True).fill('Before rearranging')
            panel.get_by_role('button',name='Take snapshot',exact=True).click()
            expect(panel.get_by_text('Before rearranging',exact=False)).to_be_visible(timeout=20000)
            fill_manuscript(page,'This change should be recoverable.');saved(page)
            page.get_by_role('button',name='Cards',exact=True).click()
            page.locator('[data-node-id="'+b+'"]').drag_to(page.locator('[data-node-id="'+a+'"]'))
            for _ in range(50):
                state=call(c,'state',pid);root=sorted([n for n in state['nodes'] if n['parentId'] is None],key=lambda n:n['position'])
                if root[0]['id']==b:break
                time.sleep(.1)
            assert root[0]['id']==b
            panel.get_by_role('button',name='Preview',exact=True).first.click()
            comparison=page.get_by_role('dialog',name='Snapshot comparison')
            expect(comparison).to_be_visible();page.screenshot(path=str(OUT/(engine+'-snapshots.png')),full_page=True)
            comparison.get_by_role('button',name='Restore with safety snapshot',exact=True).click()
            expect(comparison).not_to_be_visible(timeout=20000)
            state=call(c,'state',pid);assert any(s['kind']=='safety' for s in state['snapshots'])
            assert call(c,'section',pid,{'nodeId':a})['body']=='An iPad version.'
            root=sorted([n for n in state['nodes'] if n['parentId'] is None],key=lambda n:n['position']);assert root[0]['id']==a
            passed(engine+': pointer card ordering and whole-project snapshot restore with safety copy')

            open_node(page,a);page.get_by_role('combobox',name='Move selected item to',exact=True).select_option(folder)
            page.get_by_role('button',name='Move selected item',exact=True).click()
            page.get_by_role('button',name='Outline',exact=True).click()
            f=page.locator('[data-node-id="'+folder+'"]');f.get_by_role('button',name='Collapse',exact=True).click()
            expect(page.locator('[data-node-id="'+a+'"]')).to_have_count(0)
            f.get_by_role('button',name='Expand',exact=True).click();expect(page.locator('[data-node-id="'+a+'"]')).to_be_visible()
            assert call(c,'state',pid)['nodes'][0]
            passed(engine+': Move to and expandable hierarchy share the same manuscript structure')

            open_node(page,a)
            paragraph='She returned to the empty platform. The letter was still folded in her pocket, and the lights in the waiting room had gone out. Nobody had asked her to stay. '
            prose='\n\n'.join(paragraph*4 for _ in range(12))
            fill_manuscript(page,prose);saved(page)
            page.get_by_role('button',name='Compile manuscript',exact=True).click()
            page.get_by_role('button',name='Clear',exact=True).click();page.get_by_role('checkbox',name='Opening scene',exact=True).check()
            page.get_by_label('Anonymous competition copy',exact=True).check()
            page.get_by_label('Manuscript title',exact=True).fill('Anonymous platform story')
            page.get_by_role('button',name='Assemble and preview',exact=True).click()
            expect(page.get_by_role('link',name='Download Word (.docx)',exact=True)).to_be_visible(timeout=20000)
            page.screenshot(path=str(OUT/(engine+'-compile.png')),full_page=True)
            with page.expect_download() as download:
                page.get_by_role('link',name='Download Word (.docx)',exact=True).click()
            dest=OUT/(engine+'-manuscript.docx');download.value.save_as(str(dest))
            with zipfile.ZipFile(dest) as z:
                document=z.read('word/document.xml').decode();metadata=z.read('docProps/core.xml').decode()
                assert 'At the river' not in document and 'private planning synopsis' not in document
                assert 'Times New Roman' in document and 'w:line="480"' in document
                assert 'creator' not in metadata and 'lastModifiedBy' not in metadata
            with page.expect_popup() as popup:
                page.get_by_role('link',name='Print / Save as PDF',exact=True).click()
            printed=popup.value;printed.wait_for_load_state('networkidle')
            assert 'At the river' not in printed.locator('main').inner_text()
            if engine=='chromium':printed.pdf(path=str(OUT/'compiled-manuscript.pdf'),prefer_css_page_size=True,print_background=False,display_header_footer=False)
            printed.screenshot(path=str(OUT/(engine+'-print.png')),full_page=True);printed.close()
            passed(engine+': actual Word download and clean anonymous multi-page print/PDF selection')

            for role in ['peer','editor']:
                denied=context(browser,role)
                response=denied.request.get(BASE+'/api/project-browser-test?projectId='+pid+'&format=archive')
                assert response.status==403
                response=denied.request.post(BASE+'/api/project-browser-test',headers={'Origin':BASE},data={'action':'state','projectId':pid,'input':{'ownerId':'40000000-0000-4000-8000-000000000001'}})
                assert response.status==403;denied.close()
            passed(engine+': peer/editor browser sessions cannot read or export unsubmitted projects')

            tablet=context(browser,viewport={'width':820,'height':1180},has_touch=True,is_mobile=engine=='webkit')
            tp=tablet.new_page();tp.goto(BASE+'/project-browser-test?projectId='+pid,wait_until='networkidle')
            assert tp.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
            tp.get_by_role('button',name='Outline',exact=True).tap();open_node(tp,a)
            expect(tp.get_by_role('combobox',name='Move selected item to',exact=True)).to_be_visible()
            tp.screenshot(path=str(OUT/(engine+'-tablet.png')),full_page=True);tablet.close()
            passed(engine+': tablet layout and non-drag organising controls')
            assert not errors,errors
        except Exception as error:
            page.screenshot(path=str(OUT/(engine+'-failure.png')),full_page=True)
            (OUT/(engine+'-failure.txt')).write_text(traceback.format_exc()+'\n'+'\n'.join(errors))
            field=page.get_by_role('textbox',name='Manuscript',exact=True)
            if field.count():
                state=field.evaluate('el => ({html:el.innerHTML,selection:el.editor?.state.selection.toJSON(),document:el.editor?.getJSON()})')
                (OUT/(engine+'-editor-state.json')).write_text(json.dumps(state,indent=2))
            raise
        finally:
            (OUT/'report.json').write_text(json.dumps({'checks':checks,'identity':'synthetic isolated sessions; not live Netlify Identity','emails':'no real email sent'},indent=2))
            c.close();browser.close()
