document.addEventListener('DOMContentLoaded', () => {
    // DOMContentLoaded stellt sicher, dass das HTML geladen ist, bevor JS darauf zugreift

    // ----- HTML-Elemente abrufen (Referenzen) -----
    const challengeTitle = document.getElementById('challengeTitle');
    const challengeTitleInput = document.getElementById('challengeTitleInput');
    const saveTitleButton = document.getElementById('saveTitleButton');
    const gamesTableBody = document.querySelector('#gamesTable tbody');
    const addGameButton = document.getElementById('addGameButton');
    const totalTimeDisplay = document.getElementById('totalTimeDisplay');
    const startTimerButton = document.getElementById('startTimerButton');
    const stopTimerButton = document.getElementById('stopTimerButton');
    const resetTimerButton = document.getElementById('resetTimerButton');


    // ----- Timer-Variablen -----
    let totalSeconds = 0; // Gesamtsekunden für den Haupttimer
    let timerInterval = null; // Variable, um den Interval-Timer zu speichern
    let currentActiveGameRow = null; // Speichert die aktuell aktive Spielzeile (für den Einzel-Timer)


    // ----- Funktionen für die UI-Interaktion -----

    // Funktion zum Speichern des Challenge-Titels
    saveTitleButton.addEventListener('click', () => {
        const newTitle = challengeTitleInput.value.trim(); // .trim() entfernt Leerzeichen am Anfang/Ende
        if (newTitle) {
            challengeTitle.textContent = newTitle; // Überschrift aktualisieren
            localStorage.setItem('winChallengeTitle', newTitle); // Titel im Local Storage speichern
            challengeTitleInput.value = ''; // Eingabefeld leeren
        }
    });

    // Funktion zum Laden des Challenge-Titels beim Start
    const loadChallengeTitle = () => {
        const savedTitle = localStorage.getItem('winChallengeTitle');
        if (savedTitle) {
            challengeTitle.textContent = savedTitle;
        }
    };

    // Funktion zum Hinzufügen einer neuen Spielzeile
    addGameButton.addEventListener('click', () => {
        const gameName = prompt("Bitte gib den Namen des Spiels ein:");
        if (gameName) { // Nur hinzufügen, wenn ein Name eingegeben wurde
            addGameRow(gameName, 0, false); // Neues Spiel hinzufügen, Zeit 0, nicht abgeschlossen
            saveGames(); // Spiele speichern
        }
    });

    const addGameRow = (name, timeInSeconds, isCompleted) => {
        const row = gamesTableBody.insertRow();
        row.dataset.gameName = name;
        row.dataset.time = timeInSeconds;
        row.dataset.completed = isCompleted;

        if (isCompleted) {
            row.classList.add('completed');
        }

        // --- NEUE ZELLE FÜR AKTIVIERUNGS-BUTTON ---
        const activationButtonCell = row.insertCell(0); // NEUE Zelle an erster Position
        const activationButton = document.createElement('button');
        activationButton.classList.add('activation-button');
        activationButton.textContent = 'Aktivieren';

        activationButton.style.padding = '5px 10px';
        activationButton.style.fontSize = '12px';
        activationButton.style.margin = '0';
        activationButton.style.width = 'fit-content';

        activationButtonCell.appendChild(activationButton);
        // --- ENDE NEUE ZELLE ---

        // KORRIGIERTE INDIZES HIER:
        const checkboxCell = row.insertCell(1); // Checkbox-Zelle ist an zweiter Position (Index 1)
        const nameCell = row.insertCell(2);     // Spielname-Zelle ist an dritter Position (Index 2)
        const timeCell = row.insertCell(3);     // Zeit-Zelle ist jetzt an vierter Position (Index 3)


        // Checkbox erstellen (jetzt nur noch für den Abgeschlossen-Status)
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isCompleted;
        checkbox.addEventListener('change', () => {
            row.classList.toggle('completed', checkbox.checked);
            row.dataset.completed = checkbox.checked;
            saveGames();

            if (checkbox.checked && currentActiveGameRow === row) {
                currentActiveGameRow = null;
                localStorage.removeItem('activeGameName');
                updateActivationButtonStates();
            }
        });
        checkboxCell.appendChild(checkbox);

        nameCell.textContent = name;
        timeCell.textContent = formatTime(timeInSeconds);

        // Optional: Einen Button zum Entfernen des Spiels hinzufügen
        const removeButtonCell = row.insertCell(4); // Korrekter Index bleibt 4
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Entfernen';
        removeButton.style.backgroundColor = '#dc3545';
        removeButton.style.padding = '5px 10px';
        removeButton.style.fontSize = '12px';
        removeButton.style.margin = '0';
        removeButton.addEventListener('click', () => {
            if (confirm(`Soll das Spiel "${name}" wirklich entfernt werden?`)) {
                if (currentActiveGameRow === row) {
                    currentActiveGameRow = null;
                    localStorage.removeItem('activeGameName');
                }
                row.remove();
                saveGames();
                updateActivationButtonStates();
            }
        });
        removeButtonCell.appendChild(removeButton);

        // --- LOGIK FÜR DEN NEUEN AKTIVIERUNGS-BUTTON ---
        activationButton.addEventListener('click', () => {
            if (row.dataset.completed === 'true') {
                alert("Dieses Spiel ist bereits abgeschlossen und kann nicht aktiviert werden.");
                return;
            }

            if (currentActiveGameRow === row) {
                currentActiveGameRow = null;
                localStorage.removeItem('activeGameName');
                stopTimerButton.click(); // Timer stoppen, wenn das aktuell aktive Spiel deaktiviert wird

            } else { // Wenn ein anderes Spiel aktiviert wird
                if (currentActiveGameRow) { // Wenn bereits ein Spiel aktiv war
                    // Optional: Prüfen, ob die Checkbox des vorherigen aktiven Spiels gecheckt war
                    // Diese Logik ist etwas komplexer, wenn man den Checkbox-Status manuell steuert.
                    // Für jetzt belassen wir es bei der Grundfunktion.
                    // const prevActiveCheckbox = currentActiveGameRow.querySelector('input[type="checkbox"]');
                    // if (prevActiveCheckbox && !prevActiveCheckbox.checked) {
                    //     prevActiveCheckbox.checked = false; // Falls notwendig
                    // }
                    saveGames(); // Spielzeiten des VORHERIGEN aktiven Spiels speichern, BEVOR neues Spiel aktiviert wird
                }
                currentActiveGameRow = row;
                localStorage.setItem('activeGameName', row.dataset.gameName);

                const activeGameCheckbox = row.querySelector('input[type="checkbox"]');
                if (activeGameCheckbox) {
                    activeGameCheckbox.checked = false; // Aktives Spiel sollte nicht als "abgeschlossen" markiert sein
                    row.classList.remove('completed');
                    row.dataset.completed = 'false';
                }

                if (!timerInterval) { // Wenn Timer nicht läuft, starte ihn automatisch
                    startTimerButton.click();
                }
            }
            updateActivationButtonStates();
        });

        updateActivationButtonStates();
    };

    // Funktion zum Formatieren der Zeit (HH:MM:SS)
    const formatTime = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (num) => String(num).padStart(2, '0'); // Fügt führende Nullen hinzu
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };

    // Funktion zum Aktualisieren des Textes und Stils aller Aktivierungs-Buttons
    const updateActivationButtonStates = () => {
        gamesTableBody.querySelectorAll('tr').forEach(row => {
            const button = row.querySelector('.activation-button');
            // const checkbox = row.querySelector('input[type="checkbox"]'); // Nicht direkt benötigt hier

            if (!button) return; // Falls der Button nicht gefunden wird

            if (row.dataset.completed === 'true') {
                button.textContent = 'Abgeschlossen';
                button.style.backgroundColor = '#6c757d'; // Grau
                button.disabled = true; // Button deaktivieren
            } else if (currentActiveGameRow === row) {
                button.textContent = 'Stoppen';
                button.style.backgroundColor = '#ffc107'; // Gelb
                button.style.color = '#333'; // Schwarzer Text auf gelb
                button.disabled = false;
            } else {
                button.textContent = 'Aktivieren';
                button.style.backgroundColor = '#007bff'; // Blau
                button.style.color = 'white';
                button.disabled = false;
            }
        });
    };
    // ----- Daten Speichern und Laden (Local Storage) -----

    // Funktion zum Speichern aller Spiele im Local Storage
    const saveGames = () => {
        const games = [];
        gamesTableBody.querySelectorAll('tr').forEach(row => {
            games.push({
                name: row.dataset.gameName,
                time: parseInt(row.dataset.time), // Zeit als Zahl speichern
                completed: row.dataset.completed === 'true' // String 'true' zu Boolean true konvertieren
            });
        });
        localStorage.setItem('winChallengeGames', JSON.stringify(games)); // Array als JSON-String speichern
    };

    // Funktion zum Laden aller Spiele aus dem Local Storage beim Start
    const loadGames = () => {
        const savedGames = localStorage.getItem('winChallengeGames');
        if (savedGames) {
            const games = JSON.parse(savedGames); // JSON-String in Array umwandeln
            games.forEach(game => {
                addGameRow(game.name, game.time, game.completed);
            });
        }
    };


    // ----- Timer-Funktionen -----

    // Funktion zum Aktualisieren des Gesamt-Timers auf der UI
    const updateOverallTimerDisplay = () => {
        totalTimeDisplay.textContent = formatTime(totalSeconds);
    };

    // Funktion zum Starten des Timers
    startTimerButton.addEventListener('click', () => {
        if (timerInterval) { // Wenn der Timer bereits läuft, nichts tun
            return;
        }
        timerInterval = setInterval(() => {
            totalSeconds++; // Gesamtsekunden erhöhen
            updateOverallTimerDisplay(); // Anzeige aktualisieren
            saveTimerState(); // Gesamt-Timer-Status speichern

            // Wenn ein Spiel aktiv ist, dessen Zeit auch erhöhen
            if (currentActiveGameRow) {
                let gameTime = parseInt(currentActiveGameRow.dataset.time || 0);
                gameTime++;
                currentActiveGameRow.dataset.time = gameTime;
                currentActiveGameRow.cells[3].textContent = formatTime(gameTime); // Update in der Tabelle

                // ENTSCHEIDEND: Speichere die Spiele JETZT jede Sekunde, wenn ein Spiel aktiv ist
                // Das aktualisiert die Spielzeiten im Local Storage kontinuierlich.
                saveGames();
            }
        }, 1000); // Alle 1000 Millisekunden (1 Sekunde) ausführen
        localStorage.setItem('timerRunning', 'true'); // Speichern, dass Timer läuft
    });

    // Funktion zum Stoppen des Timers
    stopTimerButton.addEventListener('click', () => {
        clearInterval(timerInterval); // Timer stoppen
        timerInterval = null; // Variable zurücksetzen
        localStorage.setItem('timerRunning', 'false'); // Speichern, dass Timer gestoppt ist
        saveGames(); // Spielzeiten jetzt speichern, wenn der Timer stoppt (wichtig für den letzten Stand)
    });

    // Funktion zum Zurücksetzen des Timers
    resetTimerButton.addEventListener('click', () => {
        if (confirm("Soll der Timer und alle Spielzeiten wirklich zurückgesetzt werden?")) {
            clearInterval(timerInterval);
            timerInterval = null;
            totalSeconds = 0;
            updateOverallTimerDisplay();
            localStorage.removeItem('overallTimerSeconds'); // Aus Local Storage löschen
            localStorage.setItem('timerRunning', 'false'); // Timerstatus auch zurücksetzen
            localStorage.removeItem('activeGameName'); // Aktives Spiel auch zurücksetzen
            currentActiveGameRow = null; // Aktives Spiel auch im JS zurücksetzen

            // Alle Spielzeiten zurücksetzen und Checkboxen unchecken
            gamesTableBody.querySelectorAll('tr').forEach(row => {
                row.dataset.time = 0; // Datenattribut auf 0 setzen
                row.cells[3].textContent = formatTime(0); // Anzeige aktualisieren (KORREKTUR: Index 3)
                row.classList.remove('completed'); // Durchstreichen entfernen
                row.dataset.completed = 'false'; // Status zurücksetzen

                const checkbox = row.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = false; // Checkbox zurücksetzen
                }
            });
            saveGames(); // Zurückgesetzte Spielzeiten speichern
        }
    });

    // ----- Speichern und Laden des Timer-Status -----

    // Funktion zum Speichern des Gesamt-Timer-Status
    const saveTimerState = () => {
        localStorage.setItem('overallTimerSeconds', totalSeconds);
    };

    // Funktion zum Laden des Gesamt-Timer-Status beim Start
    const loadTimerState = () => {
        const savedSeconds = localStorage.getItem('overallTimerSeconds');
        if (savedSeconds !== null) {
            totalSeconds = parseInt(savedSeconds);
            updateOverallTimerDisplay();
        }
    };

    // ----- Initialisierung beim Laden der Seite (am Ende von DOMContentLoaded) -----
    loadChallengeTitle(); // Gespeicherten Titel laden
    loadGames();          // Gespeicherte Spiele laden
    loadTimerState();     // Lade den gespeicherten Timer-Zustand

    const wasTimerRunning = localStorage.getItem('timerRunning') === 'true';
    const savedActiveGameName = localStorage.getItem('activeGameName');

    if (savedActiveGameName) {
        const rows = gamesTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            if (row.dataset.gameName === savedActiveGameName) {
                currentActiveGameRow = row;
                // Die Checkbox-Logik beim Laden wird bereits in addGameRow und loadGames korrekt behandelt.
                // updateActivationButtonStates() unten kümmert sich um den Button-Status.
            }
        });
    }

    // Wichtig: Nach dem Laden der Spiele und dem Setzen von currentActiveGameRow
    updateActivationButtonStates(); // Rufe die Funktion auf, um die Button-Texte anzupassen

    // Starte den Timer, wenn er zuvor lief
    if (wasTimerRunning) {
        startTimerButton.click();
    }
}); // Ende des DOMContentLoaded-Event-Listeners