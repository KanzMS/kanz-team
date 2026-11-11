// @ts-nocheck
// The workshop ad's drawing code, kept as the designer wrote it: every colour,
// position and timing of the ad lives here. The page around it is Templates.tsx.

const FAM = '"IBM Plex Sans Arabic","Segoe UI",Tahoma,sans-serif';
const DUR = 8, FPS = 30;
const DEFAULTS = {
  chip:'الورشة الاسبوعية', kicker:'قراءة في الأسواق', title:'متابعة قرار الفيدرالي', hl:[2],
  name:'مع أحمد شعبان', role:'كبير محللي كنز', day:'الخميس', date:'12-11', tHead:'التوقيتات', theme:'weekly', cta:'ضيف سؤالك في الكومنتات',
  rows:[['السعودية','9:30'],['مصر','8:30'],['الكويت','9:30'],['الإمارات','10:30'],['قطر','9:30']],
  pScale:100, pX:0, tagScale:100
};
const LAY = {
  '916':{W:1080,H:1920,logo:{x:72,y:252,w:100},chip:{r:952,y:260,h:84},kicker:{r:948,y:394,fs:46,lh:70},
    title:{r:952,y:490,fs:106,lh:150,minL:60,up:26,grow:96},name:{r:952,y:676,h:132},person:{w:1040,x:-54,lift:100,fade:110},
    halo:{x:448,y:1160,r:750},ring:{x:448,y:1070,r:430,r2:560},date:{x:614,y:900,w:330,row:62,maxB:1352},tag:{x:566,y:852},cta:{r:952,y:1376,h:96,orb:68,pad:14,txR:100,fs:40},floor:260},
  'sq':{W:1080,H:1080,logo:{x:56,y:54,w:84},chip:{r:1024,y:56,h:84},kicker:{r:1020,y:156,fs:40,lh:64},
    title:{r:1024,y:230,fs:92,lh:130,minL:56,up:4,grow:56},name:{r:1024,y:366,h:132},person:{w:720,x:-46,lift:0,fade:0},
    halo:{x:300,y:640,r:500},ring:{x:300,y:600,r:300,r2:390},date:{x:694,y:560,w:330,row:52,maxB:952},tag:{x:648,y:512},cta:{r:1024,y:972,h:78,orb:56,pad:11,txR:82,fs:33},floor:160}
};

/* ---------- inputs, set before each frame ---------- */
let S = DEFAULTS, person = null, logo = null;

/* ---------- easing / timing ---------- */
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const E={lin:x=>x, expoOut:x=>x>=1?1:1-Math.pow(2,-10*x), p1Out:x=>1-(1-x)**2, p2Out:x=>1-(1-x)**3, p3Out:x=>1-(1-x)**4,
  p2InOut:x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2, sIn:x=>1-Math.cos(x*Math.PI/2), sOut:x=>Math.sin(x*Math.PI/2),
  sInOut:x=>-(Math.cos(Math.PI*x)-1)/2, back:s=>x=>1+(s+1)*Math.pow(x-1,3)+s*Math.pow(x-1,2)};
const k=(t,st,d,e=E.lin)=>e(clamp((t-st)/d));
function yoyo(t,st,d,rep,e=E.sInOut){ if(t<st) return 0; const ph=(t-st)/d, tot=rep+1; if(ph>=tot) return tot%2?1:0;
  const n=Math.floor(ph), v=e(ph-n); return n%2?1-v:v; }
const lerp=(a,b,p)=>a+(b-a)*p;


