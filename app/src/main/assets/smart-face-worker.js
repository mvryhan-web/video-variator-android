importScripts('./smart-vendor/vision_bundle.js');
const {FaceDetector,FilesetResolver}=Vision;
let detector;
self.onmessage=async({data})=>{
 try{
  if(!detector){const files=await FilesetResolver.forVisionTasks('/smart-vendor/wasm');detector=await FaceDetector.createFromOptions(files,{baseOptions:{modelAssetPath:'/smart-models/face.tflite',delegate:'CPU'},runningMode:'IMAGE',minDetectionConfidence:0.6});}
  const result=detector.detect(data.bitmap);
  self.postMessage({id:data.id,faces:result.detections.map(d=>({x:(d.boundingBox.originX+d.boundingBox.width/2)/data.bitmap.width,y:(d.boundingBox.originY+d.boundingBox.height/2)/data.bitmap.height,w:d.boundingBox.width/data.bitmap.width,h:d.boundingBox.height/data.bitmap.height,score:d.categories[0]?.score||0}))});
 }catch(e){self.postMessage({id:data.id,error:'Face analysis unavailable: '+e.message});}finally{data.bitmap?.close();}
};
