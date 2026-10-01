/* Original pixel scenery. Static terrain and sprites are baked once per season. */
(function (root) {
  'use strict';
  const WIDTH = 1120, HEIGHT = 880;
  const palettes = {
    spring: {grass:'#91b86e',light:'#a6c77b',dark:'#7ea35d',leaf:'#67994e',flowers:'#f4b7bb'},
    summer: {grass:'#8cab63',light:'#a1bc70',dark:'#769851',leaf:'#548644',flowers:'#f5df88'},
    autumn: {grass:'#b3a16a',light:'#c6b27a',dark:'#a0915e',leaf:'#c58c4c',flowers:'#dca176'},
    winter: {grass:'#d2e0d8',light:'#e8eee1',dark:'#bed1c7',leaf:'#b6ccc0',flowers:'#f6f2d9'}
  };
  const noise = (x,y) => {let n = Math.imul(x+139,374761393) ^ Math.imul(y+83,668265263); n = Math.imul(n ^ n>>>13,1274126177); return (n ^ n>>>16)>>>0;};
  const canvas = (w,h) => {const c=document.createElement('canvas'); c.width=w; c.height=h; return c;};
  let terrain, currentSeason, trees=[];
  const r = (g,x,y,w,h,c) => {g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h);};
  function path(g,x,y,w,h) {
    r(g,x-2,y-2,w+4,h+4,'#9b9561');r(g,x,y,w,h,'#d5be83');
    r(g,x,y,w,2,'#e6d09a');
    for(let i=0;i<w*h/95;i++){const nx=noise(i,x),ny=noise(i,y);r(g,x+nx%Math.max(1,w-3),y+ny%Math.max(1,h-2),2,1,i%3?'#baa16c':'#e8cf98');}
  }
  function treeSprite(leaf,pine=false) {
    const c=canvas(42,64),g=c.getContext('2d');
    r(g,8,57,28,5,'#46664344');r(g,18,33,7,28,'#785037');r(g,19,36,2,22,'#a87747');r(g,23,38,2,21,'#503e30');
    if(pine){for(let i=0;i<4;i++){const w=14+i*7;r(g,21-w/2,4+i*10,w,17,'#3d6650');r(g,22-w/2,3+i*10,w-3,13,leaf);r(g,23-w/2,5+i*10,3,9,'#9abc77');}}
    else{r(g,3,23,35,19,'#456c42');r(g,0,16,41,15,'#527c43');r(g,5,6,31,29,leaf);r(g,11,0,20,20,leaf);r(g,7,11,10,3,'#9cbe70');r(g,13,4,10,2,'#b0cc82');r(g,4,23,7,2,'#8bac60');r(g,29,28,7,8,'#527c43');r(g,21,34,9,3,'#517847');}
    for(let i=0;i<26;i++){const x=7+noise(i,4)%25,y=8+noise(i,5)%26;if(g.getImageData(x,y,1,1).data[3])r(g,x,y,i%3?2:3,1,i%3?'#8eaf6444':'#d1d99c55');}
    return c;
  }
  function cottage(draw,x,y) {
    const p=(dx,dy,w,h,c)=>draw(x+dx,y+dy,w,h,c);
    p(-3,32,53,5,'#43644244');p(0,0,46,36,'#856044');p(2,1,42,33,'#efd3a0');p(3,3,3,29,'#f8e7b8');p(41,4,3,30,'#bb9566');
    for(let row=4;row<32;row+=5)p(5,row,35,1,'#d4b681');
    p(-6,-2,58,4,'#63432f');
    for(let row=0;row<6;row++){const offset=row*4,w=58-offset*2;p(-6+offset,-5-row*3,w,3,row%2?'#b96749':'#c17a52');p(-5+offset,-5-row*3,w-2,1,'#e2ab71');for(let col=5;col<w;col+=8)p(-6+offset+col+(row%2?3:0),-4-row*3,1,2,'#9b503b');}
    p(8,-25,6,14,'#987c60');p(7,-27,8,3,'#c2aa88');p(8,-24,2,3,'#c3a080');
    p(27,14,11,22,'#775033');p(29,15,7,20,'#a4784b');p(30,17,1,16,'#cf9e63');p(34,26,2,2,'#f5d18c');p(26,36,14,3,'#d7bb83');p(25,39,16,2,'#a08d60');
    p(8,10,13,13,'#8d6943');p(10,12,9,8,'#79abb1');p(11,13,7,2,'#b8d6c8');p(14,12,1,8,'#f6dbab');p(10,16,9,1,'#f6dbab');p(7,23,15,3,'#aa7748');
    p(8,22,2,3,'#658649');p(13,22,2,3,'#7c9956');p(17,21,2,4,'#658649');p(7,21,4,2,'#e6a5a0');p(12,20,4,2,'#edc677');p(16,20,4,2,'#e6a5a0');
    p(3,36,21,2,'#ac8959');p(43,27,7,8,'#bc9060');p(44,25,5,3,'#ebc86e');
  }
  function booth(g,x,y,w,roof) {
    r(g,x-3,y+31,w+6,8,'#536a4344');r(g,x,y+4,w,29,'#c49a64');r(g,x+3,y+7,w-6,23,'#ebcea0');
    r(g,x+5,y+13,w-10,15,'#3f6150');r(g,x-4,y-7,w+8,10,'#714e35');
    for(let col=0;col<w+8;col+=10){r(g,x-4+col,y-12,10,14,col%20?roof:'#f6e3ad');r(g,x-4+col,y+2,10,4,col%20?roof:'#f6e3ad');}
    r(g,x-1,y+29,w+2,5,'#b8834f');r(g,x+2,y+29,w-4,1,'#f1ca87');r(g,x+3,y+4,3,27,'#8c603e');r(g,x+w-6,y+4,3,27,'#8c603e');
  }
  function flower(g,x,y,color) {r(g,x,y,1,5,'#5b854a');r(g,x-2,y-1,5,3,color);r(g,x,y,1,1,'#fff0b7');}
  function lantern(g,x,y) {r(g,x,y,2,18,'#79623e');r(g,x-3,y-6,8,7,'#684d32');r(g,x-2,y-5,6,4,'#f2d18c');r(g,x,y-5,1,4,'#dfb770');}
  function parkScenery(g,p) {
    r(g,38,77,354,193,p.light);r(g,44,81,342,181,p.grass);
    path(g,65,152,304,20);path(g,168,159,22,81);path(g,182,230,142,20);path(g,224,241,22,36);path(g,305,160,18,77);
    for(let x=48;x<385;x+=14){if(x>202&&x<260)continue;r(g,x,259,3,14,'#997346');r(g,x-1,259,5,2,'#e8c892');r(g,x,266,14,2,'#c2a06b');}
    booth(g,76,110,74,'#cb8260');booth(g,200,100,75,'#72939d');booth(g,307,95,56,'#969664');booth(g,313,182,48,'#c39b58');
    for(let i=0;i<5;i++){r(g,88+i*11,124,5,12,['#93b7ad','#e2b777','#c48c80'][i%3]);r(g,90+i*11,121,2,4,'#e1d3a6');}
    for(let i=0;i<3;i++){r(g,215+i*16,119,9,9,'#dcad7e');r(g,218+i*16,114,2,6,'#a3b679');r(g,216+i*16,116,6,2,'#6f8a53');}
    for(let i=0;i<4;i++){r(g,317+(i%2)*17,109+Math.floor(i/2)*9,12,7,'#e2bb82');r(g,321+(i%2)*17,111+Math.floor(i/2)*9,3,3,'#739461');}
    r(g,323,198,26,6,'#eee0b0');r(g,323,204,26,1,'#9d7648');
    // The fairground wheel is decorative; each booth has an actual game.
    r(g,72,207,9,22,'#8c714b');r(g,127,207,9,22,'#8c714b');r(g,80,230,49,4,'#a17c4c');
    g.strokeStyle='#745c42';g.lineWidth=2;g.beginPath();g.moveTo(105,189);g.lineTo(75,230);g.moveTo(105,189);g.lineTo(133,230);g.stroke();
    // The wheel rim, spokes and cabins are animated by BackyardAmbience.surface.

    r(g,200,238,4,29,'#93693f');r(g,257,238,4,29,'#93693f');r(g,198,235,65,7,'#bf8c58');r(g,203,232,54,3,'#e3b77e');
    for(const [x,y]of [[58,187],[278,242],[369,166],[58,245]]){r(g,x-3,y,17,7,'#a88052');for(let i=0;i<4;i++)flower(g,x+i*3,y-4,i%2?'#e7b0a7':'#f1d690');}
    lantern(g,187,185);lantern(g,283,227);
    r(g,279,179,17,3,'#aa8152');r(g,279,175,17,3,'#c19b65');r(g,281,182,2,4,'#776043');r(g,292,182,2,4,'#776043');
  }
  function forestScenery(g,p) {
    for(let y=101;y<290;y+=13)for(let x=721;x<981;x+=13){const n=noise(x,y);if(n%3===0)r(g,x,y,8,3,'#6c98532b');if(n%11===0){r(g,x,y,3,1,'#c7a77b');r(g,x+1,y-2,1,2,'#bb9870');}}
    path(g,476,270,349,18);path(g,770,259,174,17);path(g,815,212,16,72);
    cottage((x,y,w,h,c)=>r(g,x,y,w,h,c),715,252);
    for(let i=0;i<6;i++){const x=893+(i%3)*14,y=278-Math.floor(i/3)*7;r(g,x,y,14,6,'#765536');r(g,x+1,y,12,4,'#a67c48');r(g,x+11,y,3,5,'#d5af71');r(g,x+12,y+1,1,3,'#9a7445');}
    r(g,854,278,22,4,'#926c45');r(g,856,282,2,5,'#684f36');r(g,871,282,2,5,'#684f36');r(g,857,275,5,4,'#b3c4b7');r(g,859,268,2,9,'#7e5d3b');
    for(const [x,y]of [[747,215],[967,269],[882,188],[730,118],[901,159]]){r(g,x,y,2,4,'#c8b28c');r(g,x-3,y-2,8,3,'#b9745c');r(g,x-1,y-2,2,1,'#f1daba');}
    lantern(g,762,283);lantern(g,943,282);
  }
  function fishingScenery(g,p) {
    r(g,937,622,49,30,'#bac28d');r(g,936,675,52,65,'#c9c393');r(g,942,760,43,59,'#c2c395');
    path(g,829,596,18,127);path(g,839,695,148,15);path(g,948,707,16,100);
    r(g,964,690,80,32,'#7b6548');r(g,966,692,76,28,'#b69662');
    for(let x=967;x<1043;x+=7){r(g,x,692,1,27,'#836442');r(g,x+1,693,4,1,'#d3b67e');}
    r(g,963,688,82,3,'#7c603d');r(g,963,720,82,3,'#7c603d');for(const x of [966,993,1021,1040]){r(g,x,684,3,10,'#967548');r(g,x,717,3,9,'#967548');}
    cottage((x,y,w,h,c)=>r(g,x,y,w,h,c),850,750);
    r(g,907,780,26,4,'#a17d4d');r(g,910,784,2,4,'#74563a');r(g,928,784,2,4,'#74563a');r(g,920,773,10,7,'#c09a67');
    for(let i=0;i<12;i++){const x=976+(i%3)*3,y=625+Math.floor(i/3)*7;r(g,x,y,1,11,'#6c925d');r(g,x-1,y-2,3,4,'#b9aa77');}
    // A moored rowboat, baskets, stepping stones, and a picnic blanket.
    // Moored boat is drawn by the animated surface pass, including in the atlas.
    r(g,950,736,10,9,'#b48b54');r(g,952,734,6,2,'#f0d8a1');r(g,953,736,2,5,'#ddaa76');
    r(g,772,756,45,29,'#d5a596');for(let x=772;x<817;x+=8)r(g,x,757,4,27,'#eee0b0');r(g,783,762,12,8,'#b59868');r(g,785,759,8,3,'#ebd6a3');
    for(const [x,y]of [[900,655],[883,637],[922,738]]){r(g,x,y,13,3,'#aab091');r(g,x+2,y-2,8,3,'#c4c8a7');}
    lantern(g,951,683);lantern(g,914,788);
    r(g,748,669,28,4,'#a78051');r(g,748,663,28,4,'#bf9a64');r(g,751,673,2,5,'#755536');r(g,771,673,2,5,'#755536');
    for(let i=0;i<7;i++){r(g,643+i*15,803,3,16,'#97734a');r(g,641+i*15,801,7,3,'#d8b685');if(i<6)r(g,646+i*15,808,13,2,'#bc9867');}
    for(let i=0;i<6;i++){flower(g,719+i*5,738,i%2?p.flowers:'#eed18e');flower(g,878+i*4,732,i%2?'#edca7f':p.flowers);}
    for(let i=0;i<8;i++)flower(g,692+i*9,641+i%2*3,p.flowers);
  }
  function bake(season) {
    if(terrain&&currentSeason===season)return;
    currentSeason=season;const p=palettes[season];terrain=canvas(WIDTH,HEIGHT);const g=terrain.getContext('2d');
    r(g,0,0,WIDTH,HEIGHT,p.grass);
    // Repeating 16px ground details, with stable positions across reloads.
    for(let y=0;y<HEIGHT;y+=8)for(let x=0;x<WIDTH;x+=8){const n=noise(x,y);if(n%4===0)r(g,x+n%6,y+(n>>>3)%6,2,1,p.light);if(n%7===0){r(g,x+2,y+2,1,3,p.dark);r(g,x+3,y+3,2,1,p.dark);}if(n%79===0){r(g,x+3,y+2,1,4,p.dark);r(g,x+2,y+1,3,2,p.flowers);r(g,x+3,y+1,1,1,'#fff0bc');}}
    // A single river winds through the valley and joins the town waterfront.
    for(let y=0;y<HEIGHT;y++){const bank=y<300?1002+Math.round(Math.sin(y*.011)*10):991;r(g,bank-5,y,WIDTH-bank+5,1,'#7e9e63');r(g,bank,y,WIDTH-bank,1,'#4f929e');r(g,bank+6,y,WIDTH-bank-6,1,season==='winter'?'#accfd0':'#78b5b7');}
    for(let i=0;i<160;i++){const x=1008+noise(i,0)%90,y=noise(i,1)%HEIGHT;r(g,x,y,8,1,'#a9d4ce');}
    // The paths actually connect the farm, ranch, square, and northern mine.
    path(g,110,435,760,22);path(g,465,207,24,506);path(g,476,201,91,22);path(g,365,448,23,70);path(g,345,706,135,21);path(g,614,443,214,22);
    path(g,224,270,19,88);path(g,287,347,190,18);path(g,287,349,19,94);
    parkScenery(g,p);forestScenery(g,p);fishingScenery(g,p);
    // Northern hill / mine entrance, and a small campsite on the walking route.
    r(g,488,112,145,85,'#788e6b');r(g,495,98,132,89,'#a0ac85');r(g,503,89,117,78,'#b4b38d');r(g,517,81,91,70,'#b4b38d');r(g,530,75,58,20,'#c1bc97');
    for(let i=0;i<42;i++)r(g,501+noise(i,2)%110,93+noise(i,3)%63,4,2,i%2?'#8d9877':'#c5c09a');
    r(g,534,137,54,52,'#67715c');r(g,540,136,43,49,'#494f48');r(g,548,143,28,44,'#283936');r(g,540,183,43,6,'#c0a06a');
    r(g,531,138,6,48,'#886844');r(g,584,138,6,48,'#886844');r(g,529,133,63,7,'#a88654');r(g,531,133,58,2,'#e0b777');
    r(g,600,168,2,24,'#675139');r(g,597,164,8,8,'#674c34');r(g,599,166,4,4,'#ffda88');
    r(g,434,314,21,19,'#64854d');r(g,437,318,14,11,'#c2925c');r(g,439,320,10,7,'#554b35');
    r(g,500,379,32,4,'#785436');r(g,501,374,30,4,'#bd965b');r(g,502,383,3,7,'#634d34');r(g,527,383,3,7,'#634d34');
    // Clusters of flowers, rounded stones, and small shrubs soften the paths.
    for(const [x,y]of [[307,298],[336,317],[423,469],[584,255],[552,294],[74,358],[572,621],[587,654],[654,685],[81,752]]){
      r(g,x-9,y-2,20,7,'#698950');r(g,x-6,y-7,15,10,'#86a85e');r(g,x-3,y-9,8,5,'#9cbc6f');
      for(let i=0;i<3;i++){r(g,x-5+i*6,y-4,2,3,p.flowers);r(g,x-5+i*6,y-4,1,1,'#fff4b9');}
    }
    for(const [x,y]of [[449,283],[578,90],[675,249],[69,508],[533,811]]){r(g,x-5,y,13,6,'#788376');r(g,x-3,y-3,10,7,'#a7ad91');r(g,x,y-3,6,1,'#d1cbb0');}
    trees=[];const broad=treeSprite(p.leaf),pine=treeSprite(season==='winter'?'#a6bdb1':'#568453',true);
    const positions=[[75,275],[42,102],[349,292],[67,420],[93,467],[49,583],[515,494],[527,725],[553,755],[97,813],[668,724],[742,804],[930,839],[986,180],[654,147],[697,124],[427,137],[411,212],[55,52],[252,54],[376,65],[749,58],[975,67],[629,253],[934,783],[694,653]];
    for(let i=0;i<positions.length;i++){const [x,y]=positions[i];trees.push({x,y,sprite:i%3===0?broad:pine});}
    for(const node of BackyardGeography.trees)trees.push({...node,sprite:node.type==='pine'?pine:broad});
  }
  function player(g,x,y,phase,direction) {
    const step=Math.sin(phase)*1.4,back=direction==='up';
    r(g,x-7,y-1,15,4,'#344d3d55');r(g,x-4,y-6,3,6+step,'#48565d');r(g,x+2,y-6,3,6-step,'#48565d');r(g,x-5,y-1+step,4,2,'#775238');r(g,x+2,y-1-step,4,2,'#775238');
    r(g,x-5,y-16,11,11,'#5b735c');r(g,x-4,y-16,9,8,'#c8794b');r(g,x-3,y-15,2,8,'#ebaa6b');r(g,x+3,y-14,2,8,'#a14f38');r(g,x-6,y-13,2,7,'#e8b98a');r(g,x+6,y-13,2,7,'#e8b98a');
    r(g,x-4,y-24,9,9,back?'#754c34':'#edc19a');r(g,x-5,y-25,11,4,'#6a4932');r(g,x-7,y-25,15,2,'#bc9458');r(g,x-5,y-28,11,4,'#e1bc73');r(g,x-4,y-28,9,1,'#f9dda0');
    if(!back){r(g,x+(direction==='left'?-3:0),y-21,1,2,'#513d31');r(g,x+(direction==='right'?4:3),y-21,1,2,'#513d31');r(g,x,y-17,3,1,'#bf7f67');}
    else{r(g,x-3,y-16,7,7,'#8e633d');r(g,x-2,y-15,5,5,'#c99959');}
  }
  function drawAtmosphere(g,time,still) {
    // Water, pennants, and wildlife are decorative, independent of game timing.
    if(!still){
      g.strokeStyle='#c1ddd1aa';g.lineWidth=1;for(let i=0;i<18;i++){const x=1012+(i*19)%81,y=(i*43+time*.012)%HEIGHT;g.beginPath();g.moveTo(x,y);g.lineTo(x+7,y);g.stroke();}
      for(const [x,y]of [[708,704],[583,350],[902,301],[381,331]]){const dx=Math.sin(time*.0015+x)*7,dy=Math.cos(time*.002+y)*4;r(g,x+dx,y+dy,2,3,'#dfb4a4');r(g,x+dx-2,y+dy-1,3,2,'#e9d998');r(g,x+dx+1,y+dy-1,3,2,'#e9d998');}
      for(let i=0;i<3;i++){const x=1012+Math.sin(time*.0004+i)*18,y=604+i*19+Math.cos(time*.0005+i)*6;r(g,x,y,7,4,'#f1e7c8');r(g,x+5,y-3,4,4,'#d6d3b5');r(g,x+8,y-1,2,1,'#d9a062');}
    }
    for(const sign of BackyardGeography.signs){r(g,sign.x-15,sign.y-2,30,9,'#7a5839');r(g,sign.x-13,sign.y-1,26,6,sign.color);r(g,sign.x-8,sign.y+7,2,7,'#9f7b4e');r(g,sign.x+7,sign.y+7,2,7,'#9f7b4e');}
  }
  function drawOverview(g,w,h,plots,townMap,ranchMap) {
    g.save();g.scale(w/WIDTH,h/HEIGHT);g.imageSmoothingEnabled=false;g.drawImage(terrain,0,0);
    if(townMap)g.drawImage(townMap,625,300,420,300);if(ranchMap)g.drawImage(ranchMap,125,510,400,320);
    cottage((x,y,cw,ch,c)=>r(g,x,y,cw,ch,c),115,298);
    r(g,165,339,123,88,'#b0bd79');
    for(const plot of plots){const x=170+plot.x*16,y=345+plot.y*16;r(g,x,y,15,15,plot.w?'#715139':'#99754e');if(plot.s){r(g,x+6,y-1,3,12,'#759b4e');r(g,x+3,y+3,10,4,plot.st===3?'#dab276':'#91b85c');}}
    if(root.BackyardAmbience)BackyardAmbience.surface(g,0,true,currentSeason,0);
    const details=root.BackyardAmbience?BackyardAmbience.actors(0,true,currentSeason,0):[];
    const actors=[...details,...trees.map(t=>({y:t.y,draw:()=>{if(root.BackyardActivities)BackyardActivities.drawTree(g,t,0);else g.drawImage(t.sprite,t.x-21,t.y-61);}}))].sort((a,b)=>a.y-b.y);
    for(const actor of actors)actor.draw(g);
    g.restore();
  }
  root.BackyardArt={WIDTH,HEIGHT,palettes,bake,player,cottage,drawAtmosphere,drawOverview,get terrain(){return terrain;},get trees(){return trees;},noise};
})(globalThis);