/* ---------- themes ---------- */
const THEMES={
 weekly:{bg:['#2a0b49','#170528','#0b0414','#05020a'],bgStripe:'rgba(209,134,248,.06)',
  glowTop:['rgba(153,82,223,.55)','rgba(120,58,188,.20)','rgba(120,58,188,0)'],halo:['rgba(123,47,247,.34)','rgba(120,58,188,.14)','rgba(41,6,69,0)'],
  ringDash:'rgba(209,134,248,.12)',ringShadow:'rgba(153,82,223,.25)',ring:'rgba(209,134,248,.22)',ringLight:'240,215,255',ringLightShadow:'rgba(209,134,248,.3)',
  sweep:'153,82,223',sweepHi:'rgba(230,194,255,.10)',
  slab:['#4a1596','#7b2ff7','#9952df'],face:['#36105c','#1c0731','#0b0412'],faceGlow:['rgba(153,82,223,.40)','rgba(120,58,188,.14)','rgba(120,58,188,0)'],
  faceStripe:'rgba(209,134,248,.08)',faceInner:'123,47,247',cardSweep:.14,cardBorder:'rgba(209,134,248,.34)',cardTop:.13,sheen:0,
  orbBase:'#4a1596',orb:['#e9d0fd','#d6aaf9','#b37bef','#9254e0'],orbShade:'60,10,110',orbRim:.22,orbSpec:0,ink:'#1a0630',
  kicker:'#d186f8',hl:['#e6c2ff','#e6c2ff'],role:'#e6c2ff',soft:'#f3e3ff',divider:['rgba(209,134,248,.15)','rgba(230,194,255,.7)'],
  tagSlab:'#3d1380',tag:['#9a5ae8','#7530e6','#5f22c8'],tagTop:.2,tagBorder:'rgba(230,194,255,.25)',tagShadow:'rgba(40,6,80,.5)',tagSheen:0,
  personGlow:'rgba(153,82,223,.16)',pulse:'230,194,255',dot:'#e6c2ff',dotRGB:'209,134,248',alert:0},
 urgent:{bg:['#3b0a2f','#1e0621','#0e0312','#05020a'],bgStripe:'rgba(255,120,160,.05)',
  glowTop:['rgba(232,36,90,.58)','rgba(168,30,120,.24)','rgba(120,20,90,0)'],halo:['rgba(150,40,210,.34)','rgba(210,30,90,.15)','rgba(60,6,40,0)'],
  ringDash:'rgba(255,140,170,.14)',ringShadow:'rgba(232,36,90,.32)',ring:'rgba(255,130,165,.28)',ringLight:'255,196,214',ringLightShadow:'rgba(255,80,120,.45)',
  sweep:'232,40,95',sweepHi:'rgba(255,205,222,.12)',
  slab:['#a3123d','#e0245e','#8a2be2'],face:['#4b0d3c','#260826','#0e0410'],faceGlow:['rgba(240,50,100,.44)','rgba(150,40,200,.16)','rgba(120,40,180,0)'],
  faceStripe:'rgba(255,140,175,.08)',faceInner:'150,50,225',cardSweep:.26,cardBorder:'rgba(255,135,170,.48)',cardTop:.34,sheen:.12,
  orbBase:'#7a0d2e',orb:['#ffe3ea','#ff8ca7','#e8285e','#9c1550'],orbShade:'90,0,35',orbRim:.38,orbSpec:.8,ink:'#2a0410',
  kicker:'#ff8fa8',hl:['#ff5a7e','#c58bff'],role:'#ffc4d2',soft:'#ffeaf0',divider:['rgba(255,90,130,.18)','rgba(255,175,200,.85)'],
  tagSlab:'#6d0b2a',tag:['#ff6584','#e0245e','#a3123d'],tagTop:.45,tagBorder:'rgba(255,195,210,.4)',tagShadow:'rgba(90,0,30,.55)',tagSheen:.18,
  personGlow:'rgba(232,36,90,.16)',pulse:'255,170,195',dot:'#ff4f6e',dotRGB:'255,79,110',alert:1}
};
let TH=THEMES.weekly;
const themeFor=()=>S.theme==='urgent'?'urgent':'weekly';

