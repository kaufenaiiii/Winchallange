// script.js (Control Panel für Win Challenge)

// Firebase Initialisierung - DIESER BLOCK MUSS IN DEINER index.html SEIN!
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
    // DOMContentLoaded stellt sicher, dass das HTML geladen ist, bevor JS darauf zugreift

    // ----- HTML-Elemente abrufen (Referenzen) -----
    const challengeTitleElement = document.getElementById('challengeTitle'); // Umbenannt, um Konflikt mit Variable zu vermeiden
    const challengeTitleInput = document.getElementById('challengeTitleInput');
    const saveTitleButton = document.getElementById('saveTitleButton');
    const gamesTableBody = document.querySelector('#gamesTable tbody');
    const addGameButton = document.getElementById('addGameButton');
    const totalTimeDisplay = document.getElementById('totalTimeDisplay');
    const startTimerButton = document.getElementById('startTimerButton');
    const stopTimerButton = document.getElementById('stopTimerButton');
    const resetTimerButton = document.getElementById('resetTimerButton');

    // ----- Firebase Referenzen -----
    const dbRef = database.ref('/winChallengeData'); // Hauptpfad für alle Challenge-Daten

    // ----- Lokaler Zustand (wird mit Firebase synchronisiert) -----
    let totalSeconds = 0; // Gesamtsekunden für den Haupttimer
    let timerInterval = null; // Variable, um den Interval-Timer zu speichern
    let currentActiveGameRow = null; // Speichert die aktuell aktive Spielzeile (für den Einzel-Timer)
    let games = []; // Array für die Spieldaten
    let challengeTitle = 'Win Challenge'; // Aktueller Titel


    // ----- Funktionen für die UI-Interaktion und Firebase-Kommunikation -----

    // Funktion zum Speichern des gesamten Zustands in Firebase
    const saveStateToFirebase = () => {
        const dataToSave = {
            challengeTitle: challengeTitle,
            games: games, // Das 'games'-Array enthält bereits die Zeit und completed-Status
            totalSeconds: totalSeconds,
            activeGameName: currentActiveGameRow ? currentActiveGameRow.dataset.gameName : null,
            timerRunning: timerInterval !== null // Speichert, ob der Timer läuft
        };

        dbRef.set(dataToSave)
            .then(() => {
                console.log("State successfully saved to Firebase!");
            })
            .catch((error) => {
                console.error("Error saving state to Firebase:", error);
            });
    };

    // Funktion zum Laden des Zustands aus Firebase (und setzen der UI)
    const loadStateFromFirebase = () => {
        dbRef.once('value', (snapshot) => { // 'once' liest Daten einmal
            const data = snapshot.val();
            if (data) {
                challengeTitle = data.challengeTitle || 'Win Challenge';
                challengeTitleElement.textContent = challengeTitle; // UI aktualisieren

                games = data.games || [];
                gamesTableBody.innerHTML = ''; // Vorhandene Zeilen leeren
                games.forEach(game => {
                    addGameRow(game.name, game.time, game.completed, false); // Fügt Spiele hinzu, speichert aber noch nicht
                });

                totalSeconds = data.totalSeconds || 0;
                updateOverallTimerDisplay();

                const savedActiveGameName = data.activeGameName;
                if (savedActiveGameName) {
                    const rowToActivate = Array.from(gamesTableBody.querySelectorAll('tr'))
                                            .find(row => row.dataset.gameName === savedActiveGameName);
                    if (rowToActivate) {
                        currentActiveGameRow = rowToActivate;
                    }
                }
                
                // Aktualisiere den Zustand der Aktivierungs-Buttons nach dem Laden aller Spiele
                updateActivationButtonStates();

                // Timer-Status wiederherstellen
                if (data.timerRunning && !timerInterval) { // Nur starten, wenn es vorher lief und jetzt nicht läuft
                    startTimer(); // Rufe die interne startTimer-Funktion auf
                }
            } else {
                console.log("No data found in Firebase, starting fresh.");
                challengeTitleElement.textContent = challengeTitle; // Standardtitel setzen
            }
        });
    };

    // Funktion zum Hinzufügen einer neuen Spielzeile zur Tabelle
    const addGameRow = (name, timeInSeconds, isCompleted, saveAfterAdd = true) => {
        // Prüfen, ob das Spiel bereits existiert, um Duplikate zu vermeiden
        if (games.some(game => game.name === name)) {
            alert(`Ein Spiel mit dem Namen "${name}" existiert bereits!`);
            return;
        }

        const row = gamesTableBody.insertRow();
        row.dataset.gameName = name;
        row.dataset.time = timeInSeconds;
        row.dataset.completed = isCompleted;

        if (isCompleted) {
            row.classList.add('completed');
        }

        const activationButtonCell = row.insertCell(0);
        const activationButton = document.createElement('button');
        activationButton.classList.add('activation-button');
        activationButton.textContent = 'Aktivieren';
        activationButton.style.padding = '5px 10px';
        activationButton.style.fontSize = '12px';
        activationButton.style.margin = '0';
        activationButton.style.width = 'fit-content';
        activationButtonCell.appendChild(activationButton);

        const checkboxCell = row.insertCell(1);
        const nameCell = row.insertCell(2);
        const timeCell = row.insertCell(3);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isCompleted;
        checkbox.addEventListener('change', () => {
            row.classList.toggle('completed', checkbox.checked);
            row.dataset.completed = checkbox.checked;
            updateGamesArrayFromTable(); // Games-Array aktualisieren
            saveStateToFirebase(); // Speichern

            if (checkbox.checked && currentActiveGameRow === row) {
                currentActiveGameRow = null;
                saveStateToFirebase(); // Änderungen speichern
                stopTimer(); // Timer stoppen, wenn das aktuell aktive Spiel abgeschlossen wird
            }
            updateActivationButtonStates(); // Button-Zustände aktualisieren
        });
        checkboxCell.appendChild(checkbox);

        nameCell.textContent = name;
        timeCell.textContent = formatTime(timeInSeconds);

        const removeButtonCell = row.insertCell(4);
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
                    stopTimer(); // Timer stoppen, wenn aktives Spiel entfernt wird
                }
                row.remove();
                updateGamesArrayFromTable(); // Games-Array aktualisieren
                saveStateToFirebase(); // Speichern
                updateActivationButtonStates();
            }
        });
        removeButtonCell.appendChild(removeButton);

        activationButton.addEventListener('click', () => {
            if (row.dataset.completed === 'true') {
                alert("Dieses Spiel ist bereits abgeschlossen und kann nicht aktiviert werden.");
                return;
            }

            if (currentActiveGameRow === row) { // Deaktivieren
                currentActiveGameRow = null;
                stopTimer(); // Timer stoppen, wenn das aktuell aktive Spiel deaktiviert wird
            } else { // Aktivieren eines neuen Spiels
                currentActiveGameRow = row;
                // Aktives Spiel sollte nicht als "abgeschlossen" markiert sein
                const activeGameCheckbox = row.querySelector('input[type="checkbox"]');
                if (activeGameCheckbox) {
                    activeGameCheckbox.checked = false;
                    row.classList.remove('completed');
                    row.dataset.completed = 'false';
                }
                if (!timerInterval) { // Wenn Timer nicht läuft, starte ihn automatisch
                    startTimer();
                }
            }
            updateGamesArrayFromTable(); // Games-Array aktualisieren
            saveStateToFirebase(); // Speichern
            updateActivationButtonStates(); // Button-Zustände aktualisieren
        });

        // Füge das Spiel zum 'games'-Array hinzu
        if (saveAfterAdd) {
             games.push({ name: name, time: timeInSeconds, completed: isCompleted });
             saveStateToFirebase(); // Speichert das aktualisierte games-Array, wenn es neu hinzugefügt wird
        }
    };


    // Aktualisiert das interne 'games'-Array basierend auf der aktuellen Tabelle
    const updateGamesArrayFromTable = () => {
        games = []; // Leere das Array
        gamesTableBody.querySelectorAll('tr').forEach(row => {
            games.push({
                name: row.dataset.gameName,
                time: parseInt(row.dataset.time),
                completed: row.dataset.completed === 'true'
            });
        });
    };

    // Funktion zum Formatieren der Zeit (HH:MM:SS)
    const formatTime = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (num) => String(num).padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };

    // Funktion zum Aktualisieren des Textes und Stils aller Aktivierungs-Buttons
    const updateActivationButtonStates = () => {
        gamesTableBody.querySelectorAll('tr').forEach(row => {
            const button = row.querySelector('.activation-button');

            if (!button) return;

            if (row.dataset.completed === 'true') {
                button.textContent = 'Abgeschlossen';
                button.style.backgroundColor = '#6c757d'; // Grau
                button.disabled = true;
            } else if (currentActiveGameRow === row) {
                button.textContent = 'Stoppen';
                button.style.backgroundColor = '#ffc107'; // Gelb
                button.style.color = '#333';
                button.disabled = false;
            } else {
                button.textContent = 'Aktivieren';
                button.style.backgroundColor = '#007bff'; // Blau
                button.style.color = 'white';
                button.disabled = false;
            }
        });
    };

    // ----- Timer-Funktionen -----

    // Funktion zum Aktualisieren des Gesamt-Timers auf der UI
    const updateOverallTimerDisplay = () => {
        totalTimeDisplay.textContent = formatTime(totalSeconds);
    };

    // Funktion zum Starten des Timers
    const startTimer = () => {
        if (timerInterval) {
            return;
        }
        timerInterval = setInterval(() => {
            totalSeconds++;
            updateOverallTimerDisplay();

            if (currentActiveGameRow) {
                let gameTime = parseInt(currentActiveGameRow.dataset.time || 0);
                gameTime++;
                currentActiveGameRow.dataset.time = gameTime;
                currentActiveGameRow.cells[3].textContent = formatTime(gameTime); // Update in der Tabelle
            }
            saveStateToFirebase(); // Speichert den gesamten Zustand inkl. Zeiten
        }, 1000);
    };

    // Funktion zum Stoppen des Timers
    const stopTimer = () => {
        clearInterval(timerInterval);
        timerInterval = null;
        saveStateToFirebase(); // Speichert den Zustand, wenn Timer stoppt
    };

    // Funktion zum Zurücksetzen des Timers
    resetTimerButton.addEventListener('click', () => {
        if (confirm("Soll der Timer und alle Spielzeiten wirklich zurückgesetzt werden?")) {
            stopTimer(); // Stoppt den Timer und speichert den Zustand
            totalSeconds = 0;
            currentActiveGameRow = null;

            gamesTableBody.querySelectorAll('tr').forEach(row => {
                row.dataset.time = 0;
                row.cells[3].textContent = formatTime(0);
                row.classList.remove('completed');
                row.dataset.completed = 'false';

                const checkbox = row.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = false;
                }
            });
            updateGamesArrayFromTable(); // Games-Array aktualisieren
            saveStateToFirebase(); // Speichert den zurückgesetzten Zustand
            updateOverallTimerDisplay();
            updateActivationButtonStates();
        }
    });

    // ----- Event Listener für die Buttons -----

    saveTitleButton.addEventListener('click', () => {
        const newTitle = challengeTitleInput.value.trim();
        if (newTitle) {
            challengeTitle = newTitle;
            challengeTitleInput.value = '';
        } else {
            challengeTitle = 'Win Challenge'; // Setzt auf Standard, wenn leer
        }
        saveStateToFirebase(); // Speichert Titel in Firebase
    });

    addGameButton.addEventListener('click', () => {
        const gameName = prompt("Bitte gib den Namen des Spiels ein:");
        if (gameName) {
            addGameRow(gameName, 0, false, true); // addGameRow speichert selbst
            challengeTitleInput.value = ''; // Optional: Leert Titelfeld
        }
    });

    startTimerButton.addEventListener('click', startTimer);
    stopTimerButton.addEventListener('click', stopTimer);


    // ----- Initialisierung beim Laden der Seite -----
    loadStateFromFirebase(); // Lade den gesamten Zustand aus Firebase beim Start

}); // Ende des DOMContentLoaded-Event-Listeners