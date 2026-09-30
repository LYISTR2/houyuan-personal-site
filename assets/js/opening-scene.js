/* Procedural night garden adapted from the user-supplied backyard-garden.html.
 * Renderer: Three.js r128 (MIT), hosted locally in assets/vendor. */
(function(root){
'use strict';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const ss=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function create(canvas){
/* ---------- renderer ---------- */
if(!root.THREE)return null;
var renderer;
try { renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,powerPreference:'low-power'}); }
catch(e) { return null; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,innerWidth<720?1.25:1.5));
renderer.setSize(innerWidth,innerHeight,false);
var scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1613);
scene.fog = new THREE.FogExp2(0x0a1613, 0.048);
var camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 120);
scene.add(camera);

/* ---------- procedural textures ---------- */
var maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
function cv(w,h){ var c=document.createElement('canvas'); c.width=w; c.height=h; return [c, c.getContext('2d')]; }
function tex(c){ var t=new THREE.CanvasTexture(c); t.anisotropy=maxAniso; return t; }

function makeGlow(){
  var a=cv(256,256), g=a[1], gr=g.createRadialGradient(128,128,0,128,128,128);
  gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.2,'rgba(255,255,255,.6)');
  gr.addColorStop(.5,'rgba(255,255,255,.16)'); gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr; g.fillRect(0,0,256,256); return tex(a[0]);
}
/* the halo ring: soft gilded band + fine tick marks like a sundial */
function makeRing(){
  var a=cv(512,512), g=a[1], cx=256;
  var gr=g.createRadialGradient(cx,cx,0,cx,cx,256);
  gr.addColorStop(0,'rgba(255,255,255,.10)'); gr.addColorStop(.7,'rgba(255,255,255,.05)');
  gr.addColorStop(.78,'rgba(255,255,255,.55)'); gr.addColorStop(.8,'rgba(255,255,255,.95)');
  gr.addColorStop(.84,'rgba(255,255,255,.3)'); gr.addColorStop(.92,'rgba(255,255,255,.06)');
  gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr; g.fillRect(0,0,512,512);
  g.strokeStyle='rgba(255,255,255,.5)'; g.lineWidth=1.5; g.beginPath(); g.arc(cx,cx,256*.7,0,Math.PI*2); g.stroke();
  for(var i=0;i<72;i++){
    var an=i/72*Math.PI*2, r0=256*.86, r1=256*(i%6===0?.915:.885);
    g.lineWidth = i%6===0 ? 2 : 1; g.strokeStyle='rgba(255,255,255,'+(i%6===0?.75:.4)+')';
    g.beginPath(); g.moveTo(cx+Math.cos(an)*r0, cx+Math.sin(an)*r0); g.lineTo(cx+Math.cos(an)*r1, cx+Math.sin(an)*r1); g.stroke();
  }
  return tex(a[0]);
}
function makeLeaf(base,hi,lo){
  var a=cv(256,256), g=a[1];
  g.beginPath(); g.moveTo(128,252); g.bezierCurveTo(4,196,2,66,128,4); g.bezierCurveTo(254,66,252,196,128,252); g.closePath();
  var gr=g.createLinearGradient(0,252,0,4); gr.addColorStop(0,lo); gr.addColorStop(1,base);
  g.fillStyle=gr; g.fill();
  g.save(); g.clip();
  g.strokeStyle=hi; g.globalAlpha=.55; g.lineWidth=2; g.beginPath(); g.moveTo(128,252); g.lineTo(128,8); g.stroke();
  g.lineWidth=1.2; g.globalAlpha=.3;
  for(var i=1;i<9;i++){
    var y=246-i*26, dx=90-i*5;
    g.beginPath(); g.moveTo(128,y); g.quadraticCurveTo(128+dx*.5,y-16,128+dx,y-38); g.stroke();
    g.beginPath(); g.moveTo(128,y); g.quadraticCurveTo(128-dx*.5,y-16,128-dx,y-38); g.stroke();
  }
  g.restore(); return tex(a[0]);
}
function makeFern(){
  var a=cv(256,512), g=a[1];
  g.strokeStyle='#3f7a4c'; g.lineWidth=3; g.beginPath(); g.moveTo(128,510); g.lineTo(128,10); g.stroke();
  var n=22;
  for(var i=0;i<n;i++){
    var t=i/n, y=490-t*450, L=(1-t*.8)*104+14, wd=(1-t*.55)*9+2.2;
    [1,-1].forEach(function(s){
      g.save(); g.translate(128,y); g.rotate(s>0?-.95:Math.PI+.95);
      g.beginPath(); g.ellipse(L/2,0,L/2,wd,0,0,Math.PI*2);
      g.fillStyle='hsl('+(128+t*10)+','+(42+t*8)+'%,'+(26+t*22)+'%)'; g.fill(); g.restore();
    });
  }
  g.beginPath(); g.ellipse(128,26,6,22,0,0,Math.PI*2); g.fillStyle='#7fbf7f'; g.fill();
  return tex(a[0]);
}
function makeGrass(){
  var a=cv(256,256), g=a[1];
  for(var i=0;i<11;i++){
    var x=20+i*21+Math.sin(i*7.1)*6, h=110+(i%4)*34+Math.sin(i*3.3)*18, lean=(i-5)*9+Math.sin(i*5.3)*14;
    g.beginPath(); g.moveTo(x-5,254); g.quadraticCurveTo(x+lean*.3,254-h*.55,x+lean,254-h);
    g.quadraticCurveTo(x+lean*.3+4,254-h*.5,x+5,254); g.closePath();
    var gr=g.createLinearGradient(0,254,0,254-h); gr.addColorStop(0,'#2e5a3a'); gr.addColorStop(1,'#9ccf7c');
    g.fillStyle=gr; g.fill();
  }
  return tex(a[0]);
}
function makeGround(){
  var a=cv(512,512), g=a[1], r=mulberry(9);
  g.fillStyle='#132a20'; g.fillRect(0,0,512,512);
  for(var i=0;i<1600;i++){
    var x=r()*512, y=r()*512, s=1+r()*6;
    g.fillStyle='rgba('+(20+r()*40|0)+','+(50+r()*60|0)+','+(35+r()*30|0)+','+(.06+r()*.12)+')';
    g.beginPath(); g.arc(x,y,s,0,7); g.fill();
  }
  var t=tex(a[0]); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(16,16); return t;
}

