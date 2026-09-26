import {pipeline,env} from '/vendor/ai/transformers.min.js';
env.allowLocalModels=false;
env.backends.onnx.wasm.wasmPaths='/vendor/ai/';
env.backends.onnx.wasm.numThreads=1;
let recognizer;
self.onmessage=async({data})=>{
 try{
  if(!recognizer)recognizer=await pipeline('automatic-speech-recognition','Xenova/whisper-tiny',{dtype:'q8',device:'wasm',progress_callback:p=>{if(p.status==='progress')self.postMessage({type:'progress',progress:p.progress});}});
  const result=await recognizer(data.samples,{language:data.language||undefined,task:'transcribe',chunk_length_s:30,stride_length_s:5,return_timestamps:true});
  self.postMessage({type:'result',result});
 }catch(_){self.postMessage({type:'error',error:'TRANSCRIPTION_FAILED'});}
};
