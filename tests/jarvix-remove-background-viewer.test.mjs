import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {File,Blob} from 'node:buffer';

const source=readFileSync(new URL('../app/src/main/assets/jarvix-chat.js',import.meta.url),'utf8');
const start=source.indexOf('let imageViewer;');
const end=source.indexOf('function render(){',start);
assert.ok(start>0&&end>start,'Existing image viewer section must remain available');
const viewer=source.slice(start,end);

function harness({busy=false,lang='ru'}={}){
 const sent=[],attached=[],notices=[],handoffs=[];
 class Element {
  constructor(tag,text=''){this.tag=tag;this.textContent=text;this.children=[];this.listeners={};this.open=false;}
  setAttribute(name,value){this[name]=value;}
  append(...children){this.children.push(...children);}
  addEventListener(name,callback){this.listeners[name]=callback;}
  showModal(){this.open=true;}
  close(){this.open=false;this.listeners.close?.();}
  remove(){}
  focus(){}
  dispatchEvent(e){this.listeners[e.type]?.(e);}
 }
 const input=new Element('textarea');
 const form={requestSubmit(){sent.push({text:input.value,files:[...attached]});}};
 const body=new Element('body');
 const context={
  Blob,File,Event:class{constructor(type,props){this.type=type;Object.assign(this,props);}},
  URL:{createObjectURL:()=> 'blob:preview',revokeObjectURL:()=>{}},
  document:{body},
  node:(tag,text)=>new Element(tag,text),
  store:{guard(){}},
  getJarvixLanguage:()=>lang,
  headers:()=>({}),
  downloadResult:async()=>{throw Error('Should use already-owned Blob');},
  mediaExtension:()=> 'png',
  saveStudioHandoff:async value=>{handoffs.push(value);},
  status:value=>{notices.push(value);},
  composer:{add:image=>{attached.push(image);}},
  $:id=>({'jInput':input,'jChatForm':form})[id],
  busy
 };
 vm.runInNewContext(viewer+'\nglobalThis.openViewer=openImageViewer;',context);
 const original=new Blob([Buffer.from('valid-image-data')],{type:'image/png'});
 context.openViewer({resultFile:original,jobId:'selected-image'}, {focus(){}});
 const dialog=body.children.find(x=>x.className==='j-image-viewer');
 assert.ok(dialog);
 const toolbar=dialog.children.find(x=>x.className==='j-image-viewer-actions');
 assert.ok(toolbar);
 return {buttons:toolbar.children,dialog,sent,attached,notices,handoffs,input};
}

test('Remove background sends only the selected image and command through existing chat',async()=>{
 const h=harness();
 assert.deepEqual(h.buttons.map(x=>x.textContent),['Скачать','Изменить размер в Canvas','Удалить фон','Закрыть']);
 await h.buttons[2].onclick();
 assert.equal(h.sent.length,1);
 assert.equal(h.sent[0].text,'Удали фон с этой фотографии');
 assert.equal(h.sent[0].files.length,1);
 assert.equal(h.sent[0].files[0].name,'deepsyq-selected-image.png');
 assert.equal(h.sent[0].files[0].type,'image/png');
 assert.equal(h.sent[0].files[0].size,16);
 assert.equal(h.dialog.open,false);
 assert.equal(h.handoffs.length,0,'No navigation to Canvas or a duplicate chat');
});

test('Remove background cannot queue a second request while JARVIX is busy',async()=>{
 const h=harness({busy:true});
 await h.buttons[2].onclick();
 assert.equal(h.sent.length,0);
 assert.equal(h.attached.length,0);
 assert.equal(h.dialog.open,true);
 assert.equal(h.notices.length,1);
});
