"use strict";
/* ==========================================================================
   Pacchetti di contenuti: quello che prepari sul computer arriva al tablet,
   copiando un file oppure scaricandolo da un indirizzo.
   ========================================================================== */
function pacchettoCorrente(){
  return {
    tipo:'tavolo-contenuti', versione:1, generato:nowISO(),
    da:PIATT.nome,
    compendio:S.compUser||{},
    sistemi:(S.schemiUser||[]),
    incantesimi:(S.cfg.incantesimiUser||[]),
    sottoclassi:(S.sottoUser||{}),
    bozze:(S.sottoBozze||{}),
    profili:(S.profili||{})
  };
}
function firmaPacchetto(p){
  var n=0;
  Object.keys(p.compendio||{}).forEach(function(k){ n+=(p.compendio[k]||[]).length });
  return n+' voci · '+((p.sistemi||[]).length)+' schede · '+
    Object.keys(p.sottoclassi||{}).length+' sottoclassi · '+
    Object.keys(p.profili||{}).length+' profili · '+new Date(p.generato).toLocaleString('it-IT');
}
function applicaPacchetto(p){
  if(!p||p.tipo!=='tavolo-contenuti') return Promise.reject(new Error('Non è un pacchetto di Tavolo.'));
  S.compUser=S.compUser||{};
  var jobs=[];
  Object.keys(p.compendio||{}).forEach(function(sys){
    var esistenti={}; (S.compUser[sys]||[]).forEach(function(x){ esistenti[x.nome]=1 });
    var nuove=(p.compendio[sys]||[]).filter(function(x){ return !esistenti[x.nome] });
    S.compUser[sys]=(S.compUser[sys]||[]).concat(nuove);
    jobs.push(salvaCompUser(sys));
  });
  (p.sistemi||[]).forEach(function(sc){ jobs.push(salvaSchemaUser(sc)) });
  if(p.profili&&typeof salvaProfilo==='function')
    Object.keys(p.profili).forEach(function(k){ jobs.push(salvaProfilo(p.profili[k])) });
  if(p.sottoclassi&&typeof salvaSottoUser==='function'){
    S.sottoUser=S.sottoUser||{};
    S.sottoBozze=S.sottoBozze||{};
    Object.keys(p.sottoclassi).forEach(function(k){
      if(!S.sottoUser[k]){ S.sottoUser[k]=p.sottoclassi[k];
        if((p.bozze||{})[k]) S.sottoBozze[k]=1 } });
    jobs.push(salvaSottoUser());
  }
  S.cfg.ultimoPacchetto={quando:nowISO(),firma:firmaPacchetto(p)};
  jobs.push(saveCfg());
  return Promise.all(jobs).then(function(){
    return caricaCompUser();
  }).then(caricaSchemiUser);
}
ACT.esportaPacchetto=function(){
  var p=pacchettoCorrente();
  download('tavolo-contenuti-'+new Date().toISOString().slice(0,10)+'.json',
    new Blob([JSON.stringify(p,null,1)],{type:'application/json'}));
  toast(firmaPacchetto(p));
};
ACT.importaPacchetto=function(){
  pickFile('application/json').then(function(fs){
    if(!fs[0]) return;
    return fs[0].text().then(function(t){
      var p=JSON.parse(t);
      return ask('Aggiorna i contenuti',firmaPacchetto(p)+
        '<br><br>Le voci che hai già non vengono duplicate.','Aggiorna').then(function(y){
        if(!y) return;
        return applicaPacchetto(p).then(function(){ render(); toast('Contenuti aggiornati') });
      });
    });
  }).catch(function(e){ toast('File non valido') });
};
/* ---------------------- sincronizzazione da un indirizzo ---------------- */
ACT.sincro=function(){
  modal('<h2 style="font-size:19px">Sincronizzazione</h2>'+
    '<p class="faint" style="margin:9px 0;line-height:1.6">Metti il pacchetto in un posto raggiungibile dalla rete '+
    'e incolla qui il suo indirizzo. Il tablet lo controlla all\u2019avvio e ti avvisa se è cambiato.</p>'+
    '<label style="display:block;margin-bottom:11px"><span class="lab">Indirizzo del pacchetto</span>'+
    '<input id="su" value="'+esc(S.cfg.sincroUrl||'')+'" placeholder="https://raw.githubusercontent.com/tuonome/tavolo/main/contenuti.json"></label>'+
    '<label class="row" style="margin-bottom:12px;gap:9px"><input type="checkbox" id="sa" '+
    (S.cfg.sincroAuto?'checked':'')+' style="width:20px;height:20px;flex:none">'+
    '<span class="grow faint" style="font-size:12.5px">Controlla a ogni avvio</span></label>'+
    (S.cfg.ultimoPacchetto?'<p class="faint" style="margin:0 0 12px">Ultimo aggiornamento: '+
      esc(S.cfg.ultimoPacchetto.firma)+'</p>':'')+
    '<div class="row" style="gap:7px"><button class="btn grow" data-close>Chiudi</button>'+
    '<button class="btn grow" id="sv">Salva</button>'+
    '<button class="mbtn metal grow" id="sn"><span>Scarica ora</span></button></div>'+
    '<p class="faint" style="margin:12px 0 0;line-height:1.6">Se usi GitHub: metti <b style="color:var(--ink)">contenuti.json</b> '+
    'nello stesso repository dell\u2019app e usa l\u2019indirizzo <b style="color:var(--ink)">raw.githubusercontent.com</b>. '+
    'Va bene anche un link condiviso di iCloud Drive, Dropbox o Drive, purché scarichi il file diretto.</p>',
  function(el,close){
    $('#sv',el).onclick=function(){
      S.cfg.sincroUrl=$('#su',el).value.trim();
      S.cfg.sincroAuto=$('#sa',el).checked;
      saveCfg(); close(); toast('Impostazione salvata');
    };
    $('#sn',el).onclick=function(){
      S.cfg.sincroUrl=$('#su',el).value.trim();
      S.cfg.sincroAuto=$('#sa',el).checked; saveCfg();
      close(); scaricaPacchetto(true);
    };
  });
};
function scaricaPacchetto(manuale){
  var url=S.cfg.sincroUrl;
  if(!url) return manuale&&toast('Nessun indirizzo impostato');
  var m=manuale?modal('<h2 style="font-size:19px">Scarico</h2>'+
    '<p class="faint" style="margin:9px 0"><span class="busy"></span> controllo l\u2019indirizzo…</p>'):null;
  return fetch(url,{cache:'no-store'}).then(function(r){
    if(!r.ok) throw new Error('il server ha risposto '+r.status);
    return r.json();
  }).then(function(p){
    if(m) m.close();
    if(S.cfg.ultimoPacchetto&&S.cfg.ultimoPacchetto.firma===firmaPacchetto(p)){
      if(manuale) toast('Sei già aggiornato');
      return;
    }
    return ask('Contenuti disponibili',firmaPacchetto(p),'Aggiorna').then(function(y){
      if(!y) return;
      return applicaPacchetto(p).then(function(){ render(); toast('Contenuti aggiornati') });
    });
  }).catch(function(e){
    if(m) m.close();
    if(manuale) modal('<h2 style="font-size:19px">Non ci sono riuscito</h2>'+
      '<p class="faint" style="margin:9px 0 14px;line-height:1.6">'+esc(e.message)+
      '<br><br>Se il file sta su un altro sito, quel sito deve permettere il download da pagine esterne. '+
      'GitHub lo permette, molti servizi di condivisione no: in quel caso copia il file a mano.</p>'+
      '<button class="btn" style="width:100%" data-close>Chiudi</button>');
  });
}
