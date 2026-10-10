import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'app/src/main/assets');
const out=path.join(root,'dist-reminders-preview');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
for(const name of [
  'smart-reminders.html','smart-reminders.js','smart-reminders.css',
  'reminder-input-parser.js','reminder-photo.js','preview-shim.js',
  'free-tools.css','theme.css','theme.js','creator-pages.css','tools-hub.css'
]){
 fs.copyFileSync(path.join(source,name),path.join(out,name));
}
const dest=path.join(out,'smart-reminders.html');
let html=fs.readFileSync(dest,'utf8');
html=html.replace('<script src="smart-reminders.js" type="module"></script>',
 '<script src="preview-shim.js"></script><script src="smart-reminders.js" type="module"></script>');
html=html.replace('href="free-tools.html" id="reminderBack"','href="https://video-variator-android.onrender.com/free-tools.html" id="reminderBack"');
fs.writeFileSync(dest,html);
fs.writeFileSync(path.join(out,'index.html'),'<meta http-equiv="refresh" content="0;url=/smart-reminders.html"><a href="/smart-reminders.html">Open Smart Reminders test preview</a>');
const vendor=path.join(out,'vendor');
for(const [name,location] of [
 ['ocr','node_modules/tesseract.js/dist'],
 ['ocr-core','node_modules/tesseract.js-core']
]){
 const origin=path.join(root,location);
 if(!fs.existsSync(origin))throw Error('Missing dependency: '+location);
 fs.cpSync(origin,path.join(vendor,name),{recursive:true});
}
console.log('Prepared isolated Smart Reminders browser preview:',out);