/* ---------- drawing helpers ---------- */
const font=(w,s)=>`${w} ${s}px ${FAM}`;
const mctx=document.createElement('canvas').getContext('2d');
function measure(txt,w,s){ mctx.font=font(w,s); mctx.direction='rtl'; return mctx.measureText(txt).width; }
function rr(c,x,y,w,h,r){ r=Math.min(r,w/2,h/2); c.beginPath(); c.roundRect(x,y,w,h,r); }
function stripes(c,x,y,w,h,period,lw,color,shift=0){
  const ax=.866,ay=.5,dx=.5,dy=-.866,L=2*(w+h)+400;
  const pr=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([px,py])=>(px-shift)*ax+py*ay);
  const mn=Math.min(...pr)-period, mx=Math.max(...pr)+period;
  c.strokeStyle=color; c.lineWidth=lw; c.beginPath();
  for(let s=Math.floor(mn/period)*period;s<=mx;s+=period){ const px=ax*s+shift, py=ay*s;
    c.moveTo(px-dx*L,py-dy*L); c.lineTo(px+dx*L,py+dy*L); }
  c.stroke();
}
// text drawn right-aligned at r, centred on cy; p = right-to-left reveal (0..1)
const scratch=document.createElement('canvas'), sctx=scratch.getContext('2d');
function text(c,txt,r,cy,o){
  const {w=400,s=40,color='#fff',p=1,shadow=null,dir='rtl',align='right'}=o; if(p<=0||!txt) return;
  const tw=measure(txt,w,s);
  const paint=(cc,x,y)=>{ cc.font=font(w,s); cc.direction=dir; cc.textAlign=align; cc.textBaseline='middle';
    if(shadow){ cc.shadowColor=shadow[2]; cc.shadowOffsetX=0; cc.shadowOffsetY=shadow[1]; cc.shadowBlur=0; }
    cc.fillStyle=color; cc.fillText(txt,x,y); cc.shadowColor='transparent'; };
  if(p>=1){ c.save(); paint(c,r,cy); c.restore(); return; }
  const pad=24, W=Math.ceil(tw+pad*2), H=Math.ceil(s*2.6);
  if(scratch.width<W) scratch.width=W; if(scratch.height<H) scratch.height=H;
  sctx.setTransform(1,0,0,1,0,0); sctx.globalCompositeOperation='source-over'; sctx.clearRect(0,0,scratch.width,scratch.height);
  const xr=pad+tw; paint(sctx, align==='right'?xr:pad, H/2);
  const a=clamp(p*1.25-.25), b=clamp(p*1.25);
  const g=sctx.createLinearGradient(xr,0,pad,0); g.addColorStop(0,'#000'); g.addColorStop(a,'#000'); g.addColorStop(Math.max(a,b),'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,0)');
  sctx.globalCompositeOperation='destination-in'; sctx.fillStyle=g; sctx.fillRect(0,0,W,H); sctx.globalCompositeOperation='source-over';
  const left = align==='right' ? r-tw-pad : r-pad;
  c.drawImage(scratch,0,0,W,H,left,cy-H/2,W,H);
}
function card(c,x,y,w,h,rad,o={}){
  const {slab=9,sweep=null}=o;
  let g=c.createLinearGradient(x,y,x+w,y+h*.18); g.addColorStop(0,TH.slab[0]); g.addColorStop(.7,TH.slab[1]); g.addColorStop(1,TH.slab[2]);
  rr(c,x,y+slab,w,h,rad); c.fillStyle=g; c.fill();
  c.save(); rr(c,x,y,w,h,rad); c.clip();
  const L=Math.abs(w*.259)+Math.abs(h*.966), cx=x+w/2, cy=y+h/2;
  g=c.createLinearGradient(cx-.259*L/2,cy-.966*L/2,cx+.259*L/2,cy+.966*L/2);
  g.addColorStop(0,TH.face[0]); g.addColorStop(.48,TH.face[1]); g.addColorStop(1,TH.face[2]); c.fillStyle=g; c.fillRect(x,y,w,h);
  c.save(); c.translate(x+w,y); c.scale(1.3*w,1.7*h); g=c.createRadialGradient(0,0,0,0,0,1);
  g.addColorStop(0,TH.faceGlow[0]); g.addColorStop(.38,TH.faceGlow[1]); g.addColorStop(.62,TH.faceGlow[2]);
  c.fillStyle=g; c.fillRect(-1,0,1,1); c.restore();
  stripes(c,x,y,w,h,18,1.5,TH.faceStripe,x);
  g=c.createLinearGradient(0,y+h-30,0,y+h); g.addColorStop(0,`rgba(${TH.faceInner},0)`); g.addColorStop(1,`rgba(${TH.faceInner},.18)`); c.fillStyle=g; c.fillRect(x,y+h-30,w,30);
  if(TH.sheen){ g=c.createLinearGradient(0,y,0,y+h*.55); g.addColorStop(0,`rgba(255,255,255,${TH.sheen})`); g.addColorStop(.7,`rgba(255,255,255,${TH.sheen*.25})`); g.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=g; c.fillRect(x,y,w,h*.55); }
  if(sweep!==null){ const sx=x+sweep, t=.364, top=y-40, bot=y+h+40, mid=(top+bot)/2;
    g=c.createLinearGradient(sx,0,sx+170,0); g.addColorStop(0,'rgba(255,225,235,0)'); g.addColorStop(.5,`rgba(255,225,235,${TH.cardSweep})`); g.addColorStop(1,'rgba(255,225,235,0)');
    c.fillStyle=g; c.beginPath(); c.moveTo(sx+t*(mid-top),top); c.lineTo(sx+170+t*(mid-top),top); c.lineTo(sx+170-t*(bot-mid),bot); c.lineTo(sx-t*(bot-mid),bot); c.closePath();
    c.save(); c.translate(0,0); c.fill(); c.restore(); }
  c.fillStyle=`rgba(255,255,255,${TH.cardTop})`; c.fillRect(x,y,w,1.5);
  c.restore();
  rr(c,x+.75,y+.75,w-1.5,h-1.5,rad-.75); c.strokeStyle=TH.cardBorder; c.lineWidth=1.5; c.stroke();
}
function orb(c,cx,cy,d){
  const r=d/2; c.fillStyle=TH.orbBase; c.beginPath(); c.arc(cx,cy+5*d/84,r,0,7); c.fill();
  const gx=cx-r+.72*r, gy=cy-r+.6*r, g=c.createRadialGradient(gx,gy,0,gx,gy,1.9*r);
  g.addColorStop(0,TH.orb[0]); g.addColorStop(.34,TH.orb[1]); g.addColorStop(.7,TH.orb[2]); g.addColorStop(1,TH.orb[3]);
  c.fillStyle=g; c.beginPath(); c.arc(cx,cy,r,0,7); c.fill();
  c.save(); c.beginPath(); c.arc(cx,cy,r,0,7); c.clip(); const g2=c.createLinearGradient(0,cy,0,cy+r);
  g2.addColorStop(0,`rgba(${TH.orbShade},0)`); g2.addColorStop(1,`rgba(${TH.orbShade},.3)`); c.fillStyle=g2; c.fillRect(cx-r,cy,d,r); c.restore();
  c.strokeStyle=`rgba(255,255,255,${TH.orbRim})`; c.lineWidth=1.5; c.beginPath(); c.arc(cx,cy,r-.75,0,7); c.stroke();
  if(TH.orbSpec){ const sg=c.createLinearGradient(0,cy-r*.9,0,cy-r*.05); sg.addColorStop(0,`rgba(255,255,255,${TH.orbSpec})`); sg.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=sg; c.beginPath(); c.ellipse(cx-r*.08,cy-r*.48,r*.62,r*.36,0,0,7); c.fill(); }
}
const MIC=new Path2D('M27 40a15 15 0 0 0 30 0M42 55v9M35 64h14');
function micIcon(c,cx,cy,d){ c.save(); c.translate(cx-d/2,cy-d/2); c.scale(d/84,d/84); c.strokeStyle=TH.ink; c.lineWidth=4.2; c.lineCap='round'; c.lineJoin='round';
  c.beginPath(); c.roundRect(34,20,16,28,8); c.stroke(); c.stroke(MIC); c.restore(); }
