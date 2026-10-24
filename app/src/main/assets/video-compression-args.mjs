/**
 * BASE #28: fixed, local FFmpeg/WASM encode command for Everyday Tools.
 * No shell, provider API, uploaded media or paid generation.
 * Returns a fresh argument vector for the existing local createEngine().
 */
const PRESETS=Object.freeze({
 small: Object.freeze({crf:31,audioKbps:96}),
 balanced: Object.freeze({crf:27,audioKbps:128}),
 quality: Object.freeze({crf:23,audioKbps:160})
});
export function videoCompressionArgs(preset='balanced',output='compressed.mp4'){
 if(!Object.prototype.hasOwnProperty.call(PRESETS,preset))throw new RangeError('INVALID_COMPRESSION_PRESET');
 if(output!=='compressed.mp4')throw new RangeError('INVALID_OUTPUT_FILENAME');
 const p=PRESETS[preset];
 return ['-i','input','-map','0:v:0','-map','0:a:0?',
  '-c:v','libx264','-preset','ultrafast','-crf',String(p.crf),
  '-pix_fmt','yuv420p','-c:a','aac','-b:a',p.audioKbps+'k',
  '-movflags','+faststart',output];
}
export function videoCompressionInputSupported(file){
 if(!file||typeof file.name!=='string')return false;
 const mime=String(file.type||'').toLowerCase();
 // Browser file-picker accept=video/* is advisory; validate before loading WASM.
 // Some phones omit MOV/WebM MIME types, so allow known video extensions too.
 return mime.startsWith('video/')||/\.(mp4|m4v|mov|webm|mkv|avi|3gp)$/i.test(file.name);
}
export function videoCompressionSummary(inputBytes,outputBytes){
 if(!Number.isSafeInteger(inputBytes)||inputBytes<=0||!Number.isSafeInteger(outputBytes)||outputBytes<=0)
  throw new RangeError('INVALID_VIDEO_SIZE');
 const diff=(1-outputBytes/inputBytes)*100;
 return {savedPercent:Math.round(diff),smaller:outputBytes<inputBytes};
}
