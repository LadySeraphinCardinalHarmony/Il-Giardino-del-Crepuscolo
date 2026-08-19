"use strict";
/* ================================================= scheda in stile cartaceo */
function sheetCarta(pg){
  var v=pg.values, A=autoDnD(pg);
  if(v.pf.cur==null) v.pf.cur=A.pfMax;
  var CAR=[['forza','Forza'],['des','Destrezza'],['cos','Costituzione'],
           ['int','Intelligenza'],['sag','Saggezza'],['car','Carisma']];
  function carBox(id,label){
    var m=modOf(v[id]);
    return '<div class="box car"><div class="cn">'+label+'</div>'+
      '<input class="cv" type="number" inputmode="numeric" data-v="'+id+'" value="'+(v[id]||10)+'"'+
      ' style="background:transparent;border:0;text-align:center;width:100%">'+
      '<button class="cm metal" data-roll="1d20'+(m>=0?'+':'')+m+'" data-rl="'+label+'">'+
      (m>=0?'+':'')+m+'</button></div>';
  }
  function riga(id,label,attr,comp,tot){
    return '<div class="abi"><button class="pb'+(comp?' on':'')+'"'+
      (attr?' data-abil="'+id+'"':'')+'></button>'+
      '<span class="nv">'+(tot>=0?'+':'')+tot+'</span>'+
      '<span class="an">'+label+'</span>'+
      '<span class="aa">'+(attr||'')+'</span>'+
      '<button class="pill" data-roll="1d20'+(tot>=0?'+':'')+tot+'" data-rl="'+esc(label)+'">d20</button></div>';
  }
  var ts=CAR.map(function(c){
    var comp=A.tsComp.indexOf(c[0])>=0, tot=modOf(v[c[0]])+(comp?A.comp:0);
    return riga('ts_'+c[0],c[1],null,comp,tot)}).join('');
  var abil=ABIL5E.map(function(a){
    var st=(v.abil&&v.abil[a[0]])||0;
    var tot=modOf(v[a[2]])+(st===2?A.comp*2:st===1?A.comp:0);
    return riga(a[0],a[1],a[2],st>0,tot)}).join('');
  var slotHtml=A.slot.length?'<div class="box"><div class="tri" style="grid-template-columns:repeat(6,1fr)">'+
    A.slot.map(function(n,i){ if(!n) return '';
      var used=(v.slotUsati&&v.slotUsati[i+1])||0;
      return '<div style="text-align:center"><div class="mini">'+(i+1)+'\u00b0</div>'+
        '<div class="big" style="font-size:19px">'+(n-used)+'/'+n+'</div></div>'}).join('')+
    '</div><div class="tt">'+(A.patto?'slot del patto':'slot incantesimo')+'</div></div>':'';

  var html='<div class="carta" id="carta">'+
   '<div class="band" style="grid-template-columns:1.3fr 1fr 1.2fr 1fr 1fr">'+
    '<div class="box"><input class="nome" data-name value="'+esc(pg.name)+'" style="width:100%">'+
     '<div class="tt">nome del personaggio</div></div>'+
    '<div class="box"><input data-v="classe-disp" value="'+esc((CLASSI[v.classe]||{}).n||'')+' '+(v.liv||1)+'" readonly style="width:100%">'+
     '<div class="tt">classe e livello</div></div>'+
    (SOTTOCLASSI[v.classe]&&Number(v.liv||1)>=SOTTOCLASSI[v.classe].liv
      ? '<div class="box"><select data-v="sotto" style="width:100%;background:transparent;border:0;padding:0;font-family:var(--display);font-size:15px">'+
        '<option value="">— scegli —</option>'+SOTTOCLASSI[v.classe].l.map(function(x){
          return '<option'+(v.sotto===x.n?' selected':'')+'>'+esc(x.n)+'</option>'}).join('')+
        '</select><div class="tt">'+esc(SOTTOCLASSI[v.classe].n.toLowerCase())+'</div></div>'
      : '<div class="box"><input value="—" readonly style="width:100%">'+
        '<div class="tt">'+esc((SOTTOCLASSI[v.classe]||{n:'sottoclasse'}).n.toLowerCase())+' dal '+
        ((SOTTOCLASSI[v.classe]||{liv:3}).liv)+'\u00b0 livello</div></div>')+
    '<div class="box"><input data-v="specie" value="'+esc(v.specie||'')+'" style="width:100%">'+
     '<div class="tt">specie</div></div>'+
    '<div class="box"><input data-v="background" value="'+esc(v.background||'')+'" style="width:100%">'+
     '<div class="tt">background</div></div>'+
   '</div>'+
   '<div class="cols">'+
    '<div>'+CAR.map(function(c){return carBox(c[0],c[1])}).join('')+'</div>'+
    '<div>'+
      '<div class="box" style="display:flex;align-items:center;gap:10px">'+
        '<div class="big" style="min-width:56px">+'+A.comp+'</div>'+
        '<div style="flex:1"><div class="tt" style="text-align:left;margin:0">bonus di competenza</div>'+
        '<div class="mini" style="text-align:left">percezione passiva '+A.percPass+'</div></div></div>'+
      '<div class="box">'+ts+'<div class="tt">tiri salvezza</div></div>'+
      '<div class="box">'+abil+'<div class="tt">abilità</div></div>'+
    '</div>'+
    '<div>'+
      '<div class="tri">'+
        '<div class="box"><input class="big" type="number" data-v="ca" value="'+(v.ca||10)+'" style="background:transparent;border:0;width:100%">'+
          '<div class="tt">armatura</div></div>'+
        '<div class="box"><button class="big" style="width:100%" data-roll="1d20'+(A.iniz>=0?'+':'')+A.iniz+'" data-rl="Iniziativa">'+
          (A.iniz>=0?'+':'')+A.iniz+'</button><div class="tt">iniziativa</div></div>'+
        '<div class="box"><input class="big" type="number" data-v="vel" value="'+(v.vel||9)+'" style="background:transparent;border:0;width:100%">'+
          '<div class="tt">velocità</div></div>'+
      '</div>'+
      '<div class="box"><div class="row" style="gap:6px;justify-content:center">'+
        '<button class="btn sm" data-pf="-1">−</button>'+
        '<input class="big" type="number" data-pfcur value="'+v.pf.cur+'" style="background:transparent;border:0;width:80px">'+
        '<span class="mini" style="font-size:14px">/ '+A.pfMax+'</span>'+
        '<button class="btn sm" data-pf="1">＋</button></div>'+
        '<div class="tt">punti ferita · dadi vita '+A.dv+'</div></div>'+
      slotHtml+
      '<div class="box"><table><thead><tr><th>Arma</th><th>Tiro</th><th>Danni</th></tr></thead><tbody>'+
        ((v.atk||[]).map(function(w,i){
          return '<tr><td>'+esc(w.nome||'')+'</td>'+
            '<td><button class="pill" data-rollrow="atk" data-i="'+i+'" data-tpl="1d20+{bonus}">'+esc(w.bonus||'')+'</button></td>'+
            '<td><button class="pill" data-rollrow="atk" data-i="'+i+'" data-tpl="{danni}">'+esc(w.danni||'')+'</button></td></tr>'}).join('')
         ||'<tr><td colspan="3" class="mini" style="text-align:left">nessuna arma</td></tr>')+
        '</tbody></table><div class="tt">attacchi</div></div>'+
      '<div class="box"><textarea data-v="equip" style="width:100%">'+esc(v.equip||'')+'</textarea>'+
        '<div class="tt">equipaggiamento</div></div>'+
    '</div>'+
   '</div>'+
   '<div class="cols" style="margin-top:10px;grid-template-columns:1fr 1fr">'+
     '<div class="box"><div style="font-size:12.5px;line-height:1.55">'+
       A.priv.concat(typeof privSotto==='function'?privSotto(pg):[])
        .sort(function(a,b){return a.liv-b.liv})
        .map(function(f){return '<b style="font-weight:600">'+esc(f.n)+'</b> <span class="mini" style="display:inline">('+f.liv+')</span><br>'+
         '<span style="color:var(--ink-dim)">'+esc(f.t)+'</span>'}).join('<br><br>')+
       '</div><div class="tt">privilegi di classe</div></div>'+
     '<div class="box"><div style="font-size:12.5px;line-height:1.6">'+
       ((v.incant||[]).length?(v.incant||[]).map(function(s){
         return '<b style="font-weight:600">'+esc(s.nome)+'</b> <span class="mini" style="display:inline">'+
           (s.liv===0?'trucchetto':s.liv+'\u00b0')+'</span><br><span style="color:var(--ink-dim)">'+esc(s.note||'')+'</span>'}).join('<br><br>')
        :'<span class="mini" style="text-align:left;display:block">nessun incantesimo</span>')+
       '</div><div class="tt">incantesimi</div></div>'+
   '</div>'+
   '</div>';

  return '<div class="cartabar">'+
      '<button class="btn sm" data-foglio="adattivo">Adattivo</button>'+
      '<button class="btn sm" data-foglio="cartaceo" style="box-shadow:inset 0 0 0 2px var(--m2)">Cartaceo</button>'+
      '<span class="faint" style="flex:1;font-size:12px">Come la scheda di carta, rimpicciolita per lo schermo.</span>'+
    '</div>'+slab('<div class="cartawrap" id="cw">'+html+'</div>');
}
function scalaCarta(){
  var w=document.getElementById('cw'), c=document.getElementById('carta');
  if(!w||!c) return;
  var s=Math.min(1,w.clientWidth/860);
  c.style.transform='scale('+s.toFixed(4)+')';
  w.style.height=(c.scrollHeight*s)+'px';
}
document.addEventListener('click',function(e){
  var b=e.target.closest('[data-foglio]');
  if(!b) return;
  S.cfg.foglio=b.dataset.foglio; saveCfgSoon(); render();
},false);
window.addEventListener('resize',function(){ setTimeout(scalaCarta,50) });
