// Fő alkalmazásvezérlő: nézetek, szobák, hálózat és UI összekötése
class App {
    constructor() {
        this.chess = new ChessUI();
        this.sudoku = new SudokuUI();
        this.currentView = 'lobby';
        this.activeGame = null; // 'chess' vagy 'sudoku'
        this.chatUnread = 0;
        this.chatOpen = false;

        this.initDOM();
        this.initNetworkListeners();
        this.checkUrlHash();
    }

    initDOM() {
        // Játékosnév betöltése
        const nameInput = document.getElementById('player-name-input');
        if (nameInput) {
            nameInput.value = window.net.userName;
            nameInput.addEventListener('change', (e) => {
                window.net.setUserName(e.target.value);
            });
        }

        // Pályatéma választó inicializálása
        this.initBoardThemePicker();

        // Hang némítás gomb
        const muteBtn = document.getElementById('btn-mute');
        if (muteBtn) {
            this.updateMuteIcon();
            muteBtn.addEventListener('click', () => {
                window.sound.toggleMute();
                this.updateMuteIcon();
            });
        }

        // Főmenü gomb
        const homeBtn = document.getElementById('btn-home');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                if (this.currentView !== 'lobby') {
                    if (confirm('Biztosan vissza szeretnél térni a főmenübe? A folyamatban lévő játék megszakad.')) {
                        this.returnToLobby();
                    }
                }
            });
        }

        // Chat gomb
        const chatToggleBtn = document.getElementById('btn-chat-toggle');
        if (chatToggleBtn) {
            chatToggleBtn.addEventListener('click', () => this.toggleChat());
        }

        const chatSendBtn = document.getElementById('btn-chat-send');
        const chatInput = document.getElementById('chat-input');
        if (chatSendBtn && chatInput) {
            const send = () => {
                const text = chatInput.value;
                if (text && text.trim()) {
                    window.net.sendChat(text);
                    chatInput.value = '';
                }
            };
            chatSendBtn.addEventListener('click', send);
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') send();
            });
        }
    }

    updateMuteIcon() {
        const muteBtn = document.getElementById('btn-mute');
        if (!muteBtn) return;
        const isMuted = window.sound.isMuted();
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
        muteBtn.title = isMuted ? 'Hang bekapcsolása' : 'Hang némítása';
    }

    initBoardThemePicker() {
        const grid = document.getElementById('board-theme-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const themes = this.chess.boardThemes;
        const current = this.chess.boardTheme;

        Object.entries(themes).forEach(([key, theme]) => {
            const btn = document.createElement('button');
            btn.className = 'board-theme-btn';
            btn.dataset.theme = key;
            if (key === current) btn.classList.add('active-theme');

            // Mini 4x4 előnézet négyzet
            const preview = document.createElement('div');
            preview.className = 'board-theme-preview';
            for (let i = 0; i < 16; i++) {
                const sq = document.createElement('div');
                sq.className = 'board-theme-preview-sq';
                const r = Math.floor(i / 4), c = i % 4;
                sq.style.backgroundColor = (r + c) % 2 === 0 ? theme.light : theme.dark;
                preview.appendChild(sq);
            }

            const label = document.createElement('div');
            label.className = 'board-theme-name';
            label.textContent = theme.name;

            btn.appendChild(preview);
            btn.appendChild(label);

            btn.addEventListener('click', () => {
                this.chess.applyBoardTheme(key);
                // Ha a tábla éppen látható, újrarendereli
                if (this.currentView === 'chess') {
                    this.chess.renderBoard();
                }
            });

            grid.appendChild(btn);
        });

        // Alkalmazza a mentett témát azonnal
        this.chess.applyBoardTheme(current);
    }

    showView(viewName) {
        this.currentView = viewName;
        document.getElementById('view-lobby').style.display = viewName === 'lobby' ? 'flex' : 'none';
        document.getElementById('view-chess').style.display = viewName === 'chess' ? 'flex' : 'none';
        document.getElementById('view-sudoku').style.display = viewName === 'sudoku' ? 'flex' : 'none';

        const roomBar = document.getElementById('online-room-bar');
        if (roomBar) {
            roomBar.style.display = window.net.connected ? 'flex' : 'none';
        }
    }

    returnToLobby() {
        this.chess.stopTimer();
        this.sudoku.stopTimer();
        window.net.cleanup();
        this.activeGame = null;
        this.showView('lobby');
        this.hideAllModals();
        document.getElementById('online-room-bar').style.display = 'none';
    }

    // Modal kezelés
    showModal(title, message) {
        const modal = document.getElementById('info-modal');
        const titleElem = document.getElementById('info-modal-title');
        const msgElem = document.getElementById('info-modal-msg');
        if (modal && titleElem && msgElem) {
            titleElem.textContent = title;
            msgElem.textContent = message;
            modal.style.display = 'flex';
        }
    }

    hideModal() {
        const modal = document.getElementById('info-modal');
        if (modal) modal.style.display = 'none';
    }

    hideAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    }

    // Sakk választások
    openChessOptions() {
        document.getElementById('chess-mode-modal').style.display = 'flex';
    }

    startChessSolo(difficulty) {
        this.hideAllModals();
        this.activeGame = 'chess';
        this.showView('chess');
        this.chess.startNewGame({
            mode: 'ai',
            difficulty: difficulty || 'medium',
            playerColor: 'w',
            timeControl: 600
        });
    }

    startChessLocal() {
        this.hideAllModals();
        this.activeGame = 'chess';
        this.showView('chess');
        this.chess.startNewGame({
            mode: 'local',
            timeControl: 600
        });
    }

    openChessOnlineModal() {
        this.hideAllModals();
        document.getElementById('online-create-modal').style.display = 'flex';
        document.getElementById('online-target-game').value = 'chess';
        document.getElementById('chess-online-options').style.display = 'block';
        document.getElementById('sudoku-online-options').style.display = 'none';
    }

    // Szudoku választások
    openSudokuOptions() {
        document.getElementById('sudoku-mode-modal').style.display = 'flex';
    }

    startSudokuSolo(difficulty) {
        this.hideAllModals();
        this.activeGame = 'sudoku';
        this.showView('sudoku');
        this.sudoku.startNewGame({
            mode: 'solo',
            difficulty: difficulty || 'medium'
        });
    }

    openSudokuOnlineModal() {
        this.hideAllModals();
        document.getElementById('online-create-modal').style.display = 'flex';
        document.getElementById('online-target-game').value = 'sudoku';
        document.getElementById('chess-online-options').style.display = 'none';
        document.getElementById('sudoku-online-options').style.display = 'block';
    }

    // Szobakészítés
    createOnlineRoom() {
        const targetGame = document.getElementById('online-target-game').value;
        const waitingModal = document.getElementById('room-waiting-modal');
        const codeDisplay = document.getElementById('room-code-display');
        const linkDisplay = document.getElementById('room-link-input');

        this.hideAllModals();
        waitingModal.style.display = 'flex';
        codeDisplay.textContent = 'Generálás...';

        let options = {};
        if (targetGame === 'chess') {
            options = {
                color: document.getElementById('chess-color-select').value,
                time: parseInt(document.getElementById('chess-time-select').value, 10)
            };
        } else {
            options = {
                sudokuMode: document.getElementById('sudoku-online-mode-select').value,
                difficulty: document.getElementById('sudoku-difficulty-select').value
            };
        }

        window.net.createRoom(targetGame, options).then(code => {
            codeDisplay.textContent = code;
            const fullUrl = window.location.origin + window.location.pathname + '#join=' + code;
            if (linkDisplay) linkDisplay.value = fullUrl;
            document.getElementById('room-bar-code').textContent = code;
        }).catch(err => {
            waitingModal.style.display = 'none';
            this.showModal('Hiba történt', 'Nem sikerült létrehozni a szobát: ' + err.message);
        });
    }

    copyRoomLink() {
        const linkInput = document.getElementById('room-link-input');
        if (linkInput) {
            linkInput.select();
            navigator.clipboard.writeText(linkInput.value).then(() => {
                alert('A szoba meghívó link vágólapra másolva!');
            }).catch(() => {
                alert('Link: ' + linkInput.value);
            });
        }
    }

    openJoinModal() {
        this.hideAllModals();
        document.getElementById('join-room-modal').style.display = 'flex';
    }

    joinRoom() {
        const codeInput = document.getElementById('join-code-input');
        const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
        if (!code) {
            alert('Kérlek adj meg egy szobakódot!');
            return;
        }

        const joinBtn = document.getElementById('btn-submit-join');
        if (joinBtn) joinBtn.textContent = 'Csatlakozás...';

        window.net.joinRoom(code).then(() => {
            this.hideAllModals();
            if (joinBtn) joinBtn.textContent = 'Csatlakozás';
        }).catch(err => {
            if (joinBtn) joinBtn.textContent = 'Csatlakozás';
            alert('Csatlakozási hiba: ' + err.message);
        });
    }

    // Hálózati események integrációja
    initNetworkListeners() {
        window.net.on('connected', (data) => {
            window.sound.playNotification();
            this.hideAllModals();
            document.getElementById('online-room-bar').style.display = 'flex';
            document.getElementById('room-bar-code').textContent = window.net.roomCode;
            this.addChatMessage('Rendszer', 'Kapcsolódva a partnerhez!', 'sys');
        });

        window.net.on('INIT_GAME', (data) => {
            // Vendég oldal: megkapja a játék adatait a hosttól
            if (data.gameType === 'chess') {
                this.activeGame = 'chess';
                this.showView('chess');
                const guestColor = data.color === 'w' ? 'b' : (data.color === 'b' ? 'w' : (Math.random() < 0.5 ? 'w' : 'b'));
                this.chess.startNewGame({
                    mode: 'online',
                    playerColor: guestColor,
                    timeControl: data.time || 600
                });
            } else if (data.gameType === 'sudoku') {
                this.activeGame = 'sudoku';
                this.showView('sudoku');
                this.sudoku.gameMode = data.sudokuMode || 'race';
            }
        });

        window.net.on('GUEST_READY', (data) => {
            // Host oldal: a vendég készen áll, indítsuk a játékot
            const targetGame = document.getElementById('online-target-game').value;
            if (targetGame === 'chess') {
                this.activeGame = 'chess';
                this.showView('chess');
                const hostColorChoice = document.getElementById('chess-color-select').value;
                const hostColor = hostColorChoice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : hostColorChoice;
                const timeControl = parseInt(document.getElementById('chess-time-select').value, 10);
                this.chess.startNewGame({
                    mode: 'online',
                    playerColor: hostColor,
                    timeControl
                });
            } else if (targetGame === 'sudoku') {
                this.activeGame = 'sudoku';
                this.showView('sudoku');
                const sMode = document.getElementById('sudoku-online-mode-select').value;
                const sDiff = document.getElementById('sudoku-difficulty-select').value;
                this.sudoku.startNewGame({
                    mode: sMode,
                    difficulty: sDiff,
                    isHost: true
                });
            }
        });

        // Sakk események
        window.net.on('CHESS_MOVE', (data) => this.chess.onOpponentMove(data));

        // Szudoku események
        window.net.on('SUDOKU_START', (data) => {
            this.activeGame = 'sudoku';
            this.showView('sudoku');
            this.sudoku.startNewGame({
                mode: data.gameMode,
                difficulty: data.difficulty,
                puzzleData: data.puzzleData
            });
        });
        window.net.on('SUDOKU_UPDATE', (data) => this.sudoku.onPartnerUpdate(data));
        window.net.on('SUDOKU_CURSOR', (data) => this.sudoku.onPartnerCursor(data));
        window.net.on('SUDOKU_PROGRESS', (data) => this.sudoku.onPartnerProgress(data));
        window.net.on('SUDOKU_VICTORY', (data) => this.sudoku.onPartnerVictory(data));

        // Chat és hálózat
        window.net.on('CHAT_MSG', (msg) => {
            window.sound.playNotification();
            this.addChatMessage(msg.sender, msg.text, 'partner', msg.time);
            if (!this.chatOpen) {
                this.chatUnread++;
                this.updateChatBadge();
            }
        });

        window.net.on('chat', (msg) => {
            if (msg.self) {
                this.addChatMessage('Én', msg.text, 'self', msg.time);
            }
        });

        window.net.on('ping', (ms) => {
            const pingElem = document.getElementById('room-bar-ping');
            if (pingElem) pingElem.textContent = `${ms} ms`;
        });

        window.net.on('disconnected', () => {
            this.addChatMessage('Rendszer', 'A partner lekapcsolódott.', 'sys');
            alert('A partner bontotta a kapcsolatot.');
            this.returnToLobby();
        });
    }

    toggleChat() {
        this.chatOpen = !this.chatOpen;
        const panel = document.getElementById('chat-panel');
        if (panel) panel.classList.toggle('open', this.chatOpen);
        if (this.chatOpen) {
            this.chatUnread = 0;
            this.updateChatBadge();
            const input = document.getElementById('chat-input');
            if (input) input.focus();
        }
    }

    updateChatBadge() {
        const badge = document.getElementById('chat-unread-badge');
        if (!badge) return;
        if (this.chatUnread > 0) {
            badge.textContent = this.chatUnread;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    addChatMessage(sender, text, type = 'partner', time = '') {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${type}`;

        const header = document.createElement('div');
        header.className = 'chat-header';
        header.textContent = `${sender} ${time ? '(' + time + ')' : ''}`;

        const body = document.createElement('div');
        body.className = 'chat-body';
        body.textContent = text;

        msgDiv.appendChild(header);
        msgDiv.appendChild(body);
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    }

    checkUrlHash() {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#join=')) {
            const code = hash.replace('#join=', '').trim();
            if (code) {
                setTimeout(() => {
                    this.openJoinModal();
                    const codeInput = document.getElementById('join-code-input');
                    if (codeInput) codeInput.value = code;
                }, 400);
            }
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
