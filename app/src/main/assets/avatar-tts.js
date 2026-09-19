import {KokoroTTS} from '/vendor/tts/kokoro.js';
import {env} from '/vendor/ai/transformers.min.js';
env.allowLocalModels=false;env.backends.onnx.wasm.numThreads=1;env.backends.onnx.wasm.wasmPaths=new URL('/vendor/ai/',self.location.href).href;
self.onmessage=async({data})=>{try{
 const model=await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX',{dtype:'q8',device:'wasm',progress_callback:p=>{if(p.status==='progress')postMessage({type:'progress',progress:Math.round(p.progress||0)});}});
 const audio=await model.generate(data.text,{voice:data.voice});
 const wav=audio.toWav();postMessage({type:'audio',wav},[wav]);
}catch(e){postMessage({type:'error',message:String(e.message||e)});}};
