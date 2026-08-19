"use strict";
/* ==========================================================================
   Sistemi costruiti da te: uno schema descrive sezioni e campi, e l'app
   disegna la scheda. Gli schemi si generano anche dal PDF di una scheda.
   ========================================================================== */
function caricaSchemiUser(){
  return DB.list('schemi').then(function(ps){
    return Promise.all(ps.map(function(p){return DB.readJSON(p)}));
  }).then(function(all){
    S.schemiUser=all.filter(Boolean);
    S.schemiUser.forEach(function(sc){
      SISTEMI[sc.id]={n:sc.name,fam:'custom',schema:sc};
    });
  }).catch(function(){ S.schemiUser=[] });
}
function salvaSchemaUser(sc){
  if(!sc||!sc.id) return Promise.resolve();
  S.schemiUser=(S.schemiUser||[]).filter(function(x){return x.id!==sc.id}).concat([sc]);
  SISTEMI[sc.id]={n:sc.name,fam:'custom',schema:sc};
  return DB.writeJSON('schemi/'+sc.id+'.json',sc);
}
function sheetCustom(pg){
  var sc=(SISTEMI[pg.sys]||{}).schema;
  if(!sc) return slab('<p class="faint">Lo schema di questa scheda non è più disponibile.</p>');
  var v=pg.values;
  return (sc.sections||[]).map(function(s){
    var campi=(s.fields||[]).map(function(f){ return campoCustom(f,v) }).join('');
    var inner = (s.layout==='stack'||!s.layout) ? campi
      : '<div class="grid '+(s.layout==='g3'?'g3':'g2')+'">'+campi+'</div>';
    return slab(sec(s.title||'Sezione',inner));
  }).join('');
}
function campoCustom(f,v){
  var val=v[f.id];
  switch(f.type){
    case 'stat':{
      var m=Math.floor((Number(val||10)-10)/2);
      return '<div class="stat"><div class="lab">'+esc(f.label)+'</div>'+
        '<input type="number" inputmode="numeric" data-v="'+esc(f.id)+'" value="'+(val==null?10:val)+'">'+
        '<button class="mod metal" data-roll="1d20'+(m>=0?'+':'')+m+'" data-rl="'+esc(f.label)+'">'+
        (m>=0?'+':'')+m+'</button></div>';
    }
    case 'tracker':{
      var t=val||{cur:0,max:0};
      return '<div class="fld trk"><div class="lab">'+esc(f.label)+'</div>'+
        '<div class="row" style="gap:6px"><input type="number" inputmode="numeric" data-trc="'+esc(f.id)+'" value="'+(t.cur||0)+
        '" style="text-align:center;font-family:var(--mono);font-weight:700"><span class="faint">/</span>'+
        '<input type="number" inputmode="numeric" data-trm="'+esc(f.id)+'" value="'+(t.max||0)+
        '" style="width:70px;text-align:center;font-family:var(--mono)"></div></div>';
    }
    case 'check':
      return '<label class="fld row" style="gap:9px"><input type="checkbox" data-v="'+esc(f.id)+'"'+
        (val?' checked':'')+' style="width:20px;height:20px;flex:none"><span class="grow">'+esc(f.label)+'</span></label>';
    case 'longtext':
      return '<div class="fld"><span class="lab">'+esc(f.label)+'</span>'+
        '<textarea data-v="'+esc(f.id)+'" rows="4">'+esc(val||'')+'</textarea></div>';
    case 'number':
      return '<div class="fld"><span class="lab">'+esc(f.label)+'</span>'+
        '<input type="number" inputmode="numeric" data-v="'+esc(f.id)+'" value="'+(val==null?0:val)+'"></div>';
    case 'lista':
      return '<div class="fld"><div class="lab">'+esc(f.label)+'</div>'+
        listaEditabile(f.id,val||[],[['n','Voce'],['t','Nota']],null)+'</div>';
    case 'dadi':
      return '<div class="line"><button class="v" data-roll="'+esc(f.dado||'1d6')+'" data-rl="'+esc(f.label)+'">'+
        esc(f.dado||'1d6')+'</button><span class="grow">'+esc(f.label)+'</span></div>';
    default:
      return '<div class="fld"><span class="lab">'+esc(f.label)+'</span>'+
        '<input data-v="'+esc(f.id)+'" value="'+esc(val==null?'':val)+'"></div>';
  }
}
/* ------------------- generazione dello schema da una scheda ------------- */
ACT.generaScheda=function(){
  if(!modoStudio()) return toast('Funzione da computer');
  if(!IA.engine) { toast('Carica prima il modello'); return ACT.iaPannello() }
  pickFile('application/pdf,image/*').then(function(fs){
    if(!fs[0]) return;
    var f=fs[0];
    var m=modal('<h2 style="font-size:19px">Ricostruisco la scheda</h2>'+
      '<label style="display:block;margin:11px 0"><span class="lab">Nome del gioco</span>'+
      '<input id="gn" placeholder="Per esempio Brancalonia"></label>'+
      '<div id="gs" class="faint" style="margin-bottom:10px">Pronto.</div>'+
      '<pre id="gp" style="max-height:34vh;overflow:auto;font-family:var(--mono);font-size:11px;'+
      'white-space:pre-wrap;color:var(--ink-dim)"></pre>'+
      '<div class="row" style="margin-top:12px"><button class="btn grow" data-close>Chiudi</button>'+
      '<button class="mbtn metal grow" id="gg"><span>Genera</span></button></div>',
    function(el,close){
      $('#gg',el).onclick=function(){
        var nome=$('#gn',el).value.trim()||'Gioco senza nome';
        $('#gs',el).innerHTML='<span class="busy"></span> leggo il documento…';
        var testo='';
        loadPdfJs().then(function(){ return f.arrayBuffer() })
        .then(function(buf){
          if(f.type!=='application/pdf') throw new Error('Per ora leggo solo PDF con testo.');
          return window.pdfjsLib.getDocument({data:buf}).promise;
        }).then(function(pdf){
          var n=Math.min(pdf.numPages,4), p=1;
          function pagina(){
            if(p>n) return Promise.resolve();
            return pdf.getPage(p).then(function(x){ return x.getTextContent() }).then(function(tc){
              testo+=' '+tc.items.map(function(i){return i.str}).join(' ');
              p++; return pagina();
            });
          }
          return pagina();
        }).then(function(){
          $('#gs',el).innerHTML='<span class="busy"></span> il modello ricostruisce i campi…';
          return iaChiedi(
            'Sei un progettista di schede per giochi di ruolo. Rispondi SOLO con JSON valido, senza testo intorno. '+
            'Struttura: {"name":"","sections":[{"title":"","layout":"g2|g3|stack",'+
            '"fields":[{"id":"minuscolo_senza_spazi","label":"","type":"text|number|stat|tracker|check|longtext|lista|dadi"}]}]}. '+
            'Usa stat per caratteristiche con modificatore, tracker per coppie attuale/massimo, '+
            'lista per tabelle, dadi per tiri fissi. Etichette in italiano.',
            'Ricostruisci come scheda digitale questa scheda cartacea:\n\n'+testo.slice(0,5000), 1400);
        }).then(function(r){
          $('#gp',el).textContent=r.slice(0,3000);
          var sc=jsonDaTesto(r);
          sc.id='sys_'+Math.random().toString(36).slice(2,8);
          sc.name=nome; sc.creato=nowISO();
          if(!sc.sections||!sc.sections.length) throw new Error('Nessuna sezione riconosciuta.');
          return salvaSchemaUser(sc).then(function(){
            $('#gs',el).textContent='Fatto: '+sc.sections.length+' sezioni, '+
              sc.sections.reduce(function(n,s){return n+(s.fields||[]).length},0)+' campi. '+
              'Ora compare fra i sistemi quando crei un personaggio.';
            render();
          });
        }).catch(function(e){ $('#gs',el).textContent='Non ci sono riuscito: '+e.message });
      };
    });
  });
};
ACT.schemiUser=function(){
  var l=S.schemiUser||[];
  modal('<h2 style="font-size:19px">Schede costruite da te</h2>'+
    '<div style="margin:11px 0">'+(l.length?l.map(function(sc,i){
      return '<div class="line"><span class="grow">'+esc(sc.name)+
        '<span class="faint" style="font-size:11px"> · '+(sc.sections||[]).length+' sezioni</span></span>'+
        '<button class="btn sm" data-scexp="'+i+'">esporta</button>'+
        '<button class="btn sm danger" data-scdel="'+i+'">✕</button></div>'}).join('')
      :'<p class="faint">Nessuna. Sul computer puoi generarne una dal PDF di una scheda.</p>')+'</div>'+
    (modoStudio()?'<button class="mbtn metal" style="width:100%;margin-bottom:9px" data-act="generaScheda">'+
      '<span>Genera da una scheda in PDF</span></button>':'')+
    '<button class="btn" style="width:100%" data-close>Chiudi</button>',
  function(el,close){
    $$('[data-scexp]',el).forEach(function(b){ b.onclick=function(){
      var sc=l[+b.dataset.scexp];
      download(sc.name.replace(/\W+/g,'_')+'.json',new Blob([JSON.stringify(sc,null,1)],{type:'application/json'}));
    }});
    $$('[data-scdel]',el).forEach(function(b){ b.onclick=function(){
      var sc=l[+b.dataset.scdel]; close();
      ask('Elimina scheda','I personaggi creati con <b>'+esc(sc.name)+'</b> restano ma non si aprono più.','Elimina')
      .then(function(y){ if(!y) return;
        DB.remove('schemi/'+sc.id+'.json').then(function(){
          delete SISTEMI[sc.id];
          S.schemiUser=S.schemiUser.filter(function(x){return x.id!==sc.id});
          render();
        });
      });
    }});
  });
};
