"use strict";
/* ==========================================================================
   Imparare un gioco da un manuale. Quattro passaggi con il modello locale:
   che gioco è, com'è fatta la scheda, come si gioca, cosa contiene il
   compendio. Tutto sul tuo computer, dal PDF che possiedi.
   ========================================================================== */
var APPR={testo:'',nome:'',pdf:''};
function apprPezzi(testo,quanti,lung){
  var out=[];
  for(var i=0;i<testo.length&&out.length<quanti;i+=lung) out.push(testo.slice(i,i+lung));
  return out;
}
function apprCerca(testo,parole,lung){
  var t=testo.toLowerCase(), best=-1, pos=0;
  parole.forEach(function(p){
    var i=t.indexOf(p.toLowerCase());
    if(i>=0&&(best<0||i<best)){ best=i; pos=i }
  });
  if(best<0) return null;
  return testo.slice(Math.max(0,pos-400),pos+(lung||5000));
}
ACT.imparaGioco=function(){
  if(!modoStudio()) return toast('Funzione da computer');
  var m=modal('<h2 style="font-size:19px">Impara un gioco</h2>'+
    '<p class="faint" style="margin:9px 0;line-height:1.6">Carichi il manuale che possiedi e il modello '+
    'locale ne ricava quattro cose: la scheda del personaggio, il profilo di gioco che fa funzionare '+
    'la sessione, gli stati e le azioni, e le voci di compendio. '+
    'Esce una bozza da rileggere, non un risultato definitivo.</p>'+
    '<label style="display:block;margin-bottom:10px"><span class="lab">Nome del gioco</span>'+
    '<input id="gn" value="'+esc(APPR.nome||'')+'" placeholder="Come si chiama"></label>'+
    '<div id="gs" class="faint" style="margin-bottom:10px">'+
    (APPR.testo?'Manuale in memoria: '+esc(APPR.pdf):'Nessun manuale caricato.')+'</div>'+
    '<div class="row" style="gap:7px;margin-bottom:11px">'+
    '<button class="btn grow" id="gp">Carica il manuale</button>'+
    (IA.engine?'':'<button class="btn grow" data-act="iaPannello">Carica il modello</button>')+'</div>'+
    '<div class="eyebrow" style="margin-bottom:7px">Cosa ricavare</div>'+
    ['scheda:La scheda del personaggio','profilo:Il profilo di gioco: tiri, azioni, stati',
     'compendio:Il compendio: abilità, oggetti, regole'].map(function(x){
      var a=x.split(':');
      return '<label class="line"><input type="checkbox" data-pass="'+a[0]+'" checked '+
        'style="width:19px;height:19px;flex:none"><span class="grow">'+a[1]+'</span></label>'}).join('')+
    '<div id="gl" style="margin-top:11px;max-height:30vh;overflow-y:auto"></div>'+
    '<div class="row" style="margin-top:12px"><button class="btn grow" data-close>Chiudi</button>'+
    '<button class="mbtn metal grow" id="gg"><span>Impara</span></button></div>',
  function(el,close){
    function stato(t){ $('#gs',el).innerHTML=t }
    function log(t){ $('#gl',el).innerHTML+='<div class="line"><span class="grow">'+t+'</span></div>' }
    $('#gp',el).onclick=function(){
      pickFile('application/pdf').then(function(fs){
        if(!fs[0]) return;
        stato('<span class="busy"></span> leggo il PDF…');
        estraiTestoPDF(fs[0],function(p,n){ stato('<span class="busy"></span> pagina '+p+' di '+n) })
        .then(function(t){
          APPR.testo=t; APPR.pdf=fs[0].name;
          if(!$('#gn',el).value.trim()) $('#gn',el).value=fs[0].name.replace(/\.pdf$/i,'');
          stato('Manuale in memoria: '+fs[0].name+' · '+Math.round(t.length/1000)+' mila caratteri');
        }).catch(function(e){ stato('Non leggibile: '+e.message) });
      });
    };
    $('#gg',el).onclick=function(){
      if(!APPR.testo) return toast('Carica prima il manuale');
      if(!IA.engine){ toast('Carica prima il modello'); return ACT.iaPannello() }
      var nome=$('#gn',el).value.trim()||'Gioco senza nome';
      APPR.nome=nome;
      var sys='sys_'+nome.toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,10)+'_'+Math.random().toString(36).slice(2,5);
      var passi=$$('[data-pass]:checked',el).map(function(c){return c.dataset.pass});
      $('#gl',el).innerHTML='';
      var catena=Promise.resolve();

      if(passi.indexOf('scheda')>=0) catena=catena.then(function(){
        stato('<span class="busy"></span> ricostruisco la scheda…');
        var brano=apprCerca(APPR.testo,['creazione del personaggio','scheda del personaggio',
          'creare il personaggio','caratteristiche'],6000)||APPR.testo.slice(0,6000);
        return iaChiedi(
          'Rispondi SOLO con JSON valido. Struttura: {"sections":[{"title":"","layout":"g2|g3|stack",'+
          '"fields":[{"id":"minuscolo_senza_spazi","label":"","type":"text|number|stat|tracker|check|longtext|lista|dadi"}]}]}. '+
          'stat per caratteristiche, tracker per coppie attuale/massimo, lista per tabelle. Etichette in italiano.',
          'Ricostruisci la scheda del personaggio di questo gioco:\n\n'+brano, 1500)
        .then(function(r){
          var sc=jsonDaTesto(r);
          sc.id=sys; sc.name=nome; sc.creato=nowISO();
          return salvaSchemaUser(sc).then(function(){
            log('Scheda: '+sc.sections.length+' sezioni, '+
              sc.sections.reduce(function(n,s){return n+(s.fields||[]).length},0)+' campi');
          });
        }).catch(function(e){ log('Scheda non riuscita: '+esc(e.message)) });
      });

      if(passi.indexOf('profilo')>=0) catena=catena.then(function(){
        stato('<span class="busy"></span> capisco come si gioca…');
        var P=profiloVuoto(sys,nome);
        var b1=apprCerca(APPR.testo,['risoluzione','prova','test','tiro di dado','come si gioca'],5000)||APPR.testo.slice(0,5000);
        return iaChiedi(
          'Rispondi SOLO con JSON valido: {"tiro":{"formula":"notazione tipo 1d20+bonus oppure 2d6",'+
          '"descr":"una frase su come si risolve una prova"},'+
          '"attacco":{"precisione":"formula del tiro per colpire","difesa":"nome del valore da battere",'+
          '"danno":"formula del danno","note":"una frase"}}',
          'Da questo manuale ricava come si risolvono le prove e gli attacchi:\n\n'+b1, 700)
        .then(function(r){
          var o=jsonDaTesto(r);
          if(o.tiro) P.tiro=o.tiro; if(o.attacco) P.attacco=o.attacco;
          var b2=apprCerca(APPR.testo,['azioni','in combattimento','turno','conflitto'],5000)||'';
          if(!b2) return P;
          return iaChiedi(
            'Rispondi SOLO con un array JSON. Ogni elemento: ["nome dell\u2019azione","azione|libera|reazione",'+
            '"cosa fa, due frasi"]. Solo le azioni che il manuale elenca davvero.',
            'Elenca le azioni disponibili in combattimento:\n\n'+b2, 900)
          .then(function(r2){
            try{ var a=jsonDaTesto(r2); if(Array.isArray(a)) P.azioni=a.filter(function(x){return x&&x[0]}) }catch(e){}
            return P;
          });
        }).then(function(P2){
          var b3=apprCerca(APPR.testo,['stati','condizioni','status'],4000)||'';
          if(!b3) return P2;
          return iaChiedi(
            'Rispondi SOLO con un array JSON. Ogni elemento: ["nome dello stato","effetto meccanico in una frase"].',
            'Elenca gli stati o le condizioni di questo gioco:\n\n'+b3, 700)
          .then(function(r3){
            try{ var st=jsonDaTesto(r3); if(Array.isArray(st)) P2.stati=st.filter(function(x){return x&&x[0]}) }catch(e){}
            return P2;
          });
        }).then(function(P3){
          return salvaProfilo(P3).then(function(){
            log('Profilo: '+(P3.azioni||[]).length+' azioni, '+(P3.stati||[]).length+' stati');
          });
        }).catch(function(e){ log('Profilo non riuscito: '+esc(e.message)) });
      });

      if(passi.indexOf('compendio')>=0) catena=catena.then(function(){
        var pezzi=apprPezzi(APPR.testo,10,3000), i=0, trovate=[];
        function passo(){
          if(i>=pezzi.length) return Promise.resolve();
          stato('<span class="busy"></span> compendio: blocco '+(i+1)+' di '+pezzi.length);
          return iaChiedi(
            'Rispondi SOLO con un array JSON. Ogni elemento: {"nome":"","tipo":"abilita|regola|oggetto|incantesimo",'+
            '"testo":"riassunto in italiano di due frasi con i numeri esatti"}. Se non ci sono voci rispondi [].',
            'Estrai le voci da questo brano:\n\n'+pezzi[i], 900)
          .then(function(r){
            try{ var a=jsonDaTesto(r);
              if(Array.isArray(a)) a.forEach(function(x){ if(x&&x.nome&&x.testo) trovate.push(x) });
            }catch(e){}
            i++; return passo();
          }).catch(function(){ i++; return passo() });
        }
        return passo().then(function(){
          S.compUser=S.compUser||{};
          S.compUser[sys]=(S.compUser[sys]||[]).concat(trovate);
          return salvaCompUser(sys);
        }).then(function(){ log('Compendio: '+trovate.length+' voci') })
        .catch(function(e){ log('Compendio non riuscito: '+esc(e.message)) });
      });

      catena.then(function(){
        stato('Fatto. Tutto è segnato come bozza: rileggi prima di giocarci.');
        log('<b>'+esc(nome)+'</b> è ora fra i sistemi disponibili');
        return caricaProfili();
      }).then(function(){ render() });
    };
  });
};