var glowTex = makeGlow(), ringTex = makeRing();

/* ---------- geometry helpers ---------- */
function bentLeaf(w,h,bend,cup){
  var g=new THREE.PlaneGeometry(w,h,2,6); g.translate(0,h/2,0);
  var p=g.attributes.position;
  for(var i=0;i<p.count;i++){
    var y=p.getY(i)/h, x=p.getX(i)/(w/2);
    p.setZ(i, p.getZ(i) + bend*y*y*h + (cup||0)*x*x*w*.25);
    p.setY(i, p.getY(i) - bend*bend*y*y*h*.25);
  }
  g.computeVertexNormals(); return g;
}
function merge(list){
  var vc=0, ic=0;
  list.forEach(function(g){ vc+=g.attributes.position.count; ic+=g.index.count; });
  var P=new Float32Array(vc*3), N=new Float32Array(vc*3), U=new Float32Array(vc*2), I=new Uint32Array(ic), vo=0, io=0;
  list.forEach(function(g){
    P.set(g.attributes.position.array, vo*3); N.set(g.attributes.normal.array, vo*3); U.set(g.attributes.uv.array, vo*2);
    var ix=g.index.array; for(var i=0;i<ix.length;i++) I[io+i]=ix[i]+vo;
    vo+=g.attributes.position.count; io+=ix.length; g.dispose();
  });
  var out=new THREE.BufferGeometry();
  out.setAttribute('position',new THREE.BufferAttribute(P,3));
  out.setAttribute('normal',new THREE.BufferAttribute(N,3));
  out.setAttribute('uv',new THREE.BufferAttribute(U,2));
  out.setIndex(new THREE.BufferAttribute(I,1)); return out;
}
function clusterGeo(o,seed){
  var rand=mulberry(seed), parts=[], m=new THREE.Matrix4(), q=new THREE.Quaternion(), e=new THREE.Euler(), s=new THREE.Vector3(1,1,1), p=new THREE.Vector3();
  for(var i=0;i<o.n;i++){
    var k=.75+rand()*.5;
    var g=bentLeaf(o.w*k, o.h*k*(.85+rand()*.3), o.bend*(.7+rand()*.6), o.cup);
    var ry=(i/o.n)*Math.PI*2+rand()*.6, tilt=o.tmin+rand()*(o.tmax-o.tmin);
    e.set(tilt,ry,0,'YXZ'); q.setFromEuler(e);
    p.set(Math.sin(ry)*o.spread,0,Math.cos(ry)*o.spread);
    m.compose(p,q,s); g.applyMatrix4(m); parts.push(g);
  }
  return merge(parts);
}
function phong(map,color){
  return new THREE.MeshPhongMaterial({map:map,color:color,alphaTest:.45,side:THREE.DoubleSide,shininess:10,specular:0x2a4a33});
}

