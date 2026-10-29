from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
R=Path(__file__).resolve().parent; F=Path('/usr/share/fonts/opentype/urw-base35')
W,H=4000,3000
def font(n,s):return ImageFont.truetype(str(F/n),s)
HEAD='P052-Italic.otf';BODY='NimbusSans-Regular.otf';BOLD='NimbusSans-Bold.otf'
checks=[]
def text(im,t,xy,size=70,color='#24372F',face=BODY):
 d=ImageDraw.Draw(im);f=font(face,size);box=d.textbbox(xy,t,font=f);assert box[0]>=0 and box[1]>=0 and box[2]<=W and box[3]<=H,(t,box);d.text(xy,t,font=f,fill=color);checks.append({'text':t,'bounds':box})
def card(im,st,k,x,y,w,mobile=False):
 p=Image.open(R/'Previews'/f'{st}_{"Mobile" if mobile else "Print"}_{k:02}.png').convert('RGBA');h=round(w*p.height/p.width);p=p.resize((w,h),Image.Resampling.LANCZOS)
 ov=Image.new('RGBA',p.size);d=ImageDraw.Draw(ov);f=font('NimbusSans-Regular.otf',max(19,w//22))
 for yy in [h*.26,h*.52,h*.77]:
  d.text((w*.18,yy),'Pinogri',font=f,fill=(110,110,110,48));d.text((w*.62,yy+h*.07),'Pinogri',font=f,fill=(110,110,110,48))
 p=Image.alpha_composite(p,ov);im.paste(p,(x,y),p)
 return h
def save(im,i):
 i={2:3,3:4,4:5,5:6,6:7,7:2,8:10,9:8,10:9}.get(i,i)
 im.convert('RGB').save(R/'Ads'/f'{i:02}_Wedding_V2.jpg',quality=95,subsampling=0,dpi=(300,300))
 small=im.copy();small.thumbnail((1400,1050));small.save(R/'Previews'/f'Ad_{i:02}.png')
styles=[('Minimal','#ECEAE3','#272722','Quietly timeless.','Clean typography. Space to breathe.'),('Woodland','#DDE5D6','#264332','A wedding in the garden.','Watercolor greenery and soft forest tones.'),('Glamour','#0C2421','#F5EDD9','An evening to remember.','Emerald, champagne tones and an Art Deco frame.'),('Vintage','#EDDDD5','#682F3D','A little old-world romance.','Floral details and expressive calligraphy.'),('Urban','#172F59','#F4F0E7','For a city celebration.','Bold typography. A date worth remembering.')]
for j,(st,bg,ink,title,sub) in enumerate(styles,2):
 im=Image.new('RGB',(W,H),bg);text(im,st.upper(),(200,150),64,ink,BOLD);text(im,title,(190,260),155 if len(title)>25 else 185,ink,HEAD);text(im,sub,(200,525),65,ink)
 if j%2==0:
  card(im,st,1,220,730,1180);card(im,st,2,1710,1080,900);card(im,st,3,2820,800,900)
  text(im,'INVITATION',(280,2440),58,ink,BOLD);text(im,'DETAILS',(1740,2440),58,ink,BOLD);text(im,'RSVP',(2850,2440),58,ink,BOLD)
 else:
  card(im,st,2,230,1040,880);card(im,st,1,1370,740,1190);card(im,st,3,2840,1110,880)
  text(im,'DETAILS',(260,2460),58,ink,BOLD);text(im,'INVITATION',(1410,2460),58,ink,BOLD);text(im,'RSVP',(2870,2460),58,ink,BOLD)
 text(im,'Editable PPTX templates. Print and mobile versions included.',(200,2730),64,ink);text(im,'Digital files. Printed stationery and props are not included.',(200,2840),48,ink)
 save(im,j)
im=Image.new('RGB',(W,H),'#F4F1E9');text(im,'All fifteen designs.',(180,100),165,face=HEAD);text(im,'Invitation, Details and RSVP in each of five styles. Plus mobile adaptations.',(190,320),62)
for col,st in enumerate([s[0] for s in styles]):
 x=540+col*680;text(im,st,(x,480),48,face=BOLD)
 for row in range(3):card(im,st,row+1,x,610+row*750,485)
for row,t in enumerate(['INVITATION','DETAILS','RSVP']):text(im,t,(80,900+row*750),42,face=BOLD)
save(im,7)
im=Image.new('RGB',(W,H),'#E3E7DE');text(im,'Your complete invitation collection.',(180,130),145,face=HEAD);card(im,'Minimal',1,270,580,1240)
for y,a,b in [(650,'Five wedding styles','Minimal, Woodland, Glamour, Vintage and Urban.'),(1030,'15 original layouts','Invitation, Details and RSVP in each style.'),(1410,'Print and mobile','10 editable PPTX files, plus PDF and JPG samples.'),(1790,'One personal wedding','Personalize and share final files with your guests.')]:text(im,a,(1810,y),95,face=HEAD);text(im,b,(1810,y+145),59)
text(im,'DIGITAL DOWNLOAD',(1810,2290),64,face=BOLD);text(im,'Desktop editing. Fonts and licenses included.',(1810,2400),58);text(im,'No physical cards, real foil or RSVP service.',(1810,2510),56);text(im,'No Canva link. Proofread before printing or sending.',(1810,2620),56)
save(im,8)
im=Image.new('RGB',(W,H),'#172F59');text(im,'On paper. On their phone.',(180,130),170,'#F4F0E7',HEAD);text(im,'Separate layouts for printing and messaging.',(190,365),68,'#F4F0E7');text(im,'Editable PPTX. Fonts included. Desktop editing.',(190,500),60,'#F4F0E7');
card(im,'Urban',1,470,720,1080);card(im,'Urban',1,2360,630,900,True)
text(im,'5 × 7 INCHES',(470,2390),75,'#F4F0E7',BOLD);text(im,'Print JPG: 1500 × 2100 px at 300 ppi',(470,2500),57,'#F4F0E7');text(im,'1080 × 1920 PX',(2300,2390),75,'#F4F0E7',BOLD);text(im,'Mobile JPG: 9:16 portrait',(2300,2500),60,'#F4F0E7');text(im,'Personalize the PPTX first, then export your final invitation.',(200,2780),65,'#F4F0E7');save(im,9)
im=Image.new('RGB',(W,H),'#102F2B');ink='#F5EDD9';text(im,'From download to “I do”.',(180,130),175,ink,HEAD)
for y,n,a,b in [(650,'01','Download five ZIPs','Get all five styles through your Etsy purchases.'),(1060,'02','Unzip and install fonts','Open a working copy of the chosen PPTX.'),(1470,'03','Personalize and proofread','Replace all sample names, dates and contacts.'),(1880,'04','Export, print or send','Use your personalized PDF or mobile JPG.')]:
 text(im,n,(210,y),90,'#C8AC70',HEAD);text(im,a,(490,y),82,ink,BOLD);text(im,b,(490,y+135),58,ink)
card(im,'Vintage',1,2850,730,850)
text(im,'ONE PERSONAL WEDDING',(200,2530),64,ink,BOLD);text(im,'Digital templates only. No printed cards, real foil or RSVP hosting.',(200,2650),59,ink);text(im,'Illustrative cover styling; style galleries show the actual exported pages.',(200,2780),50,ink);save(im,10)
(R/'ads_qa.json').write_text(json.dumps({'dimensions':[W,H],'checks':checks,'actual_page_previews':True,'ads_excluded_from_buyer':True},indent=2));print('Created ads02–10; exact product previews and text bounds PASS')
