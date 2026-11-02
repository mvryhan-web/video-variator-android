/**
 * Offline, deterministic solid-color background eraser.
 * Removes only the 4-connected region matching the user's chosen sample.
 * No person detection, AI provider, file transfer, or background replacement.
 */
export function eraseConnectedColor(source,width,height,startX,startY,tolerance=45){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>8000000)throw new RangeError('UNSUPPORTED_IMAGE_SIZE');
 if(!(source instanceof Uint8ClampedArray)||source.length!==width*height*4)throw new TypeError('INVALID_RGBA');
 if(!Number.isInteger(startX)||!Number.isInteger(startY)||startX<0||startX>=width||startY<0||startY>=height)throw new RangeError('INVALID_SAMPLE');
 if(!Number.isFinite(tolerance)||tolerance<0||tolerance>150)throw new RangeError('INVALID_TOLERANCE');
 const index=startY*width+startX,si=index*4;
 if(source[si+3]===0)throw new RangeError('SAMPLE_IS_TRANSPARENT');
 const [red,green,blue]=[source[si],source[si+1],source[si+2]];
 const limit=3*tolerance*tolerance;
 const pixels=width*height,visited=new Uint8Array(pixels),queue=new Uint32Array(pixels);
 const rgba=new Uint8ClampedArray(source);
 let read=0,write=1,count=0;
 queue[0]=index;visited[index]=1;
 while(read<write){
  const current=queue[read++],position=current*4;
  const dr=source[position]-red,dg=source[position+1]-green,db=source[position+2]-blue;
  if(source[position+3]===0||dr*dr+dg*dg+db*db>limit)continue;
  rgba[position+3]=0;count++;
  const x=current%width,y=(current-x)/width;
  if(x>0&&!visited[current-1]){visited[current-1]=1;queue[write++]=current-1;}
  if(x+1<width&&!visited[current+1]){visited[current+1]=1;queue[write++]=current+1;}
  if(y>0&&!visited[current-width]){visited[current-width]=1;queue[write++]=current-width;}
  if(y+1<height&&!visited[current+width]){visited[current+width]=1;queue[write++]=current+width;}
 }
 return {rgba,removedPixels:count};
}