var leafTexA = makeLeaf('#79c47a','#d6f0b8','#2a6a44');
var leafTexB = makeLeaf('#6fb0a6','#cfeee6','#245a55');
var leafTexC = makeLeaf('#9bd06a','#e8f8b8','#3c7a3a');
var TYPES = {
  fern :{mat:phong(makeFern(),0xd8f0d0),  o:{w:1.05,h:1.9,bend:.6,cup:0,n:13,tmin:.35,tmax:1.15,spread:.05}},
  hosta:{mat:phong(leafTexB,0xffffff),    o:{w:1.0,h:1.35,bend:.45,cup:.35,n:9,tmin:.3,tmax:.95,spread:.12}},
  grass:{mat:phong(makeGrass(),0xffffff), o:{w:.7,h:.75,bend:.25,cup:0,n:6,tmin:.05,tmax:.55,spread:.05}},
  herb :{mat:phong(leafTexC,0xffffff),    o:{w:.34,h:.44,bend:.3,cup:.2,n:11,tmin:.15,tmax:.95,spread:.08}}
};
Object.keys(TYPES).forEach(function(k,i){
  var t=TYPES[k]; t.geos=[0,1,2].map(function(v){ return clusterGeo(t.o, 100+i*10+v); });
});
var sways=[];
function plant(type,x,z,s,ry,variant,swayAmp){
  var t=TYPES[type], m=new THREE.Mesh(t.geos[(variant||0)%3], t.mat);
  m.position.set(x,0,z); m.scale.setScalar(s); m.rotation.y=ry;
  sways.push({m:m, ph:Math.random()*6.28, a:swayAmp||.03});
  return m;
}

/* ---------- lights ---------- */
var ambient = new THREE.AmbientLight(0x27443a, 1.05); scene.add(ambient);
var hemi = new THREE.HemisphereLight(0x6f8f88, 0x0a1613, .25); scene.add(hemi);
var lantern = new THREE.PointLight(0xffd7a0, .9, 9, 1.4); lantern.position.set(0.15,-.1,-.6); camera.add(lantern);

/* ---------- the path ---------- */
var pts = [[0,1.55,10],[0,1.5,4],[1.2,1.45,-2],[-.8,1.4,-9],[1.4,1.4,-16],[-1,1.4,-23],[.6,1.45,-30],[0,1.6,-37]]
  .map(function(a){ return new THREE.Vector3(a[0],a[1],a[2]); });
var curve = new THREE.CatmullRomCurve3(pts,false,'centripetal');
var LEN = curve.getLength();
function pathAt(u){ return curve.getPointAt(clamp(u,0,1)); }
function tanAt(u){ return curve.getTangentAt(clamp(u,0,1)); }
function sideOf(t){ return new THREE.Vector3(-t.z,0,t.x).normalize(); }

