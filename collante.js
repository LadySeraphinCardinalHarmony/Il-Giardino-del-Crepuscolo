"use strict";
/* ============ collegamenti fra le parti aggiunte e il nucleo dell'app ==== */
S.compSez='inc';
S.compUser={};
/* fondo i blocchi di dati caricati separatamente */
if(typeof CLASSI_EXTRA!=='undefined')
  Object.keys(CLASSI_EXTRA).forEach(function(k){ CLASSI[k]=CLASSI_EXTRA[k] });
if(typeof SRD_INC2!=='undefined') SRD_INC=SRD_INC.concat(SRD_INC2);
/* la scheda cartacea si adatta alla larghezza dopo ogni disegno */
(function(){
  var old=render;
  render=function(){ old.apply(null,arguments);
    if(typeof scalaCarta==='function') setTimeout(scalaCarta,16) };
})();
document.addEventListener('click',function(e){
  var t=e.target.closest('[data-opensess],[data-delsess],[data-stato],[data-offstato],[data-cs],'+
    '[data-addinc],[data-addarma],[data-sec]');
  if(!t) return;
  var d=t.dataset;
  if(d.opensess!==undefined){
    var s=null; S.sessioni.forEach(function(x){ if(x.id===d.opensess) s=x });
    if(!s) return;
    if(S.sess&&S.sess.id!==s.id){ S.sess.aperta=false; saveSess() }
    S.sess=s; s.aperta=true; saveSess(); renderFromTop(); return;
  }
  if(d.delsess!==undefined){
    ask('Elimina sessione','Il diario e la cronologia vengono cancellati.','Elimina').then(function(y){
      if(!y) return;
      DB.remove(P.sess(d.delsess)).then(caricaSessioni).then(renderFromTop);
    });
    return;
  }
  if(d.stato!==undefined){
    if(!S.sess) return toast('Apri prima una sessione');
    S.sess.stati=S.sess.stati||{};
    S.sess.stati[d.stato]=!S.sess.stati[d.stato];
    S.sess.log.unshift({t:nowISO(),txt:(S.sess.stati[d.stato]?'Attivo: ':'Spento: ')+d.stato.split(':')[1]});
    saveSess();
    t.style.boxShadow=S.sess.stati[d.stato]?'inset 0 0 0 2px var(--m2)':'';
    t.textContent=S.sess.stati[d.stato]?'●':'○';
    return;
  }
  if(d.offstato!==undefined){
    S.sess.stati[d.offstato]=false; saveSess(); render(); return;
  }
  if(d.cs!==undefined){ S.compSez=d.cs; render(); return }
  if(d.addinc!==undefined){
    var sp=null; SRD_INC.forEach(function(a){ if(a[0]===d.addinc) sp=incObj(a) });
    if(!sp||!S.pg) return;
    S.pg.values.incant=(S.pg.values.incant||[]).concat([sp]);
    savePGSoon(); toast(sp.nome+' aggiunto alla scheda'); return;
  }
  if(d.addarma!==undefined){
    if(!S.pg) return;
    var w=null; SRD_ARMI.forEach(function(a){ if(a[0]===d.addarma) w=a });
    var v=S.pg.values, A=autoDnD(S.pg);
    var acc=/accurata/.test(w[4])||/distanza/.test(w[1]);
    var car=acc?Math.max(modOf(v.forza),modOf(v.des)):modOf(v.forza);
    var b=car+A.comp;
    v.atk=(v.atk||[]).concat([{nome:w[0],bonus:(b>=0?'+':'')+b,danni:w[2]+(car>=0?'+':'')+car}]);
    savePGSoon(); toast(w[0]+' aggiunta alla scheda'); return;
  }
},false);

/* le sezioni ricordano se le hai chiuse */
document.addEventListener('toggle',function(e){
  var s=e.target;
  if(!s.dataset||!s.dataset.sec) return;
  S.secChiuse[s.dataset.sec]=!s.open;
},true);

/* ricerca nel compendio */
document.addEventListener('input',function(e){
  if(e.target.dataset&&e.target.dataset.cq!==undefined){
    var r=document.getElementById('cres');
    if(r) r.innerHTML=compLista(e.target.value);
  }
},false);

/* la sessione carica anche l'elenco all'avvio */
(function(){
  var t=0;
  var iv=setInterval(function(){
    t++;
    if(S.pgs!==undefined&&DB.store){
      clearInterval(iv);
      if(typeof caricaCompUser==='function') caricaCompUser().then(function(){ if(S.tab==='compendio') render() });
      if(typeof caricaSchemiUser==='function') caricaSchemiUser().then(function(){ render() });
      if(typeof caricaSottoUser==='function') caricaSottoUser().then(function(){ if(S.tab==='scheda') render() });
      if(typeof caricaProfili==='function') caricaProfili().then(function(){ if(S.tab==='sessione') render() });
      if(S.cfg.sincroAuto&&S.cfg.sincroUrl&&typeof scaricaPacchetto==='function')
        setTimeout(function(){ scaricaPacchetto(false) },1800);
      caricaSessioni().then(function(all){
        var aperte=all.filter(function(x){return x.aperta});
        if(aperte.length) S.sess=aperte[0];
        if(S.tab==='sessione') render();
      });
    }
    if(t>60) clearInterval(iv);
  },120);
})();
