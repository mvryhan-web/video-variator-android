import fs from 'node:fs/promises';
import path from 'node:path';
import {Presentation,PresentationFile} from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const ROOT=path.dirname(new URL(import.meta.url).pathname);
const styles=[
 {id:'Minimal',bg:'#F8F6F1',ink:'#272722',accent:'#727369',font:'Nimbus Roman',italic:false},
 {id:'Woodland',bg:'#F6F5E9',ink:'#264332',accent:'#637851',font:'P052',italic:true},
 {id:'Glamour',bg:'#102F2B',ink:'#F5EDD9',accent:'#C8AC70',font:'Nimbus Roman',italic:false},
 {id:'Vintage',bg:'#F8ECE7',ink:'#682F3D',accent:'#9B706C',font:'C059',italic:true},
 {id:'Urban',bg:'#EFEDE6',ink:'#172F59',accent:'#C94832',font:'URW Gothic',italic:false}
];
const inventory=[];
for(const st of styles){for(const mobile of [false,true]){
 const W=480,H=mobile?2560/3:672,unit=H/672;
 const p=Presentation.create({slideSize:{width:W,height:H}});
 for(let kind=0;kind<3;kind++){
  const sl=p.slides.add();sl.background.fill=st.bg;
  const txt=(text,y,size=15,opt={})=>{let x=opt.x??40,w=opt.w??400;const sh=sl.shapes.add({geometry:'textbox',name:`${st.id}-${kind}-${sl.shapes.items.length}`,position:{left:x,top:y*unit,width:w,height:(opt.h??size*1.55)*unit},fill:'none',line:{style:'solid',fill:'none',width:0}});sh.text=text;sh.text.style={typeface:opt.font??st.font,fontSize:size,color:opt.color??st.ink,italic:opt.italic??false,bold:opt.bold??false,alignment:opt.align??'center',verticalAlignment:'middle',insets:0,autoFit:'none',wrap:'none'};inventory.push({style:st.id,mobile,kind,text,size,x,y:y*unit,w,h:(opt.h??size*1.55)*unit});return sh;};
  const small=(s,y,opt={})=>txt(s,y,11,{font:'Nimbus Sans',color:st.accent,...opt});
  if(st.id==='Woodland'){
   const bytes=await fs.readFile(path.join(ROOT,'Sources/woodland.png'));
   sl.images.add({blob:bytes,contentType:'image/png',alt:'Original woodland botanical watercolor corner',fit:'contain',position:{left:12,top:H-208,width:200,height:200}});
  }
  if(st.id==='Vintage'){
   const bytes=await fs.readFile(path.join(ROOT,'Sources/vintage.png'));
   sl.images.add({blob:bytes,contentType:'image/png',alt:'Original vintage rose and burgundy dahlia watercolor',fit:'contain',position:{left:170,top:H-110,width:290,height:105}});
  }
  if(st.id==='Glamour'){
   const bytes=await fs.readFile(path.join(ROOT,'Sources/glamour.png'));
   sl.images.add({blob:bytes,contentType:'image/png',alt:'Champagne-color decorative border, printed color effect, not metallic foil',fit:'contain',...(mobile?{crop:{left:0,top:0,right:0,bottom:0.76},position:{left:116,top:20,width:248,height:115}}:{position:{left:22,top:15,width:436,height:H-30}})});
  }
  if(st.id==='Urban'){
   if(kind===0){
    small('TOGETHER WITH OUR FAMILIES',45,{x:36,align:'left',w:408});
    txt('WE ARE',101,38,{x:34,w:412,align:'left',bold:true});
    txt('GETTING',147,48,{x:32,w:416,align:'left',bold:true});
    txt('MARRIED.',204,48,{x:32,w:416,align:'left',bold:true,color:st.accent});
    txt('Alexandra',310,36,{x:36,w:408,align:'left'});
    txt('& Benjamin',357,36,{x:36,w:408,align:'left'});
    txt('19.06.2027',445,40,{x:36,w:408,align:'left',bold:true});
    small('SATURDAY AT 4:00 PM',505,{x:38,align:'left',w:405,color:st.ink});
    txt('THE GLASSHOUSE',550,15,{font:'Nimbus Sans',bold:true,x:38,align:'left',w:405});
    txt('125 Garden Lane, Your City',576,13,{font:'Nimbus Sans',x:38,align:'left',w:405});
    txt('Dinner and a full dance floor to follow.',611,12,{font:'Nimbus Sans',x:38,align:'left',w:405});
   }else if(kind===1){
    txt('THE DAY.',55,49,{x:36,w:408,align:'left',bold:true,color:st.accent});
    for(const [y,time,name] of [[165,'16:00','THE CEREMONY'],[245,'17:00','DRINKS & CONVERSATION'],[325,'18:30','DINNER TOGETHER'],[405,'20:30','CAKE & DANCING']]){txt(time,y,30,{x:38,w:405,align:'left',bold:true});small(name,y+43,{x:40,align:'left',w:402,color:st.ink});}
    small('DRESS CODE: COCKTAIL ATTIRE',535,{x:40,align:'left'});
    txt('Travel and accommodation',574,14,{x:40,align:'left',font:'Nimbus Sans'});
    txt('your-wedding-website.com',605,14,{x:40,align:'left',font:'Nimbus Sans'});
   }else{
    txt('COUNT',62,54,{x:36,w:408,align:'left',bold:true});txt('YOU IN?',126,54,{x:36,w:408,align:'left',bold:true,color:st.accent});
    txt('Please reply by 19 May 2027.',242,17,{x:40,align:'left',font:'Nimbus Sans'});
    small('YOUR NAME(S)',320,{x:40,align:'left'});txt('[Guest names]',350,21,{x:40,align:'left'});
    small('ATTENDING / UNABLE TO ATTEND',418,{x:40,align:'left'});
    small('DIETARY REQUIREMENTS',480,{x:40,align:'left'});txt('[Please tell us]',510,18,{x:40,align:'left'});
    txt('Reply through our wedding website',583,13,{x:40,align:'left',font:'Nimbus Sans'});txt('your-wedding-website.com',614,14,{x:40,align:'left',font:'Nimbus Sans'});
   }
  }else{
   const vintage=st.id==='Vintage',wood=st.id==='Woodland',glam=st.id==='Glamour';
   if(kind===0&&wood){
    small('A WEDDING IN THE GARDEN',61);
    txt('Where our next',115,26,{italic:true});txt('chapter grows',151,35,{italic:true});
    txt('Alexandra',243,45,{italic:true});txt('& Benjamin',303,45,{italic:true});
    txt('invite you to share their vows',386,15);txt('beneath the garden trees',410,15);
    small('SATURDAY, 19 JUNE 2027',463,{color:st.ink});txt('Four o’clock in the afternoon',490,14,{italic:true});
    txt('The Glasshouse',540,23,{italic:true});txt('125 Garden Lane, Your City',575,13,{font:'Nimbus Sans'});txt('Dinner and dancing to follow',622,11,{italic:true,x:205,w:245});
    continue;
   }
   if(kind===0&&vintage){
    txt('You are joyfully invited',62,23,{italic:true});
    txt('Alexandra',164,53,{font:'Z003',x:56,w:368,align:'left'});txt('& Benjamin',230,53,{font:'Z003',x:56,w:368,align:'left'});
    txt('to share in their happily ever after',340,16,{italic:true});
    small('SATURDAY, 19 JUNE 2027',402,{color:st.ink});txt('Four o’clock in the afternoon',430,14,{italic:true});
    txt('The Glasshouse',479,24,{italic:true});txt('125 Garden Lane, Your City',515,13,{font:'Nimbus Sans'});txt('Dinner and dancing to follow',548,14,{italic:true});
    continue;
   }
   if(kind===0&&glam){
    if(!mobile)txt('A B',45,48,{color:st.accent});small('AN EVENING TO REMEMBER',125);
    txt('THE',188,15,{color:st.accent});txt('WEDDING',217,42,{color:st.accent});txt('OF',274,15,{color:st.accent});
    txt('Alexandra & Benjamin',333,29);
    txt('request the pleasure of your company',400,14);txt('at their wedding celebration',424,14);
    small('SATURDAY, 19 JUNE 2027',480,{color:st.ink});txt('Four o’clock in the afternoon',506,13,{italic:true});
    txt('The Glasshouse',527,23,{italic:true});txt('125 Garden Lane, Your City',558,12,{font:'Nimbus Sans'});txt('Dinner and dancing to follow',587,13,{italic:true});
    continue;
   }
   const monogram=glam?'A B':'A & B';
   if(!glam)txt(monogram,40,24,{italic:true,color:st.accent});
   if(kind===0){
    const opening={Minimal:'TOGETHER WITH OUR FAMILIES',Woodland:'WHERE OUR NEXT CHAPTER GROWS',Glamour:'AN EVENING TO REMEMBER',Vintage:'WITH LOVE, NOW AND ALWAYS'}[st.id];
    small(opening,wood?124:120);
    txt('Alexandra',173,46,{italic:st.italic});
    txt('&',234,26,{italic:true,color:st.accent});
    txt('Benjamin',278,46,{italic:st.italic});
    const invitation={Minimal:['invite you to celebrate','their wedding'],Woodland:['invite you to share their vows','beneath the garden trees'],Glamour:['request the pleasure of your company','at their wedding celebration'],Vintage:['invite you to be part','of their happily ever after']}[st.id];
    txt(invitation[0],370,16);txt(invitation[1],394,16);
    small('SATURDAY, 19 JUNE 2027',446,{color:st.ink});
    txt('Four o’clock in the afternoon',472,14,{italic:true});
    txt('The Glasshouse',516,23,{italic:st.italic});
    txt('125 Garden Lane, Your City',551,13,{font:'Nimbus Sans'});
    txt('Dinner and dancing to follow',587,14,{italic:true});
   }else if(kind===1){
    small('ALEXANDRA & BENJAMIN',112);
    txt({Minimal:'The details',Woodland:'A day in the garden',Glamour:'The celebration',Vintage:'The finer details'}[st.id],158,34,{italic:st.italic});
    for(const [y,time,name] of [[253,'4:00 PM','The ceremony'],[313,'5:00 PM','Drinks and conversation'],[373,'6:30 PM','Dinner'],[433,'8:30 PM','Cake and dancing']]){small(time,y);txt(name,y+21,17);}
    small('DRESS CODE',508);txt(wood?'Cocktail attire, garden-friendly shoes':'Cocktail attire',529,14);
    txt('Travel and stays on our wedding website',569,12,{font:'Nimbus Sans'});
    txt('your-wedding-website.com',592,13,{font:'Nimbus Sans'});
   }else{
    small('ALEXANDRA & BENJAMIN',116);
    txt({Minimal:'Kindly reply',Woodland:'We saved you a place',Glamour:'Kindly respond',Vintage:'A little note back'}[st.id],166,31,{italic:st.italic});
    txt('Please respond by 19 May 2027',242,16);
    small('NAME(S)',308);txt('[Guest names]',334,21,{italic:true});
    txt('Joyfully accepts / Regretfully declines',402,14);
    small('DIETARY REQUIREMENTS',455);txt('[Please tell us]',481,17,{italic:true});
    txt('Reply through our wedding website',557,13,{font:'Nimbus Sans'});
    txt('your-wedding-website.com',584,13,{font:'Nimbus Sans'});
   }
  }
 }
 const stem=st.id+'_'+(mobile?'Mobile':'Print');
 await(await PresentationFile.exportPptx(p)).save(path.join(ROOT,'.build',stem+'.pptx'));
 for(const [i,sl] of p.slides.items.entries()){
  const png=await p.export({slide:sl,format:'png',scale:mobile?2.25:3.125});await fs.writeFile(path.join(ROOT,'Previews',stem+'_'+String(i+1).padStart(2,'0')+'.png'),new Uint8Array(await png.arrayBuffer()));
 }
 console.log('CREATED',stem);
}}
await fs.writeFile(path.join(ROOT,'layout_manifest.json'),JSON.stringify(inventory,null,2));
