/* Shared geography: art, navigation, and activities use the same landmarks. */
(function (root) {
  'use strict';
  const regions = {
    farm: {name:'向阳农庄',subtitle:'播种、浇水，把收成装进一只篮子。',x:302,y:418,icon:'sprout'},
    ranch: {name:'河湾牧场',subtitle:'领养伙伴，照料鸡鸭与牛羊。',x:325,y:720,icon:'barn'},
    town: {name:'石溪小镇',subtitle:'赶集、加工，认识河谷里的朋友。',x:824,y:475,icon:'house'},
    park: {name:'风车游乐园',subtitle:'套圈、打靶、翻牌，攒票换小礼物。',x:235,y:245,icon:'wheel'},
    forest: {name:'青杉伐木林',subtitle:'带上斧头，把木材带回农庄。',x:816,y:259,icon:'tree'},
    fishing: {name:'柳荫钓鱼湾',subtitle:'等一次咬钩，再慢慢收紧鱼线。',x:954,y:710,icon:'fish'},
    mine: {name:'北山矿洞',subtitle:'挖掘、合成、战斗，探索地下晶洞。',x:563,y:211,icon:'lamp'}
  };
  const trees = [
    {id:'oak-1',x:779,y:244,type:'oak'}, {id:'pine-1',x:845,y:226,type:'pine'},
    {id:'oak-2',x:909,y:258,type:'oak'}, {id:'pine-2',x:943,y:191,type:'pine'},
    {id:'pine-3',x:867,y:157,type:'pine'}, {id:'oak-3',x:752,y:165,type:'oak'},
    {id:'oak-4',x:812,y:118,type:'oak'}, {id:'pine-4',x:920,y:109,type:'pine'}
  ];
  const park = [
    {id:'rings',x:115,y:160,name:'午后套圈',description:'看准瓶子，让圆环落在好位置。'},
    {id:'targets',x:239,y:151,name:'萝卜打靶',description:'瞄准冒出的萝卜，手快一点。'},
    {id:'memory',x:336,y:145,name:'河谷翻翻乐',description:'翻出相同的小图，记住它们在哪。'},
    {id:'prizes',x:333,y:233,name:'游园兑奖亭',description:'用游园票换种子、鱼饵和饲料。'}
  ];
  const fishing = [
    {id:'pier',x:972,y:705,name:'木栈桥',waterX:1036,waterY:711},
    {id:'reeds',x:962,y:643,name:'芦苇岸',waterX:1028,waterY:646},
    {id:'willow',x:963,y:797,name:'柳树下',waterX:1032,waterY:791}
  ];
  const obstacles = [
    {x:76,y:109,w:74,h:38},{x:200,y:99,w:75,h:37},{x:307,y:94,w:56,h:35},
    {x:313,y:182,w:48,h:35},{x:74,y:190,w:74,h:34},
    {x:716,y:259,w:40,h:26},{x:797,y:77,w:14,h:15},{x:849,y:749,w:62,h:32}
  ];
  const signs = [
    {x:211,y:266,label:'风车游乐园',color:'#b37359'},
    {x:819,y:287,label:'青杉伐木林',color:'#527d58'},
    {x:895,y:633,label:'柳荫钓鱼湾',color:'#507e88'},
    {x:562,y:221,label:'北山矿洞',color:'#817259'},
    {x:235,y:465,label:'向阳农庄',color:'#879753'},
    {x:323,y:825,label:'河湾牧场',color:'#a67d52'},
    {x:825,y:600,label:'石溪小镇',color:'#648c99'}
  ];
  root.BackyardGeography = {regions,trees,park,fishing,obstacles,signs};
})(globalThis);
