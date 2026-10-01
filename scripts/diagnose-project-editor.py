"""Temporary synthetic-only key diagnostic; never authenticates a real account."""
from pathlib import Path
exec(Path('scripts/verify-projects-browser.py').read_text().split('with sync_playwright() as p:')[0])
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    c=context(browser,viewport={'width':1440,'height':1000})
    page=c.new_page()
    pid,ids=seed(c,'key-diagnostic')
    a=ids['Opening scene']
    page.goto(BASE+'/project-browser-test?projectId='+pid,wait_until='networkidle')
    open_node(page,a)
    text='Eleanor kept the letter.\n\n  She had not decided whether to open it. Café, “quotes”, and an em dash — intact.'
    fill_manuscript(page,text);saved(page)
    page.reload(wait_until='networkidle');open_node(page,a)
    field=page.get_by_role('textbox',name='Manuscript',exact=True)
    def inspect(stage):
        state=field.evaluate("el => ({html:el.innerHTML,focused:document.activeElement===el,selection:el.editor?.state.selection.toJSON(),document:el.editor?.getJSON()})")
        print('EDITOR_DIAGNOSTIC '+stage+' '+json.dumps(state),flush=True)
    field.click();inspect('clicked')
    page.keyboard.press('ControlOrMeta+End');inspect('end-key')
    page.keyboard.press('Enter');inspect('enter')
    page.keyboard.insert_text('“I will stay,” she said.');inspect('typed')
    page.keyboard.press('Shift+Enter');page.keyboard.insert_text('For one more night.');inspect('soft-break')
    page.keyboard.press('Tab');inspect('tab');saved(page);inspect('saved')
    print('EDITOR_DIAGNOSTIC database '+json.dumps(call(c,'section',pid,{'nodeId':a})),flush=True)
    page.screenshot(path=str(OUT/'diagnostic-keys.png'),full_page=True)
    c.close();browser.close()
