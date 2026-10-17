/**
 * BASE #20/#35: validate local Product Video PNG/JPEG source signatures.
 * This is a browser preflight check, not a substitute for server-side media
 * decoding, malware screening, permissions, ownership or provider checks.
 */
const PNG=[137,80,78,71,13,10,26,10];
export async function validProductPhoto(file){
 if(!file||!['image/png','image/jpeg'].includes(file.type)||
  !Number.isSafeInteger(file.size)||file.size<8||file.size>1024*1024||
  typeof file.slice!=='function')return false;
 try{
  const bytes=new Uint8Array(await file.slice(0,8).arrayBuffer());
  if(file.type==='image/png')return PNG.every((value,index)=>bytes[index]===value);
  return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 }catch(_){return false;}
}
