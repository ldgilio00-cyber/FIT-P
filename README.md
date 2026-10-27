# Fit Planner Premium v42 — Progressi adattivi (27/10/2026)

Patch incrementale dalla **v41**, progettata per la PWA installata sulla Home di iPhone. Conserva **tutte le funzionalità** precedenti. Non introduce librerie, account o backend. Lo ZIP contiene **esclusivamente i file modificati**, con i percorsi originali `FIT-P-main/...`.

## Installazione

1. Prima dell'aggiornamento, dalla v41 vai in **Impostazioni → Export JSON** e conserva una copia dei dati.
2. Sostituisci **insieme** i cinque file contenuti nello ZIP, senza cambiare la cartella di pubblicazione o il dominio della PWA.
3. Apri l'app dall'icona nella schermata Home dell'iPhone. Se compare **Aggiorna app**, premi il pulsante e riapri l'app.
4. Nelle Impostazioni verifica **Fit Planner v42**. Ricontrolla le schede, lo storico, la dieta e la lista della spesa.

La chiave `localStorage` resta `fitplanner_v7`. **Nessun dato viene azzerato o convertito in un nuovo formato.** I nuovi filtri dello storico e del grafico sono soltanto preferenze dell'interfaccia, senza cambiare le sessioni registrate.

## Interventi per file

| File | Intervento |
| --- | --- |
| `index.html` | Sezione Progressi ridisegnata: quattro indicatori, grafico con selettore esercizio, indicatore e intervallo, dettaglio del punto toccato, ricerca/filtri dello storico e ricerca dei record. Aggiornata versione v42. |
| `app.js` | Riepiloghi calcolati dai dati reali, progressione a 12/30/tutte le sessioni, grafico canvas ad alta risoluzione adattivo, ridisegno al cambio dimensioni, selezione di un punto con tocco, lista sessioni/record a caricamento progressivo, ricerca, filtri Aperte/Concluse e collegamento record → grafico. Migliorata l'interpretazione del volume: senza ripetizioni valide il volume è sconosciuto, non zero. |
| `styles.css` | Layout mobile-first senza larghezze fisse, campi e pulsanti adatti al tocco, card compatte, grafico con spazio per assi ed etichette, disposizione responsive a 320–430 px e desktop, tema chiaro/scuro. |
| `sw.js` | Cache aggiornata a `fitplanner-static-v42-20261027` per pubblicare insieme HTML/JS/CSS. |
| `README.md` | Questo changelog e la guida di verifica. |

### Regole dei numeri visualizzati

- **Sessioni concluse**: numero delle sessioni marcate chiuse nello storico.
- **Serie registrate**: serie che hanno **sia** carico valido **sia** ripetizioni positive.
- **Volume totale**: somma `kg × ripetizioni` delle serie registrate (non è una stima delle calorie né del consumo energetico).
- **Esercizi registrati**: numero di esercizi distinti con almeno una serie valida.
- **Carico massimo/medio**: rispettivamente il kg più alto e la media dei kg registrati per sessione dell'esercizio scelto. Il grafico può includere anche dati di sessioni in corso, riconoscibili nello storico.
- **Volume del grafico**: solo sessioni che contengono almeno una serie con kg e ripetizioni validi.
- **Variazione**: differenza tra il primo e l'ultimo valore nel periodo selezionato; non è necessariamente un miglioramento continuo.
- **Record personali**: kg massimo registrato per esercizio. Non è una stima di 1RM.

## Cosa testare su iPhone

1. Apri **Progressi** dalla barra inferiore. Verifica che **non sia necessario scorrere orizzontalmente** e che nessuna scheda oltrepassi il bordo a sinistra o a destra.
2. In **Andamento**, scegli un esercizio e cambia **Carico massimo**, **Carico medio**, **Volume**. I numeri devono cambiare e mostrare l'unità corretta.
3. Tocca **Ultime 12**, **Ultime 30**, **Tutte**: il grafico e le tre statistiche devono rispondere. Tocca un punto per leggere **data italiana, valore e posizione** sotto il grafico.
4. Nello **Storico**, prova **Tutte**, **Concluse**, **In corso**, ricerca per nome e il pulsante **Mostra altre sessioni**. Apri una sessione e verifica che il dettaglio e le serie rimangano modificabili.
5. In **Record personali**, cerca un esercizio e tocca il risultato **Vedi grafico**: deve selezionare quell'esercizio e riportarti all'andamento.
6. Chiudi e riapri l'app. Le sessioni devono risultare identiche. Controlla anche **Palestra**, **Dieta**, **Spesa** e il backup JSON.
7. Ripeti almeno un controllo in modalità scura, con testo ingrandito e con l'iPhone in modalità aereo dopo aver aggiornato la PWA una volta online.

## Test effettivamente eseguiti

- Sintassi JavaScript validata con `node --check`.
- Test automatizzati in Chromium con viewport **320×568, 375×667, 390×844, 430×932 e 1024×768**: nessun overflow orizzontale, card entro i bordi, nessun errore JS nei percorsi provati.
- Verificati: KPI calcolati da 42 sessioni simulate, filtro 12/30/tutte, lettura di un punto del grafico, cambio indicatore, ricerca e filtri storico, caricamento progressivo, apertura del dettaglio di una sessione, collegamento dal record al grafico.
- **Non eseguiti**: test su un iPhone reale con PWA standalone, test con VoiceOver e collaudo completo dell'aggiornamento Service Worker installato. Sono necessarie le prove pratiche indicate sopra.
