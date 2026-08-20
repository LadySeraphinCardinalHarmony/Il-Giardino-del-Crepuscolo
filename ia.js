"use strict";
/* ==========================================================================
   Modello locale (Qwen tramite WebLLM). Gira nel browser, sulla scheda video:
   nessun dato esce dal dispositivo, nessuna chiave, nessun costo.
   Serve a leggere un PDF che possiedi e ricavarne voci di compendio.
   ========================================================================== */
var IA={engine:null,modello:'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',stato:'spento',prog:''};
var MODELLI=[
 ['Qwen2.5-1.5B-Instruct-q4f16_1-MLC','Qwen 1.5B','circa 1,1 GB · veloce, impreciso'],
 ['Qwen2.5-3B-Instruct-q4f16_1-MLC','Qwen 3B','circa 2,0 GB · equilibrato'],
 ['Qwen2.5-7B-Instruct-q4f16_1-MLC','Qwen 7B','circa 4,4 GB · lento, migliore']
];
function iaDisponibile(){ return typeof navigator!=='undefined' && !!navigator.gpu }
function iaCarica(onProg){
  if(IA.engine) return Promise.resolve(IA.engine);
  if(!iaDisponibile()) return Promise.reject(new Error(
    'Questo browser non espone WebGPU, che serve per far girare il modello. '+
    'Su computer usa Chrome o Edge aggiornati; su iPad serve Safari 18 o successivo.'));
  IA.stato='caricamento';
  return import('https://esm.run/@mlc-ai/web-llm').then(function(webllm){
    return webllm.CreateMLCEngine(IA.modello,{initProgressCallback:function(p){
      IA.prog=p.text||''; if(onProg) onProg(p.text||'', p.progress||0);
    }});
  }).then(function(e){ IA.engine=e; IA.stato='pronto'; return e });
}
function iaChiedi(sistema,utente,maxTok){
  return IA.engine.chat.completions.create({
    messages:[{role:'system',content:sistema},{role:'user',content:utente}],
    temperature:0.1, max_tokens:maxTok||900
  }).then(function(r){ return r.choices[0].message.content });
}
function jsonDaTesto(t){
  var s=String(t).replace(/```json|```/g,'').trim();
  var i=s.search(/[\[{]/);
  if(i<0) throw new Error('Il modello non ha risposto in JSON.');
  /* conta le parentesi per prendere la struttura intera, non la prima annidata */
  var apre=s.charAt(i), chiude=apre==='['?']':'}', liv=0, fine=-1, str=false, esc2=false;
  for(var k=i;k<s.length;k++){
    var c=s.charAt(k);
    if(esc2){ esc2=false; continue }
    if(c==='\\'){ esc2=true; continue }
    if(c==='"'){ str=!str; continue }
    if(str) continue;
    if(c===apre) liv++;
    else if(c===chiude){ liv--; if(liv===0){ fine=k; break } }
  }
  if(fine<0) fine=s.lastIndexOf(chiude);
  return JSON.parse(s.slice(i,fine+1));
}
/* voci ricavate dai tuoi PDF: restano nella tua cartella, divise per gioco */
function caricaCompUser(){
  return DB.list('compendio').then(function(ps){
    return Promise.all(ps.map(function(p){return DB.readJSON(p)}));
  }).then(function(all){
    S.compUser={};
    all.filter(Boolean).forEach(function(f){ S.compUser[f.sys]=f.voci||[] });
  }).catch(function(){ S.compUser={} });
}
function salvaCompUser(sys){
  return DB.writeJSON('compendio/'+sys+'.json',{sys:sys,voci:S.compUser[sys]||[],agg:nowISO()});
}
ACT.iaPannello=function(){
  var ok=iaDisponibile();
  modal('<h2 style="font-size:19px">Modello locale</h2>'+
    '<p class="faint" style="margin:9px 0;line-height:1.6">Scarica un modello Qwen una volta sola e '+
    'gira sulla scheda video del dispositivo. Nessun dato esce da qui, nessuna chiave, nessun costo.</p>'+
    (ok?'':'<p class="faint" style="margin:0 0 12px;color:#C2506A;line-height:1.6">'+
      'Questo browser non espone WebGPU. Su computer serve Chrome o Edge aggiornati, '+
      'su iPad Safari 18 o successivo. Senza, il resto dell\u2019app funziona lo stesso.</p>')+
    '<label style="display:block;margin-bottom:11px"><span class="lab">Modello</span><select id="mm">'+
    MODELLI.map(function(m){return '<option value="'+m[0]+'"'+(IA.modello===m[0]?' selected':'')+'>'+
      m[1]+' — '+m[2]+'</option>'}).join('')+'</select></label>'+
    '<div id="ip" class="faint" style="margin-bottom:11px">'+
    (IA.stato==='pronto'?'Modello pronto.':'Non ancora caricato.')+'</div>'+
    '<div class="row" style="gap:7px"><button class="mbtn metal grow" id="ic"'+(ok?'':' disabled')+'>'+
    '<span>Carica il modello</span></button>'+
    '<button class="btn grow" id="ix">Leggi un PDF</button></div>'+
    '<p class="faint" style="margin:12px 0 0;line-height:1.6">Aspettative oneste: un modello da 1,5 miliardi '+
    'di parametri sbaglia spesso i dettagli. Serve a preparare una bozza da correggere, non a fidarsi a occhi chiusi. '+
    'Su iPad la memoria disponibile è poca: se si blocca, usa il computer.</p>'+
    '<button class="btn" style="width:100%;margin-top:12px" data-close>Chiudi</button>',
  function(el,close){
    $('#mm',el).onchange=function(){ IA.modello=this.value; IA.engine=null; IA.stato='spento';
      $('#ip',el).textContent='Modello cambiato: va ricaricato.' };
    $('#ic',el).onclick=function(){
      $('#ip',el).innerHTML='<span class="busy"></span> avvio…';
      iaCarica(function(t,p){ $('#ip',el).innerHTML='<span class="busy"></span> '+esc(t) })
      .then(function(){ $('#ip',el).textContent='Modello pronto.' })
      .catch(function(e){ $('#ip',el).textContent=e.message });
    };
    $('#ix',el).onclick=function(){ close(); iaLeggiPDF() };
  });
};
function iaLeggiPDF(){
  if(!IA.engine) return toast('Carica prima il modello');
  pickFile('application/pdf').then(function(fs){
    if(!fs[0]) return;
    var sys=(S.pg&&S.pg.sys)||'dnd24';
    var m=modal('<h2 style="font-size:19px">Leggo il manuale</h2>'+
      '<label style="display:block;margin:11px 0"><span class="lab">Aggiungi al compendio di</span>'+
      '<select id="sy">'+Object.keys(SISTEMI).map(function(k){
        return '<option value="'+k+'"'+(k===sys?' selected':'')+'>'+SISTEMI[k].n+'</option>'}).join('')+'</select></label>'+
      '<label style="display:block;margin-bottom:11px"><span class="lab">Pagine (per esempio 120-140)</span>'+
      '<input id="pp" placeholder="lascia vuoto per tutte"></label>'+
      '<div id="st" class="faint" style="margin-bottom:11px">Pronto.</div>'+
      '<div id="ris" style="max-height:40vh;overflow-y:auto"></div>'+
      '<div class="row" style="margin-top:12px"><button class="btn grow" data-close>Chiudi</button>'+
      '<button class="mbtn metal grow" id="go"><span>Estrai</span></button></div>',
    function(el,close){
      $('#go',el).onclick=function(){
        var target=$('#sy',el).value, range=$('#pp',el).value.trim();
        var trovate=[];
        $('#st',el).innerHTML='<span class="busy"></span> apro il PDF…';
        loadPdfJs().then(function(){ return fs[0].arrayBuffer() })
        .then(function(buf){ return window.pdfjsLib.getDocument({data:buf}).promise })
        .then(function(pdf){
          var da=1, a=pdf.numPages;
          var mm=range.match(/(\d+)\s*-\s*(\d+)/);
          if(mm){ da=clamp(+mm[1],1,pdf.numPages); a=clamp(+mm[2],da,pdf.numPages) }
          a=Math.min(a,da+39);
          var testi=[], p=da;
          function pagina(){
            if(p>a) return Promise.resolve();
            $('#st',el).innerHTML='<span class="busy"></span> pagina '+p+' di '+a;
            return pdf.getPage(p).then(function(pg2){ return pg2.getTextContent() })
              .then(function(tc){
                testi.push(tc.items.map(function(i){return i.str}).join(' ').replace(/\s+/g,' '));
                p++; return pagina();
              });
          }
          return pagina().then(function(){ return testi.join('\n') });
        })
        .then(function(testo){
          var pezzi=[];
          for(var i=0;i<testo.length;i+=3000) pezzi.push(testo.slice(i,i+3000));
          pezzi=pezzi.slice(0,12);
          var idx=0;
          function passo(){
            if(idx>=pezzi.length) return Promise.resolve();
            $('#st',el).innerHTML='<span class="busy"></span> il modello legge il blocco '+(idx+1)+' di '+pezzi.length;
            return iaChiedi(
              'Sei un assistente che struttura regole di giochi di ruolo. Rispondi SOLO con un array JSON, '+
              'senza testo intorno. Ogni elemento: {"nome":"","tipo":"incantesimo|abilita|regola|oggetto",'+
              '"liv":numero o null,"testo":"riassunto in italiano di due frasi"}. '+
              'Se il brano non contiene voci riconoscibili rispondi [].',
              'Estrai le voci da questo brano di manuale:\n\n'+pezzi[idx], 900)
            .then(function(r){
              try{
                var arr=jsonDaTesto(r);
                if(Array.isArray(arr)) arr.forEach(function(x){
                  if(x&&x.nome&&x.testo) trovate.push(x) });
              }catch(e){}
              idx++;
              $('#ris',el).innerHTML=trovate.map(function(x,i){
                return '<div class="line"><span class="grow">'+esc(x.nome)+'</span>'+
                  '<span class="pill">'+esc(x.tipo||'regola')+'</span>'+
                  '<button class="btn sm danger" data-scarta="'+i+'">✕</button></div>'}).join('');
              return passo();
            });
          }
          return passo();
        })
        .then(function(){
          if(!trovate.length){ $('#st',el).textContent='Non ho trovato voci riconoscibili.'; return }
          S.compUser=S.compUser||{};
          S.compUser[target]=(S.compUser[target]||[]).concat(trovate);
          return salvaCompUser(target).then(function(){
            $('#st',el).textContent=trovate.length+' voci aggiunte al compendio di '+SISTEMI[target].n+
              '. Rileggile: il modello sbaglia.';
            render();
          });
        })
        .catch(function(e){ $('#st',el).textContent='Non ci sono riuscito: '+e.message });
      };
      el.addEventListener('click',function(ev){
        var b=ev.target.closest('[data-scarta]'); if(!b) return;
      });
    });
  });
}