/* ground + stepping stones */
var ground = new THREE.Mesh(new THREE.PlaneGeometry(140,140), new THREE.MeshPhongMaterial({map:makeGround(),color:0xffffff,shininess:4,specular:0x111111}));
ground.rotation.x=-Math.PI/2; scene.add(ground);

(function stones(){
  var n=Math.floor(LEN/1.7), im=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1.06,.07,7), new THREE.MeshPhongMaterial({color:0x53625a,shininess:14}), n);
  var m=new THREE.Matrix4(), q=new THREE.Quaternion(), e=new THREE.Euler(), r=mulberry(4);
  for(var i=0;i<n;i++){
    var u=(i+.5)/n, p=pathAt(u), t=tanAt(u), sd=sideOf(t), off=(r()-.5)*.5, rad=.4+r()*.14;
    e.set(0,r()*6.28,0); q.setFromEuler(e);
    m.compose(new THREE.Vector3(p.x+sd.x*off,.035,p.z+sd.z*off), q, new THREE.Vector3(rad,1,rad*(.85+r()*.3)));
    im.setMatrixAt(i,m);
  }
  scene.add(im);
})();

/* background dressing: dark trunks + lots of plants */
(function dressing(){
  var r=mulberry(21), n=16, im=new THREE.InstancedMesh(new THREE.CylinderGeometry(.5,.72,18,7), new THREE.MeshPhongMaterial({color:0x14261e,shininess:2}), n);
  var m=new THREE.Matrix4(), q=new THREE.Quaternion();
  for(var i=0;i<n;i++){
    var u=r()*1.05, p=pathAt(u), sd=sideOf(tanAt(u)), off=(r()<.5?-1:1)*(9+r()*7), sc=.7+r()*.8;
    m.compose(new THREE.Vector3(p.x+sd.x*off,9,p.z+sd.z*off), q, new THREE.Vector3(sc,1,sc)); im.setMatrixAt(i,m);
  }
  scene.add(im);
})();
var specPositions = [];       // filled below, used to keep the foreground uncluttered
function scatterPlants(){
  var r=mulberry(55), kinds=['fern','fern','hosta','grass','grass','grass'];
  for(var i=0;i<90;i++){
    var u=r()*1.04-.02, p=pathAt(u), sd=sideOf(tanAt(u)), off=(r()<.5?-1:1)*(2.3+Math.pow(r(),1.4)*9);
    var x=p.x+sd.x*off, z=p.z+sd.z*off, skip=false;
    specPositions.forEach(function(sp){ if(Math.hypot(sp.x-x,sp.z-z)<2.8) skip=true; });
    if(skip) continue;
    var kind=kinds[Math.floor(r()*kinds.length)], far=Math.abs(off)>7.5;
    scene.add(plant(kind,x,z,(far?1.9:.8)+r()*.9,r()*6.28,Math.floor(r()*3),.02));
  }
}

/* ---------- gate at the start of the path ---------- */
var GATE_Z = 3.5, gate = new THREE.Group();
(function(){
  var iron=new THREE.MeshPhongMaterial({color:0x22342c,shininess:30,specular:0x445a50});
  [-1.45,1.45].forEach(function(x){ var b=new THREE.Mesh(new THREE.BoxGeometry(.22,2.0,.22),iron); b.position.set(x,1,0); gate.add(b); });
  var arch=new THREE.Mesh(new THREE.TorusGeometry(1.45,.09,10,44,Math.PI),iron); arch.position.y=2.0; gate.add(arch);
  for(var i=0;i<9;i++){                                    // vines on the arch
    var a=Math.PI*(i+.5)/9, c=plant('herb',Math.cos(a)*1.45,0,.55,a*2,i,.04);
    c.position.y=2.0+Math.sin(a)*1.45; c.position.x=Math.cos(a)*1.45; c.rotation.z=a-Math.PI/2; gate.add(c);
  }
  [-1.45,1.45].forEach(function(x,i){ gate.add(plant('fern',x*1.1,.35,.9,i*2,i)); });
  gate.position.z=GATE_Z; scene.add(gate);
})();

