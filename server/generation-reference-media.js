// Preliminary, strict local-media admission. Never treat this as a provider-compatible
// codec or malware verdict; staged assets stay private and cannot be sent to an AI.
const LIMITS=Object.freeze({'video/mp4':20*1024*1024,'audio/wav':8*1024*1024});
const MAX_VIDEO_SECONDS=30;
const MAX_AUDIO_SECONDS=60;
const fourcc=(bytes,index)=>bytes.toString('latin1',index,index+4);
const reject=()=>{throw Error('REFERENCE_MEDIA_INVALID');};
function boxes(bytes,from,to){
 const result=[];let at=from;
 while(at<to){
  if(to-at<8)reject();
  const size=bytes.readUInt32BE(at),type=fourcc(bytes,at+4);
  // Refuse extended-size, zero-sized and truncated boxes until a full parser
  // and codec scanner have been integrated.
  if(size<8||size>to-at)reject();
  result.push({start:at,end:at+size,type,data:at+8});
  at+=size;
 }
 return result;
}
function inspectMp4(bytes){
 if(bytes.length<48)reject();
 const top=boxes(bytes,0,bytes.length);
 const ftyp=top[0];
 if(ftyp?.type!=='ftyp'||ftyp.end-ftyp.start<16)reject();
 const brand=fourcc(bytes,ftyp.data);
 if(!new Set(['isom','iso2','mp41','mp42','avc1','M4V ','MSNV']).has(brand))reject();
 const moov=top.find(x=>x.type==='moov');
 if(!moov||!top.some(x=>x.type==='mdat'&&x.end-x.data>0))reject();
 const children=boxes(bytes,moov.data,moov.end);
 const mvhd=children.find(x=>x.type==='mvhd');
 if(!mvhd||mvhd.end-mvhd.data<20)reject();
 const version=bytes[mvhd.data];let scale,duration;
 if(version===0){
  if(mvhd.end-mvhd.data<20)reject();
  scale=bytes.readUInt32BE(mvhd.data+12);
  duration=bytes.readUInt32BE(mvhd.data+16);
 }else if(version===1){
  if(mvhd.end-mvhd.data<32)reject();
  scale=bytes.readUInt32BE(mvhd.data+20);
  duration=Number(bytes.readBigUInt64BE(mvhd.data+24));
 }else reject();
 const seconds=duration/scale;
 if(!scale||!Number.isFinite(seconds)||seconds<=0||seconds>MAX_VIDEO_SECONDS)reject();
 // Require a declared video track. An audio-only MP4 is not a video reference.
 let videoTrack=false;
 for(const trak of children.filter(x=>x.type==='trak')){
  const mdia=boxes(bytes,trak.data,trak.end).find(x=>x.type==='mdia');
  if(!mdia)continue;
  const hdlr=boxes(bytes,mdia.data,mdia.end).find(x=>x.type==='hdlr');
  if(hdlr&&hdlr.end-hdlr.data>=12&&fourcc(bytes,hdlr.data+8)==='vide')videoTrack=true;
 }
 if(!videoTrack)reject();
 return {kind:'video',mime:'video/mp4',extension:'mp4',size:bytes.length,durationSeconds:seconds};
}
function inspectWav(bytes){
 if(bytes.length<44||fourcc(bytes,0)!=='RIFF'||fourcc(bytes,8)!=='WAVE')reject();
 const declared=bytes.readUInt32LE(4)+8;
 if(declared!==bytes.length)reject();
 let fmt=null,dataSize=0,at=12;
 while(at<bytes.length){
  if(at+8>bytes.length)reject();
  const type=fourcc(bytes,at),size=bytes.readUInt32LE(at+4),end=at+8+size;
  if(end>bytes.length)reject();
  if(type==='fmt '){
   if(fmt||size<16)reject();
   const start=at+8;
   const format=bytes.readUInt16LE(start),channels=bytes.readUInt16LE(start+2);
   const rate=bytes.readUInt32LE(start+4),byteRate=bytes.readUInt32LE(start+8);
   const blockAlign=bytes.readUInt16LE(start+12),bits=bytes.readUInt16LE(start+14);
   if(format!==1||channels<1||channels>2||rate<8000||rate>96000||
      ![16,24].includes(bits)||blockAlign!==channels*bits/8||byteRate!==rate*blockAlign)reject();
   fmt={byteRate,blockAlign};
  }else if(type==='data'){if(dataSize)reject();dataSize=size;}
  at=end+(size%2);
 }
 if(at!==bytes.length||!fmt||!dataSize||dataSize%fmt.blockAlign)reject();
 const seconds=dataSize/fmt.byteRate;
 if(!Number.isFinite(seconds)||seconds<=0||seconds>MAX_AUDIO_SECONDS)reject();
 return {kind:'audio',mime:'audio/wav',extension:'wav',size:bytes.length,durationSeconds:seconds};
}
export function inspectStudioReferenceMedia({bytes,mime}={}){
 if(!Buffer.isBuffer(bytes)||typeof mime!=='string'||!Object.hasOwn(LIMITS,mime)||
    !bytes.length||bytes.length>LIMITS[mime])reject();
 return mime==='video/mp4'?inspectMp4(bytes):inspectWav(bytes);
}
export const STUDIO_REFERENCE_MEDIA_LIMITS=LIMITS;
