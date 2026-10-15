// Szudoku grafikus felület és interakciók
class SudokuUI {
    constructor() {
        this.engine = new SudokuEngine();
        this.board = Array(9).fill(null).map(() => Array(9).fill(0));
        this.notes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set()));
        this.selectedCell = null;
        this.noteMode = false;
        this.difficulty = 'medium';
        this.gameMode = 'solo'; // 'solo', 'race', 'coop'

        // Időzítő és előzmények
        this.timer = 0;
        this.timerInterval = null;
        this.history = []; // Visszavonáshoz
        this.mistakes = 0;

        // Verseny / kooperáció állapota
        this.partnerProgress = 0;
        this.partnerCursor = null;

        this.initKeyListeners();
    }

    startNewGame(options = {}) {
        this.difficulty = options.difficulty || 'medium';
        this.gameMode = options.mode || 'solo';
        this.selectedCell = null;
        this.noteMode = false;
        this.history = [];
        this.mistakes = 0;
        this.partnerProgress = 0;
        this.partnerCursor = null;

        // Ha kapunk megadott feladványt (pl. online hosttól)
        if (options.puzzleData) {
            this.engine.board = options.puzzleData.board.map(r => [...r]);
            this.engine.solution = options.puzzleData.solution.map(r => [...r]);
            this.engine.initial = options.puzzleData.initial.map(r => [...r]);
        } else {
            this.engine.generate(this.difficulty);
        }

        this.board = this.engine.board.map(r => [...r]);
        this.notes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set()));

        this.renderBoard();
        this.startTimer();
        this.updateStats();

        // Verseny és kooperáció sáv beállítása
        const raceBar = document.getElementById('sudoku-race-container');
        if (raceBar) {
            raceBar.style.display = this.gameMode === 'race' ? 'block' : 'none';
            this.updateRaceProgress(0, 0);
        }

        // Ha host vagyunk és online a játék, küldjük el a klienstáblát
        if (options.isHost && (this.gameMode === 'race' || this.gameMode === 'coop')) {
            window.net.send('SUDOKU_START', {
                puzzleData: {
                    board: this.engine.board,
                    solution: this.engine.solution,
                    initial: this.engine.initial
                },
                difficulty: this.difficulty,
                gameMode: this.gameMode
            });
        }
    }

    startTimer() {
        this.stopTimer();
        this.timer = 0;
        this.updateTimerDisplay();
        this.timerInterval = setInterval(() => {
            this.timer++;
            this.updateTimerDisplay();
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimerDisplay() {
        const timerElem = document.getElementById('sudoku-timer');
        if (!timerElem) return;
        const m = Math.floor(this.timer / 60);
        const s = this.timer % 60;
        timerElem.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    renderBoard() {
        const boardElem = document.getElementById('sudoku-board');
        if (!boardElem) return;
        boardElem.innerHTML = '';

        const conflicts = this.engine.getConflicts(this.board);
        const selVal = (this.selectedCell && this.board[this.selectedCell.r][this.selectedCell.c]) || 0;

        // A grid 11 oszlop x 11 sor:
        //   oszlopok: 0-2 (blokk1), 3 (szeparátor), 4-6 (blokk2), 7 (szeparátor), 8-10 (blokk3)
        //   sorok:    ugyanígy
        // A cellák: grid-sor és oszlop index "fordítva" a szeparátorokra nézve.
        // Szeparátor oszlopok: gridCol 3 és 7
        // Szeparátor sorok:    gridRow 3 és 7

        // Segédfüggvény: valós tábla sor/col => grid sor/col
        // r=0,1,2 => gridRow 0,1,2 | r=3,4,5 => gridRow 4,5,6 | r=6,7,8 => gridRow 8,9,10
        const toGrid = (i) => i < 3 ? i : i < 6 ? i + 1 : i + 2;

        // 11x11-es "slot" — szeparátorok = gridRow/Col 3 és 7
        for (let gridRow = 0; gridRow < 11; gridRow++) {
            for (let gridCol = 0; gridCol < 11; gridCol++) {
                const isSepRow = (gridRow === 3 || gridRow === 7);
                const isSepCol = (gridCol === 3 || gridCol === 7);

                if (isSepRow || isSepCol) {
                    // Szeparátor elem (vastag 3px-es blokk-határ)
                    const sep = document.createElement('div');
                    sep.className = isSepRow && isSepCol ? 'sudoku-sep-col' : (isSepRow ? 'sudoku-sep-row' : 'sudoku-sep-col');
                    boardElem.appendChild(sep);
                    continue;
                }

                // Valós tábla koordináták visszaszámítása
                const r = gridRow < 3 ? gridRow : gridRow < 7 ? gridRow - 1 : gridRow - 2;
                const c = gridCol < 3 ? gridCol : gridCol < 7 ? gridCol - 1 : gridCol - 2;

                const isInitial = this.engine.initial[r][c];
                const val = this.board[r][c];

                const cell = document.createElement('div');
                cell.className = 'sudoku-cell';
                cell.dataset.row = r;
                cell.dataset.col = c;

                // Jobb szél eltávolítása ha a következő a szeparátor
                // (gridCol 2, 6, 10 — azaz c=2, 5, 8)
                if (c === 2 || c === 5 || c === 8) cell.classList.add('no-right-border');
                // Alsó szél eltávolítása ha az alatta szeparátor jön
                if (r === 2 || r === 5 || r === 8) cell.classList.add('no-bottom-border');

                if (isInitial) cell.classList.add('initial');
                if (conflicts[r][c] && val !== 0) cell.classList.add('conflict');

                // Kijelölések
                if (this.selectedCell) {
                    if (this.selectedCell.r === r && this.selectedCell.c === c) {
                        cell.classList.add('selected');
                    } else if (
                        this.selectedCell.r === r ||
                        this.selectedCell.c === c ||
                        (Math.floor(this.selectedCell.r / 3) === Math.floor(r / 3) &&
                         Math.floor(this.selectedCell.c / 3) === Math.floor(c / 3))
                    ) {
                        cell.classList.add('highlight-zone');
                    }

                    if (selVal !== 0 && val === selVal) {
                        cell.classList.add('highlight-match');
                    }
                }

                // Partner kurzor (Koop módban)
                if (this.gameMode === 'coop' && this.partnerCursor &&
                    this.partnerCursor.r === r && this.partnerCursor.c === c) {
                    cell.classList.add('partner-cursor');
                    const badge = document.createElement('div');
                    badge.className = 'partner-badge';
                    badge.textContent = 'Partner';
                    cell.appendChild(badge);
                }

                // Tartalom: szám vagy ceruzajegyzet
                if (val !== 0) {
                    const span = document.createElement('span');
                    span.className = 'cell-number';
                    span.textContent = val;
                    cell.appendChild(span);
                } else if (this.notes[r][c].size > 0) {
                    const notesGrid = document.createElement('div');
                    notesGrid.className = 'notes-grid';
                    for (let n = 1; n <= 9; n++) {
                        const noteSpan = document.createElement('span');
                        noteSpan.className = 'note-num';
                        noteSpan.textContent = this.notes[r][c].has(n) ? n : '';
                        notesGrid.appendChild(noteSpan);
                    }
                    cell.appendChild(notesGrid);
                }

                cell.addEventListener('click', () => this.selectCell(r, c));
                boardElem.appendChild(cell);
            }
        }

        this.updateNumpadBadges();
    }

    selectCell(r, c) {
        this.selectedCell = { r, c };
        this.renderBoard();

        if (this.gameMode === 'coop') {
            window.net.send('SUDOKU_CURSOR', { r, c });
        }
    }

    inputNumber(num) {
        if (!this.selectedCell) return;
        const { r, c } = this.selectedCell;
        if (this.engine.initial[r][c]) return;

        // Visszavonási előzmény mentése
        this.history.push({
            r, c,
            prevVal: this.board[r][c],
            prevNotes: new Set(this.notes[r][c])
        });

        if (this.noteMode) {
            // Ceruzajegyzet kapcsolása
            if (this.board[r][c] === 0) {
                if (this.notes[r][c].has(num)) {
                    this.notes[r][c].delete(num);
                } else {
                    this.notes[r][c].add(num);
                }
                window.sound.playSudokuPlace();
                this.renderBoard();

                if (this.gameMode === 'coop') {
                    window.net.send('SUDOKU_UPDATE', {
                        r, c,
                        notes: Array.from(this.notes[r][c]),
                        val: 0
                    });
                }
            }
        } else {
            // Szám beírása
            const isSame = this.board[r][c] === num;
            const newVal = isSame ? 0 : num;

            this.board[r][c] = newVal;
            this.notes[r][c].clear();

            if (newVal !== 0) {
                window.sound.playSudokuPlace();
                // Hiba ellenőrzés
                if (newVal !== this.engine.solution[r][c]) {
                    this.mistakes++;
                    window.sound.playError();
                }
            } else {
                window.sound.playSudokuErase();
            }

            this.renderBoard();
            this.updateStats();

            // Online szinkronizáció
            if (this.gameMode === 'coop') {
                window.net.send('SUDOKU_UPDATE', {
                    r, c,
                    val: newVal,
                    notes: []
                });
            } else if (this.gameMode === 'race') {
                const filled = this.engine.countFilledCorrectly(this.board);
                window.net.send('SUDOKU_PROGRESS', {
                    progress: filled,
                    total: 81
                });
                this.updateRaceProgress(filled, this.partnerProgress);
            }

            // Megoldás ellenőrzése
            if (this.engine.isSolved(this.board)) {
                this.handlePuzzleComplete();
            }
        }
    }

    erase() {
        if (!this.selectedCell) return;
        const { r, c } = this.selectedCell;
        if (this.engine.initial[r][c]) return;

        this.history.push({
            r, c,
            prevVal: this.board[r][c],
            prevNotes: new Set(this.notes[r][c])
        });

        this.board[r][c] = 0;
        this.notes[r][c].clear();
        window.sound.playSudokuErase();
        this.renderBoard();

        if (this.gameMode === 'coop') {
            window.net.send('SUDOKU_UPDATE', { r, c, val: 0, notes: [] });
        } else if (this.gameMode === 'race') {
            const filled = this.engine.countFilledCorrectly(this.board);
            window.net.send('SUDOKU_PROGRESS', { progress: filled, total: 81 });
            this.updateRaceProgress(filled, this.partnerProgress);
        }
    }

    undo() {
        if (this.history.length === 0) return;
        const last = this.history.pop();
        this.board[last.r][last.c] = last.prevVal;
        this.notes[last.r][last.c] = new Set(last.prevNotes);
        this.selectedCell = { r: last.r, c: last.c };
        this.renderBoard();

        if (this.gameMode === 'coop') {
            window.net.send('SUDOKU_UPDATE', {
                r: last.r,
                c: last.c,
                val: last.prevVal,
                notes: Array.from(last.prevNotes)
            });
        }
    }

    giveHint() {
        const hint = this.engine.getHint(this.board);
        if (!hint) return;

        this.history.push({
            r: hint.r,
            c: hint.c,
            prevVal: this.board[hint.r][hint.c],
            prevNotes: new Set(this.notes[hint.r][hint.c])
        });

        this.board[hint.r][hint.c] = hint.val;
        this.notes[hint.r][hint.c].clear();
        this.selectedCell = { r: hint.r, c: hint.c };
        window.sound.playSudokuPlace();
        this.renderBoard();
        this.updateStats();

        if (this.gameMode === 'coop') {
            window.net.send('SUDOKU_UPDATE', {
                r: hint.r,
                c: hint.c,
                val: hint.val,
                notes: []
            });
        } else if (this.gameMode === 'race') {
            const filled = this.engine.countFilledCorrectly(this.board);
            window.net.send('SUDOKU_PROGRESS', { progress: filled, total: 81 });
            this.updateRaceProgress(filled, this.partnerProgress);
        }

        if (this.engine.isSolved(this.board)) {
            this.handlePuzzleComplete();
        }
    }

    toggleNoteMode() {
        this.noteMode = !this.noteMode;
        const btn = document.getElementById('sudoku-btn-note');
        if (btn) btn.classList.toggle('active', this.noteMode);
    }

    updateStats() {
        const misElem = document.getElementById('sudoku-mistakes');
        if (misElem) misElem.textContent = this.mistakes;
    }

    updateNumpadBadges() {
        // Megszámolja, melyik számból hány van kész a táblán (max 9)
        const counts = Array(10).fill(0);
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (this.board[r][c] !== 0) counts[this.board[r][c]]++;
            }
        }
        for (let n = 1; n <= 9; n++) {
            const btn = document.getElementById(`numpad-${n}`);
            if (btn) {
                btn.classList.toggle('completed', counts[n] >= 9);
            }
        }
    }

    updateRaceProgress(myProgress, oppProgress) {
        const myFillElem = document.getElementById('race-my-fill');
        const oppFillElem = document.getElementById('race-opp-fill');
        const myScoreElem = document.getElementById('race-my-score');
        const oppScoreElem = document.getElementById('race-opp-score');

        const myPct = Math.min(100, Math.round((myProgress / 81) * 100));
        const oppPct = Math.min(100, Math.round((oppProgress / 81) * 100));

        if (myFillElem) myFillElem.style.width = `${myPct}%`;
        if (oppFillElem) oppFillElem.style.width = `${oppPct}%`;
        if (myScoreElem) myScoreElem.textContent = `${myProgress}/81 (${myPct}%)`;
        if (oppScoreElem) oppScoreElem.textContent = `${oppProgress}/81 (${oppPct}%)`;
    }

    handlePuzzleComplete() {
        this.stopTimer();
        window.sound.playVictory();

        if (this.gameMode === 'race') {
            window.net.send('SUDOKU_VICTORY', { time: this.timer });
            window.app.showModal('Győzelem!', `Elsőként oldottad meg a Szudokut! Időd: ${this.formatTime(this.timer)}`);
        } else if (this.gameMode === 'coop') {
            window.app.showModal('Közös Siker!', `Gratulálunk! Sikeresen megoldottátok a feladványt együtt. Idő: ${this.formatTime(this.timer)}`);
        } else {
            window.app.showModal('Gratulálunk!', `Sikeresen megoldottad a Szudokut! Idő: ${this.formatTime(this.timer)}`);
        }
    }

    formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    // Hálózati eseménykezelők
    onPartnerUpdate(data) {
        if (!data) return;
        const { r, c, val, notes } = data;
        this.board[r][c] = val || 0;
        this.notes[r][c] = new Set(notes || []);
        this.renderBoard();

        if (this.engine.isSolved(this.board)) {
            this.handlePuzzleComplete();
        }
    }

    onPartnerCursor(data) {
        if (!data) return;
        this.partnerCursor = { r: data.r, c: data.c };
        this.renderBoard();
    }

    onPartnerProgress(data) {
        if (!data) return;
        this.partnerProgress = data.progress || 0;
        const myFilled = this.engine.countFilledCorrectly(this.board);
        this.updateRaceProgress(myFilled, this.partnerProgress);
    }

    onPartnerVictory(data) {
        this.stopTimer();
        window.sound.playNotification();
        window.app.showModal('A verseny véget ért', `Az ellenfeled fejezte be először a Szudokut!`);
    }

    initKeyListeners() {
        window.addEventListener('keydown', (e) => {
            // Ne reagáljon chat gépelés közben
            if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
                return;
            }
            if (!this.selectedCell) return;

            // Számok 1-9
            if (e.key >= '1' && e.key <= '9') {
                this.inputNumber(parseInt(e.key, 10));
                return;
            }

            // Törlés
            if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
                this.erase();
                return;
            }

            // Nyilakkal való mozgás a rácson
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                let { r, c } = this.selectedCell;
                if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
                if (e.key === 'ArrowDown') r = Math.min(8, r + 1);
                if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
                if (e.key === 'ArrowRight') c = Math.min(8, c + 1);
                this.selectCell(r, c);
                return;
            }

            // 'n' gomb: jegyzet mód váltása
            if (e.key.toLowerCase() === 'n') {
                this.toggleNoteMode();
                return;
            }

            // 'h' gomb: segítség (hint)
            if (e.key.toLowerCase() === 'h') {
                this.giveHint();
                return;
            }

            // 'z' gomb vagy Ctrl+Z: visszavonás
            if (e.key.toLowerCase() === 'z' || (e.ctrlKey && e.key.toLowerCase() === 'z')) {
                this.undo();
                return;
            }
        });
    }
}

window.SudokuUI = SudokuUI;