const BUBBLE=new Path2D('M24 22h36a10 10 0 0 1 10 10v18a10 10 0 0 1-10 10H42l-13 11v-11h-5a10 10 0 0 1-10-10V32a10 10 0 0 1 10-10z');
function bubbleIcon(c,cx,cy,d){ c.save(); c.translate(cx-d/2,cy-d/2); c.scale(d/84,d/84); c.strokeStyle=TH.ink; c.fillStyle=TH.ink; c.lineWidth=4.2; c.lineJoin='round';
  c.stroke(BUBBLE); [32,42,52].forEach(x=>{ c.beginPath(); c.arc(x,41,3.6,0,7); c.fill(); }); c.restore(); }
function clockIcon(c,cx,cy,d,mA,hA){ c.save(); c.translate(cx-d/2,cy-d/2); c.scale(d/70,d/70); c.strokeStyle=TH.ink; c.lineWidth=3.8; c.lineCap='round';
  c.beginPath(); c.arc(35,35,17,0,7); c.stroke();
  const hand=(len,ang0,rot)=>{ const a=(ang0+rot)*Math.PI/180; c.beginPath(); c.moveTo(35,35); c.lineTo(35+len*Math.cos(a),35+len*Math.sin(a)); c.stroke(); };
  hand(10,-90,hA); hand(9,0,mA); c.restore(); }

/* ---------- person cache (scaled + bottom fade) ---------- */
let pc=null, pcKey='';
function personCanvas(L){
  const iw=person.naturalWidth||1, ih=person.naturalHeight||1, pw=Math.round(L.person.w*S.pScale/100), ph=Math.round(pw*ih/iw);
  const key=[person.src.length,person.src.slice(-40),pw,L.person.fade].join('|'); if(pc&&pcKey===key) return pc;
  const cv=document.createElement('canvas'); cv.width=pw; cv.height=ph; const c=cv.getContext('2d');
  c.imageSmoothingQuality='high'; c.drawImage(person,0,0,pw,ph);
  if(L.person.fade){ const g=c.createLinearGradient(0,0,0,ph); g.addColorStop(0,'#000'); g.addColorStop(clamp((ph-L.person.fade)/ph),'#000'); g.addColorStop(1,'rgba(0,0,0,0)');
    c.globalCompositeOperation='destination-in'; c.fillStyle=g; c.fillRect(0,0,pw,ph); c.globalCompositeOperation='source-over'; }
  pc=cv; pcKey=key; return cv;
}

/* ---------- title layout: Enter = new line, long titles split into two balanced lines ---------- */
function titleLayout(L){
  const T=L.title, avail=T.r-T.minL;
  let idx=0; const manual=S.title.replace(/\r/g,'').split('\n').map(l=>l.trim().split(/\s+/).filter(Boolean)).filter(l=>l.length).map(ws=>ws.map(w=>({w,i:idx++})));
  const width=(ws,fs)=>ws.reduce((a,o)=>a+measure(o.w,700,fs),0)+measure(' ',700,fs)*Math.max(0,ws.length-1);
  let lines=manual;
  if(manual.length===1&&manual[0].length>1&&width(manual[0],T.fs*.8)>avail){
    const ws=manual[0]; let best=null;
    for(let k=1;k<ws.length;k++){ const m=Math.max(width(ws.slice(0,k),100),width(ws.slice(k),100)); if(!best||m<best.m) best={k,m}; }
    lines=[ws.slice(0,best.k),ws.slice(best.k)];
  }
  const n=Math.max(1,lines.length), pitchR=1.22, lhR=T.lh/T.fs;
  let fs=T.fs; const widest=Math.max(1,...lines.map(l=>width(l,T.fs))); if(widest>avail) fs*=avail/widest;
  if(n>1) fs=Math.min(fs,(T.lh+T.grow)/((n-1)*pitchR+lhR));
  const h=(n-1)*pitchR*fs+lhR*fs, extra=Math.max(0,h-T.lh), up=Math.min(extra,T.up);
  return {lines,fs,pitch:pitchR*fs,lh:lhR*fs,y:T.y-up,up,down:extra-up,count:idx};
}

