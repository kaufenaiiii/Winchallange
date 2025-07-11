document.addEventListener('DOMContentLoaded', () => {
    const overlayChallengeTitle = document.getElementById('overlay-challenge-title');
    const overlayGameList = document.getElementById('overlay-game-list');
    const overlayTotalTime = document.getElementById('overlay-total-time');
    const pageIndicators = document.getElementById('page-indicators'); // Für die Seitenanzeige

    const PAGE_SIZE = 5; // Anzahl der Spiele pro Seite im Overlay

    let currentPage = 0; // Aktuelle Seite für die Anzeige

    // Funktion zum Formatieren der Zeit (HH:MM:SS) - Duplikat aus script.js, aber notwendig für Overlay
    const formatTime = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const pad = (num) => String(num).padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };

        const testLocalStorageData = localStorage.getItem('winChallengeTitle');
        document.getElementById('overlayChallengeTitle').textContent = `DEBUG: Titel: ${testLocalStorageData || 'NICHT GEFUNDEN'}`;
    
// Hauptfunktion zum Aktualisieren des Overlays
    const updateOverlay = () => {
        // Titel laden
        const savedTitle = localStorage.getItem('winChallengeTitle');
        overlayChallengeTitle.textContent = savedTitle || 'Win Challenge'; // Standardtitel, falls keiner gesetzt

        // Gesamtzeit laden
        const savedTotalSeconds = localStorage.getItem('overallTimerSeconds');
        overlayTotalTime.textContent = formatTime(parseInt(savedTotalSeconds || 0));

        // Spiele laden
        const savedGames = localStorage.getItem('winChallengeGames');
        let games = [];
        if (savedGames) {
            try {
                games = JSON.parse(savedGames);
            } catch (e) {
                console.error("Fehler beim Parsen der Spieldaten aus Local Storage:", e);
                games = []; // Zurücksetzen, um Fehler zu vermeiden
            }
        }

        // Filtern von Spielen, die "completed" sind (optional, wenn du sie nicht anzeigen willst)
        // games = games.filter(game => !game.completed); // Uncomment, wenn abgeschlossene Spiele ausgeblendet werden sollen

        // Logik für Seitenumbruch und Anzeige
        const totalPages = Math.ceil(games.length / PAGE_SIZE);

        // Stelle sicher, dass currentPage im gültigen Bereich liegt
        if (currentPage >= totalPages && totalPages > 0) {
            currentPage = 0; // Zurück zur ersten Seite, wenn die aktuelle Seite nicht mehr existiert
        }
        if (totalPages === 0) { // Wenn keine Spiele vorhanden sind
            currentPage = 0;
        }

        const startIndex = currentPage * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        const gamesToDisplay = games.slice(startIndex, endIndex);

        // Spiel-Liste aktualisieren
        overlayGameList.innerHTML = ''; // Vorhandene Einträge leeren
        if (gamesToDisplay.length === 0 && games.length > 0) { // Fallback, falls slice nichts ergibt, aber Spiele da sind
             // Dies kann passieren, wenn PAGE_SIZE größer ist als die Gesamtzahl der Spiele
             // oder wenn currentPage durch Filter ungültig wird.
             // In diesem Fall einfach alle anzeigen, oder eine leere Seite.
             // Für jetzt, einfach leer lassen, wenn nichts zum Anzeigen da ist auf der Seite.
        } else if (gamesToDisplay.length === 0 && games.length === 0) {
            // Wenn keine Spiele hinzugefügt wurden
            const li = document.createElement('li');
            li.textContent = "Keine Spiele hinzugefügt.";
            li.classList.add('no-games-message'); // CSS-Klasse für Styling
            overlayGameList.appendChild(li);
        } else {
            gamesToDisplay.forEach(game => {
                const li = document.createElement('li');
                li.classList.add('game-item');

                // Überprüfen, ob das Spiel das aktuell aktive Spiel ist (optional, für Hervorhebung)
                const activeGameName = localStorage.getItem('activeGameName');
                if (activeGameName && game.name === activeGameName) {
                    li.classList.add('active-game');
                }

                // Prüfen, ob das Spiel abgeschlossen ist
                if (game.completed) {
                    li.classList.add('completed-game');
                }

                // Hier können wir spezifische Elemente für Name und Zeit erstellen, um sie separat zu stylen
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

        // Debugging-Ausgabe (optional, aber hilfreich):
        // console.log("Overlay aktualisiert. Aktuelle Spiele:", games);
        // console.log("Angezeigte Spiele:", gamesToDisplay);
        // console.log("Aktive Seite:", currentPage);
    };

    // Automatischer Wechsel der Seiten im Overlay
    // Nur aktivieren, wenn es mehr als eine Seite gibt
    let pageCycleInterval = null;
    const startPageCycling = () => {
        if (pageCycleInterval) {
            clearInterval(pageCycleInterval);
        }
        if (Math.ceil(JSON.parse(localStorage.getItem('winChallengeGames') || '[]').length / PAGE_SIZE) > 1) {
            pageCycleInterval = setInterval(() => {
                const games = JSON.parse(localStorage.getItem('winChallengeGames') || '[]');
                const totalPages = Math.ceil(games.length / PAGE_SIZE);
                if (totalPages > 1) {
                    currentPage = (currentPage + 1) % totalPages;
                    updateOverlay(); // Overlay aktualisieren, um die neue Seite anzuzeigen
                } else {
                    clearInterval(pageCycleInterval); // Stoppen, wenn nur eine Seite
                    pageCycleInterval = null;
                }
            }, 5000); // Wechselt alle 5 Sekunden die Seite
        }
    };

    // Initialer Aufruf und Start des Aktualisierungsintervalls
    updateOverlay(); // Erste Aktualisierung beim Laden
    setInterval(updateOverlay, 1000); // Aktualisiert alle 1 Sekunde für Live-Daten

    // Starten des Seitenwechsels, wenn die Seite geladen ist
    startPageCycling(); // Startet den Zyklus beim ersten Laden
    // Event Listener für wenn sich Spiele ändern, um den Seitenzyklus neu zu starten
    // Dies ist etwas komplexer, da Local Storage keine direkten Change Events über Tabs hinweg hat.
    // Eine einfache Lösung ist, den Seitenzyklus bei jedem updateOverlay() Aufruf zu prüfen,
    // oder bei relevanten Änderungen in der Hauptanwendung (z.B. addGame, removeGame)
    // einen localStorage.setItem('overlayReloadTrigger', Date.now()); zu setzen
    // und dann im Overlay darauf zu lauschen (aber das wäre Mehraufwand).
    // Fürs Erste reicht es, wenn er initial startet und bei jedem updateOverlay die Anzahl prüft.

    // Manuelles Neustarten des Seitenwechsels, falls sich die Anzahl der Spiele ändert (optional, wenn nötig)
    // Dies würde eine komplexere Kommunikation zwischen Hauptseite und Overlay erfordern,
    // oder das Hinzufügen eines 'storage' event listeners, der auf Änderungen von 'winChallengeGames' reagiert.
    // Für den Anfang sollte der aktuelle Ansatz genügen.
});