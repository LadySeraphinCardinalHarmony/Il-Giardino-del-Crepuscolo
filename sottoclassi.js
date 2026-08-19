"use strict";
/* ====================================================== sottoclassi in scheda */
function sottoDi(classe,nome){
  var g=SOTTOCLASSI[classe]; if(!g) return null;
  var out=null; g.l.forEach(function(x){ if(x.n===nome) out=x });
  return out;
}
function chiaveSotto(classe,nome,liv,titolo){ return classe+'|'+nome+'|'+liv+'|'+titolo }
/* i privilegi che scrivi tu restano in un file solo, e viaggiano nel pacchetto */
function caricaSottoUser(){
  return DB.readJSON('sottoclassi.json').then(function(j){
    S.sottoUser=(j&&j.voci)||{}; S.sottoBozze=(j&&j.bozze)||{};
  }).catch(function(){ S.sottoUser={}; S.sottoBozze={} });
}
function salvaSottoUser(){ return DB.writeJSON('sottoclassi.json',
  {voci:S.sottoUser||{},bozze:S.sottoBozze||{},agg:nowISO()}) }
function privSotto(pg){
  var v=pg.values, liv=clamp(Number(v.liv||1),1,20);
  var sc=sottoDi(v.classe,v.sotto);
  if(!sc) return [];
  if(sc.srd) return (sc.f||[]).filter(function(f){return f[0]<=liv})
    .map(function(f){ return {n:f[1],liv:f[0],t:f[2],sotto:sc.n,srd:1} });
  var g=SOTTOCLASSI[v.classe];
  var tappe=tappeSotto(v.classe);
  return tappe.filter(function(l){return l<=liv}).map(function(l){
    var k=chiaveSotto(v.classe,sc.n,l,'privilegio');
    var testo=(S.sottoUser||{})[k];
    return {n:sc.n+' · livello '+l,liv:l,sotto:sc.n,vuoto:!testo,chiave:k,
      bozza:!!(testo&&(S.sottoBozze||{})[k]),
      t:testo||'Privilegio da completare. Tocca per scriverlo: lo trascrivi una volta e resta, e viaggia nel pacchetto verso gli altri dispositivi.'};
  });
}
function tappeSotto(classe){
  var t={barbaro:[3,6,10,14],bardo:[3,6,14],chierico:[1,2,6,8,17],druido:[2,6,10,14],
   guerriero:[3,7,10,15,18],ladro:[3,9,13,17],mago:[2,6,10,14],monaco:[3,6,11,17],
   paladino:[3,7,15,20],ranger:[3,7,11,15],stregone:[1,6,14,18],warlock:[1,6,10,14]};
  return t[classe]||[3,6,10,14];
}
ACT.scriviSotto=function(t){
  var k=t.dataset.chiave;
  var parti=k.split('|');
  modal('<h2 style="font-size:19px">'+esc(parti[1])+'</h2>'+
    '<p class="faint" style="margin:8px 0 11px;line-height:1.55">Privilegio di livello '+esc(parti[2])+
    '. Trascrivilo dal tuo manuale: resta salvato e lo ritrovi su ogni personaggio con questa sottoclasse.</p>'+
    '<textarea id="sx" rows="6">'+esc((S.sottoUser||{})[k]||'')+'</textarea>'+
    '<div class="row" style="margin-top:12px"><button class="btn grow" data-close>Annulla</button>'+
    '<button class="mbtn metal grow" id="oks"><span>Salva</span></button></div>',
  function(el,close){
    $('#sx',el).focus();
    $('#oks',el).onclick=function(){
      S.sottoUser=S.sottoUser||{};
      var val=$('#sx',el).value.trim();
      S.sottoBozze=S.sottoBozze||{};
      if(val){ S.sottoUser[k]=val; delete S.sottoBozze[k] } else { delete S.sottoUser[k]; delete S.sottoBozze[k] }
      salvaSottoUser().then(function(){ close(); render() });
    };
  });
};

