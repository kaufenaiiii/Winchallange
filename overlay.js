// overlay.js (Overlay für OBS)

// Firebase Initialisierung - DIESER BLOCK MUSS IN DEINER overlay.html SEIN!
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>
// <script>
//   const firebaseConfig = {
//     apiKey: "DEIN_API_KEY", // ERSETZE DURCH DEINEN API KEY
//     authDomain: "DEIN_PROJECT_ID.firebaseapp.com",
//     databaseURL: "https://DEIN_PROJECT_ID-default-rtdb.europ-west1.firebasedatabase.app", // ERSETZE DURCH DEINE URL
//     projectId: "DEIN_PROJECT_ID",
//     storageBucket: "DEIN_PROJECT_ID.appspot.com",
//     messagingSenderId: "DEIN_SENDER_ID",
//     appId: "DEIN_APP_ID"
//   };
//   const app = firebase.initializeApp(firebaseConfig);
//   const database = app.database();
// </script>
// Ende des Firebase-Initialisierungs-Blocks


document.addEventListener('DOMContentLoaded', () => {
    // ----- HTML-Elemente abrufen (Referenzen) -----
    // WICHTIG: Die ID hier muss mit der ID im HTML übereinstimmen!
    // Ich habe 'overlay-challenge-title' zu 'overlayChallengeTitle' geändert,
    // um Konsistenz mit dem script.js zu gewährleisten.
    const overlayChallengeTitle = document.getElementById('overlayChallengeTitle');
    const overlayGameList = document.getElementById('overlay-game-list');
    const overlayTotalTime = document.getElementById('overlay-total-time');
    const pageIndicators = document.getElementById('page-indicators'); // Für die Seitenanzeige

    const PAGE_SIZE = 5; // Anzahl der Spiele pro Seite im Overlay
    let currentPage = 0; // Aktuelle Seite für die Anzeige

    // ----- Firebase Referenzen -----
    const dbRef = database.ref('/winChallengeData'); // Muss der GLEICHE Pfad sein wie in script.js

    // ----- Lokaler Zustand (wird durch Firebase-Daten aktualisiert) -----
    let currentGames = [];
    let currentTotalSeconds = 0;
    let currentChallengeTitle = 'Win Challenge';
    let currentActiveGameName = null;

    // Funktion zum Formatieren der Zeit (HH:MM:SS)
    const formatTime = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const pad = (num) => String(num).padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };

    // Hauptfunktion zum Aktualisieren des Overlays
    const updateOverlayDisplay = () => { // Umbenannt, damit klar ist, dass es die Anzeige aktualisiert
        // Titel anzeigen
        overlayChallengeTitle.textContent = currentChallengeTitle;

        // Gesamtzeit anzeigen
        overlayTotalTime.textContent = formatTime(currentTotalSeconds);

        // Filtern von Spielen, die "completed" sind (optional, wenn du sie nicht anzeigen willst)
        const gamesToFilterAndDisplay = currentGames.filter(game => !game.completed);

        // Logik für Seitenumbruch und Anzeige
        const totalPages = Math.ceil(gamesToFilterAndDisplay.length / PAGE_SIZE);

        // Stelle sicher, dass currentPage im gültigen Bereich liegt
        if (currentPage >= totalPages && totalPages > 0) {
            currentPage = 0; // Zurück zur ersten Seite, wenn die aktuelle Seite nicht mehr existiert
        }
        if (totalPages === 0) { // Wenn keine Spiele vorhanden sind
            currentPage = 0;
        }

        const startIndex = currentPage * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        const gamesOnCurrentPage = gamesToFilterAndDisplay.slice(startIndex, endIndex);

        // Spiel-Liste aktualisieren
        overlayGameList.innerHTML = ''; // Vorhandene Einträge leeren
        if (gamesOnCurrentPage.length === 0 && gamesToFilterAndDisplay.length === 0) {
            // Wenn keine Spiele hinzugefügt wurden oder alle abgeschlossen sind
            const li = document.createElement('li');
            li.textContent = "Keine Spiele hinzugefügt.";
            li.classList.add('no-games-message'); // CSS-Klasse für Styling
            overlayGameList.appendChild(li);
        } else {
            gamesOnCurrentPage.forEach(game => {
                const li = document.createElement('li');
                li.classList.add('game-item');

                // Überprüfen, ob das Spiel das aktuell aktive Spiel ist (für Hervorhebung)
                if (currentActiveGameName && game.name === currentActiveGameName) {
                    li.classList.add('active-game');
                }

                // Prüfen, ob das Spiel abgeschlossen ist (sollten hier nicht angezeigt werden, wenn gefiltert)
                if (game.completed) {
                    li.classList.add('completed-game');
                }

                const gameNameSpan = document.createElement('span');
                gameNameSpan.classList.add('game-name');
                gameNameSpan.textContent = game.name;

                const gameTimeSpan = document.createElement('span');
                gameTimeSpan.classList.add('game-time');
                gameTimeSpan.textContent = formatTime(game.time);

                li.appendChild(gameNameSpan);
                li.appendChild(gameTimeSpan);
                overlayGameList.appendChild(li);
            });
        }

        // Seitenindikatoren aktualisieren (Punkte unter der Liste)
        pageIndicators.innerHTML = '';
        for (let i = 0; i < totalPages; i++) {
            const dot = document.createElement('span');
            dot.classList.add('page-dot');
            if (i === currentPage) {
                dot.classList.add('active');
            }
            pageIndicators.appendChild(dot);
        }

        // console.log("Overlay aktualisiert. Daten:", { title: currentChallengeTitle, games: currentGames, totalTime: currentTotalSeconds, activeGame: currentActiveGameName });
    };

    // Automatischer Wechsel der Seiten im Overlay
    let pageCycleInterval = null;
    const startPageCycling = () => {
        if (pageCycleInterval) {
            clearInterval(pageCycleInterval);
        }
        // Prüfen, ob es mehr als eine Seite gibt, um den Zyklus zu starten
        const gamesForCycling = currentGames.filter(game => !game.completed);
        if (Math.ceil(gamesForCycling.length / PAGE_SIZE) > 1) {
            pageCycleInterval = setInterval(() => {
                const totalPages = Math.ceil(gamesForCycling.length / PAGE_SIZE);
                if (totalPages > 1) { // Doppelte Prüfung, falls sich gamesForCycling schnell ändert
                    currentPage = (currentPage + 1) % totalPages;
                    updateOverlayDisplay(); // Overlay aktualisieren, um die neue Seite anzuzeigen
                } else {
                    clearInterval(pageCycleInterval);
                    pageCycleInterval = null;
                    currentPage = 0; // Zurück zur ersten Seite, wenn nur noch eine Seite
                    updateOverlayDisplay(); // Einmal aktualisieren, um sicherzustellen, dass nur die erste Seite angezeigt wird
                }
            }, 5000); // Wechselt alle 5 Sekunden die Seite
        } else {
            currentPage = 0; // Wenn nur 0 oder 1 Seite, immer auf Seite 0 bleiben
            updateOverlayDisplay(); // Sicherstellen, dass nur die erste (oder einzige) Seite angezeigt wird
        }
    };

    // Firebase Listener: Hört auf Änderungen in der Datenbank in Echtzeit
    dbRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            currentChallengeTitle = data.challengeTitle || 'Win Challenge';
            currentGames = data.games || [];
            currentTotalSeconds = data.totalSeconds || 0;
            currentActiveGameName = data.activeGameName || null;
            // console.log("Data received from Firebase:", data);
        } else {
            // Wenn keine Daten in der DB, setze auf Standard
            currentChallengeTitle = 'Win Challenge';
            currentGames = [];
            currentTotalSeconds = 0;
            currentActiveGameName = null;
            // console.log("No data in Firebase. Resetting overlay state.");
        }
        // Sobald neue Daten von Firebase kommen, aktualisiere die Anzeige
        updateOverlayDisplay();
        // Starte/aktualisiere den Seitenzyklus bei Datenänderung
        startPageCycling();
    });

    // Keine kontinuierliche setInterval(updateOverlay, 1000) mehr,
    // da der dbRef.on('value') Listener alle Änderungen in Echtzeit abfängt.
    // Die Anzeige wird aktualisiert, sobald Firebase neue Daten liefert.

    // Initialer Aufruf (wird aber meist sofort vom Firebase Listener überschrieben)
    updateOverlayDisplay();
});