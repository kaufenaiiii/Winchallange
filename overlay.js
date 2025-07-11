// overlay.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Overlay-Anzeige-Elemente ---
    const overlayChallengeTitle = document.getElementById('overlayChallengeTitle'); // Korrigierte ID
    const overlayGameList = document.getElementById('overlay-game-list');
    const overlayTotalTime = document.getElementById('overlay-total-time');
    const pageIndicators = document.getElementById('page-indicators'); // Für die Seitenanzeige

    const PAGE_SIZE = 5; // Anzahl der Spiele pro Seite im Overlay
    let currentPage = 0; // Aktuelle Seite für die Anzeige

    // --- NEUE OBS-STEUERUNGS-ELEMENTE (in overlay.html hinzufügen) ---
    // Diese Elemente müssen in deinem overlay.html vorhanden sein, damit der Code funktioniert.
    // Sie werden im OBS-Interaktionsfenster angezeigt.
    const obsControls = document.getElementById('obs-controls');
    const obsTitleInput = document.getElementById('obsTitleInput');
    const obsSaveTitleBtn = document.getElementById('obsSaveTitleBtn');
    const obsGameInput = document.getElementById('obsGameInput');
    const obsAddGameBtn = document.getElementById('obsAddGameBtn');
    const obsStartTimerBtn = document.getElementById('obsStartTimerBtn');
    const obsStopTimerBtn = document.getElementById('obsStopTimerBtn');
    const obsResetTimerBtn = document.getElementById('obsResetTimerBtn');
    const obsActiveGameSelect = document.getElementById('obsActiveGameSelect');
    const obsSetActiveGameBtn = document.getElementById('obsSetActiveGameBtn');
    const obsCompleteGameSelect = document.getElementById('obsCompleteGameSelect');
    const obsCompleteGameBtn = document.getElementById('obsCompleteGameBtn');

    // --- Lokaler Zustand für das Overlay (wird im Local Storage des Overlays gespeichert) ---
    let games = [];
    let overallTimerSeconds = 0;
    let timerInterval = null;
    let challengeTitle = 'Win Challenge'; // Initialer Standardtitel
    let activeGameName = null;

    // --- Hilfsfunktionen ---

    // Funktion zum Formatieren der Zeit (HH:MM:SS)
    const formatTime = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const pad = (num) => String(num).padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };

    // Funktion zum Speichern des Zustands im Local Storage (des Overlays selbst)
    const saveState = () => {
        localStorage.setItem('winChallengeGames', JSON.stringify(games));
        localStorage.setItem('overallTimerSeconds', overallTimerSeconds.toString());
        localStorage.setItem('winChallengeTitle', challengeTitle);
        localStorage.setItem('activeGameName', activeGameName || '');
        // console.log("State saved:", { games, overallTimerSeconds, challengeTitle, activeGameName }); // Nur zur Fehlerbehebung
    };

    // Funktion zum Laden des Zustands aus dem Local Storage (des Overlays selbst)
    const loadState = () => {
        const savedGames = localStorage.getItem('winChallengeGames');
        if (savedGames) {
            try {
                games = JSON.parse(savedGames);
            } catch (e) {
                console.error("Fehler beim Parsen der Spieldaten aus Local Storage:", e);
                games = [];
            }
        } else {
            games = [];
        }

        const savedTotalSeconds = localStorage.getItem('overallTimerSeconds');
        overallTimerSeconds = parseInt(savedTotalSeconds || '0');

        const savedTitle = localStorage.getItem('winChallengeTitle');
        challengeTitle = savedTitle || 'Win Challenge';

        const savedActiveGame = localStorage.getItem('activeGameName');
        activeGameName = savedActiveGame || null;
        
        // Initialisiere die Select-Felder in den OBS-Controls nach dem Laden
        populateGameSelects();
    };

    // Funktion zum Aktualisieren der Anzeige des Overlays (UI)
    const updateOverlay = () => {
        // Titel anzeigen
        overlayChallengeTitle.textContent = challengeTitle;

        // Gesamtzeit anzeigen
        overlayTotalTime.textContent = formatTime(overallTimerSeconds);

        // Filter und Paginierung für Spiele (nur aktive/nicht abgeschlossene Spiele anzeigen)
        const activeAndIncompleteGames = games.filter(game => !game.completed);
        const totalPages = Math.ceil(activeAndIncompleteGames.length / PAGE_SIZE);

        if (currentPage >= totalPages && totalPages > 0) {
            currentPage = 0;
        } else if (totalPages === 0) {
            currentPage = 0;
        }

        const startIndex = currentPage * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        const gamesToDisplay = activeAndIncompleteGames.slice(startIndex, endIndex);

        // Spiel-Liste aktualisieren
        overlayGameList.innerHTML = '';
        if (gamesToDisplay.length === 0 && activeAndIncompleteGames.length === 0) {
            const li = document.createElement('li');
            li.textContent = "Keine Spiele hinzugefügt.";
            li.classList.add('no-games-message');
            overlayGameList.appendChild(li);
        } else {
            gamesToDisplay.forEach(game => {
                const li = document.createElement('li');
                li.classList.add('game-item');

                if (activeGameName && game.name === activeGameName) {
                    li.classList.add('active-game');
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

        // Seitenindikatoren aktualisieren
        pageIndicators.innerHTML = '';
        for (let i = 0; i < totalPages; i++) {
            const dot = document.createElement('span');
            dot.classList.add('page-dot');
            if (i === currentPage) {
                dot.classList.add('active');
            }
            pageIndicators.appendChild(dot);
        }
        
        // Aktualisiere die Select-Felder in den OBS-Controls bei jeder Overlay-Aktualisierung
        populateGameSelects();
    };

    // Funktion zum Füllen der Select-Felder in den OBS-Controls
    const populateGameSelects = () => {
        // Aktives Spiel Select (nur nicht abgeschlossene Spiele)
        obsActiveGameSelect.innerHTML = '<option value="">Kein Spiel aktiv</option>';
        games.filter(game => !game.completed).forEach(game => {
            const option = document.createElement('option');
            option.value = game.name;
            option.textContent = game.name;
            obsActiveGameSelect.appendChild(option);
        });
        // Setze den aktuell aktiven Wert, falls vorhanden
        if (activeGameName && obsActiveGameSelect.querySelector(`option[value="${activeGameName}"]`)) {
            obsActiveGameSelect.value = activeGameName;
        } else {
            obsActiveGameSelect.value = ""; // Wenn aktives Spiel nicht mehr existiert/abgeschlossen ist
        }

        // Spiel abschließen Select (nur nicht abgeschlossene Spiele)
        obsCompleteGameSelect.innerHTML = '<option value="">Spiel auswählen</option>';
        games.filter(game => !game.completed).forEach(game => {
            const option = document.createElement('option');
            option.value = game.name;
            option.textContent = game.name;
            obsCompleteGameSelect.appendChild(option);
        });
    };

    // --- Ereignishandler für OBS-Steuerelemente ---

    obsSaveTitleBtn.addEventListener('click', () => {
        challengeTitle = obsTitleInput.value || 'Win Challenge';
        saveState();
        updateOverlay();
        obsTitleInput.value = ''; // Eingabefeld leeren
    });

    obsAddGameBtn.addEventListener('click', () => {
        const gameName = obsGameInput.value.trim();
        if (gameName) {
            addGame(gameName);
            obsGameInput.value = ''; // Eingabefeld leeren
        }
    });

    obsStartTimerBtn.addEventListener('click', startTimer);
    obsStopTimerBtn.addEventListener('click', stopTimer);
    obsResetTimerBtn.addEventListener('click', resetTimer);

    obsSetActiveGameBtn.addEventListener('click', () => {
        const selectedGameName = obsActiveGameSelect.value;
        setActiveGame(selectedGameName);
    });

    obsCompleteGameBtn.addEventListener('click', () => {
        const selectedGameName = obsCompleteGameSelect.value;
        if (selectedGameName) {
            completeGame(selectedGameName);
        }
    });

    // Automatischer Wechsel der Seiten im Overlay
    let pageCycleInterval = null;
    const startPageCycling = () => {
        if (pageCycleInterval) {
            clearInterval(pageCycleInterval);
        }
        // Prüfen, ob es mehr als eine Seite gibt, um den Zyklus zu starten
        // Wir holen die Games direkt, um die aktuelle Anzahl zu prüfen
        const currentGamesForCycling = games.filter(game => !game.completed);
        if (Math.ceil(currentGamesForCycling.length / PAGE_SIZE) > 1) {
            pageCycleInterval = setInterval(() => {
                const totalPages = Math.ceil(currentGamesForCycling.length / PAGE_SIZE); // Re-evaluate total pages
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

    // --- Initialisierung beim Laden ---
    loadState(); // Zustand beim Laden aus Local Storage wiederherstellen
    updateOverlay(); // Erste Aktualisierung der Anzeige

    // Aktualisiert die Anzeige und den Timer alle 1 Sekunde
    // Startet auch den Timer neu, wenn er vorher aktiv war (loadState prüft das nicht)
    // Wenn du möchtest, dass der Timer nach einem Neuladen des Overlays weiterläuft,
    // müsstest du den Zustand des Timers (läuft/gestoppt) ebenfalls speichern.
    // Für dieses Beispiel starten wir ihn nicht automatisch neu.
    setInterval(updateOverlay, 1000);

    // Starten des Seitenwechsels, wenn die Seite geladen ist
    startPageCycling(); // Startet den Zyklus beim ersten Laden
});