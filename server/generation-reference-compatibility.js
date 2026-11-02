// BASE #5: no-network Seedance 2.0 *pre-dispatch* media policy.
// This is independent of storage admission. NEVER dispatch from this module.
// Source: https://docs.byteplus.com/pt/docs/modelark/create-video-generation-task-api
// Provider API acceptance, rights, public URL transport and billing are separate gates.
const finite=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
const invalid=reason=>({compatible:false,reason});
const MAX_BYTES={video:20*1024*1024,audio:8*1024*1024}; // existing stricter storage caps
export function seedance20ReferenceCompatibility({model,imageCount=0,videos=[],audios=[]}={}){
 if(model!=='byteplus-seedance-2')return invalid('REFERENCE_MODEL_NOT_SUPPORTED');
 if(!Number.isInteger(imageCount)||imageCount<0||imageCount>3||
  !Array.isArray(videos)||!Array.isArray(audios)||
  videos.length>3||audios.length>3)return invalid('REFERENCE_COUNT_UNSUPPORTED');
 // Seedance 2.0 does not allow audio-only reference requests.
 if(!imageCount&&!videos.length)return invalid('REFERENCE_VISUAL_REQUIRED');
 let videoTotal=0;
 for(const item of videos){
  if(!item||item.mime!=='video/mp4'||item.videoCodec!=='h264'||
   !finite(item.size,1,MAX_BYTES.video)||!finite(item.durationSeconds,2,15)||
   !finite(item.width,300,6000)||!finite(item.height,300,6000)||
   !finite(item.width*item.height,407696,8295044)||
   !finite(item.width/item.height,0.4,2.5)||
   !finite(item.frameRate,24,60)||
   (item.audioCodec!=null&&item.audioCodec!=='aac'))return invalid('REFERENCE_VIDEO_INCOMPATIBLE');
  videoTotal+=item.durationSeconds;
 }
 if(videoTotal>15)return invalid('REFERENCE_VIDEO_DURATION_TOTAL');
 let audioTotal=0;
 for(const item of audios){
  if(!item||item.mime!=='audio/wav'||!['pcm_s16le','pcm_s24le'].includes(item.audioCodec)||
   !finite(item.size,1,MAX_BYTES.audio)||!finite(item.durationSeconds,2,15)||
   !finite(item.sampleRate,8000,96000)||!finite(item.channels,1,2))
    return invalid('REFERENCE_AUDIO_INCOMPATIBLE');
  audioTotal+=item.durationSeconds;
 }
 if(audioTotal>15)return invalid('REFERENCE_AUDIO_DURATION_TOTAL');
 return {compatible:true,reason:null,referenceVideos:videos.length,referenceAudio:audios.length,
  referenceImages:imageCount,videoDurationSeconds:videoTotal,audioDurationSeconds:audioTotal};
}
