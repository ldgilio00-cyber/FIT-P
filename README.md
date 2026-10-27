# Fit Planner v40 — Correzione tastiera iPhone PWA + Allenamento scuro

Aggiornamento incrementale della **v39**, applicabile sovrascrivendo esclusivamente i file presenti in questo archivio. Mantiene tutti gli altri file della v39, le icone, le schede, le diete, la spesa e lo storico.

## Perché è stato necessario

Nella PWA installata sulla **schermata Home di iPhone** (modalità standalone), aprire la tastiera numerica cambiava il `visualViewport`. La v39 ricalcolava direttamente l'altezza dell'intero pannello allenamento su quell'altezza ridotta: questo può spostare i comandi davanti alla scheda o far sparire i campi kg/ripetizioni. La correzione non è un semplice aumento dei margini: cambia la gestione della tastiera.

## Correzione v40

- Il pannello allenamento **mantiene l'altezza di riferimento** all'apertura della tastiera; non si comprime più ogni volta che cambia `visualViewport`.
- Il sistema calcola lo spazio coperto dalla tastiera e lo riserva **nell'area scrollabile dell'allenamento**. Quando si scrive nei campi kg/ripetizioni, i comandi inferiori, l'intestazione e il timer si nascondono temporaneamente: il campo resta libero e visibile.
- Nuovo pulsante **✓ Fine** vicino ai campi; chiude la tastiera e ripristina la vista completa. I valori sono salvati già durante la digitazione.
- I campi sono entrambi adatti alla tastiera numerica iPhone. Per i kg restano validi sia `75,5` sia `75.5`; le ripetizioni accettano solo numeri interi positivi al salvataggio della serie.
- Allenamento con **tema scuro dedicato**, schede blu notte, contrasto elevato, timer compatto e campo kg/ripetizioni in primo piano, ispirato allo stile grafico richiesto.
- Versione interfaccia e cache PWA aggiornate a **v40**.

## File inclusi e motivazione

| File | Cosa cambia |
| --- | --- |
| `app.js` | Gestione focus/tastiera nella PWA standalone, altezza pannello stabile, compensazione dello spazio coperto, comando Fine e tastiera numerica. |
| `styles.css` | Modalità di inserimento senza footer sovrapposto, scorrimento protetto, grafica allenamento blu notte in stile app. |
| `index.html` | Numero di versione v40. |
| `sw.js` | Nuova cache `fitplanner-static-v40-20261027` per aggiornare insieme i file. |
| `README.md` | Questa guida. |

La chiave di salvataggio resta **`fitplanner_v7`**: non vengono rimosse o convertite le sessioni e non viene modificato il formato persistente dei dati.

## Installazione corretta su iPhone

1. Dalla PWA attuale apri **Impostazioni → Export JSON** e conserva un backup.
2. Pubblica nella cartella originale sullo **stesso indirizzo web** tutti i file dello ZIP, senza cambiare nome o percorso della cartella.
3. Sul telefono connesso a Internet, apri l'app **dalla sua icona nella schermata Home** e usa **Aggiorna app** quando appare. Se non appare, chiudi completamente l'app e riaprila con Internet attivo.
4. In **Impostazioni** verifica che sia indicata la **v40**. Non cancellare dati del sito né disinstallare l'app per forzare l'aggiornamento: perderesti i dati locali se non ripristinabili da backup.

## Test concreto sul tuo iPhone

1. Apri una sessione di allenamento. Controlla che il timer sia compatto e che la scheda dell'esercizio sia leggibile.
2. Tocca il campo **Kg** e poi **Reps**: la tastiera deve aprirsi e i campi devono restare sopra, senza footer che li copre e senza grande salto di layout.
3. Digita `75,5` kg e `10` ripetizioni. Tocca **✓ Fine**: deve sparire la tastiera e devono tornare timer e pulsanti normali.
4. Premi **Serie →**, poi **← Serie**: devono rimanere `75,5` e `10` nella serie precedente.
5. Verifica anche il flusso **Salva e avvia timer**, **Prossimo esercizio**, **Chiudi**, poi riapri la sessione dallo storico.
6. Esci completamente dalla PWA e riaprila. Verifica che schede, diete, spesa, serie e consumi registrati siano ancora presenti.

## Test effettivamente effettuati

- Sintassi JS di `app.js` e `sw.js` verificata con Node.js.
- Test automatizzati con Chromium emulando larghezze 320, 375, 390 e 430 px, con verifica dell'allineamento di timer, corpo sessione e comandi.
- Test flussi: modifica kg e ripetizioni, persistenza, navigazione serie, timer, esercizio successivo, chiusura sessione, nomi pasti e registrazione dei pasti consumati.
- Simulazione della contrazione di `visualViewport` dovuta a tastiera fino a 350 px: campo visibile, pannello non compresso, pulsante Fine e ritorno alla vista normale.

**Limite importante**: queste sono simulazioni browser, **non** un test fisico di Safari/WebKit in modalità standalone su iPhone. Il comportamento della tastiera Apple va verificato col test sopra sul tuo dispositivo. Questa correzione è specificamente progettata per il problema visibile nel tuo screenshot.
