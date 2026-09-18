import {pipeline,env,RawImage} from '/vendor/ai/transformers.min.js';
env.allowLocalModels=false;
env.backends.onnx.wasm.wasmPaths=new URL('/vendor/ai/',self.location.href).href;
env.backends.onnx.wasm.numThreads=1;
let segmenter,transcriber;
const progress=data=>{if(data.status==='progress')postMessage({type:'progress',value:Math.round(data.progress||0)});};
self.onmessage=async({data})=>{try{
 if(data.type==='portrait'){
  segmenter??=await pipeline('background-removal','Xenova/modnet',{dtype:'fp32',device:'wasm',progress_callback:progress});
  const raw=new RawImage(new Uint8ClampedArray(data.pixels),data.width,data.height,4);
  const [result]=await segmenter(raw);const rgba=result.rgba();
  postMessage({type:'result',id:data.id,width:rgba.width,height:rgba.height,pixels:rgba.data.buffer},[rgba.data.buffer]);
 }else if(data.type==='speech'){
  transcriber??=await pipeline('automatic-speech-recognition','onnx-community/whisper-tiny',{dtype:{encoder_model:'fp32',decoder_model_merged:'q8'},device:'wasm',progress_callback:progress});
  const result=await transcriber(new Float32Array(data.audio),{return_timestamps:true,chunk_length_s:20,stride_length_s:3,task:'transcribe',...(data.language==='auto'?{}:{language:data.language})});
  postMessage({type:'result',id:data.id,chunks:result.chunks||[],text:result.text||''});
 }
}catch(error){postMessage({type:'error',id:data.id,message:String(error.message||error)});}};
