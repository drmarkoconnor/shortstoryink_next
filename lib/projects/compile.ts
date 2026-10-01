import { Buffer } from 'node:buffer'
import { compiledText, countWords, escapeMarkup, paragraphs, validateCompileSettings, type Compiled } from './model'

const xmlHeader='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
function crc32(bytes: Buffer): number { let crc=0xffffffff; for(const byte of bytes) {crc^=byte; for(let i=0;i<8;i++) crc=(crc>>>1)^((crc&1)?0xedb88320:0)} return (crc^0xffffffff)>>>0 }
// Small standards-compliant ZIP writer: OOXML text only, no downloaded fonts or
// document-conversion service. STORE avoids a runtime dependency and is portable.
function zip(files: Record<string,string>): Buffer {
 const locals:Buffer[]=[],central:Buffer[]=[]; let offset=0
 for(const [name,value] of Object.entries(files)) {
  const filename=Buffer.from(name), data=Buffer.from(value), crc=crc32(data)
  const header=Buffer.alloc(30); header.writeUInt32LE(0x04034b50,0); header.writeUInt16LE(20,4); header.writeUInt16LE(0x800,6); header.writeUInt16LE(33,12); header.writeUInt32LE(crc,14); header.writeUInt32LE(data.length,18); header.writeUInt32LE(data.length,22); header.writeUInt16LE(filename.length,26)
  locals.push(header,filename,data)
  const directory=Buffer.alloc(46); directory.writeUInt32LE(0x02014b50,0); directory.writeUInt16LE(20,4); directory.writeUInt16LE(20,6); directory.writeUInt16LE(0x800,8); directory.writeUInt16LE(33,14); directory.writeUInt32LE(crc,16); directory.writeUInt32LE(data.length,20); directory.writeUInt32LE(data.length,24); directory.writeUInt16LE(filename.length,28); directory.writeUInt32LE(offset,42)
  central.push(directory,filename); offset+=header.length+filename.length+data.length
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22); end.writeUInt32LE(0x06054b50,0); end.writeUInt16LE(Object.keys(files).length,8); end.writeUInt16LE(Object.keys(files).length,10); end.writeUInt32LE(directory.length,12); end.writeUInt32LE(offset,16)
 return Buffer.concat([...locals,directory,end])
}
function cleanXml(text:string) { return escapeMarkup(text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'')) }
export function compileDocx(input: Compiled): Buffer {
 const s=validateCompileSettings(input.settings), size=Math.round(s.size*2), margin=Math.round(s.margins/25.4*1440), line=s.spacing*240
 const run=(text:string)=>'<w:r><w:rPr><w:rFonts w:ascii="'+s.font+'" w:hAnsi="'+s.font+'" w:cs="'+s.font+'"/><w:sz w:val="'+size+'"/></w:rPr>'+text.replace(/\r\n?/g,'\n').split('\n').map(t=>'<w:t xml:space="preserve">'+cleanXml(t)+'</w:t>').join('<w:br/>')+'</w:r>'
 const para=(text:string,align='left',indent=false,breakBefore=false)=>'<w:p><w:pPr><w:jc w:val="'+align+'"/><w:spacing w:before="0" w:after="0" w:line="'+line+'" w:lineRule="auto"/><w:ind w:firstLine="'+(indent?720:0)+'"/>'+(breakBefore?'<w:pageBreakBefore/>':'')+'</w:pPr>'+run(text)+'</w:p>'
 let content=s.wordCount?para(countWords(compiledText(input))+' words','right'):''
 content+=para(s.title,'center')
 if(!s.anonymous && s.author) content+=para(s.author,'center')
 if(s.titlePage) content+='<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
 input.nodes.forEach((node,index)=>{
  if(index && !s.pageBreaks) content+=para('#','center')
  if(s.headings) content+=para(node.title,'center',false,index>0 && s.pageBreaks)
  paragraphs(node.body).forEach((text,p)=>{ content+=para(text,'left',s.indent && p>0,!s.headings && index>0 && p===0 && s.pageBreaks) })
 })
 const width=s.paper==='A4'?11906:12240,height=s.paper==='A4'?16838:15840
 const section='<w:sectPr><w:headerReference w:type="default" r:id="rHeader"/><w:footerReference w:type="default" r:id="rFooter"/><w:pgSz w:w="'+width+'" w:h="'+height+'"/><w:pgMar w:top="'+margin+'" w:right="'+margin+'" w:bottom="'+margin+'" w:left="'+margin+'" w:header="500" w:footer="500"/>'+(s.titlePage?'<w:titlePg/><w:pgNumType w:start="0"/>':'')+'</w:sectPr>'
 const namespace='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
 const header=(s.anonymous?'':s.author?s.author+' / ':'')+s.title
 return zip({
  '[Content_Types].xml':xmlHeader+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>',
  '_rels/.rels':xmlHeader+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rOffice" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rCore" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>',
  'word/document.xml':xmlHeader+'<w:document '+namespace+' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>'+content+section+'</w:body></w:document>',
  'word/styles.xml':xmlHeader+'<w:styles '+namespace+'><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="'+s.font+'" w:hAnsi="'+s.font+'"/><w:sz w:val="'+size+'"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="'+line+'" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>',
  'word/_rels/document.xml.rels':xmlHeader+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header.xml"/><Relationship Id="rFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer.xml"/></Relationships>',
  'word/header.xml':xmlHeader+'<w:hdr '+namespace+'>'+para(header,'right')+'</w:hdr>',
  'word/footer.xml':xmlHeader+'<w:ftr '+namespace+'><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:fldSimple w:instr="PAGE"><w:r><w:rPr><w:rFonts w:ascii="'+s.font+'" w:hAnsi="'+s.font+'"/><w:sz w:val="'+size+'"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>',
  // Anonymity: neither account identifiers nor creator / lastModifiedBy are exported.
  'docProps/core.xml':xmlHeader+'<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>'+cleanXml(s.title)+'</dc:title></cp:coreProperties>',
 })
}
export function compileHtml(input: Compiled): string {
 const s=validateCompileSettings(input.settings), e=escapeMarkup, cssText=(text:string)=>JSON.stringify(text).replace(/</g,'\\3c ')
 const content=input.nodes.map((n,i)=>'<section class="section '+(i>0 && s.pageBreaks?'new-page':'')+'">'+(i>0&&!s.pageBreaks?'<p class="separator">#</p>':'')+(s.headings?'<h2>'+e(n.title)+'</h2>':'')+paragraphs(n.body).map((p,j)=>'<p class="body '+(j===0?'opening':'')+'">'+e(p).replace(/\n/g,'<br>')+'</p>').join('')+'</section>').join('')
 return '<!doctype html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+e(s.title)+'</title><style>@page{size:'+s.paper+';margin:'+s.margins+'mm;@bottom-center{content:counter(page);font-size:12pt}@top-right{content:'+cssText(s.title)+';font-size:10pt}}*{box-sizing:border-box}body{margin:0;background:#eee;color:#000;font-family:"'+s.font+'",serif;font-size:'+s.size+'pt;line-height:'+s.spacing+'}.controls{font:15px/1.5 system-ui;padding:20px;margin:auto;max-width:900px}.controls button{padding:10px}main{background:#fff;margin:20px auto;padding:'+s.margins+'mm;max-width:'+(s.paper==='A4'?210:215.9)+'mm}h1,h2{font-size:inherit;font-weight:normal;text-align:center;margin:0 0 1em;break-after:avoid}p{margin:0;padding:0;white-space:pre-wrap;overflow-wrap:anywhere}.body{text-indent:'+(s.indent?'12.7mm':'0')+';orphans:2;widows:2}.opening{ text-indent:0}.separator{text-align:center;margin:1em 0}.count{text-align:right}.author{text-align:center}.title-page{break-after:page;min-height:180mm}.new-page{break-before:page}@media print{body{background:white}main{padding:0;margin:0;max-width:none}.controls{display:none}}</style></head><body><aside class="controls"><button id="print">Print / Save as PDF</button><p>This is a fixed compiled copy, not your working project. Use 100% scale and turn off the browser’s own headers and footers. Check page numbers and the installed font in the resulting PDF. Browser font fallback and print support vary; the Word download explicitly requests '+e(s.font)+'.</p>'+(s.anonymous?'<p>Anonymous export excludes account and author metadata. Check the title, manuscript text and filename yourself for identifying details.</p>':'')+'</aside><main><header class="'+(s.titlePage?'title-page':'')+'">'+(s.wordCount?'<p class="count">'+countWords(compiledText(input))+' words</p>':'')+'<h1>'+e(s.title)+'</h1>'+(!s.anonymous&&s.author?'<p class="author">'+e(s.author)+'</p>':'')+'</header>'+content+'</main><script>document.getElementById("print").addEventListener("click",function(){window.print()});</script></body></html>'
}
