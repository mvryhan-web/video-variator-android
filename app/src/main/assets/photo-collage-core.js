// Pure layout geometry for BASE #28 local photo collage.
export const MAX_COLLAGE_FILES=9;
export const MAX_COLLAGE_FILE_BYTES=15*1024*1024;
export const MAX_COLLAGE_TOTAL_BYTES=80*1024*1024;
export function collageGeometry(count,preferredColumns=2,gap=12,width=1200){
 if(!Number.isInteger(count)||count<2||count>MAX_COLLAGE_FILES)throw Error('COLLAGE_COUNT');
 if(![2,3].includes(preferredColumns)||![0,12,24].includes(gap)||width!==1200)throw Error('COLLAGE_LAYOUT');
 const columns=Math.min(count,preferredColumns),rows=Math.ceil(count/columns);
 const cell=(width-gap*(columns+1))/columns,height=Math.round(gap*(rows+1)+cell*rows);
 return {width,height,columns,rows,cell,gap};
}
export function centerCrop(imageWidth,imageHeight,boxWidth,boxHeight){
 if(![imageWidth,imageHeight,boxWidth,boxHeight].every(v=>Number.isFinite(v)&&v>0))throw Error('COLLAGE_IMAGE');
 const scale=Math.max(boxWidth/imageWidth,boxHeight/imageHeight);
 const sourceWidth=Math.min(imageWidth,boxWidth/scale),sourceHeight=Math.min(imageHeight,boxHeight/scale);
 return {sx:(imageWidth-sourceWidth)/2,sy:(imageHeight-sourceHeight)/2,sw:sourceWidth,sh:sourceHeight};
}
