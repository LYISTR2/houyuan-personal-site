/* An original pixel valley: stars descend, windows wake, a lantern comes home.
 * Canvas 2D, with the same wood/field/roof colors as the playable world. */
(function(root){
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x)),smooth=(a,b,t)=>{const p=clamp((t-a)/(b-a));return p*p*(3-2*p);};
  const noise=n=>{let x=Math.imul(n+47,374761393);x=Math.imul(x^(x>>>13),1274126177);return (x^(x>>>16))>>>0;};
  function create(canvas){
    const g=canvas.getContext('2d');if(!g)return null;
    let W=0,H=0,u=1,portrait=false,disposed=false;
    const pixel=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));};
    function resize(){
      portrait=innerWidth<680;W=Math.min(900,Math.ceil(innerWidth/2));H=Math.ceil(W*innerHeight/innerWidth);
      canvas.width=W;canvas.height=H;u=W/(portrait?380:720);g.imageSmoothingEnabled=false;
    }
    function hill(base,height,color,seed){
      g.fillStyle=color;g.beginPath();g.moveTo(0,H);
      for(let x=-8;x<W+10;x+=8){const y=base+Math.sin(x/W*5+seed)*height+Math.sin(x/W*13+seed)*height*.2;g.lineTo(x,y);}
      g.lineTo(W,H);g.closePath();g.fill();
    }
    function pine(x,y,size,color){
      pixel(x-size*.08,y-size*.12,size*.16,size*.28,'#293e36');
      for(let i=0;i<4;i++){const width=size*(.22+i*.17);pixel(x-width/2,y-size+i*size*.18,width,size*.29,color);}
      pixel(x-size*.04,y-size*.91,size*.05,size*.35,'#617b6540');
    }
    function light(x,y,r,alpha){
      const grad=g.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,`rgba(255,207,120,${alpha})`);grad.addColorStop(1,'rgba(255,193,99,0)');g.fillStyle=grad;g.fillRect(x-r,y-r,r*2,r*2);
    }
    function house(x,y,s,t,serial,roof='#906452'){
      const draw=(dx,dy,w,h,c)=>pixel(x+dx*s,y+dy*s,w*s,h*s,c);
      draw(-3,37,69,5,'#112c2b66');draw(0,0,62,41,'#614e3a');draw(2,1,58,36,'#a38e6b');draw(3,1,4,35,'#bcaa7f');draw(54,1,5,37,'#7c7154');
      for(let r=4;r<37;r+=5)draw(7,r,45,1,'#867853');
      draw(-5,-3,72,5,'#3e3b33');
      for(let row=0;row<7;row++){draw(-4+row*4,-5-row*3,70-row*8,3,roof);draw(-3+row*4,-5-row*3,68-row*8,1,'#b58c6680');}
      draw(45,-26,6,17,'#766b57');draw(44,-28,8,3,'#968971');
      draw(35,14,13,25,'#514637');draw(37,16,9,23,'#6d543b');draw(44,27,2,2,'#dcb779');draw(32,39,19,3,'#b8a17a');
      const awake=smooth(2.3+serial*.38,3.4+serial*.38,t);
      draw(10,11,17,16,'#504e3b');draw(12,13,13,11,awake>.05?'#b8a579':'#698889');
      if(awake>0){g.globalAlpha=awake;light(x+18*s,y+18*s,33*s,.28);draw(12,13,13,11,'#e7c581');draw(13,14,4,3,'#ffe4ab');g.globalAlpha=1;}
      draw(18,13,2,11,'#927851');draw(12,18,13,2,'#927851');draw(9,27,20,3,'#6e6047');
      draw(11,24,3,4,'#718657');draw(21,24,3,4,'#718657');draw(11,24,3,1,'#c89983');draw(21,23,3,1,'#d5b17c');
      if(t>3.2){g.globalAlpha=.15;draw(46,-34-Math.sin(t+serial)*3,8,2,'#b0bcb0');g.globalAlpha=1;}
    }
    function mill(x,y,s,t){
      pixel(x-6*s,y,14*s,34*s,'#9a8b68');pixel(x-9*s,y-4*s,20*s,5*s,'#736457');pixel(x-5*s,y+31*s,13*s,4*s,'#6f684e');
      g.save();g.translate(x,y+4*s);g.rotate(t*.17);for(let i=0;i<4;i++){g.rotate(Math.PI/2);pixel(0,-1*s,25*s,2*s,'#b6b89d');pixel(6*s,-5*s,17*s,4*s,'#88967d');}g.restore();pixel(x-2*s,y+2*s,4*s,4*s,'#d2be90');
    }
    function river(horizon,t){
      g.fillStyle='#366273';g.beginPath();g.moveTo(W*.69,horizon-2);g.lineTo(W*.77,horizon-2);g.lineTo(W*.72,H*.72);g.lineTo(W*.54,H);g.lineTo(W*.35,H);g.lineTo(W*.65,H*.72);g.closePath();g.fill();
      g.strokeStyle='#70969760';g.lineWidth=1;
      for(let i=0;i<19;i++){const y=horizon+(H-horizon)*i/19,x=W*(.73-(i/19)**2*.24)+Math.sin(t*.5+i)*3*u,width=(3+i*.8)*u;pixel(x-width/2,y,width,1,'#94b5ae55');}
      const y=H*.74;pixel(W*.625,y,W*.10,7*u,'#5b513d');pixel(W*.62,y-2*u,W*.11,3*u,'#a5976b');
      for(let i=0;i<6;i++)pixel(W*.625+i*W*.017,y,1,7*u,'#857453');
    }
    function fields(x,y,s){
      for(let row=0;row<5;row++)for(let col=0;col<7;col++){
        const fx=x+col*8*s,fy=y+row*5*s;pixel(fx,fy,7*s,4*s,'#49553a');pixel(fx+3*s,fy-2*s,1*s,4*s,'#7b9361');if((row+col)%3===0)pixel(fx+2*s,fy,3*s,1*s,'#c19d68');
      }
      for(let i=0;i<7;i++)pixel(x-4*s+i*9*s,y+25*s,2*s,6*s,'#a08e63');pixel(x-4*s,y+27*s,57*s,1*s,'#b19a6e');
    }
    function lanternPerson(x,y,s,t){
      pixel(x-3*s,y-7*s,3*s,7*s,'#435266');pixel(x+2*s,y-6*s,3*s,6*s,'#435266');pixel(x-4*s,y-18*s,9*s,12*s,'#b17c53');pixel(x-3*s,y-25*s,7*s,8*s,'#c8a079');pixel(x-5*s,y-27*s,11*s,3*s,'#c4ad7b');pixel(x-3*s,y-29*s,7*s,3*s,'#dfc392');
      pixel(x+6*s,y-16*s,1*s,7*s,'#8d7956');pixel(x+5*s,y-9*s,4*s,6*s,'#dbb87b');pixel(x+6*s,y-8*s,2*s,3*s,'#ffe6b1');light(x+7*s,y-6*s,25*s,.30);
      if(t<6.7)pixel(x-3*s,y,3*s,1*s,'#766853');
    }
    function gate(t){
      const near=smooth(4.9,7.2,t),scale=1+near*.7,top=H*.93-near*H*.08,gap=W*(portrait?.20:.16)*scale;
      for(const side of [-1,1]){
        const x=W*.5+side*gap,w=9*u*scale;pixel(x-w/2,top-48*u*scale,w,65*u*scale,'#4b4935');pixel(x-w/2+2*u,top-47*u*scale,2*u,59*u*scale,'#9c865a');pixel(x-w/2-2*u,top-51*u*scale,w+4*u,4*u,'#ae9464');
        const end=side<0?-20:W+20;g.strokeStyle='#7c7450';g.lineWidth=3*u;g.beginPath();g.moveTo(end,top-26*u*scale);g.lineTo(x,top-26*u*scale);g.moveTo(end,top-7*u*scale);g.lineTo(x,top-7*u*scale);g.stroke();
        for(let i=1;i<=5;i++){const fx=x+(end-x)*i/6;pixel(fx,top-35*u*scale,3*u,58*u*scale,'#60634a');}
        light(x,top-42*u*scale,26*u,.12+near*.1);
      }
    }
    function draw(t,pointer){
      if(disposed)return;
      g.globalAlpha=1;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);
      const descend=smooth(.5,4.9,t),horizon=H*(.76-descend*.22);
      const sky=g.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#111e32');sky.addColorStop(.65,'#29464c');sky.addColorStop(1,'#718574');g.fillStyle=sky;g.fillRect(0,0,W,H);
      for(let i=0;i<65;i++){const n=noise(i),x=n%W,y=(n>>>9)%Math.ceil(H*.53);g.globalAlpha=.22+.5*(Math.sin(t*.7+i)*.5+.5);pixel(x+pointer.x*(i%3),y,i%13===0?2:1,1,i%9?'#d3ded0':'#e8c99d');if(i%17===0)pixel(x,y-1,1,3,'#d3ded0');}g.globalAlpha=1;
      const moonX=W*(portrait?.80:.81),moonY=H*.13;light(moonX,moonY,30*u,.10);g.fillStyle='#e5dab1';g.beginPath();g.arc(moonX,moonY,6*u,0,7);g.fill();g.fillStyle='#243746';g.beginPath();g.arc(moonX+3*u,moonY-2*u,5*u,0,7);g.fill();
      const shooting=smooth(.4,2.6,t);if(t>.4&&t<2.6){g.globalAlpha=Math.sin(shooting*Math.PI);const x=W*(.68-shooting*.23),y=H*(.08+shooting*.18);pixel(x,y,2,2,'#ffdfaa');for(let j=1;j<12;j++)pixel(x+j*2,y-j,j<4?2:1,1,`rgba(241,215,169,${(1-j/12)*.4})`);g.globalAlpha=1;}
      // Each distance layer has its own travel amount and pointer parallax.
      g.save();g.translate(pointer.x*2,0);hill(horizon-H*.14,H*.025,'#344e57',2);hill(horizon-H*.06,H*.034,'#365958',4);g.restore();
      g.save();g.translate(pointer.x*4,0);hill(horizon,H*.035,'#3d655b',1);for(let i=0;i<19;i++){const x=i*W/18,y=horizon+Math.sin(i*.9)*H*.022;pine(x,y,(16+noise(i)%11)*u,'#2e514a');}g.restore();
      g.save();const zoom=1+smooth(2.5,7.3,t)*.14;g.translate(W*.5+pointer.x*5,H*.84+pointer.y*2);g.scale(zoom,zoom);g.translate(-W*.5,-H*.84);
      hill(horizon+H*.07,H*.023,'#416951',3);river(horizon+H*.055,t);
      // North mine, forest, striped fairground booths, fields, town and barns.
      pixel(W*.58,horizon-H*.006,23*u,13*u,'#617765');pixel(W*.585,horizon+2*u,8*u,10*u,'#213e39');
      for(let i=0;i<8;i++)pine(W*(.81+i*.021),horizon+H*(.065+(i%3)*.023),(21+i%3*6)*u,'#315343');
      for(let i=0;i<3;i++){const x=W*(.17+i*.038),y=horizon+H*.04;pixel(x,y,21*u,14*u,'#8f8b65');pixel(x-2*u,y-3*u,25*u,5*u,i%2?'#6e9790':'#b48770');for(let j=0;j<4;j++)pixel(x+j*6*u,y-3*u,3*u,5*u,'#c9b58a');}
      fields(W*.17,horizon+H*.14,u*.8);house(W*.20,horizon+H*.085,u*.65,t,1);
      house(W*.47,horizon+H*.09,u*.56,t,3,'#927869');house(W*.54,horizon+H*.14,u*.53,t,4,'#647f88');mill(W*.84,horizon+H*.14,u*.8,t);
      house(W*.78,horizon+H*.27,u*.61,t,5,'#a48273');fields(W*.84,horizon+H*.33,u*.55);
      // The homecoming path leads to the same warm, hand-built cottage language.
      g.fillStyle='#979575';g.beginPath();g.moveTo(W*.39,H*.77);g.lineTo(W*.44,H*.77);g.lineTo(W*.57,H);g.lineTo(W*.43,H);g.closePath();g.fill();
      house(W*(portrait?.23:.27),horizon+H*.29,u*1.08,t,0);
      for(let i=0;i<15;i++){const x=(noise(i+90)%100)/100*W,y=horizon+H*.16+(noise(i+30)%100)/100*H*.38;if(x>W*.35&&x<W*.77)continue;pine(x,y,(24+i%4*7)*u,'#2b4d3d');}
      for(let i=0;i<18;i++){const x=(noise(i+300)%100)/100*W,y=horizon+H*.12+(noise(i+200)%100)/100*H*.40;pixel(x,y,2*u,1*u,'#87936b80');if(i%4===0)pixel(x,y-u,1*u,2*u,'#bb9c8466');}
      const walk=smooth(3.2,6.8,t);lanternPerson(W*(.47+walk*.03),H*(.81+walk*.10),u*.8,t);
      // Fireflies gather along the walking route, rather than around specimen rings.
      for(let i=0;i<14;i++){const x=W*(.3+(noise(i+500)%100)/250)+Math.sin(t*.6+i)*7*u,y=H*(.67+(noise(i+600)%100)/400)+Math.cos(t*.5+i)*4*u;g.globalAlpha=(.35+Math.sin(t*1.2+i)*.3)*smooth(1,4,t);light(x,y,5*u,.24);pixel(x,y,1,1,'#e9d197');}g.globalAlpha=1;
      g.restore();
      // Foreground grasses and the gate move faster as the viewer approaches.
      g.save();g.translate(pointer.x*10,pointer.y*4);gate(t);for(let i=0;i<23;i++){const x=i*W/22,y=H*(.96+(i%3)*.015);pixel(x,y,2*u,8*u,'#263f34');pixel(x-u,y+3*u,5*u,2*u,'#34513f');}g.restore();
      // A low strip of mist keeps depth without hiding the houses or windows.
      g.globalAlpha=.08;const mist=g.createLinearGradient(0,horizon-H*.03,0,horizon+H*.07);mist.addColorStop(0,'#adc1b5');mist.addColorStop(1,'#adc1b500');g.fillStyle=mist;g.fillRect(0,horizon-H*.03,W,H*.1);g.globalAlpha=1;
    }
    function dispose(){disposed=true;canvas.width=1;canvas.height=1;}
    resize();return {draw,resize,dispose};
  }
  root.BackyardOpeningScene={create};
})(globalThis);
