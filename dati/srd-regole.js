/* Armi, condizioni e azioni dal System Reference Document di Wizards of the Coast,
   licenza Creative Commons Attribuzione 4.0. */
/* [nome, categoria, danni, tipo, proprietà, gittata] */
var SRD_ARMI=[
["Ascia bipenne","marziale mischia","1d12","tagliente","pesante, due mani",""],
["Ascia da battaglia","marziale mischia","1d8","tagliente","versatile 1d10",""],
["Arco corto","semplice distanza","1d6","perforante","munizioni, due mani","24/96 m"],
["Arco lungo","marziale distanza","1d8","perforante","munizioni, pesante, due mani","45/180 m"],
["Balestra a mano","marziale distanza","1d6","perforante","munizioni, leggera, ricarica","9/36 m"],
["Balestra leggera","semplice distanza","1d8","perforante","munizioni, ricarica, due mani","24/96 m"],
["Balestra pesante","marziale distanza","1d10","perforante","munizioni, pesante, ricarica, due mani","30/120 m"],
["Bastone ferrato","semplice mischia","1d6","contundente","versatile 1d8",""],
["Clava","semplice mischia","1d4","contundente","leggera",""],
["Falcione","marziale mischia","1d10","tagliente","pesante, portata, due mani",""],
["Giavellotto","semplice mischia","1d6","perforante","da lancio","9/36 m"],
["Lancia","semplice mischia","1d6","perforante","da lancio, versatile 1d8","6/18 m"],
["Mazza","semplice mischia","1d6","contundente","",""],
["Martello da guerra","marziale mischia","1d8","contundente","versatile 1d10",""],
["Martello leggero","semplice mischia","1d4","contundente","leggera, da lancio","6/18 m"],
["Piccone da guerra","marziale mischia","1d8","perforante","",""],
["Pugnale","semplice mischia","1d4","perforante","accurata, leggera, da lancio","6/18 m"],
["Spada corta","marziale mischia","1d6","perforante","accurata, leggera",""],
["Spada lunga","marziale mischia","1d8","tagliente","versatile 1d10",""],
["Spadone","marziale mischia","2d6","tagliente","pesante, due mani",""],
["Stocco","marziale mischia","1d8","perforante","accurata",""],
["Tridente","marziale mischia","1d6","perforante","da lancio, versatile 1d8","6/18 m"],
["Fionda","semplice distanza","1d4","contundente","munizioni","9/36 m"],
["Randello","semplice mischia","1d8","contundente","due mani",""],
["Alabarda","marziale mischia","1d10","tagliente","pesante, portata, due mani",""]
];
/* [nome, effetto] */
var SRD_COND=[
["Accecato","Non vedi e fallisci le prove che richiedono la vista. I tuoi attacchi hanno svantaggio, quelli contro di te vantaggio."],
["Affascinato","Non puoi attaccare chi ti affascina né bersagliarlo con effetti nocivi. Chi ti affascina ha vantaggio alle prove sociali con te."],
["Afferrato","La tua velocità diventa 0. Finisce se chi ti afferra è incapacitato o se vieni allontanato."],
["Assordato","Non senti e fallisci le prove che richiedono l'udito."],
["Avvelenato","Svantaggio ai tiri per colpire e alle prove di caratteristica."],
["Incapacitato","Non puoi compiere azioni né reazioni."],
["Invisibile","Non puoi essere visto senza magia. I tuoi attacchi hanno vantaggio, quelli contro di te svantaggio."],
["Paralizzato","Sei incapacitato, non ti muovi e non parli. Gli attacchi contro di te hanno vantaggio e a 1,5 m sono colpi critici."],
["Pietrificato","Sei trasformato in materia inanimata, incapacitato, con resistenza a tutti i danni e immunità a veleni e malattie."],
["Privo di sensi","Sei incapacitato, lasci cadere ciò che tieni e cadi prono. Gli attacchi a 1,5 m sono colpi critici."],
["Prono","Ti muovi solo strisciando. I tuoi attacchi hanno svantaggio; quelli contro di te hanno vantaggio a 1,5 m, svantaggio da lontano."],
["Spaventato","Svantaggio a prove e tiri per colpire finché vedi la fonte della paura, e non puoi avvicinarti volontariamente."],
["Stordito","Sei incapacitato, parli a stento, fallisci i tiri salvezza su Forza e Destrezza. Gli attacchi contro di te hanno vantaggio."],
["Trattenuto","La velocità è 0, i tuoi attacchi hanno svantaggio, quelli contro di te vantaggio, e hai svantaggio ai tiri salvezza su Destrezza."],
["Sfinimento","Sei livelli di gravità crescente: svantaggio alle prove, velocità dimezzata, svantaggio ai tiri per colpire e ai tiri salvezza, punti ferita massimi dimezzati, velocità 0, morte."]
];
/* [nome, tipo, testo] */
var SRD_AZIONI=[
["Attaccare","azione","Un attacco in mischia o a distanza. Alcuni privilegi permettono più attacchi con la stessa azione."],
["Scattare","azione","Guadagni movimento extra pari alla tua velocità per questo turno."],
["Disimpegnarsi","azione","Il tuo movimento non provoca attacchi di opportunità per il resto del turno."],
["Schivare","azione","Chi ti attacca ha svantaggio e tu hai vantaggio ai tiri salvezza su Destrezza, finché la tua velocità non è 0."],
["Nascondersi","azione","Prova di Destrezza (Furtività) contro la Percezione passiva di chi potrebbe notarti."],
["Preparare","azione","Scegli un innesco e una risposta: la esegui come reazione quando l'innesco si verifica."],
["Aiutare","azione","Un alleato ottiene vantaggio alla prossima prova, o al prossimo attacco contro un nemico entro 1,5 m da te."],
["Usare un oggetto","azione","Interagisci con un secondo oggetto o usi le proprietà speciali di un oggetto."],
["Cercare","azione","Dedichi l'azione a cercare qualcosa, di norma con una prova di Saggezza (Percezione) o Intelligenza (Indagare)."],
["Lanciare un incantesimo","varia","Il tempo di lancio dell'incantesimo: azione, azione bonus, reazione o più lungo."]
];
/* Stati e risorse attivabili in sessione, per classe */
var CLASSE_STATI={
 barbaro:[{id:'ira',n:'Ira',t:'Vantaggio alle prove e ai tiri salvezza su Forza, danni extra in mischia, resistenza a contundenti, perforanti e taglienti. Finisce se non attacchi né subisci danni per un round.',dmg:2}],
 bardo:[{id:'isp',n:'Ispirazione bardica',t:'Dai un dado a un alleato con un\u2019azione bonus. Gli usi tornano con il riposo lungo, o breve dal 5° livello.'}],
 ladro:[{id:'furtivo',n:'Attacco furtivo pronto',t:'Una volta per turno, se hai vantaggio o un alleato è adiacente al bersaglio, aggiungi i dadi di Attacco furtivo ai danni.'}],
 guerriero:[{id:'impeto',n:'Azione impetuosa',t:'Un\u2019azione aggiuntiva in questo turno. Torna con il riposo breve.'},
            {id:'energie',n:'Recuperare energie',t:'Azione bonus: recuperi 1d10 più il tuo livello in punti ferita.'}],
 mago:[{id:'conc',n:'Concentrazione',t:'Se subisci danni, tiro salvezza su Costituzione con CD pari a 10 o metà dei danni, il valore più alto.'}],
 chierico:[{id:'incanala',n:'Incanalare divinità',t:'Un potere del tuo dominio, oppure Scacciare non morti. Torna con il riposo breve o lungo.'}]
};
