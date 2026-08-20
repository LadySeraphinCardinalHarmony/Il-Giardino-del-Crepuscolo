"use strict";
/* ============================================================== sessioni */
function sessNuova(sys,titolo){
  return {id:uid('ses'),sys:sys,titolo:titolo||('Sessione del '+new Date().toLocaleDateString('it-IT')),
    data:nowISO(),aperta:true,round:1,turno:null,k:[],log:[],diario:[],pgIds:[],stati:{},snapshot:{}};
}
function caricaSessioni(){
  return DB.list('sessioni').then(function(ps){
    return Promise.all(ps.map(function(p){return DB.readJSON(p)}));
  }).then(function(all){
    S.sessioni=all.filter(Boolean).sort(function(a,b){return String(b.data).localeCompare(String(a.data))});
    return S.sessioni;
  }).catch(function(){ S.sessioni=[]; return [] });
}
function viewSess(){
  if(!S.sess) return viewSessLista();
  var s=S.sess, out='';
  out+=slab('<div class="row"><div class="grow">'+
    '<input data-sesst value="'+esc(s.titolo)+'" style="background:transparent;border:0;padding:0;'+
    'font-family:var(--display);font-size:20px;font-weight:700">'+
    '<div class="faint">'+esc(SISTEMI[s.sys].n)+' · '+new Date(s.data).toLocaleDateString('it-IT')+
    ' · round '+s.round+'</div></div>'+
    '<button class="btn sm" data-act="menusess">⋯</button></div>'+
    '<div class="row" style="margin-top:11px;gap:7px">'+
    '<button class="mbtn metal grow" data-act="attacca"><span>Attacca</span></button>'+
    '<button class="mbtn metal grow" data-act="azione"><span>Azione</span></button>'+
    '<button class="btn" data-act="stati">Stati</button></div>');

  var attivi=Object.keys(s.stati||{}).filter(function(k){return s.stati[k]});
  if(attivi.length) out+=slab('<div class="eyebrow" style="margin-bottom:7px">Stati attivi</div>'+
    '<div class="row wrap">'+attivi.map(function(k){
      return '<button class="pill" data-offstato="'+esc(k)+'" style="box-shadow:inset 0 0 0 2px var(--m2);color:var(--ink)">● '+
        esc(k.split(':')[1]||k)+'</button>'}).join('')+'</div>',{plain:true});

  var PROF=(typeof profiloDi==='function')?profiloDi(s.sys):null;
  if(typeof fuSess==='function'&&fuSess()){ out+=fuPannelloConflitto() }
  else if(PROF){ out+=pannelloProfilo(PROF) }
  else out+=slab('<div class="row" style="margin-bottom:9px"><div class="eyebrow grow">Al tavolo</div>'+
    '<button class="btn sm" data-act="tiraini">Iniziativa</button>'+
    '<button class="btn sm" data-act="aggcomb">＋</button></div>'+
    (s.k.length?s.k.slice().sort(function(a,b){return (b.init||0)-(a.init||0)}).map(function(k){
      return '<div class="line"'+(s.turno===k.id?' style="box-shadow:inset 0 0 0 2px var(--m2)"':'')+'>'+
        '<button class="v" data-ini="'+k.id+'">'+(k.init==null?'–':k.init)+'</button>'+
        '<span class="grow">'+esc(k.n)+'</span>'+
        '<button class="btn sm" data-hp="'+k.id+'" data-d="-1">−</button>'+
        '<span style="font-family:var(--mono);font-weight:700;min-width:38px;text-align:center">'+
        (k.pf==null?'–':k.pf)+'</span>'+
        '<button class="btn sm" data-hp="'+k.id+'" data-d="1">＋</button>'+
        '<button class="btn sm danger" data-delk="'+k.id+'">✕</button></div>'}).join('')+
      '<div class="row" style="margin-top:9px"><button class="btn grow" data-act="turnoprec">◀</button>'+
      '<button class="mbtn metal grow" data-act="turnosucc"><span>Turno successivo ▶</span></button></div>'
     :'<p class="faint">Aggiungi i personaggi e i nemici, poi tira l\u2019iniziativa.</p>'));

  out+=slab('<div class="row" style="margin-bottom:9px"><div class="eyebrow grow">Diario</div>'+
    '<button class="btn sm" data-act="notadiario">＋ voce</button></div>'+
    (s.diario.length?s.diario.map(function(n,i){
      return '<div class="line" data-det="dr'+i+'"><span class="grow">'+esc(n.txt.slice(0,60))+
        (n.txt.length>60?'…':'')+'</span><span class="pill">'+hhmm(n.t)+'</span></div>'+
        '<div class="det" id="dr'+i+'"><div class="body">'+esc(n.txt)+'</div></div>'}).join('')
     :'<p class="faint">Quello che succede, scritto come lo racconteresti dopo.</p>'));

  out+=slab('<div class="eyebrow" style="margin-bottom:8px">Cronologia dei tiri</div>'+
    (s.log.length?s.log.slice(0,50).map(function(l){
      return '<div style="font-family:var(--mono);font-size:12px;padding:5px 0;border-bottom:1px solid var(--line);color:var(--ink-dim)">'+
        '<span style="color:var(--ink-faint)">'+hhmm(l.t)+'</span> '+esc(l.txt)+'</div>'}).join('')
     :'<p class="faint">Ogni tiro finisce qui.</p>'),{plain:true});
  return out;
}
function viewSessLista(){
  var out=slab('<div class="row"><div class="grow"><div class="eyebrow">Sessioni</div>'+
    '<div class="faint">'+S.sessioni.length+' salvate</div></div>'+
    '<button class="mbtn metal" data-act="nuovasess"><span>Nuova</span></button></div>');
  if(!S.sessioni.length) return out+slab('<div class="empty"><span class="g">⚔</span>'+
    'Nessuna sessione.<br>Ogni sessione è un diario legato a un gioco, e ricorda lo stato delle schede.</div>',{plain:true});
  var per={};
  S.sessioni.forEach(function(s){ (per[s.sys]=per[s.sys]||[]).push(s) });
  Object.keys(per).forEach(function(sys){
    out+=slab('<div class="eyebrow" style="margin-bottom:8px">'+esc(SISTEMI[sys]?SISTEMI[sys].n:sys)+'</div>'+
      per[sys].map(function(s){
        return '<div class="line"><span class="grow">'+esc(s.titolo)+
          '<span class="faint" style="font-size:11px"> · '+new Date(s.data).toLocaleDateString('it-IT')+
          ' · '+s.diario.length+' voci</span></span>'+
          '<button class="btn sm" data-opensess="'+s.id+'">apri</button>'+
          '<button class="btn sm danger" data-delsess="'+s.id+'">✕</button></div>'}).join(''));
  });
  return out;
}
ACT.nuovasess=function(){
  modal('<h2 style="font-size:19px">Nuova sessione</h2>'+
    '<label style="display:block;margin:12px 0"><span class="lab">Titolo</span>'+
    '<input id="st" value="Sessione del '+new Date().toLocaleDateString('it-IT')+'"></label>'+
    '<label style="display:block;margin-bottom:14px"><span class="lab">Gioco</span><select id="ss">'+
    Object.keys(SISTEMI).map(function(k){
      return '<option value="'+k+'"'+(S.pg&&S.pg.sys===k?' selected':'')+'>'+SISTEMI[k].n+'</option>'}).join('')+
    '</select></label><div class="row"><button class="btn grow" data-close>Annulla</button>'+
    '<button class="mbtn metal grow" id="oks"><span>Apri</span></button></div>',
  function(el,close){
    $('#oks',el).onclick=function(){
      if(S.sess){ S.sess.aperta=false; saveSess() }
      S.sess=sessNuova($('#ss',el).value,$('#st',el).value.trim());
      if(S.pg&&S.pg.sys===S.sess.sys){ S.sess.pgIds=[S.pg.id]; snapshot() }
      saveSess(); caricaSessioni().then(function(){ close(); renderFromTop() });
    };
  });
};
function snapshot(){
  if(!S.sess||!S.pg) return;
  S.sess.snapshot[S.pg.id]={nome:S.pg.name,quando:nowISO(),values:JSON.parse(JSON.stringify(S.pg.values))};
}
ACT.menusess=function(){
  modal('<h2 style="font-size:19px">'+esc(S.sess.titolo)+'</h2><div style="margin:12px 0">'+
    '<button class="btn" style="width:100%;margin-bottom:8px" id="snap">Salva lo stato delle schede</button>'+
    '<button class="btn" style="width:100%;margin-bottom:8px" id="exp">Esporta il diario</button>'+
    '<button class="btn" style="width:100%;margin-bottom:8px" id="close2">Chiudi la sessione</button>'+
    '<button class="btn danger" style="width:100%" id="del">Elimina</button></div>'+
    '<button class="btn" style="width:100%" data-close>Indietro</button>',
  function(el,close){
    $('#snap',el).onclick=function(){ snapshot(); saveSess(); close(); toast('Stato salvato nella sessione') };
    $('#exp',el).onclick=function(){
      var s=S.sess;
      var txt='# '+s.titolo+'\n'+SISTEMI[s.sys].n+' · '+new Date(s.data).toLocaleString('it-IT')+'\n\n## Diario\n\n'+
        s.diario.slice().reverse().map(function(n){return '**'+hhmm(n.t)+'** '+n.txt}).join('\n\n')+
        '\n\n## Tiri\n\n'+s.log.slice().reverse().map(function(l){return '- '+hhmm(l.t)+' '+l.txt}).join('\n');
      download(s.titolo.replace(/\W+/g,'_')+'.md',new Blob([txt],{type:'text/markdown'}));
      close();
    };
    $('#close2',el).onclick=function(){ snapshot(); S.sess.aperta=false; saveSess();
      S.sess=null; close(); caricaSessioni().then(renderFromTop) };
    $('#del',el).onclick=function(){
      var id=S.sess.id; close();
      ask('Elimina sessione','Il diario e la cronologia vengono cancellati.','Elimina').then(function(y){
        if(!y) return;
        DB.remove(P.sess(id)).then(function(){ S.sess=null; return caricaSessioni() }).then(renderFromTop);
      });
    };
  });
};
ACT.notadiario=function(){
  modal('<h2 style="font-size:19px">Voce di diario</h2>'+
    '<textarea id="dn" rows="5" placeholder="Cosa è successo" style="margin:12px 0"></textarea>'+
    '<div class="row"><button class="btn grow" data-close>Annulla</button>'+
    '<button class="mbtn metal grow" id="okd"><span>Aggiungi</span></button></div>',
  function(el,close){
    $('#dn',el).focus();
    $('#okd',el).onclick=function(){
      var v=$('#dn',el).value.trim();
      if(v){ S.sess.diario.unshift({t:nowISO(),txt:v}); saveSess() }
      close(); render();
    };
  });
};
ACT.stati=function(){
  if(typeof fuSess==='function'&&fuSess()&&S.pg&&SISTEMI[S.pg.sys].fam==='fu'){
    var v=S.pg.values;
    return modal('<h2 style="font-size:19px">Stati</h2>'+
      '<p class="faint" style="margin:8px 0 11px">Ogni stato abbassa di una taglia le caratteristiche indicate. '+
      'Difese e Test si aggiornano subito.</p>'+
      '<div class="row wrap">'+FU_STATI.map(function(st){
        var on=v.status&&v.status[st[0]];
        return '<button class="btn sm" data-status="'+esc(st[0])+'"'+
          (on?' style="box-shadow:inset 0 0 0 2px #C2506A;color:#C2506A"':'')+'>'+
          (on?'● ':'○ ')+esc(st[0])+'</button>'}).join('')+'</div>'+
      '<button class="btn" style="width:100%;margin-top:12px" data-close>Fatto</button>');
  }
  var PS=(S.sess&&typeof profiloDi==='function')?profiloDi(S.sess.sys):null;
  if(PS&&PS.stati&&PS.stati.length){
    return modal('<h2 style="font-size:19px">Stati</h2>'+
      '<div style="margin:11px 0;max-height:56vh;overflow-y:auto">'+PS.stati.map(function(st,i){
        return '<div class="line" data-det="pz'+i+'"><span class="grow">'+esc(st[0])+'</span>'+
          '<span class="pill">leggi</span></div>'+
          '<div class="det" id="pz'+i+'"><div class="body">'+esc(st[1]||'')+'</div></div>'}).join('')+'</div>'+
      '<button class="btn" style="width:100%" data-close>Fatto</button>');
  }
  var pg=S.pg, cl=pg&&SISTEMI[pg.sys].fam==='dnd'?pg.values.classe:null;
  var list=(cl&&CLASSE_STATI[cl])||[];
  var gen=[{id:'conc',n:'Concentrazione',t:'Se subisci danni, tiro salvezza su Costituzione con CD pari a 10 oppure metà dei danni, il valore più alto.'}];
  var all=list.concat(cl==='mago'?[]:gen);
  modal('<h2 style="font-size:19px">Stati</h2>'+
    '<p class="faint" style="margin:7px 0 11px">Restano accesi finché non li spegni, e influenzano i suggerimenti quando attacchi.</p>'+
    (all.length?all.map(function(s,i){
      var key=(cl||'gen')+':'+s.n, on=S.sess.stati&&S.sess.stati[key];
      return '<div class="line" data-det="st'+i+'"><button class="pill" data-stato="'+esc(key)+'"'+
        (on?' style="box-shadow:inset 0 0 0 2px var(--m2);color:var(--ink)"':'')+'>'+(on?'●':'○')+'</button>'+
        '<span class="grow">'+esc(s.n)+'</span><span class="pill">leggi</span></div>'+
        '<div class="det" id="st'+i+'"><div class="body">'+esc(s.t)+'</div></div>'}).join('')
     :'<p class="faint">Apri prima una scheda per vedere gli stati della sua classe.</p>')+
    '<button class="btn" style="width:100%;margin-top:12px" data-close>Fatto</button>');
};
ACT.azione=function(){
  var PR=(S.sess&&typeof profiloDi==='function')?profiloDi(S.sess.sys):null;
  var lista = (typeof fuSess==='function'&&fuSess()&&typeof FU_AZIONI!=='undefined') ? FU_AZIONI
            : (PR&&PR.azioni&&PR.azioni.length) ? PR.azioni : SRD_AZIONI;
  modal('<h2 style="font-size:19px">Azioni</h2>'+
    '<p class="faint" style="margin:7px 0 11px">Cosa puoi fare nel tuo turno, dal regolamento.</p>'+
    lista.map(function(a,i){
      return '<div class="line" data-det="az'+i+'"><span class="grow">'+esc(a[0])+'</span>'+
        '<span class="pill">'+esc(a[1])+'</span></div>'+
        '<div class="det" id="az'+i+'"><div class="body">'+esc(a[2])+'</div></div>'}).join('')+
    '<button class="btn" style="width:100%;margin-top:12px" data-close>Fatto</button>');
};

