// Sakk grafikus felület és interakciók — valódi Cburnett bábukkal és pályaválasztóval
class ChessUI {
    constructor() {
        this.engine = new ChessEngine();
        this.playerColor = 'w';
        this.isFlipped = false;
        this.gameMode = 'ai';
        this.aiDifficulty = 'medium';
        this.selectedSquare = null;
        this.legalMoves = [];
        this.pendingPromoMove = null;

        // Időzítők
        this.timeControl = 600;
        this.whiteTime = 600;
        this.blackTime = 600;
        this.timerInterval = null;

        // Pályatéma (board theme)
        this.boardTheme = localStorage.getItem('sz_board_theme') || 'classic';
        this.boardThemes = {
            classic:  { light: '#f0d9b5', dark: '#b58863', name: 'Klasszikus (Fa)' },
            lichess:  { light: '#f0f0ef', dark: '#8ca2ad', name: 'Lichess (Szürke-kék)' },
            green:    { light: '#ffffdd', dark: '#86a666', name: 'Zöld (Hagyományos)' },
            coral:    { light: '#f5deb3', dark: '#cd853f', name: 'Korall (Meleg)' },
            navy:     { light: '#dee3e6', dark: '#315991', name: 'Haditengerész (Kék)' },
            purple:   { light: '#e8dfed', dark: '#7b4fa0', name: 'Lila' },
            midnight: { light: '#7b91b0', dark: '#2e3a4e', name: 'Éjfél (Sötét)' },
            walnut:   { light: '#e8c99a', dark: '#7a4c2a', name: 'Dió (Barna)' },
        };
    }

    startNewGame(options = {}) {
        this.gameMode = options.mode || 'ai';
        this.aiDifficulty = options.difficulty || 'medium';
        this.playerColor = options.playerColor || 'w';
        this.isFlipped = this.playerColor === 'b';
        this.timeControl = options.timeControl !== undefined ? options.timeControl : 600;

        this.whiteTime = this.timeControl;
        this.blackTime = this.timeControl;
        this.selectedSquare = null;
        this.legalMoves = [];
        this.pendingPromoMove = null;

        this.engine.reset();
        this.applyBoardTheme(this.boardTheme);
        this.renderBoard();
        this.updateStatus();
        this.updateHistory();
        this.updateCaptured();
        this.startTimer();

        if (this.gameMode === 'ai' && this.playerColor === 'b') {
            setTimeout(() => this.makeAiMove(), 500);
        }
    }

    // ─── Pályatéma kezelés ────────────────────────────────────────────────────
    applyBoardTheme(themeName) {
        const theme = this.boardThemes[themeName];
        if (!theme) return;
        this.boardTheme = themeName;
        localStorage.setItem('sz_board_theme', themeName);

        const root = document.documentElement;
        root.style.setProperty('--sq-light', theme.light);
        root.style.setProperty('--sq-dark', theme.dark);

        // Aktív gomb kiemelés a témavälasztóban
        document.querySelectorAll('.board-theme-btn').forEach(btn => {
            btn.classList.toggle('active-theme', btn.dataset.theme === themeName);
        });
    }

