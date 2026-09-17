// Video Uniquifier same-origin FFmpeg worker for @ffmpeg/ffmpeg 0.12.x
const CORE_URL=(self.location.protocol==='https:'||self.location.protocol==='http:')
  ? `${self.location.origin}/vendor/ffmpeg/ffmpeg-core.js`
  : 'https://video-variator-android.onrender.com/vendor/ffmpeg/ffmpeg-core.js';
const T={LOAD:'LOAD',EXEC:'EXEC',FFPROBE:'FFPROBE',WRITE_FILE:'WRITE_FILE',READ_FILE:'READ_FILE',DELETE_FILE:'DELETE_FILE',RENAME:'RENAME',CREATE_DIR:'CREATE_DIR',LIST_DIR:'LIST_DIR',DELETE_DIR:'DELETE_DIR',ERROR:'ERROR',DOWNLOAD:'DOWNLOAD',PROGRESS:'PROGRESS',LOG:'LOG',MOUNT:'MOUNT',UNMOUNT:'UNMOUNT'};
let ffmpeg;

async function load({coreURL:_coreURL,wasmURL:_wasmURL,workerURL:_workerURL}={}){
  const first=!ffmpeg;
  try{
    if(!_coreURL)_coreURL=CORE_URL;
    importScripts(_coreURL);
  }catch(_){
    if(!_coreURL)_coreURL=CORE_URL;
    const mod=await import(_coreURL);
    self.createFFmpegCore=mod.default;
    if(!self.createFFmpegCore)throw new Error('failed to import ffmpeg-core.js');
  }
  const coreURL=_coreURL;
  const wasmURL=_wasmURL||_coreURL.replace(/\.js$/g,'.wasm');
  const workerURL=_workerURL||_coreURL.replace(/\.js$/g,'.worker.js');
  ffmpeg=await self.createFFmpegCore({mainScriptUrlOrBlob:`${coreURL}#${btoa(JSON.stringify({wasmURL,workerURL}))}`});
  ffmpeg.setLogger(data=>self.postMessage({type:T.LOG,data}));
  ffmpeg.setProgress(data=>self.postMessage({type:T.PROGRESS,data}));
  return first;
}
function exec({args,timeout=-1}){ffmpeg.setTimeout(timeout);ffmpeg.exec(...args);const ret=ffmpeg.ret;ffmpeg.reset();return ret;}
function ffprobe({args,timeout=-1}){ffmpeg.setTimeout(timeout);ffmpeg.ffprobe(...args);const ret=ffmpeg.ret;ffmpeg.reset();return ret;}
function writeFile({path,data}){ffmpeg.FS.writeFile(path,data);return true;}
function readFile({path,encoding}){return ffmpeg.FS.readFile(path,{encoding});}
function deleteFile({path}){ffmpeg.FS.unlink(path);return true;}
function rename({oldPath,newPath}){ffmpeg.FS.rename(oldPath,newPath);return true;}
function createDir({path}){ffmpeg.FS.mkdir(path);return true;}
function listDir({path}){return ffmpeg.FS.readdir(path).map(name=>{const stat=ffmpeg.FS.stat(`${path}/${name}`);return{name,isDir:ffmpeg.FS.isDir(stat.mode)};});}
function deleteDir({path}){ffmpeg.FS.rmdir(path);return true;}
function mount({fsType,options,mountPoint}){const fs=ffmpeg.FS.filesystems[String(fsType)];if(!fs)return false;ffmpeg.FS.mount(fs,options,mountPoint);return true;}
function unmount({mountPoint}){ffmpeg.FS.unmount(mountPoint);return true;}

self.onmessage=async({data:{id,type,data}})=>{
  const transfer=[];let result;
  try{
    if(type!==T.LOAD&&!ffmpeg)throw new Error('ffmpeg is not loaded');
    switch(type){
      case T.LOAD:result=await load(data);break;
      case T.EXEC:result=exec(data);break;
      case T.FFPROBE:result=ffprobe(data);break;
      case T.WRITE_FILE:result=writeFile(data);break;
      case T.READ_FILE:result=readFile(data);break;
      case T.DELETE_FILE:result=deleteFile(data);break;
      case T.RENAME:result=rename(data);break;
      case T.CREATE_DIR:result=createDir(data);break;
      case T.LIST_DIR:result=listDir(data);break;
      case T.DELETE_DIR:result=deleteDir(data);break;
      case T.MOUNT:result=mount(data);break;
      case T.UNMOUNT:result=unmount(data);break;
      default:throw new Error('unknown message type');
    }
  }catch(e){self.postMessage({id,type:T.ERROR,data:String(e)});return;}
  if(result instanceof Uint8Array)transfer.push(result.buffer);
  self.postMessage({id,type,data:result},transfer);
};
