# Fit Planner Premium v39 — navigazione chiara e allenamento stabile

Aggiornamento incrementale della **v38** del 27/10/2026. Non è un nuovo progetto né un reset dei dati. Lo ZIP contiene solo i file modificati e nuovi, conservando i percorsi `FIT-P-main/`.

## Modifiche v39

| File | Modifiche |
| --- | --- |
| `index.html` | Barra inferiore ripristinata in uno stile semplice con cinque etichette e icone riconoscibili; Impostazioni con un unico ingranaggio compatto; timer riorganizzato su una riga; esercizi e comandi meglio distinti; versione v39; icona Apple dedicata. |
| `styles.css` | Ripristino barra inferiore senza dock flottante; layout dell'allenamento con colonna flessibile stabile, timer compatto, area esercizio scorrevole e comandi sempre allineati; adattamenti per 320–430 px e schermi bassi. |
| `app.js` | Adattamento dell'altezza del pannello allenamento alla viewport visibile in iOS, suggerimenti spostati in sezione apribile, target esercizio più conciso, selettore serie centrato; logica dati invariata. |
| `sw.js` | Versione cache `fitplanner-static-v39-20261027` e nuovo asset per icona iPhone. |
| `brand-mark.svg` | Logo semplificato: un manubrio riconoscibile, senza lettere astratte. |
| `icon-192.png` | Icona PWA aggiornata. |
| `icon-512.png` | Icona PWA aggiornata. |
| `apple-touch-icon.png` | Nuova icona 180×180 per la schermata Home di iPhone. |
| `README.md` | Changelog e test aggiornati. |

`manifest.webmanifest` e gli altri file del progetto **non sono stati modificati** e devono rimanere nella cartella esistente.

## Cosa verificare su iPhone

1. **Prima dell'aggiornamento**, da Impostazioni esporta un backup JSON e verifica che sia leggibile. Mantieni l'indirizzo esatto del sito: `localStorage` non segue automaticamente un cambio di dominio/percorso.
2. Sostituisci tutti i file presenti nello ZIP, mantenendo le cartelle originali. Apri Safari sull'indirizzo esistente e usa **Aggiorna app** se appare il relativo avviso. Controlla che la versione sia `v39` in Impostazioni.
3. **Barra delle pagine:** devono comparire `Home`, `Palestra`, `Dieta`, `Spesa`, `Progressi`, con icone evidenti e non ambigue. Impostazioni deve essere un piccolo pulsante nell'angolo superiore destro, non una riga aggiuntiva.
4. **Allenamento:** avvia una sessione con più esercizi e 3–4 serie. Il timer deve stare in alto, su una riga compatta. Prova Start, Pausa e Salta. Verifica che i campi kg/reps siano grandi e che i comandi Salva, Serie precedente, Serie successiva ed Esercizio successivo non si spostino dopo le azioni.
5. **Tastiera iPhone:** tocca il campo Kg e il campo Reps. Verifica che la tastiera non copra permanentemente il campo attivo o il tasto necessario e che, richiusa la tastiera, il layout torni stabile.
6. **Persistenza:** compila una serie, passa alla successiva e torna indietro; i dati devono restare. Chiudi l'allenamento, aprilo dallo storico e controlla le serie salvate.
7. **Dieta e Spesa:** verifica che i nomi personalizzati dei pasti, le spunte `Consumato`, gli articoli della spesa e le scorte siano rimasti. Le date devono continuare a comparire come `GG/MM/AAAA`.
8. **Icona:** se la PWA è già installata sulla Home, iOS può mantenere l'icona precedente nella cache. Prima di valutare il risultato, apri e aggiorna il sito. Non eliminare l'app o i suoi dati prima di aver verificato il backup.
9. **Offline:** dopo aver visitato online la v39 e completato l'aggiornamento, riapri la PWA in modalità aereo e verifica l'avvio. Non cancellare la cache manualmente durante questa prova.

## Verifiche tecniche eseguite

- Controllo di sintassi JavaScript con Node.js.
- Verifica delle nuove dimensioni delle icone PWA e Apple.
- Test di interazione in Chromium headless con HTML/CSS/JavaScript caricati localmente nella pagina senza navigazione HTTP: viewport **320×568, 375×667, 390×844 e 430×932 px**. In questi test il footer della sessione resta allineato e non vengono rilevati errori JavaScript.
- Test di salvataggio serie, passaggio serie precedente/successiva, Start/Pausa/Salta, passaggio esercizio, chiusura sessione, persistenza del carico, rinomina dei pasti e spunte consumati.
- Non è stato possibile verificare il Service Worker installato tramite un vero URL navigabile a causa delle restrizioni dell'ambiente, né provare su iPhone fisico/Safari. Questi test rimangono necessari.

## Sicurezza dati

La chiave di salvataggio resta **`fitplanner_v7`**. La struttura esistente di schede, diete e sessioni non è stata sostituita. Salva comunque un backup JSON prima di aggiornare: è il modo più sicuro per recuperare i dati nel caso un dispositivo elimini la propria memoria locale.
