"use strict";
/* ========================================================== Fabula Ultima */
function fuTaglia(pg,car){
  var base=Number(pg.values[car]||8), giu=0;
  FU_STATI.forEach(function(s){
    if(pg.values.status&&pg.values.status[s[0]]){ if(s[1]===car) giu++; if(s[2]===car) giu++ }
  });
  var i=FU_TAGLIE.indexOf(base); if(i<0) i=1;
  return FU_TAGLIE[clamp(i-giu,0,3)];
}
function fuLivello(pg){
  var v=pg.values;
  if(v.livManuale) return clamp(Number(v.liv||5),5,60);
  var n=0; (v.classi||[]).forEach(function(c){ n+=Number(c.liv||0) });
  return Math.max(1,n);
}
function fuBonusClassi(pg){
  var b={pv:0,pm:0,pi:0};
  (pg.values.classi||[]).forEach(function(c){
    FU_CLASSI_BASE.forEach(function(k){
      if(k[0]===c.n&&Number(c.liv||0)>0){ b.pv+=k[2]; b.pm+=k[3]; b.pi+=k[4] }
    });
  });
  return b;
}
autoFU=function(pg){
  var v=pg.values, liv=fuLivello(pg), b=fuBonusClassi(pg);
  var vig=Number(v.vigore||8), vol=Number(v.volonta||8);
  var pv=liv+vig*5+b.pv+Number(v.pvExtra||0);
  var pm=liv+vol*5+b.pm+Number(v.pmExtra||0);
  return {liv:liv,pv:pv,pm:pm,crisi:Math.floor(pv/2),
    pi:6+b.pi+Number(v.piExtra||0),
    dif:fuTaglia(pg,'destrezza')+Number(v.difMod||0),
    difM:fuTaglia(pg,'intuito')+Number(v.difMMod||0),
    ini:Number(v.iniMod||0)};
};
sheetFU=function(pg){
  var v=pg.values, A=autoFU(pg), out='';
  if(v.pvCur==null) v.pvCur=A.pv;
  if(v.pmCur==null) v.pmCur=A.pm;
  if(v.piCur==null) v.piCur=A.pi;
  var inCrisi=Number(v.pvCur)<=A.crisi;

  out+=slab(sec('Tratti','<div class="grid g2">'+
    ['identita:Identità:Coraggiosa maga dal cuore d\u2019oro',
     'tema:Tema:Ambizione, Dovere, Vendetta…',
     'origine:Origine:Il villaggio, la nave, la torre…'].map(function(x){
      var a=x.split(':');
      return '<label style="grid-column:1/-1"><span class="lab">'+a[1]+'</span>'+
        '<input data-v="'+a[0]+'" value="'+esc(v[a[0]]||'')+'" placeholder="'+esc(a[2])+'"></label>'}).join('')+
    '</div><p class="faint" style="margin:9px 0 0">Spendendo un Punto Fabula puoi invocare un Tratto '+
    'e ritirare uno o entrambi i dadi di un Test.</p>'));

  out+=slab(sec('Caratteristiche','<div class="grid g2">'+
    FU_CARAT.map(function(c){
      var base=Number(v[c[0]]||8), att=fuTaglia(pg,c[0]), rid=att<base;
      return '<div class="stat"><div class="lab">'+c[1]+'</div>'+
        '<div class="row" style="justify-content:center;gap:4px;margin-top:3px">'+
        FU_TAGLIE.map(function(t){
          return '<button class="pill" data-fu="'+c[0]+'" data-t="'+t+'"'+
            (base===t?' style="box-shadow:inset 0 0 0 2px var(--m2);color:var(--ink)"':'')+'>d'+t+'</button>'}).join('')+
        '</div>'+(rid?'<div class="pill" style="margin-top:5px;color:#C2506A">ridotta a d'+att+'</div>':'')+
        '</div>'}).join('')+'</div>'+
    '<button class="mbtn metal" style="width:100%;margin-top:11px" data-act="fuTest">'+
    '<span>Esegui un Test</span></button>'+
    '<p class="faint" style="margin:9px 0 0">Un Test tira due caratteristiche e somma i risultati. '+
    'Doppio 6 o più alto è un successo critico, doppio 1 è un fallimento critico.</p>'));

  var pvp=A.pv?clamp(v.pvCur/A.pv*100,0,100):0, pmp=A.pm?clamp(v.pmCur/A.pm*100,0,100):0;
  out+=slab(sec('Punti',
    (inCrisi?'<div class="line" style="box-shadow:inset 0 0 0 2px #C2506A;color:#C2506A">'+
      '<span class="grow">Sei in Crisi: sotto la soglia di '+A.crisi+' punti vita</span></div>':'')+
    '<div class="trk"><div class="row" style="gap:6px"><span class="lab" style="width:32px;margin:0">PV</span>'+
    '<button class="btn sm" data-fupv="-5">−5</button><button class="btn sm" data-fupv="-1">−</button>'+
    '<input class="grow" type="number" inputmode="numeric" data-fucur="pvCur" value="'+v.pvCur+
    '" style="text-align:center;font-family:var(--mono);font-weight:700;font-size:17px">'+
    '<span class="faint">/ '+A.pv+'</span>'+
    '<button class="btn sm" data-fupv="1">＋</button><button class="btn sm" data-fupv="5">＋5</button></div>'+
    '<div class="bar"><i style="width:'+pvp+'%"></i></div></div>'+
    '<div class="trk" style="margin-top:10px"><div class="row" style="gap:6px"><span class="lab" style="width:32px;margin:0">PM</span>'+
    '<button class="btn sm" data-fupm="-5">−5</button><button class="btn sm" data-fupm="-1">−</button>'+
    '<input class="grow" type="number" inputmode="numeric" data-fucur="pmCur" value="'+v.pmCur+
    '" style="text-align:center;font-family:var(--mono);font-weight:700;font-size:17px">'+
    '<span class="faint">/ '+A.pm+'</span>'+
    '<button class="btn sm" data-fupm="1">＋</button><button class="btn sm" data-fupm="5">＋5</button></div>'+
    '<div class="bar"><i style="width:'+pmp+'%"></i></div></div>'+
    '<div class="grid g3" style="margin-top:11px">'+
    '<div class="stat"><div class="lab">Punti inventario</div>'+
    '<input type="number" inputmode="numeric" data-fucur="piCur" value="'+v.piCur+'">'+
    '<div class="pill" style="margin-top:3px">su '+A.pi+'</div></div>'+
    autoCell('Crisi',A.crisi)+
    '<div class="stat"><div class="lab">Punti Fabula</div>'+
    '<input type="number" inputmode="numeric" data-v="fabula" value="'+(v.fabula||0)+'"></div>'+
    '</div>'+
    '<p class="faint" style="margin:9px 0 0">PV pari al livello più cinque volte la taglia di Vigore, '+
    'PM pari al livello più cinque volte la taglia di Volontà, più i bonus delle Classi.</p>'));

  out+=slab(sec('Difese','<div class="grid g3">'+
    autoCell('Difesa',A.dif)+autoCell('Difesa magica',A.difM)+
    '<div class="stat"><div class="lab">Iniziativa</div>'+
    '<input type="number" inputmode="numeric" data-v="iniMod" value="'+(v.iniMod||0)+'">'+
    '<button class="mod metal" data-roll="1d'+fuTaglia(pg,'destrezza')+'+1d'+fuTaglia(pg,'intuito')+
    (A.ini?(A.ini>0?'+':'')+A.ini:'')+'" data-rl="Iniziativa">tira</button></div>'+
    '</div><div class="grid g2" style="margin-top:9px">'+
    '<label><span class="lab">Modificatore Difesa (armatura)</span>'+
    '<input type="number" inputmode="numeric" data-v="difMod" value="'+(v.difMod||0)+'"></label>'+
    '<label><span class="lab">Modificatore Difesa magica</span>'+
    '<input type="number" inputmode="numeric" data-v="difMMod" value="'+(v.difMMod||0)+'"></label>'+
    '</div><p class="faint" style="margin:9px 0 0">Difesa pari alla taglia di Destrezza, '+
    'Difesa magica alla taglia di Intuito, più quello che aggiunge o toglie l\u2019equipaggiamento.</p>'));

  out+=slab(sec('Stati',
    '<div class="row wrap">'+FU_STATI.map(function(s){
      var on=v.status&&v.status[s[0]];
      return '<button class="pill" data-status="'+esc(s[0])+'"'+
        (on?' style="box-shadow:inset 0 0 0 2px #C2506A;color:#C2506A"':'')+'>'+
        (on?'● ':'○ ')+esc(s[0])+'</button>'}).join('')+'</div>'+
    '<p class="faint" style="margin:9px 0 0">Ogni stato abbassa di una taglia le caratteristiche indicate: '+
    'Lento la Destrezza, Confuso l\u2019Intuito, Debole il Vigore, Scosso la Volontà, '+
    'Furente Destrezza e Intuito, Avvelenato Vigore e Volontà. Difese e Test si aggiornano da soli.</p>'));

  var liv=fuLivello(pg);
  out+=slab(sec('Classi',
    '<div class="row" style="margin-bottom:9px"><div class="eyebrow grow">livello '+liv+
    ' · '+((v.classi||[]).length)+' classi</div>'+
    '<button class="btn sm" data-act="fuClasse">＋ classe</button></div>'+
    ((v.classi||[]).length?v.classi.map(function(c,i){
      var d=null; FU_CLASSI_BASE.forEach(function(k){ if(k[0]===c.n) d=k });
      return '<div class="line" data-det="fc'+i+'"><span class="v">'+(c.liv||0)+'</span>'+
        '<span class="grow">'+esc(c.n)+'</span>'+
        '<button class="btn sm" data-fuliv="'+i+'" data-d="-1">−</button>'+
        '<button class="btn sm" data-fuliv="'+i+'" data-d="1">＋</button>'+
        '<button class="btn sm danger" data-delrow="classi" data-i="'+i+'">✕</button></div>'+
        '<div class="det" id="fc'+i+'"><div class="body">'+(d?esc(d[1]):'')+
        (d&&(d[2]||d[3]||d[4])?'<br><b>Benefici gratuiti:</b> '+
          [d[2]?'+'+d[2]+' PV':'',d[3]?'+'+d[3]+' PM':'',d[4]?'+'+d[4]+' PI':''].filter(Boolean).join(', '):'')+
        '</div></div>'}).join('')
     :'<p class="faint">Alla creazione distribuisci cinque livelli fra due o tre Classi.</p>')));

  out+=slab(sec('Abilità',
    '<div class="row" style="margin-bottom:9px"><div class="eyebrow grow">'+((v.abilita||[]).length)+' apprese</div>'+
    '<button class="btn sm" data-act="fuAbilita">＋ abilità</button></div>'+
    ((v.abilita||[]).length?v.abilita.map(function(a,i){
      return '<div class="line" data-det="fa'+i+'"><span class="v">'+(a.la||1)+'</span>'+
        '<span class="grow">'+esc(a.n)+(a.cl?'<span class="faint" style="font-size:11px"> '+esc(a.cl)+'</span>':'')+'</span>'+
        '<button class="btn sm" data-fula="'+i+'" data-d="-1">−</button>'+
        '<button class="btn sm" data-fula="'+i+'" data-d="1">＋</button>'+
        '<button class="btn sm danger" data-delrow="abilita" data-i="'+i+'">✕</button></div>'+
        '<div class="det" id="fa'+i+'"><div class="body">'+esc(a.t||'Testo da inserire dal manuale.')+
        '<div style="margin-top:9px"><button class="btn sm" data-fuedit="'+i+'">'+
        (a.t?'Modifica':'Scrivi il testo')+'</button></div></div></div>'}).join('')
     :'<p class="faint">Ogni livello di Classe ti dà un\u2019Abilità nuova, oppure alza di uno il Livello Abilità di una che hai già.</p>')));

  out+=slab(sec('Legami',
    '<div class="row" style="margin-bottom:9px"><div class="eyebrow grow">'+((v.legami||[]).length)+' di 6</div>'+
    '<button class="btn sm" data-act="fuLegame">＋ legame</button></div>'+
    ((v.legami||[]).length?v.legami.map(function(l,i){
      var forza=Object.keys(l.e||{}).filter(function(k){return l.e[k]}).length;
      return '<div class="line"><span class="v">'+forza+'</span>'+
        '<span class="grow">'+esc(l.n||'senza nome')+
        '<div class="faint" style="font-size:11px">'+
        (Object.keys(l.e||{}).filter(function(k){return l.e[k]}).join(', ')||'nessuna emozione')+'</div></span>'+
        '<button class="btn sm" data-fuleg="'+i+'">modifica</button>'+
        '<button class="btn sm danger" data-delrow="legami" data-i="'+i+'">✕</button></div>'}).join('')
     :'<p class="faint">Un Legame vale da 1 a 3 secondo quante emozioni contiene. Spendendo un Punto Fabula '+
      'ne aggiungi la forza al risultato di un Test.</p>')));

  out+=slab(sec('Orologi',
    '<div class="row" style="margin-bottom:9px"><div class="eyebrow grow">'+((v.orologi||[]).length)+'</div>'+
    '<button class="btn sm" data-act="fuOrologio">＋ orologio</button></div>'+
    ((v.orologi||[]).length?v.orologi.map(function(o,i){
      return '<div class="fld"><div class="row"><span class="grow">'+esc(o.n)+'</span>'+
        '<span class="pill">'+(o.pieni||0)+'/'+o.seg+'</span>'+
        '<button class="btn sm danger" data-delrow="orologi" data-i="'+i+'">✕</button></div>'+
        '<div class="pips" style="margin-top:5px">'+
        Array.apply(null,Array(o.seg)).map(function(_,k){
          return '<button class="pip metal'+(k<(o.pieni||0)?' on':'')+'" data-fuoro="'+i+'" data-n="'+(k+1)+'">'+
            (k<(o.pieni||0)?'<span class="metal"></span>':'')+'</button>'}).join('')+'</div></div>'}).join('')
     :'<p class="faint">Gli Orologi misurano il tempo che passa e le minacce che avanzano.</p>')),{plain:true});

  out+=slab(sec('Equipaggiamento e risorse',
    '<div class="grid g2" style="margin-bottom:9px">'+
    '<label><span class="lab">Zenit</span><input type="number" inputmode="numeric" data-v="zenit" value="'+(v.zenit||0)+'"></label>'+
    '<label><span class="lab">Punti esperienza</span><input type="number" inputmode="numeric" data-v="px" value="'+(v.px||0)+'"></label>'+
    '</div>'+
    (Number(v.px||0)>=10?'<div class="line" style="box-shadow:inset 0 0 0 2px var(--m2)">'+
      '<span class="grow">Hai 10 o più PX: puoi spenderne 10 e salire di livello</span></div>':'')+
    listaEditabile('equip',v.equip||[],[['n','Oggetto'],['t','Effetto'],['q','Qtà']],null)+
    '<p class="faint" style="margin:9px 0 0">A fine sessione: 5 PX automatici, più i Punti Ultima spesi dai '+
    'Cattivi, più i Punti Fabula spesi dal gruppo divisi per il numero di personaggi.</p>'),false);
  return out;
};