/* ------------------------------------------------------------- attacco */
ACT.attacca=function(){
  var pg=S.pg;
  if(pg&&SISTEMI[pg.sys]&&SISTEMI[pg.sys].fam==='fu'&&typeof attaccoFU==='function') return attaccoFU();
  var PA=(S.sess&&typeof profiloDi==='function')?profiloDi(S.sess.sys):null;
  if(PA&&typeof attaccoProfilo==='function') return attaccoProfilo(PA);
  if(!pg||SISTEMI[pg.sys].fam!=='dnd')
    return toast('Apri prima una scheda di D&D o di Fabula Ultima');
  modal('<h2 style="font-size:19px">Attacco</h2>'+
    '<p class="faint" style="margin:7px 0 12px">Con cosa colpisci?</p>'+
    '<div class="row"><button class="mbtn metal grow" id="ba"><span>Con un\u2019arma</span></button>'+
    '<button class="mbtn metal grow" id="bm"><span>Con la magia</span></button></div>'+
    '<button class="btn" style="width:100%;margin-top:12px" data-close>Annulla</button>',
  function(el,close){
    $('#ba',el).onclick=function(){ close(); attaccoArma() };
    $('#bm',el).onclick=function(){ close(); attaccoMagia() };
  });
};
function statoAttivo(nome){
  var k=Object.keys((S.sess&&S.sess.stati)||{});
  for(var i=0;i<k.length;i++) if(S.sess.stati[k[i]]&&k[i].indexOf(nome)>=0) return true;
  return false;
}
function suggerimenti(pg){
  var v=pg.values, out=[], liv=Number(v.liv||1);
  if(v.classe==='barbaro'&&statoAttivo('Ira'))
    out.push({n:'Ira',t:'Aggiungi i danni da ira in mischia con Forza: +2 fino all\u20198° livello, +3 fino al 15°, poi +4.',
      dmg:liv>=16?4:liv>=9?3:2});
  if(v.classe==='ladro')
    out.push({n:'Attacco furtivo',t:'Se hai vantaggio, o se un alleato è entro 1,5 m dal bersaglio, aggiungi i dadi di Attacco furtivo.',
      dice:Math.ceil(liv/2)+'d6'});
  if(v.classe==='bardo')
    out.push({n:'Ispirazione bardica',t:'Se un alleato te l\u2019ha data, aggiungi il dado al tiro per colpire dopo aver visto il risultato.',
      dice:dadoIspirazione(liv)});
  if(v.classe==='guerriero'&&liv>=3)
    out.push({n:'Manovre',t:'Se sei un maestro di battaglia, puoi spendere un dado di superiorità per una manovra.'});
  if(statoAttivo('Concentrazione'))
    out.push({n:'Concentrazione attiva',t:'Ricorda il tiro salvezza su Costituzione se subisci danni.'});
  return out;
}
function attaccoArma(){
  var pg=S.pg, v=pg.values, A=autoDnD(pg);
  var armi=v.atk||[];
  if(!armi.length) return toast('Aggiungi prima un\u2019arma dalla scheda');
  modal('<h2 style="font-size:19px">Con quale arma?</h2>'+
    '<div style="margin:11px 0">'+armi.map(function(w,i){
      return '<div class="line"><span class="grow">'+esc(w.nome||'arma')+'</span>'+
        '<span class="pill">'+esc(w.bonus||'')+'</span>'+
        '<button class="btn sm" data-warm="'+i+'">scegli</button></div>'}).join('')+'</div>'+
    '<button class="btn" style="width:100%" data-close>Annulla</button>',
  function(el,close){
    $$('[data-warm]',el).forEach(function(b){ b.onclick=function(){
      close(); tiroAttacco(armi[Number(b.dataset.warm)],A) }});
  });
}
function attaccoMagia(){
  var pg=S.pg, v=pg.values, A=autoDnD(pg);
  var inc=v.incant||[];
  modal('<h2 style="font-size:19px">Attacco magico</h2>'+
    '<div class="grid g2" style="margin:11px 0">'+
    autoCell('Bonus di attacco',(A.atkInc>=0?'+':'')+A.atkInc)+
    autoCell('CD tiro salvezza',A.cd)+'</div>'+
    (inc.length?'<div class="eyebrow" style="margin-bottom:7px">I tuoi incantesimi</div>'+
      inc.map(function(s,i){
        return '<div class="line" data-det="am'+i+'"><span class="v">'+(s.liv===0?'T':s.liv)+'</span>'+
          '<span class="grow">'+esc(s.nome)+'</span>'+
          '<button class="btn sm" data-minc="'+i+'">usa</button></div>'+
          '<div class="det" id="am'+i+'"><div class="body">'+esc(s.note||'')+'</div></div>'}).join('')
     :'<p class="faint">Nessun incantesimo in scheda.</p>')+
    '<button class="btn" style="width:100%;margin-top:12px" data-close>Chiudi</button>',
  function(el,close){
    $$('[data-minc]',el).forEach(function(b){ b.onclick=function(){
      var s=inc[Number(b.dataset.minc)];
      close();
      tiroAttacco({nome:s.nome,bonus:(A.atkInc>=0?'+':'')+A.atkInc,danni:'',magia:true,cd:A.cd,note:s.note},A);
    }});
  });
}
function tiroAttacco(arma,A){
  var pg=S.pg, sugg=suggerimenti(pg);
  var bonus=parseInt(String(arma.bonus||'0').replace('+',''),10)||0;
  modal('<h2 style="font-size:19px">'+esc(arma.nome)+'</h2>'+
    (arma.magia?'<p class="faint" style="margin:7px 0 0">CD del tiro salvezza: <b style="color:var(--ink)">'+arma.cd+'</b></p>':'')+
    '<div class="eyebrow" style="margin:12px 0 7px">Tiro per colpire</div>'+
    '<div class="row" style="gap:6px"><button class="btn sm grow" data-mode="normale" aria-pressed="true">Normale</button>'+
    '<button class="btn sm grow" data-mode="van">Vantaggio</button>'+
    '<button class="btn sm grow" data-mode="svan">Svantaggio</button></div>'+
    '<div class="row" style="margin-top:9px">'+
    '<button class="mbtn metal grow" id="tira"><span>Tira l\u2019app</span></button>'+
    '<input id="man" type="number" inputmode="numeric" placeholder="d20 tirato da te" style="flex:1">'+
    '<button class="btn" id="calc">Calcola</button></div>'+
    '<div id="ris" style="margin-top:11px"></div>'+
    (arma.danni?'<div class="eyebrow" style="margin:14px 0 7px">Danni</div>'+
      '<div class="row"><button class="mbtn metal grow" id="dmg"><span>Tira '+esc(arma.danni)+'</span></button>'+
      '<button class="btn" id="dmgc">Critico</button></div><div id="dris" style="margin-top:9px"></div>':'')+
    (sugg.length?'<div class="eyebrow" style="margin:14px 0 7px">Puoi usare anche</div>'+
      sugg.map(function(s,i){
        return '<div class="line" data-det="sg'+i+'"><span class="grow">'+esc(s.n)+'</span>'+
          (s.dice?'<button class="btn sm" data-sdice="'+esc(s.dice)+'">'+esc(s.dice)+'</button>':'')+
          (s.dmg?'<span class="pill">+'+s.dmg+'</span>':'')+'</div>'+
          '<div class="det" id="sg'+i+'"><div class="body">'+esc(s.t)+'</div></div>'}).join(''):'')+
    '<button class="btn" style="width:100%;margin-top:14px" data-close>Chiudi</button>',
  function(el,close){
    var mode='normale';
    $$('[data-mode]',el).forEach(function(b){ b.onclick=function(){
      mode=b.dataset.mode;
      $$('[data-mode]',el).forEach(function(o){
        o.setAttribute('aria-pressed',o===b);
        o.style.boxShadow=o===b?'inset 0 0 0 2px var(--m2)':''});
    }});
    function mostra(d20,tot,crit){
      $('#ris',el).innerHTML='<div class="line" style="box-shadow:inset 0 0 0 2px var(--m2)">'+
        '<span class="v">'+tot+'</span><span class="grow">'+(crit?'colpo critico':'totale sul bersaglio')+
        '</span><span class="pill">d20 '+d20+'</span></div>';
      if(S.sess){ S.sess.log.unshift({t:nowISO(),txt:arma.nome+': attacco '+tot+(crit?' critico':'')});
        saveSess() }
    }
    $('#tira',el).onclick=function(){
      var e='1d20'+(mode==='van'?' van':mode==='svan'?' svan':'')+(bonus>=0?'+':'')+bonus;
      var r=rollDice(e);
      var d20=r.total-bonus;
      mostra(d20,r.total,d20===20);
    };
    $('#calc',el).onclick=function(){
      var d=parseInt($('#man',el).value,10);
      if(isNaN(d)) return toast('Scrivi il risultato del d20');
      mostra(d,d+bonus,d===20);
    };
    if($('#dmg',el)){
      var tiraDanni=function(crit){
        var e=arma.danni;
        if(crit) e=e.replace(/(\d*)d(\d+)/,function(_,n,f){return (2*(parseInt(n||'1',10)))+'d'+f});
        var bonusIra=0;
        sugg.forEach(function(s){ if(s.dmg) bonusIra+=s.dmg });
        var r=rollDice(e+(bonusIra?'+'+bonusIra:''));
        $('#dris',el).innerHTML='<div class="line"><span class="v">'+r.total+'</span>'+
          '<span class="grow">danni'+(bonusIra?' · ira inclusa':'')+'</span>'+
          '<span class="pill">'+esc(e)+'</span></div>';
        if(S.sess){ S.sess.log.unshift({t:nowISO(),txt:arma.nome+': '+r.total+' danni'}); saveSess() }
      };
      $('#dmg',el).onclick=function(){ tiraDanni(false) };
      $('#dmgc',el).onclick=function(){ tiraDanni(true) };
    }
    $$('[data-sdice]',el).forEach(function(b){ b.onclick=function(ev){
      ev.stopPropagation();
      var r=rollDice(b.dataset.sdice);
      b.outerHTML='<span class="pill">'+b.dataset.sdice+' → '+r.total+'</span>';
      if(S.sess){ S.sess.log.unshift({t:nowISO(),txt:b.dataset.sdice+': '+r.total}); saveSess() }
    }});
  });
}