/* ---------- frame ---------- */
function render(c,fmt,t){
  const L=LAY[fmt], W=L.W, H=L.H; TH=THEMES[themeFor()];
  c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
  // background
  let g=c.createLinearGradient(W*.59,0,W*.41,H); g.addColorStop(0,TH.bg[0]); g.addColorStop(.38,TH.bg[1]); g.addColorStop(.7,TH.bg[2]); g.addColorStop(1,TH.bg[3]);
  c.fillStyle=g; c.fillRect(0,0,W,H);
  stripes(c,0,0,W,H,26,2,TH.bgStripe,-140*t/DUR);
  { const p=k(t,0,1.4,E.sOut), r=650*lerp(.8,1,p); c.globalAlpha=p*(TH.alert?lerp(1,.62,yoyo(t,1.2,.9,6)):1); g=c.createRadialGradient(W+380-650,-420+650,0,W+380-650,-420+650,r);
    g.addColorStop(0,TH.glowTop[0]); g.addColorStop(.4,TH.glowTop[1]); g.addColorStop(.68,TH.glowTop[2]); c.fillStyle=g; c.fillRect(0,0,W,H); c.globalAlpha=1; }
  { const p=k(t,.25,1.2,E.expoOut), y=yoyo(t,1.45,1.6,3), sc=lerp(.6,1,p)*lerp(1,1.06,y), r=L.halo.r*sc;
    c.globalAlpha=p*lerp(1,.85,y); g=c.createRadialGradient(L.halo.x,L.halo.y,0,L.halo.x,L.halo.y,r);
    g.addColorStop(0,TH.halo[0]); g.addColorStop(.3,TH.halo[1]); g.addColorStop(.6,TH.halo[2]); c.fillStyle=g; c.fillRect(0,0,W,H); c.globalAlpha=1; }
  const R=L.ring;
  { const p=k(t,.5,1.2,E.expoOut), sc=lerp(.75,1,p); c.save(); c.globalAlpha=p; c.translate(R.x,R.y); c.rotate((40*t/DUR)*Math.PI/180);
    c.setLineDash([6,6]); c.strokeStyle=TH.ringDash; c.lineWidth=1.5; c.beginPath(); c.arc(0,0,R.r2*sc,0,7); c.stroke(); c.restore(); }
  { const p=k(t,.4,1.1,E.expoOut), y=yoyo(t,1.5,1.3,3), sc=lerp(.7,1,p); c.save(); c.globalAlpha=p*lerp(1,.75,y);
    c.shadowColor=TH.ringShadow; c.shadowBlur=60; c.strokeStyle=TH.ring; c.lineWidth=2; c.beginPath(); c.arc(R.x,R.y,(R.r-1)*sc,0,7); c.stroke(); c.restore(); }
  { const a=k(t,.7,1,E.sOut)*.7; if(a>0){ const rot=(-40+360*t/DUR)*Math.PI/180; c.save(); c.globalAlpha=a;
      g=c.createConicGradient(rot-Math.PI/2,R.x,R.y); g.addColorStop(0,`rgba(${TH.ringLight},0)`); g.addColorStop(250/360,`rgba(${TH.ringLight},0)`);
      g.addColorStop(300/360,`rgba(${TH.ringLight},.06)`); g.addColorStop(352/360,`rgba(${TH.ringLight},.34)`); g.addColorStop(1,`rgba(${TH.ringLight},0)`);
      c.shadowColor=TH.ringLightShadow; c.shadowBlur=5; c.strokeStyle=g; c.lineWidth=4; c.beginPath(); c.arc(R.x,R.y,R.r+1,0,7); c.stroke(); c.restore(); } }
  { const p=k(t,.3,3.2,E.sInOut), op=t<1.9?k(t,.3,1,E.sOut):1-k(t,1.9,1.6,E.sIn); if(op>0){
      const ew=W*1.6, shift=lerp(-.55,.55,p)*ew, ang=20*Math.PI/180, cx=W/2+shift, cy=H/2, hl=ew/2;
      const x0=cx-Math.cos(ang)*hl, y0=cy-Math.sin(ang)*hl, x1=cx+Math.cos(ang)*hl, y1=cy+Math.sin(ang)*hl;
      g=c.createLinearGradient(x0,y0,x1,y1); g.addColorStop(0,`rgba(${TH.sweep},0)`); g.addColorStop(.40,`rgba(${TH.sweep},0)`); g.addColorStop(.48,`rgba(${TH.sweep},.22)`);
      g.addColorStop(.5,TH.sweepHi); g.addColorStop(.52,`rgba(${TH.sweep},.22)`); g.addColorStop(.6,`rgba(${TH.sweep},0)`); g.addColorStop(1,`rgba(${TH.sweep},0)`);
      c.save(); c.globalAlpha=op; c.globalCompositeOperation='screen'; c.fillStyle=g; c.fillRect(0,0,W,H); c.restore(); } }

  // logo
  { const p=k(t,.15,.6,E.back(2)), a=clamp(k(t,.15,.6,E.p2Out)*1.4); const lw=L.logo.w, lh=lw*(logo.naturalHeight||83)/(logo.naturalWidth||89);
    if(a>0&&logo.complete){ c.save(); c.globalAlpha=a; c.translate(L.logo.x+lw/2,L.logo.y+lh/2); c.scale(lerp(.6,1,p),lerp(.6,1,p)); c.drawImage(logo,-lw/2,-lh/2,lw,lh); c.restore(); } }

  // chip
  { const C=L.chip, ts=38, txtW=measure(S.chip,600,ts), cw=txtW+66+40, x=C.r-cw, sc=k(t,.25,.45,E.back(1.8));
    if(sc>0.001){ c.save(); c.translate(C.r,C.y+C.h/2); c.scale(sc,sc); c.translate(-C.r,-(C.y+C.h/2));
      const sw=k(t,4.3,.7,E.p2InOut); card(c,x,C.y,cw,C.h,42,{slab:6,sweep:t>=4.3&&sw<1?lerp(-260,420,sw):null});
      const redDot=TH.alert||/طوار/.test(S.chip), dotRGB=redDot?'255,79,110':TH.dotRGB;
      const dx=C.r-41, dy=C.y+42; if(t>=.6){ const ph=(t-.6), f=ph>=7?1:E.sOut(ph%1);
        c.fillStyle=`rgba(${dotRGB},${.6*(1-f)})`; c.beginPath(); c.arc(dx,dy,11+16*f,0,7); c.fill(); }
      c.save(); c.shadowColor=`rgba(${dotRGB},.9)`; c.shadowBlur=18; c.fillStyle=redDot?'#ff4f6e':TH.dot; c.beginPath(); c.arc(dx,dy,11,0,7); c.fill(); c.restore();
      text(c,S.chip,C.r-66,C.y+42,{w:600,s:ts,p:k(t,.5,.5)});
      c.restore(); } }

  const TL=titleLayout(L);
  // kicker
  { const K=L.kicker, maxW=K.r-L.title.minL; let fs=K.fs; const w0=measure(S.kicker,500,fs); if(w0>maxW) fs*=maxW/w0;
    text(c,S.kicker,K.r,K.y-TL.up+K.lh/2,{w:500,s:fs,color:TH.kicker,p:k(t,1,.55)}); }

  // title (words rise from a mask, line by line)
  { const fs=TL.fs, lh=TL.lh, sp=measure(' ',700,fs), stg=Math.min(.2,.9/Math.max(1,TL.count-1));
    TL.lines.forEach((ws,li)=>{ const top=TL.y+li*TL.pitch, cy=top+lh/2; let xr=L.title.r;
      ws.forEach(({w,i})=>{ const ww=measure(w,700,fs), p=k(t,1.3+stg*i,.6,E.expoOut);
        if(p>0){ c.save(); c.beginPath(); c.rect(xr-ww-fs*.12,top-fs*.1,ww+fs*.24,lh+fs*.16); c.clip();
          let fill='#ffffff'; if(S.hl.includes(i)){ fill=c.createLinearGradient(xr,0,xr-ww,0); fill.addColorStop(0,TH.hl[0]); fill.addColorStop(1,TH.hl[1]); }
          text(c,w,xr,cy+(1-p)*1.35*fs*1.45,{w:700,s:fs,color:fill,shadow:[0,4*fs/106,'rgba(11,4,18,.55)']}); c.restore(); }
        xr-=ww+sp; }); }); }

  // name card
  { const N=L.name, n1s=44, n2s=30, NW=Math.max(measure(S.name,700,n1s),measure(S.role,400,n2s))+130+44;
    const wp=k(t,2.15,.45,E.p3Out), w=lerp(132,NW,wp), fy=-4*yoyo(t,3.9,1.4,1), y=N.y+fy+TL.down, op=wp;
    if(op>0){ c.save(); c.globalAlpha=op; const sw=k(t,3,.8,E.p2InOut);
      c.save(); rr(c,N.r-w-2,y-2,w+4,N.h+14,30); c.clip(); card(c,N.r-w,y,w,N.h,30,{sweep:t>=3&&sw<1?lerp(-260,NW+60,sw):null});
      text(c,S.name,N.r-130,y+18+28,{w:700,s:n1s,p:k(t,2.4,.45),shadow:[0,2,'rgba(11,4,18,.55)']});
      text(c,S.role,N.r-130,y+72+20,{w:400,s:n2s,color:TH.role,p:k(t,2.6,.4)}); c.restore(); c.restore(); }
    const os=k(t,2.05,.4,E.back(2)); if(os>0){ const cx=N.r-24-42, cy=y+24+42; c.save(); c.translate(cx,cy); c.scale(os,os); orb(c,0,0,84); micIcon(c,0,0,84); c.restore(); } }

  // person
  { const P=L.person, pcv=personCanvas(L), pw=pcv.width, ph=pcv.height, x=P.x+S.pX+(P.w-pw)/2, y=H-ph+6-P.lift;
    const p=k(t,.45,1,E.back(1.05)), a=clamp(k(t,.45,1,E.p2Out)*1.3), sc=lerp(.96,1,p)*lerp(1,1.015,yoyo(t,1.6,2.6,1)), dy=lerp(120,0,p);
    if(a>0){ c.save(); c.globalAlpha=a; c.translate(x+pw/2,y+ph+dy); c.scale(sc,sc); c.shadowColor=TH.personGlow; c.shadowBlur=10;
      c.drawImage(pcv,-pw/2,-ph); c.restore(); } }
  g=c.createLinearGradient(0,H-L.floor,0,H); g.addColorStop(0,'rgba(5,2,10,0)'); g.addColorStop(1,'rgba(5,2,10,.55)'); c.fillStyle=g; c.fillRect(0,H-L.floor,W,L.floor);

  // timings card
  { const D=L.date, n=Math.max(1,S.rows.length), Dy=D.y+TL.down; let row=D.row; const hOf=r=>110+n*r+18; while(Dy+hOf(row)>D.maxB&&row>40) row--;
    const h=hOf(row), fl=-8*yoyo(t,4.3,1.1,1), x=D.x, y=Dy+fl, w=D.w, sc=k(t,2.75,.55,E.back(1.7));
    if(sc>0.001){ c.save(); const ox=x+w*.85, oy=y+h*.3; c.translate(ox,oy); c.scale(sc,sc); c.translate(-ox,-oy);
      const sw=k(t,4.15,.9,E.p2InOut); card(c,x,y,w,h,30,{sweep:t>=4.15&&sw<1?lerp(-260,480,sw):null});
      let hs=42; const hw=measure(S.tHead,700,hs), hmax=w-94-24; if(hw>hmax) hs*=hmax/hw;
      text(c,S.tHead,x+w-94,y+48,{w:700,s:hs,p:k(t,2.95,.45)});
      const dv=k(t,3.05,.5,E.p2Out); if(dv>0){ const dw=(w-48)*dv; g=c.createLinearGradient(x+24,0,x+w-24,0);
        g.addColorStop(0,TH.divider[0]); g.addColorStop(.5,TH.divider[1]); g.addColorStop(1,TH.divider[0]); c.fillStyle=g; c.fillRect(x+w-24-dw,y+98,dw,2); }
      S.rows.forEach(([cty,tm],i)=>{ const t0=3.15+.13*i, cy=y+110+i*row+row/2; const rs=Math.min(1,row/D.row); let cs=33*rs, ts=40*rs;
        const label=cty?cty+':':''; const cw=measure(label,400,cs), twd=measure(tm,700,ts), room=w-46-30-14;
        if(cw+twd>room){ const f=room/(cw+twd); cs*=f; ts*=f; }
        text(c,label,x+w-30,cy,{w:400,s:cs,color:TH.soft,p:k(t,t0,.35)});
        const tp=k(t,t0+.12,.35,E.back(2)), ta=clamp(k(t,t0+.12,.35,E.p2Out)*1.2);
        if(ta>0){ c.save(); c.globalAlpha=ta; text(c,tm,x+46+lerp(-24,0,tp),cy,{w:700,s:ts,dir:'ltr',align:'left',shadow:[0,2,'rgba(11,4,18,.55)']}); c.restore(); } });
      const ocx=x+w-22-29, ocy=y+20+29; c.save(); c.translate(ocx,ocy); c.rotate(lerp(-90,0,k(t,2.85,.6,E.back(2)))*Math.PI/180);
      orb(c,0,0,58); const hp=k(t,2.9,1.1,E.p3Out); clockIcon(c,0,0,58,450*hp,285*hp); c.restore();
      c.restore(); }
    // tag (day + date)
    const tp=k(t,3.85,.4,E.p3Out); if(tp>0.001){ const T=L.tag, ds=44, dts=44, dayW=measure(S.day,700,ds), dateW=S.date?measure(S.date,600,dts):0, gap=S.date?14:0;
      const tw=26+dayW+gap+dateW+26, th=72, tx=T.x, ty=T.y+fl+TL.down, cx=tx+tw/2, cy=ty+th/2;
      c.save(); c.globalAlpha=tp; const tsc=(S.tagScale??100)/100; c.translate(cx,ty+th); c.scale(tsc,tsc); c.translate(-cx,-(ty+th)); // size grows up from the bottom edge, off the times card
      c.translate(cx,cy); c.rotate(-6*Math.PI/180); c.scale(Math.max(.02,Math.cos((88*(1-tp))*Math.PI/180)),1); c.translate(-cx,-cy);
      rr(c,tx,ty+7,tw,th,16); c.fillStyle=TH.tagSlab; c.fill();
      const L2=tw+th; g=c.createLinearGradient(tx,ty,tx+tw,ty+th); g.addColorStop(0,TH.tag[0]); g.addColorStop(.55,TH.tag[1]); g.addColorStop(1,TH.tag[2]);
      rr(c,tx,ty,tw,th,16); c.fillStyle=g; c.fill();
      c.save(); rr(c,tx,ty,tw,th,16); c.clip(); c.fillStyle=`rgba(255,255,255,${TH.tagTop})`; c.fillRect(tx,ty,tw,1.5);
      if(TH.tagSheen){ const sg=c.createLinearGradient(0,ty,0,ty+th*.5); sg.addColorStop(0,`rgba(255,255,255,${TH.tagSheen})`); sg.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=sg; c.fillRect(tx,ty,tw,th*.5); }
      c.restore();
      rr(c,tx+.75,ty+.75,tw-1.5,th-1.5,15); c.strokeStyle=TH.tagBorder; c.lineWidth=1.5; c.stroke();
      text(c,S.day,tx+tw-26,cy-2,{w:700,s:ds,shadow:[0,2,TH.tagShadow]});
      if(S.date) text(c,S.date,tx+26,cy-2,{w:600,s:dts,color:TH.soft,dir:'ltr',align:'left',shadow:[0,2,TH.tagShadow]});
      c.restore(); } }

  // CTA: orb pops, card grows to the left, text reveals, then a soft nudge
  { const C=L.cta, txt=(S.cta||'').trim(); if(txt){
    let fs=C.fs, tw=measure(txt,700,fs); const maxTW=C.r-60-C.txR-34; if(tw>maxTW){ fs*=maxTW/tw; tw=maxTW; }
    const CW=tw+C.txR+34, wp=k(t,5.1,.5,E.p3Out), w=lerp(C.h,CW,wp);
    if(wp>0){ c.save(); c.globalAlpha=wp; const sw=k(t,6,.8,E.p2InOut);
      card(c,C.r-w,C.y,w,C.h,30,{sweep:t>=6&&sw<1?lerp(-260,CW+60,sw):null});
      c.save(); rr(c,C.r-w,C.y,w,C.h,30); c.clip(); text(c,txt,C.r-C.txR,C.y+C.h/2,{w:700,s:fs,p:k(t,5.35,.55),shadow:[0,2,'rgba(11,4,18,.55)']}); c.restore();
      c.restore(); }
    const ocx=C.r-C.pad-C.orb/2, ocy=C.y+C.pad+C.orb/2;
    if(t>=5.6&&t<7.6){ const f=(t-5.6)%1, a=f<.5?f/.5:(1-f)/.5, sc=1+.7*E.sOut(f);
      c.strokeStyle=`rgba(${TH.pulse},${(.7*.9*a).toFixed(3)})`; c.lineWidth=2; c.beginPath(); c.arc(ocx,ocy,C.orb/2*sc,0,7); c.stroke(); }
    const os=k(t,5,.45,E.back(2.2)); if(os>0){ const rot=lerp(-30,0,clamp(os))-10*yoyo(t,6.3,.18,5);
      c.save(); c.translate(ocx,ocy); c.rotate(rot*Math.PI/180); c.scale(os,os); orb(c,0,0,C.orb); bubbleIcon(c,0,0,C.orb); c.restore(); } } }

  // vignette + fade-in from black
  c.save(); c.translate(W/2,H*.45); c.scale(1.3*W,.8*H); g=c.createRadialGradient(0,0,0,0,0,1);
  g.addColorStop(0,'rgba(3,1,8,0)'); g.addColorStop(.55,'rgba(3,1,8,0)'); g.addColorStop(1,'rgba(3,1,8,.65)'); c.fillStyle=g; c.fillRect(-.5/1.3,-.45/.8,1/1.3,1/.8); c.restore();
  const fa=1-k(t,0,.35,E.p1Out); if(fa>0){ c.fillStyle=`rgba(0,0,0,${fa})`; c.fillRect(0,0,W,H); }
}

export { DUR, FPS, LAY, DEFAULTS };

/** Draws the ad at time t (seconds) for a format ('916' or 'sq'). */
export function drawFrame(c, fmt, t, state, images) {
  S = state; person = images.person; logo = images.logo;
  render(c, fmt, t);
}
