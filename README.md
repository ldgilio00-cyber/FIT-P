# Fit Planner v41 · aggiornamento iPhone (27/10/2026)

Patch incrementale della **v40**. Nessun backend o libreria nuova. I file v40 non elencati nell'archivio v41 devono restare invariati. Non cambiare dominio o percorso di pubblicazione: la memoria locale è legata all'origine della PWA.

## Installazione

1. Dalla v40, prima di modificare i file, aprire **Impostazioni → Esporta JSON** e salvare il backup.
2. Sovrascrivere insieme i cinque file contenuti in questo ZIP, conservando le directory originali.
3. Aprire Fit Planner dalla schermata Home dell'iPhone. Se appare l'avviso di nuova versione, toccare **Aggiorna app**; quindi riaprire la PWA.
4. Verificare la dicitura **v41** in Impostazioni. Controllare numero di schede, diete, allenamenti e voci della spesa.
5. Conservare il backup della v40 fino al completamento dei test.

La chiave locale è ancora `fitplanner_v7`. Nessuna migrazione distruttiva: i nuovi filtri hanno valori di default quando non presenti nei vecchi dati. Le date visibili rimangono `GG/MM/AAAA`; internamente si mantengono i formati storici necessari a confronti e salvataggi.

## Novità / changelog

| File | Modifica |
| --- | --- |
| `app.js` | Allenamento con **tutte le serie visibili** in griglia. Kg/ripetizioni salvati direttamente su `localStorage` a ogni variazione e alla sospensione della PWA, senza considerare automaticamente completate serie vuote. Memoria dell'indice di serie. Ultima prestazione di ogni serie, carico di progressione proposto e pulsante esplicito **Usa**. Modifica porzioni dalla giornata, apertura rapida editor pasto, copia a domani. Filtri Spesa Da acquistare/Tutti con acquistati alla fine. |
| `index.html` | Rimossi banner esplicativi del periodo Spesa, aggiunti pulsanti per le viste Spesa e sostituita icona Impostazioni con un ingranaggio chiaro e proporzionato. Versione v41. |
| `styles.css` | Griglia stabile delle serie per iPhone, campi grandi, separazione dei suggerimenti dai risultati, controllo Fine che resta visibile durante lo scroll con tastiera aperta. Ritocchi a barra inferiore e card, pulsanti per Dieta e Spesa. |
| `sw.js` | Nome cache aggiornato a `fitplanner-static-v41-20261027` per caricare simultaneamente i file nuovi. |
| `README.md` | Istruzioni e test. |

Le icone PWA, il logo, il manifest e gli altri asset della v40 non sono inclusi perché non modificati.

## Verifiche pratiche su iPhone (PWA installata)

1. **Serie:** aprire un allenamento, toccare direttamente la riga 2 o 3, inserire kg e ripetizioni. Tutte le righe devono essere visibili nella stessa scheda. Con **Fine** deve chiudersi la tastiera senza perdere i valori.
2. **Salvataggio automatico:** digitare una serie, poi uscire con **Esci** senza premere “Salva e avvia timer”. Riaprire dalla Home; i valori devono essere presenti. Prova anche bloccando e sbloccando l'iPhone.
3. **Carichi suggeriti:** su un esercizio con prestazioni precedenti appaiono i riferimenti. I suggerimenti restano distinti dai valori reali; solo **Usa** compila il carico della serie selezionata.
4. **Timer:** avviare, mettere in pausa, saltare. Controllare che le posizioni di timer e campi rimangano stabili. Verificare iOS standalone con tastiera numerica aperta anche sulla quarta serie.
5. **Dieta:** scegliere un giorno. Modificare la quantità di un alimento, copiarne il pasto al giorno successivo, rinominarlo se serve e segnare diversi pasti consumati. Verificare dopo il riavvio.
6. **Spesa:** controllare che il testo/banner sulle date sia sparito. Generare la spesa, spuntare prodotti, alternare **Da acquistare** e **Tutti**: gli acquistati devono comparire nella parte finale di Tutti. Modificare scorte e aggiungere un prodotto manuale, quindi ricalcolare: non devono sparire.
7. **Dati precedenti e offline:** controllare schede, sessioni, quantità, pasti consumati e spesa dopo l'aggiornamento; aprire la PWA in modalità aereo dopo averla aggiornata una volta online.

## Test effettuati realmente

- `node --check app.js`: sintassi JS corretta.
- Test automatizzati in **Chromium** con viewport **320×568, 375×667, 390×844 e 430×932**: tutte le serie presenti, modifiche kg/reps persistite, cambio serie/esercizio, timer, quantità dieta, copia del pasto, editor del pasto, filtri Spesa, banner rimosso e nessun errore JS nei percorsi testati.
- Simulazione tastiera su viewport **320×568 e 390×844**, con 350 px di schermo occupati: test sul campo della terza serie e sul pulsante Fine superati.

**Non eseguiti**: test su Safari WebKit di un iPhone fisico, installazione/reinstallazione PWA reale, timer con iOS fisico bloccato e misurazione di resistenza all'interruzione improvvisa dell'alimentazione. In particolare, il comportamento della tastiera installata nella Home va confermato sul dispositivo.
