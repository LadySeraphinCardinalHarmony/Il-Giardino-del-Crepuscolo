"use strict";
/* ========================================================== compendio SRD */
function incObj(a){
  return {nome:a[0],liv:a[1],scuola:a[2],tempo:a[3],gittata:a[4],durata:a[5],classi:a[6],note:a[7]};
}
var CLASSE_SIGLA={bardo:'b',chierico:'c',mago:'m',ladro:'',guerriero:'',barbaro:''};
function viewCompendio(){
  var out=slab('<div class="eyebrow">Compendio</div>'+
    '<p class="faint" style="margin:7px 0 11px">Regole aperte di D&amp;D pubblicate da Wizards of the Coast '+
    'con licenza Creative Commons. Cercabili, e inseribili nelle schede con un tocco.</p>'+
    '<input id="cq" placeholder="Cerca un incantesimo, un\u2019arma, una condizione" data-cq>'+
    '<div class="row" style="margin-top:9px">'+
    [['inc','Incantesimi'],['armi','Armi'],['cond','Condizioni'],['az','Azioni'],['mie','Le mie voci']].map(function(t){
      return '<button class="btn sm grow" data-cs="'+t[0]+'"'+
        (S.compSez===t[0]?' style="box-shadow:inset 0 0 0 2px var(--m2)"':'')+'>'+t[1]+'</button>'}).join('')+
    '</div>');
  out+=slab('<div id="cres">'+compLista('')+'</div>',{plain:true});
  return out;
}
function compLista(q){
  q=(q||'').toLowerCase();
  var sez=S.compSez||'inc', h='';
  if(sez==='inc'){
    var list=SRD_INC.map(incObj).filter(function(s){
      return !q||s.nome.toLowerCase().indexOf(q)>=0||(s.scuola||'').toLowerCase().indexOf(q)>=0});
    list.sort(function(a,b){return a.nome.localeCompare(b.nome,'it')});
    h=list.map(function(s,i){
      return '<div class="line" data-det="cc'+i+'"><span class="v">'+(s.liv===0?'T':s.liv)+'</span>'+
        '<span class="grow">'+esc(s.nome)+'<span class="faint" style="font-size:11px"> '+esc(s.scuola)+'</span></span>'+
        (S.pg&&SISTEMI[S.pg.sys].fam==='dnd'?'<button class="btn sm" data-addinc="'+esc(s.nome)+'">＋</button>':'')+
        '</div><div class="det" id="cc'+i+'"><div class="body"><b>'+esc(s.tempo)+'</b> · '+
        esc(s.gittata)+' · '+esc(s.durata)+'<br>'+esc(s.note)+'</div></div>'}).join('');
    if(!list.length) h='<p class="faint">Nessun incantesimo con questo nome.</p>';
  }else if(sez==='armi'){
    var a2=SRD_ARMI.filter(function(w){return !q||w[0].toLowerCase().indexOf(q)>=0});
    h=a2.map(function(w,i){
      return '<div class="line" data-det="cw'+i+'"><span class="v">'+esc(w[2])+'</span>'+
        '<span class="grow">'+esc(w[0])+'</span>'+
        (S.pg&&SISTEMI[S.pg.sys].fam==='dnd'?'<button class="btn sm" data-addarma="'+esc(w[0])+'">＋</button>':'')+
        '</div><div class="det" id="cw'+i+'"><div class="body">'+esc(w[1])+' · danni '+esc(w[2])+' '+esc(w[3])+
        (w[4]?'<br>'+esc(w[4]):'')+(w[5]?'<br>gittata '+esc(w[5]):'')+'</div></div>'}).join('');
  }else if(sez==='cond'){
    h=SRD_COND.filter(function(c){return !q||c[0].toLowerCase().indexOf(q)>=0})
      .map(function(c,i){
      return '<div class="line" data-det="ck'+i+'"><span class="grow">'+esc(c[0])+'</span>'+
        '<span class="pill">leggi</span></div><div class="det" id="ck'+i+'"><div class="body">'+esc(c[1])+'</div></div>'}).join('');
  }else if(sez==='mie'){
    var sys=(S.pg&&S.pg.sys)||'dnd24';
    var voci=(S.compUser&&S.compUser[sys])||[];
    voci=voci.filter(function(x){return !q||String(x.nome).toLowerCase().indexOf(q)>=0});
    voci.sort(function(a,b){return String(a.nome).localeCompare(String(b.nome),'it')});
    h='<p class="faint" style="margin:0 0 9px">Voci ricavate dai tuoi manuali per '+
      esc(SISTEMI[sys]?SISTEMI[sys].n:sys)+'. Restano nella tua cartella.</p>'+
      (voci.length?voci.map(function(x,i){
        return '<div class="line" data-det="cu'+i+'"><span class="grow">'+esc(x.nome)+'</span>'+
          '<span class="pill">'+esc(x.tipo||'regola')+'</span></div>'+
          '<div class="det" id="cu'+i+'"><div class="body">'+esc(x.testo||'')+'</div></div>'}).join('')
       :'<p class="faint">Ancora nessuna. Con un modello locale puoi ricavarle dai PDF che possiedi.</p>')+
      '<button class="mbtn metal" style="width:100%;margin-top:11px" data-act="iaPannello">'+
      '<span>Modello locale</span></button>';
  }else{
    h=SRD_AZIONI.filter(function(c){return !q||c[0].toLowerCase().indexOf(q)>=0})
      .map(function(c,i){
      return '<div class="line" data-det="ca'+i+'"><span class="grow">'+esc(c[0])+'</span>'+
        '<span class="pill">'+esc(c[1])+'</span></div><div class="det" id="ca'+i+'"><div class="body">'+esc(c[2])+'</div></div>'}).join('');
  }
  return h;
}
ACT.pickinc=function(){
  var v=S.pg.values, cl=S.pg.values.classe, sigla={bardo:'b',chierico:'c',mago:'m'}[cl];
  var list=SRD_INC.map(incObj);
  if(sigla) list=list.filter(function(s){return s.classi.indexOf(sigla)>=0});
  list.sort(function(a,b){return a.liv-b.liv||a.nome.localeCompare(b.nome,'it')});
  var m=modal('<h2 style="font-size:19px">Aggiungi incantesimi</h2>'+
    '<p class="faint" style="margin:7px 0 10px">'+(sigla?'Filtrati per la tua classe. ':'')+
    'Tocca il nome per leggere, il più per aggiungerlo.</p>'+
    '<input id="pq" placeholder="Cerca" style="margin-bottom:10px">'+
    '<div id="pl" style="max-height:52vh;overflow-y:auto"></div>'+
    '<button class="btn" style="width:100%;margin-top:12px" data-close>Fatto</button>',
  function(el,close){
    function draw(q){
      q=(q||'').toLowerCase();
      var f=list.filter(function(s){return !q||s.nome.toLowerCase().indexOf(q)>=0});
      var cur={}; (v.incant||[]).forEach(function(x){cur[x.nome]=1});
      $('#pl',el).innerHTML=f.map(function(s,i){
        return '<div class="line" data-det="pk'+i+'"><span class="v">'+(s.liv===0?'T':s.liv)+'</span>'+
          '<span class="grow">'+esc(s.nome)+'<span class="faint" style="font-size:11px"> '+esc(s.scuola)+'</span></span>'+
          (cur[s.nome]?'<span class="pill">già presente</span>'
            :'<button class="btn sm" data-pinc="'+esc(s.nome)+'">＋</button>')+
          '</div><div class="det" id="pk'+i+'"><div class="body"><b>'+esc(s.tempo)+'</b> · '+
          esc(s.gittata)+' · '+esc(s.durata)+'<br>'+esc(s.note)+'</div></div>'}).join('')
        ||'<p class="faint">Nessun risultato.</p>';
      $$('[data-pinc]',el).forEach(function(b){ b.onclick=function(ev){
        ev.stopPropagation();
        var s=null; list.forEach(function(x){if(x.nome===b.dataset.pinc)s=x});
        v.incant=(v.incant||[]).concat([s]);
        savePGSoon(); b.outerHTML='<span class="pill">aggiunto</span>';
      }});
    }
    $('#pq',el).oninput=function(){draw(this.value)};
    draw('');
  });
};
ACT.pickarma=function(){
  var v=S.pg.values, A=autoDnD(S.pg), cl=CLASSI[v.classe];
  modal('<h2 style="font-size:19px">Aggiungi un\u2019arma</h2>'+
    '<p class="faint" style="margin:7px 0 10px">Il tiro per colpire e i danni vengono calcolati con la '+
    'caratteristica giusta: Forza in mischia, Destrezza se l\u2019arma è accurata o a distanza.</p>'+
    '<div id="wl" style="max-height:56vh;overflow-y:auto">'+SRD_ARMI.map(function(w,i){
      return '<div class="line" data-det="wa'+i+'"><span class="v">'+esc(w[2])+'</span>'+
        '<span class="grow">'+esc(w[0])+'</span><button class="btn sm" data-parma="'+i+'">＋</button></div>'+
        '<div class="det" id="wa'+i+'"><div class="body">'+esc(w[1])+' · '+esc(w[3])+
        (w[4]?'<br>'+esc(w[4]):'')+'</div></div>'}).join('')+'</div>'+
    '<button class="btn" style="width:100%;margin-top:12px" data-close>Fatto</button>',
  function(el,close){
    $$('[data-parma]',el).forEach(function(b){ b.onclick=function(ev){
      ev.stopPropagation();
      var w=SRD_ARMI[Number(b.dataset.parma)];
      var acc=/accurata/.test(w[4])||/distanza/.test(w[1]);
      var car=acc?Math.max(modOf(v.forza),modOf(v.des)):modOf(v.forza);
      var bonus=car+A.comp;
      v.atk=(v.atk||[]).concat([{nome:w[0],bonus:(bonus>=0?'+':'')+bonus,
        danni:w[2]+(car>=0?'+':'')+car,tipo:w[3],prop:w[4]}]);
      savePGSoon();
      b.outerHTML='<span class="pill">aggiunta</span>';
    }});
  });
};
