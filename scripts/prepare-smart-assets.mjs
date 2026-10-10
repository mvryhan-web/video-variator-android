import {mkdir,cp,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../app/src/main/assets/',import.meta.url);
await mkdir(new URL('smart-vendor/',root),{recursive:true});
const pkg=new URL('../node_modules/@mediapipe/tasks-vision/',import.meta.url);
await cp(new URL('vision_bundle.js',pkg),new URL('smart-vendor/vision_bundle.js',root));
await cp(new URL('wasm/',pkg),new URL('smart-vendor/wasm/',root),{recursive:true});
await mkdir(new URL('smart-models/',root),{recursive:true});
const file=new URL('smart-models/face.tflite',root),hash='b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f';
let bytes;try{bytes=await readFile(file);}catch{}
const valid=b=>b&&createHash('sha256').update(b).digest('hex')===hash;
if(!valid(bytes)){const response=await fetch('https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite');if(!response.ok)throw Error('Model download failed');bytes=Buffer.from(await response.arrayBuffer());if(!valid(bytes))throw Error('Model integrity mismatch');await writeFile(file,bytes);}
console.log('Pinned local face detector assets ready.');