/* ================== completamento automatico dal manuale (solo studio) ==== */
var TESTO_MANUALE={nome:'',testo:''};
function estraiTestoPDF(file,onProg){
  return loadPdfJs().then(function(){ return file.arrayBuffer() })
  .then(function(buf){ return window.pdfjsLib.getDocument({data:buf}).promise })
  .then(function(pdf){
    var out=[], p=1;
    function pagina(){
      if(p>pdf.numPages) return Promise.resolve(out.join('\n'));
      if(onProg&&p%10===0) onProg(p,pdf.numPages);
      return pdf.getPage(p).then(function(x){ return x.getTextContent() }).then(function(tc){
        out.push(tc.items.map(function(i){return i.str}).join(' ').replace(/\s+/g,' '));
        p++; return pagina();
      });
    }
    return pagina();
  });
}
function normalizza(s){
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ');
}
/* trova il punto del manuale che parla di quella sottoclasse */
function finestraPer(nome,testo){
  var n=normalizza(nome), t=normalizza(testo);
  var chiave=n.replace(/^(collegio|dominio|circolo|cammino|via|giuramento|scuola|archetipo) (del|della|dello|dei|delle|dell|di|d) /,'');
  var pos=-1, best=-1, conteggio={};
  var idx=t.indexOf(chiave);
  while(idx>=0){
    var blocco=Math.floor(idx/1500);
    conteggio[blocco]=(conteggio[blocco]||0)+1;
    if(conteggio[blocco]>best){ best=conteggio[blocco]; pos=idx }
    idx=t.indexOf(chiave,idx+1);
  }
  if(pos<0) return null;
  var da=Math.max(0,pos-600);
  return testo.slice(da,da+5200);
}
ACT.completaSottoclassi=function(){
  if(!modoStudio()) return toast('Funzione da computer');
  if(!IA.engine){ toast('Carica prima il modello'); return ACT.iaPannello() }
  var classe=(S.pg&&S.pg.values&&S.pg.values.classe)||'bardo';
  modal('<h2 style="font-size:19px">Completa le sottoclassi</h2>'+
    '<p class="faint" style="margin:9px 0;line-height:1.6">Carica il manuale che possiedi. '+
    'L\u2019app cerca ogni sottoclasse per nome, ne prende il pezzo di testo e chiede al modello '+
    'di riassumere il privilegio di ciascun livello. Quello che ottieni è una bozza da rileggere: '+
    'resta segnata come tale finché non la correggi.</p>'+
    '<label style="display:block;margin-bottom:11px"><span class="lab">Classe</span><select id="cl">'+
    Object.keys(SOTTOCLASSI).map(function(k){
      return '<option value="'+k+'"'+(k===classe?' selected':'')+'>'+(CLASSI[k]?CLASSI[k].n:k)+'</option>'}).join('')+
    '</select></label>'+
    '<div id="el" style="max-height:34vh;overflow-y:auto;margin-bottom:11px"></div>'+
    '<div id="ss" class="faint" style="margin-bottom:11px">'+
    (TESTO_MANUALE.nome?'Manuale in memoria: '+esc(TESTO_MANUALE.nome):'Nessun manuale caricato.')+'</div>'+
    '<div class="row" style="gap:7px"><button class="btn grow" id="pdf">Carica manuale</button>'+
    '<button class="mbtn metal grow" id="go"><span>Completa</span></button></div>'+
    '<button class="btn" style="width:100%;margin-top:10px" data-close>Chiudi</button>',
  function(el,close){
    function lista(){
      var k=$('#cl',el).value, g=SOTTOCLASSI[k];
      $('#el',el).innerHTML=g.l.map(function(x,i){
        if(x.srd) return '<div class="line"><span class="grow">'+esc(x.n)+'</span><span class="pill">già completa</span></div>';
        var liv=tappeSotto(k), fatte=liv.filter(function(l){
          return (S.sottoUser||{})[chiaveSotto(k,x.n,l,'privilegio')] }).length;
        return '<label class="line"><input type="checkbox" data-sub="'+esc(x.n)+'"'+
          (fatte<liv.length?' checked':'')+' style="width:19px;height:19px;flex:none">'+
          '<span class="grow">'+esc(x.n)+'</span><span class="pill">'+fatte+'/'+liv.length+'</span></label>';
      }).join('');
    }
    $('#cl',el).onchange=lista; lista();
    $('#pdf',el).onclick=function(){
      pickFile('application/pdf').then(function(fs){
        if(!fs[0]) return;
        $('#ss',el).innerHTML='<span class="busy"></span> leggo il PDF…';
        estraiTestoPDF(fs[0],function(p,n){ $('#ss',el).innerHTML='<span class="busy"></span> pagina '+p+' di '+n })
        .then(function(t){
          TESTO_MANUALE={nome:fs[0].name,testo:t};
          $('#ss',el).textContent='Manuale in memoria: '+fs[0].name+' ('+Math.round(t.length/1000)+' mila caratteri)';
        }).catch(function(e){ $('#ss',el).textContent='Non leggibile: '+e.message });
      });
    };
    $('#go',el).onclick=function(){
      if(!TESTO_MANUALE.testo) return toast('Carica prima il manuale');
      var k=$('#cl',el).value;
      var scelte=$$('[data-sub]:checked',el).map(function(c){return c.dataset.sub});
      if(!scelte.length) return toast('Nessuna sottoclasse selezionata');
      var livelli=tappeSotto(k), i=0, fatte=0, saltate=[];
      S.sottoUser=S.sottoUser||{}; S.sottoBozze=S.sottoBozze||{};
      function passo(){
        if(i>=scelte.length) return Promise.resolve();
        var nome=scelte[i];
        $('#ss',el).innerHTML='<span class="busy"></span> '+esc(nome)+' ('+(i+1)+' di '+scelte.length+')';
        var win=finestraPer(nome,TESTO_MANUALE.testo);
        if(!win){ saltate.push(nome); i++; return passo() }
        return iaChiedi(
          'Rispondi SOLO con un oggetto JSON, senza testo intorno. Le chiavi sono i livelli richiesti, '+
          'i valori sono il privilegio di quel livello riassunto in italiano in due o tre frasi, '+
          'con i numeri di gioco esatti. Se un livello non compare nel brano, ometti la chiave.',
          'Sottoclasse: "'+nome+'". Livelli richiesti: '+livelli.join(', ')+
          '.\n\nBrano del manuale:\n'+win, 1100)
        .then(function(r){
          try{
            var o=jsonDaTesto(r);
            livelli.forEach(function(l){
              var t=o[String(l)]||o[l];
              if(t&&String(t).length>20){
                var key=chiaveSotto(k,nome,l,'privilegio');
                if(!S.sottoUser[key]){ S.sottoUser[key]=String(t).trim(); S.sottoBozze[key]=1; fatte++ }
              }
            });
          }catch(e){ saltate.push(nome) }
          i++; return passo();
        }).catch(function(){ saltate.push(nome); i++; return passo() });
      }
      passo().then(function(){
        return salvaSottoUser();
      }).then(function(){
        $('#ss',el).textContent=fatte+' privilegi scritti come bozza'+
          (saltate.length?' · non trovate: '+saltate.join(', '):'')+'. Rileggile prima di fidarti.';
        lista(); render();
      });
    };
  });
};
