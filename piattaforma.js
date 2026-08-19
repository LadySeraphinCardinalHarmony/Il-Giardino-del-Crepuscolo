"use strict";
/* ========================================================== riconoscimento */
var PIATT=(function(){
  var ua=navigator.userAgent||'', p=navigator.platform||'';
  var iPad = /iPad/.test(ua) || (p==='MacIntel'&&navigator.maxTouchPoints>1);
  var iPhone = /iPhone|iPod/.test(ua);
  var android = /Android/.test(ua);
  var win = /Windows/.test(ua)&&!iPad;
  var mac = /Macintosh/.test(ua)&&!iPad;
  var linux = /Linux/.test(ua)&&!android;
  var desktop = win||mac||linux;
  return {
    iPad:iPad, iPhone:iPhone, android:android, windows:win, mac:mac, linux:linux,
    desktop:desktop, tocco:navigator.maxTouchPoints>0,
    cartelle: typeof window.showDirectoryPicker==='function',
    webgpu: !!navigator.gpu,
    nome: win?'Windows':mac?'Mac':iPad?'iPad':iPhone?'iPhone':android?'Android':linux?'Linux':'questo dispositivo',
    /* le funzioni pesanti hanno senso solo dove c'è memoria e scheda video */
    studio: (win||mac||linux)&&!!navigator.gpu
  };
})();
function modoStudio(){ return !!(PIATT.studio || (typeof S!=='undefined'&&S.cfg&&S.cfg.forzaStudio)) }
function vistaPiattaforma(){
  var p=PIATT;
  return slab('<div class="eyebrow">Dispositivo</div>'+
    '<div class="row" style="margin-top:8px;gap:10px;align-items:flex-start">'+
    '<div class="big" style="font-family:var(--display);font-size:26px;font-weight:700;line-height:1">'+
    esc(p.nome)+'</div><div class="grow faint" style="font-size:12.5px;line-height:1.55">'+
    (modoStudio()
      ? 'Modalit\u00e0 studio attiva: puoi ampliare il compendio e generare schede con un modello locale, '+
        'poi mandare tutto al tablet come pacchetto.'
      : 'Modalit\u00e0 tavolo: schede, dadi, sessioni e manuali. Le funzioni di preparazione stanno sul computer, '+
        'e i loro risultati arrivano qui come pacchetto.')+
    '</div></div>'+
    '<div class="row wrap" style="margin-top:11px;gap:6px">'+
    '<span class="pill">'+(p.cartelle?'cartelle sì':'cartelle no')+'</span>'+
    '<span class="pill">'+(p.webgpu?'WebGPU sì':'WebGPU no')+'</span>'+
    '<span class="pill">'+(p.tocco?'tocco':'mouse')+'</span></div>'+
    (!PIATT.studio?'<label class="row" style="margin-top:12px;gap:9px">'+
      '<input type="checkbox" data-forzastudio '+(S.cfg.forzaStudio?'checked':'')+
      ' style="width:20px;height:20px;flex:none"><span class="grow faint" style="font-size:12.5px">'+
      'Mostra comunque le funzioni di studio. Su questo dispositivo potrebbero non funzionare o bloccarsi.'+
      '</span></label>':''));
}
