"use strict";
/* ==========================================================================
   Profilo di sessione: descrive come si gioca un sistema — che tiro si usa,
   quali azioni esistono, quali stati, come si risolve un attacco.
   Il pannello di sessione si costruisce da qui, quindi vale per qualsiasi
   gioco, non solo per quelli che ho scritto a mano.
   ========================================================================== */
function caricaProfili(){
  return DB.list('profili').then(function(ps){
    return Promise.all(ps.map(function(p){return DB.readJSON(p)}));
  }).then(function(all){
    S.profili={};
    all.filter(Boolean).forEach(function(p){ if(p.sys) S.profili[p.sys]=p });
  }).catch(function(){ S.profili={} });
}
function salvaProfilo(p){
  S.profili=S.profili||{};
  S.profili[p.sys]=p;
  return DB.writeJSON('profili/'+p.sys+'.json',p);
}
function profiloDi(sys){ return (S.profili||{})[sys]||null }
function profiloVuoto(sys,nome){
  return {sys:sys,nome:nome||'',versione:1,creato:nowISO(),bozza:true,
    tiro:{formula:'1d20',descr:'Tira e confronta con una difficoltà.'},
    attacco:{precisione:'1d20+bonus',difesa:'Difesa',danno:'1d6',note:''},
    azioni:[], stati:[], risorse:[{id:'pf',nome:'Punti ferita'}]};
}
/* ---------------- pannello di sessione costruito dal profilo ------------ */
function pannelloProfilo(P){
  var s=S.sess;
  var eroi=s.k.filter(function(k){return k.lato!=='nemico'});
  var nemici=s.k.filter(function(k){return k.lato==='nemico'});
  function riga(k){
    return '<div class="line"'+(k.agito?' style="opacity:.5"':'')+'>'+
      '<button class="pill" data-fuagito="'+k.id+'" style="min-width:30px">'+(k.agito?'●':'○')+'</button>'+
      '<span class="grow">'+esc(k.n)+
      (k.stati&&k.stati.length?'<div class="faint" style="font-size:11px">'+esc(k.stati.join(', '))+'</div>':'')+
      '</span><button class="btn sm" data-fudanno="'+k.id+'">danno</button>'+
      '<span style="font-family:var(--mono);font-weight:700;min-width:52px;text-align:center">'+
      (k.pf==null?'–':k.pf)+(k.pfmax?'/'+k.pfmax:'')+'</span>'+
      (P.stati&&P.stati.length?'<button class="btn sm" data-prstato="'+k.id+'">stati</button>':'')+
      '<button class="btn sm danger" data-delk="'+k.id+'">✕</button></div>';
  }
  var tutti=s.k.length&&s.k.every(function(k){return k.agito});
  return slab('<div class="row" style="margin-bottom:9px">'+
    '<div class="eyebrow grow">'+esc(P.nome||SISTEMI[s.sys]&&SISTEMI[s.sys].n||'Conflitto')+
    ' · turno '+(s.round||1)+(P.bozza?'':'')+'</div>'+
    '<button class="btn sm" data-act="aggcomb">＋</button></div>'+
    (P.bozza?'<div class="line" style="box-shadow:inset 0 0 0 1px var(--m2)">'+
      '<span class="grow faint">Profilo ricavato dal manuale: rileggilo e correggilo dove serve</span>'+
      '<button class="btn sm" data-act="modificaProfilo">apri</button></div>':'')+
    (eroi.length?'<div class="eyebrow" style="margin:9px 0 6px">Personaggi</div>'+eroi.map(riga).join(''):'')+
    (nemici.length?'<div class="eyebrow" style="margin:11px 0 6px">Avversari</div>'+nemici.map(riga).join(''):'')+
    (!s.k.length?'<p class="faint">Aggiungi chi partecipa alla scena.</p>':'')+
    (s.k.length?'<div class="row" style="margin-top:10px">'+
      '<button class="btn grow" data-act="fuNuovoTurno">'+(tutti?'Nuovo turno':'Azzera i segni')+'</button>'+
      '<button class="mbtn metal grow" data-act="attacca"><span>Tira</span></button></div>':'')+
    (P.tiro&&P.tiro.descr?'<p class="faint" style="margin:9px 0 0">'+esc(P.tiro.descr)+'</p>':''));
}
function attaccoProfilo(P){
  var a=P.attacco||{};
  modal('<h2 style="font-size:19px">Risoluzione</h2>'+
    (a.note?'<p class="faint" style="margin:8px 0 11px">'+esc(a.note)+'</p>':
      '<p class="faint" style="margin:8px 0 11px">Formula dal manuale: <b style="color:var(--ink)">'+
      esc(a.precisione||P.tiro.formula)+'</b></p>')+
    '<div class="grid g2" style="margin-bottom:11px">'+
    '<label style="grid-column:1/-1"><span class="lab">Tiro</span>'+
    '<input id="pf" value="'+esc(a.precisione||P.tiro.formula||'1d20')+'"></label>'+
    '<label><span class="lab">'+esc(a.difesa||'Difficoltà')+'</span>'+
    '<input id="pd" type="number" inputmode="numeric" placeholder="opzionale"></label>'+
    '<label><span class="lab">Danno</span><input id="pn" value="'+esc(a.danno||'')+'"></label>'+
    '</div><div id="pr" style="margin-bottom:12px"></div>'+
    '<div class="row"><button class="btn grow" data-close>Chiudi</button>'+
    '<button class="mbtn metal grow" id="po"><span>Tira</span></button></div>',
  function(el,close){
    $('#po',el).onclick=function(){
      var r=rollDice($('#pf',el).value);
      var dif=Number($('#pd',el).value||0);
      var esito=dif?(r.total>=dif?'riesce':'fallisce'):'';
      var d=$('#pn',el).value.trim()?rollDice($('#pn',el).value):null;
      $('#pr',el).innerHTML='<div class="line" style="box-shadow:inset 0 0 0 2px var(--m2)">'+
        '<span class="v" style="font-size:20px">'+r.total+'</span>'+
        '<span class="grow">'+r.html+(esito?'<div class="faint" style="font-size:11px">'+esito+'</div>':'')+'</span></div>'+
        (d?'<div class="line" style="margin-top:7px"><span class="v" style="font-size:20px">'+d.total+'</span>'+
          '<span class="grow">danno<div class="faint" style="font-size:11px">'+d.html+'</div></span>'+
          '<button class="btn sm" data-fuapplica="'+d.total+'">applica</button></div>':'');
      if(S.sess){ S.sess.log.unshift({t:nowISO(),txt:'Tiro '+r.total+(esito?' · '+esito:'')+
        (d?' · '+d.total+' danni':'')}); saveSess() }
      $$('[data-fuapplica]',el).forEach(function(b){ b.onclick=function(){
        close(); fuApplicaDanno(Number(b.dataset.fuapplica)) }});
    };
  });
}
ACT.modificaProfilo=function(){
  var P=profiloDi(S.sess?S.sess.sys:(S.pg&&S.pg.sys));
  if(!P) return toast('Nessun profilo per questo gioco');
  modal('<h2 style="font-size:19px">Profilo di '+esc(P.nome||P.sys)+'</h2>'+
    '<p class="faint" style="margin:8px 0 11px">Quello che il pannello di sessione usa per questo gioco. '+
    'Correggi quello che il modello ha capito male.</p>'+
    '<label style="display:block;margin-bottom:9px"><span class="lab">Tiro base</span>'+
    '<input id="qf" value="'+esc((P.tiro||{}).formula||'')+'"></label>'+
    '<label style="display:block;margin-bottom:9px"><span class="lab">Come funziona</span>'+
    '<textarea id="qd" rows="2">'+esc((P.tiro||{}).descr||'')+'</textarea></label>'+
    '<div class="grid g2" style="margin-bottom:9px">'+
    '<label><span class="lab">Tiro d\u2019attacco</span><input id="qp" value="'+esc((P.attacco||{}).precisione||'')+'"></label>'+
    '<label><span class="lab">Valore da battere</span><input id="qv" value="'+esc((P.attacco||{}).difesa||'')+'"></label>'+
    '<label style="grid-column:1/-1"><span class="lab">Danno</span><input id="qn" value="'+esc((P.attacco||{}).danno||'')+'"></label>'+
    '</div>'+
    '<div class="eyebrow" style="margin-bottom:6px">Azioni ('+((P.azioni||[]).length)+')</div>'+
    '<div style="max-height:22vh;overflow-y:auto;margin-bottom:9px">'+
    ((P.azioni||[]).map(function(a,i){
      return '<div class="line" data-det="pa'+i+'"><span class="grow">'+esc(a[0])+'</span>'+
        '<span class="pill">'+esc(a[1]||'azione')+'</span></div>'+
        '<div class="det" id="pa'+i+'"><div class="body">'+esc(a[2]||'')+'</div></div>'}).join('')
     ||'<p class="faint">Nessuna azione.</p>')+'</div>'+
    '<div class="eyebrow" style="margin-bottom:6px">Stati ('+((P.stati||[]).length)+')</div>'+
    '<div style="max-height:20vh;overflow-y:auto;margin-bottom:11px">'+
    ((P.stati||[]).map(function(st,i){
      return '<div class="line" data-det="ps'+i+'"><span class="grow">'+esc(st[0])+'</span></div>'+
        '<div class="det" id="ps'+i+'"><div class="body">'+esc(st[1]||'')+'</div></div>'}).join('')
     ||'<p class="faint">Nessuno stato.</p>')+'</div>'+
    '<div class="row"><button class="btn grow" data-close>Chiudi</button>'+
    '<button class="mbtn metal grow" id="qo"><span>Salva e conferma</span></button></div>',
  function(el,close){
    $('#qo',el).onclick=function(){
      P.tiro={formula:$('#qf',el).value.trim(),descr:$('#qd',el).value.trim()};
      P.attacco={precisione:$('#qp',el).value.trim(),difesa:$('#qv',el).value.trim(),
                 danno:$('#qn',el).value.trim(),note:(P.attacco||{}).note||''};
      P.bozza=false;
      salvaProfilo(P).then(function(){ close(); render(); toast('Profilo confermato') });
    };
  });
};