/* ------------------------------- azioni di Fabula Ultima ---------------- */
ACT.fuTest=function(){
  var pg=S.pg;
  modal('<h2 style="font-size:19px">Test</h2>'+
    '<p class="faint" style="margin:8px 0 11px">Scegli le due caratteristiche. Il Game Master ti dice '+
    'la Difficoltà: 7 è facile, 10 normale, 13 difficile, 16 molto difficile.</p>'+
    '<div class="grid g2" style="margin-bottom:11px">'+
    ['a','b'].map(function(k,i){
      return '<label><span class="lab">Caratteristica '+(i+1)+'</span><select id="f'+k+'">'+
        FU_CARAT.map(function(c){
          return '<option value="'+c[0]+'"'+((i===0&&c[0]==='destrezza')||(i===1&&c[0]==='vigore')?' selected':'')+
          '>'+c[1]+' (d'+fuTaglia(pg,c[0])+')</option>'}).join('')+'</select></label>'}).join('')+
    '</div>'+
    '<div class="grid g2" style="margin-bottom:12px">'+
    '<label><span class="lab">Bonus</span><input id="fbon" type="number" inputmode="numeric" value="0"></label>'+
    '<label><span class="lab">Difficoltà</span><input id="fdif" type="number" inputmode="numeric" placeholder="10"></label>'+
    '</div><div id="fr" style="margin-bottom:12px"></div>'+
    '<div class="row"><button class="btn grow" data-close>Chiudi</button>'+
    '<button class="mbtn metal grow" id="ft"><span>Tira</span></button></div>',
  function(el,close){
    $('#ft',el).onclick=function(){
      var ca=$('#fa',el).value, cb=$('#fb',el).value;
      var ta=fuTaglia(pg,ca), tb=fuTaglia(pg,cb);
      var bonus=Number($('#fbon',el).value||0);
      var da=1+Math.floor(Math.random()*ta), db=1+Math.floor(Math.random()*tb);
      var tot=da+db+bonus, hr=Math.max(da,db);
      var crit=da===db&&da>=6, fumble=da===1&&db===1;
      var dif=Number($('#fdif',el).value||0);
      var esito=dif?(tot>=dif?'successo':'fallimento'):'';
      $('#fr',el).innerHTML='<div class="line" style="box-shadow:inset 0 0 0 2px '+
        (fumble?'#C2506A':crit?'var(--m2)':'var(--line)')+'">'+
        '<span class="v" style="font-size:22px">'+tot+'</span>'+
        '<span class="grow"><span class="die">'+da+'</span> <span class="die">'+db+'</span>'+
        (bonus?' <span class="die">+'+bonus+'</span>':'')+
        '<div class="faint" style="font-size:11px">Risultato Alto '+hr+
        (crit?' · successo critico':fumble?' · fallimento critico':'')+
        (esito?' · '+esito:'')+'</div></span></div>';
      if(S.sess){ S.sess.log.unshift({t:nowISO(),
        txt:'Test d'+ta+'+d'+tb+': '+tot+(crit?' critico':fumble?' fallimento critico':'')}); saveSess() }
    };
  });
};
ACT.fuClasse=function(){
  var v=S.pg.values;
  modal('<h2 style="font-size:19px">Aggiungi una Classe</h2>'+
    '<div style="max-height:52vh;overflow-y:auto;margin:11px 0">'+
    FU_CLASSI_BASE.map(function(k,i){
      var gia=(v.classi||[]).some(function(c){return c.n===k[0]});
      return '<div class="line" data-det="fk'+i+'"><span class="grow">'+esc(k[0])+'</span>'+
        (gia?'<span class="pill">già presa</span>':'<button class="btn sm" data-fuadd="'+i+'">＋</button>')+
        '</div><div class="det" id="fk'+i+'"><div class="body">'+esc(k[1])+
        (k[2]||k[3]||k[4]?'<br><b>Benefici gratuiti:</b> '+
          [k[2]?'+'+k[2]+' PV':'',k[3]?'+'+k[3]+' PM':'',k[4]?'+'+k[4]+' PI':''].filter(Boolean).join(', '):'')+
        '</div></div>'}).join('')+'</div>'+
    '<button class="btn" style="width:100%" data-close>Chiudi</button>',
  function(el,close){
    $$('[data-fuadd]',el).forEach(function(b){ b.onclick=function(ev){
      ev.stopPropagation();
      v.classi=(v.classi||[]).concat([{n:FU_CLASSI_BASE[+b.dataset.fuadd][0],liv:1}]);
      savePGSoon(); close(); render();
    }});
  });
};
ACT.fuAbilita=function(){
  var v=S.pg.values;
  modal('<h2 style="font-size:19px">Nuova Abilità</h2>'+
    '<div class="grid g2" style="margin:11px 0">'+
    '<label style="grid-column:1/-1"><span class="lab">Nome</span><input id="an" placeholder="Magia Elementale"></label>'+
    '<label><span class="lab">Classe</span><select id="ac">'+
      ((v.classi||[]).map(function(c){return '<option>'+esc(c.n)+'</option>'}).join('')||
       FU_CLASSI_BASE.map(function(k){return '<option>'+esc(k[0])+'</option>'}).join(''))+'</select></label>'+
    '<label><span class="lab">Livello Abilità</span><input id="al" type="number" value="1"></label>'+
    '<label style="grid-column:1/-1"><span class="lab">Effetto (dal manuale)</span>'+
    '<textarea id="at" rows="4"></textarea></label></div>'+
    '<div class="row"><button class="btn grow" data-close>Annulla</button>'+
    '<button class="mbtn metal grow" id="ao"><span>Aggiungi</span></button></div>',
  function(el,close){
    $('#an',el).focus();
    $('#ao',el).onclick=function(){
      var n=$('#an',el).value.trim(); if(!n) return;
      v.abilita=(v.abilita||[]).concat([{n:n,cl:$('#ac',el).value,la:Number($('#al',el).value||1),t:$('#at',el).value.trim()}]);
      savePGSoon(); close(); render();
    };
  });
};
ACT.fuLegame=function(){ fuLegameEdit(-1) };
function fuLegameEdit(i){
  var v=S.pg.values;
  var l=i>=0?v.legami[i]:{n:'',e:{}};
  modal('<h2 style="font-size:19px">Legame</h2>'+
    '<label style="display:block;margin:11px 0"><span class="lab">Con chi</span>'+
    '<input id="ln" value="'+esc(l.n||'')+'" placeholder="Nome della persona"></label>'+
    '<div class="eyebrow" style="margin-bottom:7px">Emozioni · una per coppia</div>'+
    FU_EMOZIONI.map(function(p,k){
      return '<div class="row" style="margin-bottom:7px;gap:6px">'+
        p.map(function(e){
          return '<button class="btn sm grow" data-emo="'+esc(e)+'" data-coppia="'+k+'"'+
            ((l.e||{})[e]?' style="box-shadow:inset 0 0 0 2px var(--m2)"':'')+'>'+esc(e)+'</button>'}).join('')+
        '</div>'}).join('')+
    '<div class="row" style="margin-top:12px">'+
    (i>=0?'<button class="btn danger" id="ld">Elimina</button>':'')+
    '<button class="btn grow" data-close>Annulla</button>'+
    '<button class="mbtn metal grow" id="lo"><span>Salva</span></button></div>',
  function(el,close){
    var e=JSON.parse(JSON.stringify(l.e||{}));
    $$('[data-emo]',el).forEach(function(b){ b.onclick=function(){
      var coppia=FU_EMOZIONI[+b.dataset.coppia];
      var acceso=e[b.dataset.emo];
      coppia.forEach(function(x){ delete e[x] });
      if(!acceso) e[b.dataset.emo]=1;
      $$('[data-emo]',el).forEach(function(o){
        o.style.boxShadow=e[o.dataset.emo]?'inset 0 0 0 2px var(--m2)':'' });
    }});
    $('#lo',el).onclick=function(){
      var nuovo={n:$('#ln',el).value.trim()||'senza nome',e:e};
      if(i>=0) v.legami[i]=nuovo;
      else { if((v.legami||[]).length>=6) return toast('Sei già a sei Legami'); v.legami=(v.legami||[]).concat([nuovo]) }
      savePGSoon(); close(); render();
    };
    if($('#ld',el)) $('#ld',el).onclick=function(){ v.legami.splice(i,1); savePGSoon(); close(); render() };
  });
}
ACT.fuOrologio=function(){
  var v=S.pg.values;
  modal('<h2 style="font-size:19px">Nuovo orologio</h2>'+
    '<div class="grid g2" style="margin:11px 0">'+
    '<label style="grid-column:1/-1"><span class="lab">Nome</span><input id="on" placeholder="La marea sale"></label>'+
    '<label><span class="lab">Sezioni</span><select id="os">'+
    [4,6,8,10,12].map(function(n){return '<option'+(n===6?' selected':'')+'>'+n+'</option>'}).join('')+
    '</select></label></div>'+
    '<div class="row"><button class="btn grow" data-close>Annulla</button>'+
    '<button class="mbtn metal grow" id="oo"><span>Aggiungi</span></button></div>',
  function(el,close){
    $('#on',el).focus();
    $('#oo',el).onclick=function(){
      v.orologi=(v.orologi||[]).concat([{n:$('#on',el).value.trim()||'orologio',seg:Number($('#os',el).value),pieni:0}]);
      savePGSoon(); close(); render();
    };
  });
};
document.addEventListener('click',function(e){
  var t=e.target.closest('[data-fuliv],[data-fula],[data-fuoro],[data-fuleg],[data-fuedit]');
  if(!t||!S.pg) return;
  var v=S.pg.values, d=t.dataset;
  if(d.fuliv!==undefined){
    var c=v.classi[+d.fuliv]; c.liv=clamp(Number(c.liv||0)+Number(d.d),0,10);
    savePGSoon(); render(); return;
  }
  if(d.fula!==undefined){
    var a=v.abilita[+d.fula]; a.la=clamp(Number(a.la||1)+Number(d.d),1,10);
    savePGSoon(); render(); return;
  }
  if(d.fuoro!==undefined){
    var o=v.orologi[+d.fuoro], n=Number(d.n);
    o.pieni = Number(o.pieni||0)===n ? n-1 : n;
    savePGSoon(); render(); return;
  }
  if(d.fuleg!==undefined){ fuLegameEdit(+d.fuleg); return }
  if(d.fuedit!==undefined){
    var ab=v.abilita[+d.fuedit];
    modal('<h2 style="font-size:19px">'+esc(ab.n)+'</h2>'+
      '<textarea id="ax" rows="6" style="margin:11px 0">'+esc(ab.t||'')+'</textarea>'+
      '<div class="row"><button class="btn grow" data-close>Annulla</button>'+
      '<button class="mbtn metal grow" id="axo"><span>Salva</span></button></div>',
    function(el2,close2){
      $('#ax',el2).focus();
      $('#axo',el2).onclick=function(){ ab.t=$('#ax',el2).value.trim(); savePGSoon(); close2(); render() };
    });
    return;
  }
},false);