/* ---------- halos ---------- */
function sprite(map,color,scale,opacity){
  var s=new THREE.Sprite(new THREE.SpriteMaterial({map:map,color:color,transparent:true,opacity:opacity,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
  s.scale.set(scale,scale,1); return s;
}
var gateGlow = sprite(glowTex,0xffc46b,17,0), gateRing = sprite(ringTex,0xffd58a,4.8,0);
gateGlow.position.set(0,2.0,-1.5); gateRing.position.set(0,2.0,GATE_Z-.4);
scene.add(gateGlow, gateRing);

/* ---------- specimens ---------- */
var PAL = [
  {bg:'#0a1613',amb:'#27443a',halo:'#ffc46b'},
  {bg:'#0a1a17',amb:'#264a40',halo:'#8fe3c0'},
  {bg:'#0c1a14',amb:'#33502c',halo:'#d8f08a'},
  {bg:'#150f1c',amb:'#3d3050',halo:'#d59bff'},
  {bg:'#0a1420',amb:'#25384f',halo:'#6fb8ff'},
  {bg:'#161309',amb:'#4a3d24',halo:'#ffc46b'}
].map(function(o){ return {bg:new THREE.Color(o.bg),amb:new THREE.Color(o.amb),halo:new THREE.Color(o.halo)}; });

var specs = [];   // index k-1 for k=1..5
function registerSpec(k,group,pos,haloOff,ringScale){
  var col=PAL[k].halo;
  var glow=sprite(glowTex,col,ringScale*2.1,.2), ring=sprite(ringTex,col,ringScale,.35);
  glow.position.copy(pos).add(haloOff); ring.position.copy(pos).add(haloOff);
  var light=new THREE.PointLight(col.getHex(),.2,15,1.5); light.position.copy(pos).add(new THREE.Vector3(0,1.8,0)).addScaledVector(haloOff,-.2);
  group.position.copy(pos);
  scene.add(group,glow,ring,light);
  specs[k-1]={k:k,group:group,pos:pos.clone(),glow:glow,ring:ring,light:light,ringBase:ringScale,g:0};
  specPositions.push(pos);
}
function specPoint(k){
  var u=k/5, p=pathAt(u), t=tanAt(u), sd=sideOf(t), sgn=(k%2)?1:-1;
  return {pos:new THREE.Vector3(p.x+t.x*5.8+sd.x*sgn*2.9, 0, p.z+t.z*5.8+sd.z*sgn*2.9), t:t, out:sd.multiplyScalar(sgn)};
}

/* 1 fern */
(function(){
  var s=specPoint(1), g=new THREE.Group();
  [[0,0,1.5,0],[1.0,.7,1.15,1.2],[-.9,.8,1.05,2.4],[.2,-1.0,1.0,3.3],[-1.3,-.5,.8,4.2]].forEach(function(a,i){ g.add(plant('fern',a[0],a[1],a[2],a[3],i)); });
  for(var i=0;i<4;i++) g.add(plant('grass',Math.cos(i*1.7)*1.6,Math.sin(i*1.7)*1.6,.7,i,i));
  registerSpec(1,g,s.pos,new THREE.Vector3(s.out.x*1.2+s.t.x*1.2,1.7,s.out.z*1.2+s.t.z*1.2),5.6);
})();
/* 2 hosta */
(function(){
  var s=specPoint(2), g=new THREE.Group();
  [[0,0,1.5,0.4],[1.1,.5,1.15,1.7],[-1.0,.6,1.1,2.9],[.1,-1.1,1.0,4.1]].forEach(function(a,i){ g.add(plant('hosta',a[0],a[1],a[2],a[3],i)); });
  for(var i=0;i<3;i++) g.add(plant('grass',Math.cos(i*2.4+.5)*1.7,Math.sin(i*2.4+.5)*1.7,.7,i,i));
  registerSpec(2,g,s.pos,new THREE.Vector3(s.out.x*1.2+s.t.x*1.2,1.5,s.out.z*1.2+s.t.z*1.2),5.4);
})();
/* 3 herb bed with glowing blossoms */
var flowerMeta = null;
(function(){
  var s=specPoint(3), g=new THREE.Group(), r=mulberry(77);
  var wood=new THREE.MeshPhongMaterial({color:0x3a2c1f,shininess:6});
  var bed=new THREE.Mesh(new THREE.BoxGeometry(1.7,.42,3.2),wood); bed.position.y=.21; g.add(bed);
  var soil=new THREE.Mesh(new THREE.PlaneGeometry(1.5,3.0),new THREE.MeshPhongMaterial({color:0x1a120d,shininess:2}));
  soil.rotation.x=-Math.PI/2; soil.position.y=.43; g.add(soil);
  for(var i=0;i<9;i++){
    var c=plant(i%3===0?'grass':'herb',(r()-.5)*1.1,(r()-.5)*2.6,.85+r()*.7,r()*6.28,i,.05); c.position.y=.42; g.add(c);
  }
  var n=42, cols=[0xffffff,0xe7b8ff,0xffe08a,0xff9fc4];
  var fl=new THREE.InstancedMesh(new THREE.SphereGeometry(.055,8,6),new THREE.MeshBasicMaterial({color:0xffffff,fog:false}),n);
  var st=new THREE.InstancedMesh(new THREE.CylinderGeometry(.007,.007,1,4),new THREE.MeshPhongMaterial({color:0x4d7a45}),n);
  var gp=new Float32Array(n*3), gc=new Float32Array(n*3), m=new THREE.Matrix4(), col=new THREE.Color();
  for(var j=0;j<n;j++){
    var x=(r()-.5)*1.3, z=(r()-.5)*2.8, h=.35+r()*.6;
    m.makeTranslation(x,.42+h,z); fl.setMatrixAt(j,m);
    m.compose(new THREE.Vector3(x,.42+h/2,z),new THREE.Quaternion(),new THREE.Vector3(1,h,1)); st.setMatrixAt(j,m);
    col.setHex(cols[j%4]); fl.setColorAt(j,col);
    gp[j*3]=x; gp[j*3+1]=.42+h; gp[j*3+2]=z; gc[j*3]=col.r; gc[j*3+1]=col.g; gc[j*3+2]=col.b;
  }
  g.add(fl,st);
  var pg=new THREE.BufferGeometry(); pg.setAttribute('position',new THREE.BufferAttribute(gp,3)); pg.setAttribute('color',new THREE.BufferAttribute(gc,3));
  var pm=new THREE.PointsMaterial({size:.55,map:glowTex,vertexColors:true,transparent:true,opacity:.75,depthWrite:false,blending:THREE.AdditiveBlending,fog:false});
  g.add(new THREE.Points(pg,pm));
  g.rotation.y=Math.atan2(s.t.x,s.t.z);
  registerSpec(3,g,s.pos,new THREE.Vector3(s.out.x*1.2+s.t.x*1.2,1.5,s.out.z*1.2+s.t.z*1.2),5.4);
  specs[2].rotY=g.rotation.y;
})();
/* 4 pond with ripples */
var ripples=[];
(function(){
  var s=specPoint(4), g=new THREE.Group(), r=mulberry(88);
  var rim=new THREE.Mesh(new THREE.TorusGeometry(1.72,.17,10,44),new THREE.MeshPhongMaterial({color:0x445149,shininess:12}));
  rim.rotation.x=Math.PI/2; rim.position.y=.2; g.add(rim);
  var water=new THREE.Mesh(new THREE.CircleGeometry(1.62,48),new THREE.MeshPhongMaterial({color:0x0f2a3a,shininess:140,specular:0x8ac8ff,transparent:true,opacity:.94}));
  water.rotation.x=-Math.PI/2; water.position.y=.15; g.add(water);
  var padMat=new THREE.MeshPhongMaterial({color:0x3f8a4c,shininess:30,side:THREE.DoubleSide});
  for(var i=0;i<7;i++){
    var pg=new THREE.CircleGeometry(1,24,.3,Math.PI*2-.6); pg.rotateX(-Math.PI/2);
    var pad=new THREE.Mesh(pg,padMat), a=r()*6.28, d=r()*1.05, sc=.26+r()*.18;
    pad.position.set(Math.cos(a)*d,.17,Math.sin(a)*d); pad.scale.set(sc,1,sc); pad.rotation.y=r()*6.28; g.add(pad);
  }
  var bud=new THREE.Mesh(new THREE.SphereGeometry(.1,10,8),new THREE.MeshBasicMaterial({color:0xffd7ec,fog:false}));
  bud.scale.y=1.6; bud.position.set(.25,.32,-.2); g.add(bud);
  var bg=sprite(glowTex,0xffb8dc,.9,.9); bg.position.copy(bud.position); g.add(bg);
  var rg=new THREE.PlaneGeometry(3.2,3.2); rg.rotateX(-Math.PI/2);
  for(var k=0;k<3;k++){
    var rm=new THREE.Mesh(rg,new THREE.MeshBasicMaterial({map:ringTex,color:0x6fb8ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
    rm.position.set(-.2,.18,.3); g.add(rm); ripples.push({m:rm,off:k/3});
  }
  registerSpec(4,g,s.pos,new THREE.Vector3(s.out.x*1.2+s.t.x*1.2,1.5,s.out.z*1.2+s.t.z*1.2),5.4);
})();
/* 5 the lantern at the end of the path */
(function(){
  var u=1, p=pathAt(u), t=tanAt(u), g=new THREE.Group();
  var pos=new THREE.Vector3(p.x+t.x*7,0,p.z+t.z*7);
  var post=new THREE.Mesh(new THREE.CylinderGeometry(.045,.06,1.8,8),new THREE.MeshPhongMaterial({color:0x22342c})); post.position.y=.9; g.add(post);
  var head=new THREE.Mesh(new THREE.BoxGeometry(.3,.36,.3),new THREE.MeshBasicMaterial({color:0xffe2a8,fog:false})); head.position.y=1.95; g.add(head);
  var cap=new THREE.Mesh(new THREE.ConeGeometry(.26,.2,4),new THREE.MeshPhongMaterial({color:0x22342c})); cap.position.y=2.25; cap.rotation.y=Math.PI/4; g.add(cap);
  for(var i=0;i<5;i++) g.add(plant('fern',Math.cos(i*1.3)*1.4,Math.sin(i*1.3)*1.4,.9,i,i));
  registerSpec(5,g,pos,new THREE.Vector3(0,1.95,0),6.6);
})();
scatterPlants();

/* ---------- fireflies ---------- */
var flies=[];
(function(){
  var r=mulberry(5);
  for(var s=0;s<2;s++){
    var n=70, arr=new Float32Array(n*3), base=[];
    for(var i=0;i<n;i++){
      var u=r()*1.04, p=pathAt(u), sd=sideOf(tanAt(u)), off=(r()*2-1)*6.5;
      var b={x:p.x+sd.x*off,y:.35+r()*2.4,z:p.z+sd.z*off,a:.3+r()*.5,b:.4+r()*.5,c:.3+r()*.5,ph:r()*6.28};
      base.push(b); arr[i*3]=b.x; arr[i*3+1]=b.y; arr[i*3+2]=b.z;
    }
    var geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(arr,3));
    var mat=new THREE.PointsMaterial({size:.2,map:glowTex,color:s?0xc8ffb0:0xffd88a,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,fog:false});
    var pts2=new THREE.Points(geo,mat); scene.add(pts2); flies.push({geo:geo,base:base,mat:mat,arr:arr,s:s});
  }
})();


var look=new THREE.Vector3(0,2,GATE_Z),tmp=new THREE.Vector3(),tgt=new THREE.Vector3(),tmpC=new THREE.Color(),haloCol=new THREE.Color();
var mouse={x:0,y:0},lastTime=0;
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
function draw(t,p,pointer){
  const dt=clamp(t-lastTime,0,.05);lastTime=t;
  const portrait=innerWidth<720,it=ss(0,3.2,t);
  const f=p*5,i=Math.min(4,Math.floor(f)),k=ss(0,1,f-i);
  tmpC.lerpColors(PAL[i].bg,PAL[i+1].bg,k);scene.background.copy(tmpC);scene.fog.color.copy(tmpC);
  ambient.color.lerpColors(PAL[i].amb,PAL[i+1].amb,k);
  haloCol.lerpColors(PAL[i].halo,PAL[i+1].halo,k);
  const base=pathAt(p),tan=tanAt(p),right=sideOf(tan);
  tmp.set(0,3.7,25).lerp(base,it);tmp.x+=(1-it)*Math.sin(it*3.2)*2.6;
  mouse.x+=(pointer.x-mouse.x)*Math.min(1,dt*3);mouse.y+=(pointer.y-mouse.y)*Math.min(1,dt*3);
  camera.position.copy(tmp).addScaledVector(right,mouse.x*.28*it);camera.position.y-=mouse.y*.11*it;
  const near=Math.max(1,Math.min(5,Math.round(p*5))),sp=specs[near-1];
  const w=(1-ss(0,.1,Math.abs(p-near/5)))*(portrait?.72:.4);
  tgt.copy(base).addScaledVector(tan,6);tgt.y-=.15;
  tmp.set(sp.pos.x,near===5?1.7:portrait?.35:.9,sp.pos.z);tgt.lerp(tmp,w);
  tmp.set(0,2,GATE_Z).lerp(tgt,it*it);look.lerp(tmp,1-Math.exp(-dt*5));
  camera.fov=(portrait?62:50)+(1-it)*24;camera.updateProjectionMatrix();camera.lookAt(look);camera.rotateZ((1-it)*.025);
  const gv=ss(.1,1.8,t)*(1-ss(.05,.19,p));gateGlow.material.opacity=.65*gv;gateRing.material.opacity=.85*gv;
  const ringScale=(portrait?3.6:4.8)*(.7+.3*ss(.4,3,t));gateRing.scale.set(ringScale,ringScale,1);
  for(const q of specs){
    const d=camera.position.distanceTo(q.pos),g=1-ss(4.5,17,d);q.g+=(g-q.g)*Math.min(1,dt*3);
    q.group.scale.setScalar(.8+.2*q.g);q.light.intensity=.15+2*q.g;q.glow.material.opacity=.15+.45*q.g;q.ring.material.opacity=.22+.58*q.g;
    const rs=q.ringBase*(portrait?.75:1)*(.92+.1*q.g);q.ring.scale.set(rs,rs,1);q.glow.scale.set(rs*2.1,rs*2.1,1);
  }
  ripples.forEach(r=>{const ph=(t*.32+r.off)%1,sc=.25+ph*1.45;r.m.scale.set(sc,1,sc);r.m.material.opacity=Math.pow(1-ph,1.6)*.5*specs[3].g;});
  sways.forEach(s=>{s.m.rotation.x=Math.sin(t*.8+s.ph)*s.a;s.m.rotation.z=Math.cos(t*.65+s.ph)*s.a;});
  flies.forEach(fl=>{for(let i=0;i<fl.base.length;i++){const b=fl.base[i];fl.arr[i*3]=b.x+Math.sin(t*b.a+b.ph)*.6;fl.arr[i*3+1]=b.y+Math.sin(t*b.b+b.ph*1.7)*.35;fl.arr[i*3+2]=b.z+Math.cos(t*b.c+b.ph)*.6;}fl.geo.attributes.position.needsUpdate=true;fl.mat.opacity=.55+.35*Math.sin(t*(1.1+fl.s*.5)+fl.s*2);});
  renderer.render(scene,camera);return '#'+haloCol.getHexString();
}
function dispose(){
  const geos=new Set(),mats=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){mats.add(m);if(m.map)textures.add(m.map);}});
  geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();
}
resize();return {draw,resize,dispose};
}
root.OpeningGarden={create};
})(globalThis);