    // ─── Időzítők ────────────────────────────────────────────────────────────
    startTimer() {
        this.stopTimer();
        if (this.timeControl <= 0) {
            document.getElementById('chess-timers').style.display = 'none';
            return;
        }
        document.getElementById('chess-timers').style.display = 'flex';
        this.updateTimerDisplays();

        this.timerInterval = setInterval(() => {
            if (this.engine.turn === 'w') {
                this.whiteTime = Math.max(0, this.whiteTime - 1);
                if (this.whiteTime === 0) this.handleTimeOut('w');
            } else {
                this.blackTime = Math.max(0, this.blackTime - 1);
                if (this.blackTime === 0) this.handleTimeOut('b');
            }
            this.updateTimerDisplays();
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    updateTimerDisplays() {
        const wElem = document.getElementById('white-timer');
        const bElem = document.getElementById('black-timer');
        if (wElem) wElem.textContent = this.formatTime(this.whiteTime);
        if (bElem) bElem.textContent = this.formatTime(this.blackTime);
        if (wElem) wElem.closest('.clock-card').classList.toggle('active-clock', this.engine.turn === 'w');
        if (bElem) bElem.closest('.clock-card').classList.toggle('active-clock', this.engine.turn === 'b');
    }

    handleTimeOut(timedOutColor) {
        this.stopTimer();
        window.sound.playVictory();
        const winner = timedOutColor === 'w' ? 'Fekete' : 'Fehér';
        window.app.showModal('Idő lejárt!', `${winner} nyert időtúllépéssel.`);
    }

    // ─── Tábla renderelés ─────────────────────────────────────────────────────
    renderBoard() {
        const boardElem = document.getElementById('chess-board');
        if (!boardElem) return;
        boardElem.innerHTML = '';

        const lastMove = this.engine.history.length > 0
            ? this.engine.history[this.engine.history.length - 1].move
            : null;
        const kingInCheckPos = this.engine.inCheck(this.engine.turn)
            ? this.engine.findKing(this.engine.turn)
            : null;

        for (let rowIdx = 0; rowIdx < 8; rowIdx++) {
            for (let colIdx = 0; colIdx < 8; colIdx++) {
                const r = this.isFlipped ? 7 - rowIdx : rowIdx;
                const c = this.isFlipped ? 7 - colIdx : colIdx;

                const sq = document.createElement('div');
                sq.className = `chess-square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
                sq.dataset.row = r;
                sq.dataset.col = c;

                // Koordináta jelölések (a-h / 1-8)
                if (colIdx === 0) {
                    const rankLabel = document.createElement('span');
                    rankLabel.className = 'sq-rank-label';
                    rankLabel.textContent = this.isFlipped ? r + 1 : 8 - r;
                    sq.appendChild(rankLabel);
                }
                if (rowIdx === 7) {
                    const fileLabel = document.createElement('span');
                    fileLabel.className = 'sq-file-label';
                    fileLabel.textContent = 'abcdefgh'[c];
                    sq.appendChild(fileLabel);
                }

                // Kiemelések
                if (this.selectedSquare && this.selectedSquare.r === r && this.selectedSquare.c === c) {
                    sq.classList.add('selected');
                }
                if (lastMove) {
                    if ((lastMove.from.r === r && lastMove.from.c === c) ||
                        (lastMove.to.r === r && lastMove.to.c === c)) {
                        sq.classList.add('last-move');
                    }
                }
                if (kingInCheckPos && kingInCheckPos.r === r && kingInCheckPos.c === c) {
                    sq.classList.add('in-check');
                }

                // Lépésjelölő pöttyök
                const isLegalTarget = this.legalMoves.some(m => m.to.r === r && m.to.c === c);
                if (isLegalTarget) {
                    const hintElem = document.createElement('div');
                    hintElem.className = this.engine.board[r][c] ? 'hint-capture' : 'hint-dot';
                    sq.appendChild(hintElem);
                }

                // Bábu behelyezése valódi SVG-vel
                const piece = this.engine.board[r][c];
                if (piece) {
                    const pieceElem = document.createElement('div');
                    pieceElem.className = 'chess-piece';

                    const pieceKey = piece[0] + piece[1]; // pl. 'wK', 'bP'
                    if (typeof PIECE_SVGS !== 'undefined' && PIECE_SVGS[pieceKey]) {
                        pieceElem.innerHTML = PIECE_SVGS[pieceKey];
                        const svgEl = pieceElem.querySelector('svg');
                        if (svgEl) {
                            svgEl.setAttribute('width', '100%');
                            svgEl.setAttribute('height', '100%');
                        }
                    } else {
                        // Fallback szöveg bábu
                        const glyphs = { wK:'♔', wQ:'♕', wR:'♖', wB:'♗', wN:'♘', wP:'♙',
                                         bK:'♚', bQ:'♛', bR:'♜', bB:'♝', bN:'♞', bP:'♟' };
                        pieceElem.textContent = glyphs[pieceKey] || piece;
                        pieceElem.style.fontSize = '40px';
                        pieceElem.style.color = piece[0] === 'w' ? '#fff' : '#111';
                        pieceElem.style.textShadow = piece[0] === 'w'
                            ? '0 0 3px #000'
                            : '0 0 3px #fff';
                    }

                    sq.appendChild(pieceElem);
                }

                sq.addEventListener('click', () => this.handleSquareClick(r, c));
                boardElem.appendChild(sq);
            }
        }
    }

    // ─── Kattintás kezelés ────────────────────────────────────────────────────
    handleSquareClick(r, c) {
        if (this.gameMode === 'online' && this.engine.turn !== this.playerColor) return;
        if (this.gameMode === 'ai' && this.engine.turn !== this.playerColor) return;

        const clickedPiece = this.engine.board[r][c];

        if (this.selectedSquare) {
            const targetMove = this.legalMoves.find(m => m.to.r === r && m.to.c === c);
            if (targetMove) {
                if (targetMove.isPromo) {
                    this.pendingPromoMove = targetMove;
                    this.showPromotionDialog();
                    return;
                }
                this.executeMove(targetMove);
                return;
            }
        }

        if (clickedPiece && clickedPiece[0] === this.engine.turn) {
            if (this.gameMode === 'local' || clickedPiece[0] === this.playerColor) {
                this.selectedSquare = { r, c };
                this.legalMoves = this.engine.getLegalMoves(r, c);
                this.renderBoard();
                return;
            }
        }

        this.selectedSquare = null;
        this.legalMoves = [];
        this.renderBoard();
    }

    showPromotionDialog() {
        const dialog = document.getElementById('chess-promo-modal');
        const color = this.engine.turn; // Az aktuálisan lépő szín
        // Frissítsük a promóciós bábuk megjelenítését az aktuális bábukészlettel
        const promoTypes = ['Q', 'R', 'B', 'N'];
        promoTypes.forEach(type => {
            const btn = document.getElementById(`promo-${type}`);
            if (btn && typeof PIECE_SVGS !== 'undefined') {
                const key = color + type;
                btn.innerHTML = PIECE_SVGS[key] || btn.innerHTML;
                const svg = btn.querySelector('svg');
                if (svg) { svg.style.width = '52px'; svg.style.height = '52px'; }
            }
        });
        if (dialog) dialog.style.display = 'flex';
    }

    choosePromotion(pieceType) {
        const dialog = document.getElementById('chess-promo-modal');
        if (dialog) dialog.style.display = 'none';
        if (this.pendingPromoMove) {
            const m = this.pendingPromoMove;
            this.pendingPromoMove = null;
            this.executeMove(m, pieceType);
        }
    }

    // ─── Lépés végrehajtása ───────────────────────────────────────────────────
    executeMove(move, promoChoice = 'Q') {
        const isCapture = !!(move.captured || this.engine.board[move.to.r][move.to.c] || move.isEnPassant);

        this.engine.applyMove(move, promoChoice);
        this.selectedSquare = null;
        this.legalMoves = [];

        if (isCapture) window.sound.playCapture();
        else window.sound.playMove();

        this.renderBoard();
        this.updateHistory();
        this.updateCaptured();

        const status = this.engine.getGameStatus();
        this.updateStatus(status);

        if (status.check) window.sound.playCheck();

        if (this.gameMode === 'online') {
            window.net.send('CHESS_MOVE', {
                move, promoChoice,
                whiteTime: this.whiteTime,
                blackTime: this.blackTime
            });
        }

        if (status.over) {
            this.stopTimer();
            this.handleGameOver(status);
            return;
        }

        if (this.gameMode === 'ai' && this.engine.turn !== this.playerColor) {
            setTimeout(() => this.makeAiMove(), 350);
        }
    }

    makeAiMove() {
        const best = this.engine.getBestMove(this.aiDifficulty);
        if (best) {
            const isCapture = !!(best.captured || this.engine.board[best.to.r][best.to.c] || best.isEnPassant);
            this.engine.applyMove(best, 'Q');

            if (isCapture) window.sound.playCapture();
            else window.sound.playMove();

            this.renderBoard();
            this.updateHistory();
            this.updateCaptured();

            const status = this.engine.getGameStatus();
            this.updateStatus(status);
            if (status.check) window.sound.playCheck();
            if (status.over) {
                this.stopTimer();
                this.handleGameOver(status);
            }
        }
    }

    onOpponentMove(data) {
        if (!data || !data.move) return;
        const { move, promoChoice, whiteTime, blackTime } = data;
        if (whiteTime !== undefined) this.whiteTime = whiteTime;
        if (blackTime !== undefined) this.blackTime = blackTime;

        const isCapture = !!(move.captured || this.engine.board[move.to.r][move.to.c] || move.isEnPassant);
        this.engine.applyMove(move, promoChoice || 'Q');

        if (isCapture) window.sound.playCapture();
        else window.sound.playMove();

        this.renderBoard();
        this.updateHistory();
        this.updateCaptured();

        const status = this.engine.getGameStatus();
        this.updateStatus(status);
        if (status.check) window.sound.playCheck();
        if (status.over) {
            this.stopTimer();
            this.handleGameOver(status);
        }
    }

    // ─── Állapot / UI frissítők ───────────────────────────────────────────────
    updateStatus(status = this.engine.getGameStatus()) {
        const statusElem = document.getElementById('chess-status-text');
        if (!statusElem) return;

        if (status.over) {
            if (status.reason === 'checkmate') {
                const winnerName = status.winner === 'w' ? 'Fehér' : 'Fekete';
                statusElem.textContent = `♚ Sakk-matt! ${winnerName} győzött!`;
            } else if (status.reason === 'stalemate') {
                statusElem.textContent = '½ Patt! Döntetlen.';
            } else {
                statusElem.textContent = '½ Döntetlen!';
            }
        } else {
            const turnName = this.engine.turn === 'w' ? 'Fehér' : 'Fekete';
            const checkStr = status.check ? ' ⚠ Sakk!' : '';
            statusElem.textContent = `${turnName} lépése${checkStr}`;
        }
    }

    updateHistory() {
        const histElem = document.getElementById('chess-history-list');
        if (!histElem) return;
        histElem.innerHTML = '';

        for (let i = 0; i < this.engine.history.length; i += 2) {
            const moveNum = Math.floor(i / 2) + 1;
            const wItem = this.engine.history[i];
            const bItem = this.engine.history[i + 1];

            const row = document.createElement('div');
            row.className = 'history-row';

            const numSpan = document.createElement('span');
            numSpan.className = 'hist-num';
            numSpan.textContent = `${moveNum}.`;

            const wSpan = document.createElement('span');
            wSpan.className = 'hist-w';
            wSpan.textContent = this.formatMoveText(wItem);

            const bSpan = document.createElement('span');
            bSpan.className = 'hist-b';
            bSpan.textContent = bItem ? this.formatMoveText(bItem) : '';

            row.appendChild(numSpan);
            row.appendChild(wSpan);
            row.appendChild(bSpan);
            histElem.appendChild(row);
        }
        histElem.scrollTop = histElem.scrollHeight;
    }

    formatMoveText(histItem) {
        const files = 'abcdefgh';
        const { move, piece, promoChoice, captured } = histItem;
        if (move.isCastle === 'K') return 'O-O';
        if (move.isCastle === 'Q') return 'O-O-O';
        const type = piece[1] !== 'P' ? piece[1] : '';
        const cap = captured ? (piece[1] === 'P' ? files[move.from.c] + 'x' : 'x') : '';
        const dest = files[move.to.c] + (8 - move.to.r);
        const promo = promoChoice ? `=${promoChoice}` : '';
        return `${type}${cap}${dest}${promo}`;
    }

    updateCaptured() {
        const wCapElem = document.getElementById('white-captured');
        const bCapElem = document.getElementById('black-captured');

        const renderCaptured = (pieces, elem) => {
            if (!elem) return;
            elem.innerHTML = '';
            pieces.forEach(p => {
                const span = document.createElement('span');
                span.className = 'cap-piece';
                const key = p[0] + p[1];
                if (typeof PIECE_SVGS !== 'undefined' && PIECE_SVGS[key]) {
                    span.innerHTML = PIECE_SVGS[key];
                    const svg = span.querySelector('svg');
                    if (svg) { svg.style.width = '24px'; svg.style.height = '24px'; }
                } else {
                    const glyphs = { wK:'♔', wQ:'♕', wR:'♖', wB:'♗', wN:'♘', wP:'♙',
                                     bK:'♚', bQ:'♛', bR:'♜', bB:'♝', bN:'♞', bP:'♟' };
                    span.textContent = glyphs[key] || p;
                    span.style.fontSize = '18px';
                }
                elem.appendChild(span);
            });
        };

        renderCaptured(this.engine.captured.b, wCapElem);
        renderCaptured(this.engine.captured.w, bCapElem);
    }

    handleGameOver(status) {
        let msg = '';
        if (status.reason === 'checkmate') {
            const isWinner = status.winner === this.playerColor;
            if (isWinner) window.sound.playVictory();
            msg = `Sakk-matt! ${status.winner === 'w' ? 'Fehér' : 'Fekete'} győzött!`;
        } else if (status.reason === 'stalemate') {
            msg = 'Döntetlen: Patthelyzet!';
        } else {
            msg = 'Döntetlen mérkőzés!';
        }
        window.app.showModal('Játék Vége', msg);
    }

    flipBoard() {
        this.isFlipped = !this.isFlipped;
        this.renderBoard();
    }
}

window.ChessUI = ChessUI;
