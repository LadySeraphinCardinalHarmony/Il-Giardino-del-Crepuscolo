/* Sottoclassi. Quelle con testo vengono dal System Reference Document di
   Wizards of the Coast (CC BY 4.0): una per classe, l'unica pubblicata così.
   Le altre sono elencate come voci vuote da completare: i nomi sono
   riferimenti, il testo lo aggiungi tu dal tuo manuale. */
var SOTTOCLASSI={
 barbaro:{liv:3,n:'Cammino primordiale',l:[
  {n:'Cammino del Berserker',srd:1,f:[
   [3,'Frenesia','Quando entri in ira puoi andare in frenesia: ogni turno esegui un attacco extra con un\u2019azione bonus. Quando l\u2019ira finisce subisci un livello di sfinimento.'],
   [6,'Ira folle','Non puoi essere spaventato mentre sei in ira, e se lo eri l\u2019effetto è sospeso.'],
   [10,'Presenza intimidatoria','Con un\u2019azione spaventi una creatura che fallisce un tiro salvezza su Saggezza contro la CD del tuo Carisma.'],
   [14,'Rappresaglia','Quando subisci danni da una creatura entro 1,5 m, puoi usare la reazione per attaccarla.']]},
  {n:'Cammino del Guerriero Totemico'},{n:'Cammino dell\u2019Antenato Ancestrale'},
  {n:'Cammino della Furia Selvaggia'},{n:'Cammino dello Zelota'},{n:'Cammino della Bestia'},
  {n:'Cammino del Portatore di Tempeste'},{n:'Cammino del Cuore Selvaggio'}]},
 bardo:{liv:3,n:'Collegio bardico',l:[
  {n:'Collegio del Sapere',srd:1,f:[
   [3,'Competenze aggiuntive','Ottieni competenza in tre abilità a tua scelta.'],
   [3,'Parole taglienti','Come reazione spendi un\u2019Ispirazione bardica per sottrarre il dado al tiro per colpire, ai danni o alla prova di una creatura.'],
   [6,'Segreti magici aggiuntivi','Impari due incantesimi da qualsiasi classe, che contano come da bardo.'],
   [14,'Abilità impareggiabile','Se fallisci una prova puoi spendere un\u2019Ispirazione bardica e sommare il dado al risultato.']]},
  {n:'Collegio del Valore'},{n:'Collegio delle Spade'},{n:'Collegio dei Sussurri'},
  {n:'Collegio della Creazione'},{n:'Collegio dell\u2019Eloquenza'},{n:'Collegio della Danza'},
  {n:'Collegio degli Spiriti'}]},
 chierico:{liv:1,n:'Dominio divino',l:[
  {n:'Dominio della Vita',srd:1,f:[
   [1,'Discepolo della vita','Ogni incantesimo di cura di 1° livello o superiore ripristina punti ferita aggiuntivi pari a 2 più il livello dell\u2019incantesimo.'],
   [1,'Competenza','Ottieni competenza nelle armature pesanti.'],
   [2,'Preservare la vita','Incanalare divinità: distribuisci punti ferita pari a cinque volte il tuo livello fra le creature entro 9 m, fino a metà del loro massimo.'],
   [6,'Guaritore benedetto','Gli incantesimi di cura che lanci su altri curano anche te di 2 più il livello dell\u2019incantesimo.'],
   [8,'Colpo potenziato','Una volta per turno aggiungi 1d8 danni radiosi a un attacco con arma. Diventa 2d8 al 14° livello.'],
   [17,'Guarigione suprema','Quando lanci un incantesimo di cura, invece di tirare consideri ogni dado al massimo risultato.']]},
  {n:'Dominio della Conoscenza'},{n:'Dominio della Guerra'},{n:'Dominio della Luce'},
  {n:'Dominio della Natura'},{n:'Dominio dell\u2019Inganno'},{n:'Dominio della Tempesta'},
  {n:'Dominio della Tomba'},{n:'Dominio della Forgia'},{n:'Dominio dell\u2019Ordine'},
  {n:'Dominio della Pace'},{n:'Dominio del Crepuscolo'}]},
 druido:{liv:2,n:'Circolo druidico',l:[
  {n:'Circolo della Terra',srd:1,f:[
   [2,'Trucchetto aggiuntivo','Impari un trucchetto da druido in più.'],
   [2,'Ricreazione naturale','Con un riposo breve recuperi slot per un totale di livelli pari a metà del tuo livello da druido.'],
   [3,'Incantesimi del circolo','Scegli una terra — artica, costiera, desertica, foresta, montagna, palude, sottosuolo — e ottieni incantesimi sempre preparati.'],
   [6,'Passo terreno','Il terreno difficile magico non ti rallenta e ignori gli effetti vegetali che ostacolano.'],
   [10,'Ostacolo naturale','Non puoi essere ammaliato o spaventato da elementali e fatati, e sei immune al veleno e alle malattie.'],
   [14,'Santuario naturale','Le bestie e i vegetali devono superare un tiro salvezza su Saggezza per attaccarti.']]},
  {n:'Circolo della Luna'},{n:'Circolo dei Sogni'},{n:'Circolo del Pastore'},
  {n:'Circolo delle Spore'},{n:'Circolo delle Stelle'},{n:'Circolo della Fiamma Ardente'},
  {n:'Circolo del Serpente Piumato'}]},
 guerriero:{liv:3,n:'Archetipo marziale',l:[
  {n:'Campione',srd:1,f:[
   [3,'Critico migliorato','I tuoi attacchi con arma sono colpi critici anche con un 19.'],
   [7,'Atleta straordinario','Aggiungi metà del bonus di competenza alle prove di Forza, Destrezza e Costituzione che non lo includono, e il salto in lungo con rincorsa aumenta.'],
   [10,'Stile di combattimento aggiuntivo','Scegli un secondo stile di combattimento.'],
   [15,'Critico superiore','I tuoi attacchi sono critici con 18, 19 e 20.'],
   [18,'Sopravvissuto','All\u2019inizio di ogni tuo turno recuperi punti ferita se sei sotto metà del massimo.']]},
  {n:'Maestro di Battaglia'},{n:'Cavaliere Arcano'},{n:'Cavaliere'},{n:'Campione Arcano'},
  {n:'Samurai'},{n:'Guerriero Psionico'},{n:'Cavalcatore di Draghi'},{n:'Maestro d\u2019Armi'}]},
 ladro:{liv:3,n:'Archetipo ladresco',l:[
  {n:'Furfante',srd:1,f:[
   [3,'Mani veloci','Con l\u2019Azione astuta puoi usare Rapidità di mano, usare gli arnesi da scasso o interagire con un oggetto.'],
   [3,'Lavoro in secondo piano','Sei capace di scalare più velocemente e ti muovi in silenzio.'],
   [9,'Agilità sopraffina','Scali senza dimezzare la velocità e i salti con rincorsa aumentano.'],
   [13,'Uso degli oggetti magici','Ignori i requisiti di classe, razza e livello degli oggetti magici.'],
   [17,'Riflessi felini','Se agisci per primo nel combattimento puoi compiere un turno aggiuntivo.']]},
  {n:'Assassino'},{n:'Mistificatore Arcano'},{n:'Investigatore'},{n:'Esploratore'},
  {n:'Spadaccino'},{n:'Anima Fantasma'},{n:'Lama Psionica'}]},
 mago:{liv:2,n:'Tradizione arcana',l:[
  {n:'Scuola dell\u2019Evocazione',srd:1,f:[
   [2,'Studioso dell\u2019evocazione','Copiare incantesimi di evocazione nel libro costa metà tempo e metà denaro.'],
   [2,'Scultore di incantesimi','Scegli alcune creature nell\u2019area dei tuoi incantesimi: riescono automaticamente nel tiro salvezza e non subiscono danni.'],
   [6,'Trucchetto potenziato','Aggiungi il modificatore di Intelligenza ai danni dei trucchetti che non lo includono già.'],
   [10,'Potenza dell\u2019evocazione','Chi supera il tiro salvezza contro i tuoi incantesimi da evocazione subisce comunque metà danni.'],
   [14,'Sovraccarico','Aumenti i danni di un incantesimo di 1° o 2° livello, a rischio di ferirti se lo fai troppo spesso.']]},
  {n:'Scuola dell\u2019Abiurazione'},{n:'Scuola dell\u2019Ammaliamento'},{n:'Scuola della Divinazione'},
  {n:'Scuola dell\u2019Illusione'},{n:'Scuola della Necromanzia'},{n:'Scuola della Trasmutazione'},
  {n:'Scuola dell\u2019Evocazione (Conjuration)'},{n:'Cantore di Lame'},{n:'Mago di Guerra'},
  {n:'Ordine degli Scribi'},{n:'Cronurgia'},{n:'Graviturgia'}]},
 monaco:{liv:3,n:'Tradizione monastica',l:[
  {n:'Via della Mano Aperta',srd:1,f:[
   [3,'Tecnica della mano aperta','Quando colpisci con Raffica di colpi puoi spingere il bersaglio, farlo cadere prono o impedirgli le reazioni.'],
   [6,'Totale guarigione','Con un\u2019azione recuperi punti ferita pari a tre volte il tuo livello da monaco, una volta per riposo lungo.'],
   [11,'Tranquillità','Al termine di un riposo lungo ottieni l\u2019effetto di Santuario fino al riposo successivo.'],
   [17,'Palmo tremante','Spendi 3 punti ki per imporre vibrazioni letali che puoi scatenare entro alcuni giorni.']]},
  {n:'Via dell\u2019Ombra'},{n:'Via dei Quattro Elementi'},{n:'Via del Maestro Ubriaco'},
  {n:'Via del Kensei'},{n:'Via dell\u2019Anima Solare'},{n:'Via della Misericordia'},
  {n:'Via del Drago Ascendente'},{n:'Via dell\u2019Io Astrale'}]},
 paladino:{liv:3,n:'Giuramento sacro',l:[
  {n:'Giuramento di Devozione',srd:1,f:[
   [3,'Incanalare divinità: Arma sacra','Aggiungi il modificatore di Carisma ai tiri per colpire di un\u2019arma, che diventa magica ed emette luce.'],
   [3,'Incanalare divinità: Scacciare gli empi','Immondi e non morti che ti vedono devono fuggire se falliscono un tiro salvezza su Saggezza.'],
   [7,'Aura di devozione','Tu e gli alleati entro 3 m non potete essere ammaliati.'],
   [15,'Purezza di spirito','Sei costantemente sotto l\u2019effetto di Protezione dal male e dal bene.'],
   [20,'Nimbo sacro','Emani luce solare, infliggi danni radiosi a chi ti inizia il turno vicino e hai vantaggio ai tiri salvezza contro incantesimi di immondi e non morti.']]},
  {n:'Giuramento degli Antichi'},{n:'Giuramento di Vendetta'},{n:'Giuramento della Corona'},
  {n:'Giuramento di Conquista'},{n:'Giuramento di Redenzione'},{n:'Giuramento delle Sentinelle'},
  {n:'Giuramento della Gloria'},{n:'Spezzagiuramento'}]},
 ranger:{liv:3,n:'Archetipo del ranger',l:[
  {n:'Cacciatore',srd:1,f:[
   [3,'Preda del cacciatore','Scegli: danni extra contro bersagli grandi, oppure contro chi ha meno punti ferita, oppure un attacco che colpisce due creature vicine.'],
   [7,'Tattiche difensive','Scegli: resistere agli attacchi di creature grandi, evitare gli attacchi multipli, o schivare meglio i tiri a distanza.'],
   [11,'Attacchi multipli','Scegli: colpire tre creature con una raffica, oppure attaccare più volte lo stesso bersaglio.'],
   [15,'Difesa superiore del cacciatore','Come reazione riduci i danni subiti da un attacco che puoi vedere.']]},
  {n:'Signore delle Bestie'},{n:'Cacciatore di Mostri'},{n:'Vagabondo Fatato'},
  {n:'Sentinella Alata'},{n:'Sciamano Totemico'},{n:'Vagabondo dell\u2019Orizzonte'},
  {n:'Sterminatore di Non Morti'},{n:'Battitore'}]},
 stregone:{liv:1,n:'Origine stregonesca',l:[
  {n:'Discendenza Draconica',srd:1,f:[
   [1,'Antenato draconico','Scegli un tipo di drago: parli draconico e hai vantaggio alle prove di Carisma con i draghi.'],
   [1,'Resilienza draconica','I punti ferita massimi aumentano di uno per livello e senza armatura la Classe Armatura è 13 più Destrezza.'],
   [6,'Affinità elementale','Aggiungi il modificatore di Carisma ai danni degli incantesimi del tuo elemento, e puoi ottenerne resistenza.'],
   [14,'Ali del drago','Come azione bonus fai crescere ali e ottieni velocità di volare pari alla tua velocità.'],
   [18,'Presenza draconica','Spendendo 5 punti stregoneria affascini o spaventi le creature entro 18 m.']]},
  {n:'Magia Selvaggia'},{n:'Anima Divina'},{n:'Anima Ombrosa'},{n:'Mente Tempestosa'},
  {n:'Mente Aberrante'},{n:'Stregoneria Meccanica'},{n:'Anima Fiammeggiante'}]},
 warlock:{liv:1,n:'Patrono ultraterreno',l:[
  {n:'L\u2019Immondo',srd:1,f:[
   [1,'Benedizione oscura','Quando riduci una creatura a 0 punti ferita ottieni punti ferita temporanei pari al Carisma più il tuo livello.'],
   [6,'Fortuna oscura','Puoi ritirare un tiro per colpire, una prova o un tiro salvezza, una volta per riposo breve.'],
   [10,'Resilienza immonda','Scegli un tipo di danno all\u2019inizio di ogni riposo breve: ne ottieni resistenza.'],
   [14,'Scagliare nell\u2019abisso','Spedisci una creatura su un piano infernale per un turno: se sopravvive torna dove era.']]},
  {n:'L\u2019Arcifata'},{n:'Il Grande Antico'},{n:'Il Celestiale'},{n:'L\u2019Immortale'},
  {n:'L\u2019Insonne'},{n:'Il Genio'},{n:'La Lama Maledetta'},{n:'Il Sacrofago'}]}
};
