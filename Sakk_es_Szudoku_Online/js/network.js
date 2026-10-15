// WebRTC hálózati réteg PeerJS alapokon
class NetworkManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.isHost = false;
        this.roomCode = null;
        this.handlers = {};
        this.connected = false;
        this.peerIdPrefix = "sz-game-p2p-v1-";
        this.pingInterval = null;
        this.lastPing = 0;
        this.currentPing = 0;
        this.userName = localStorage.getItem('sz_player_name') || 'Játékos';
    }

    setUserName(name) {
        if (name && name.trim()) {
            this.userName = name.trim();
            localStorage.setItem('sz_player_name', this.userName);
        }
    }

    on(type, callback) {
        if (!this.handlers[type]) {
            this.handlers[type] = [];
        }
        this.handlers[type].push(callback);
    }

    emit(type, data) {
        if (this.handlers[type]) {
            this.handlers[type].forEach(cb => {
                try { cb(data); } catch (e) { console.error('Eseménykezelő hiba:', e); }
            });
        }
    }

    createRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    createRoom(gameType, options = {}) {
        return new Promise((resolve, reject) => {
            this.cleanup();
            this.isHost = true;
            this.roomCode = this.createRoomCode();
            const fullPeerId = this.peerIdPrefix + this.roomCode;

            try {
                this.peer = new Peer(fullPeerId, {
                    debug: 1,
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:global.stun.twilio.com:3478' }
                        ]
                    }
                });

                this.peer.on('open', (id) => {
                    resolve(this.roomCode);
                });

                this.peer.on('connection', (conn) => {
                    if (this.conn && this.conn.open) {
                        conn.close(); // Egyszerre 1 ellenfél
                        return;
                    }
                    this.setupConnection(conn, true, { gameType, ...options });
                });

                this.peer.on('error', (err) => {
                    if (err.type === 'unavailable-id') {
                        // Ha ütközne a szobakód, próbáljunk újat
                        this.createRoom(gameType, options).then(resolve).catch(reject);
                    } else {
                        this.emit('error', err);
                        reject(err);
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    joinRoom(roomCode) {
        return new Promise((resolve, reject) => {
            this.cleanup();
            this.isHost = false;
            this.roomCode = roomCode.trim().toUpperCase();
            const targetPeerId = this.peerIdPrefix + this.roomCode;

            try {
                this.peer = new Peer({
                    debug: 1,
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:global.stun.twilio.com:3478' }
                        ]
                    }
                });

                this.peer.on('open', () => {
                    const conn = this.peer.connect(targetPeerId, {
                        reliable: true,
                        metadata: { playerName: this.userName }
                    });

                    let timeout = setTimeout(() => {
                        if (!this.connected) {
                            reject(new Error("Nem sikerült kapcsolódni a szobához (időtúllépés). Ellenőrizd a szobakódot!"));
                        }
                    }, 12000);

                    conn.on('open', () => {
                        clearTimeout(timeout);
                        this.setupConnection(conn, false);
                        resolve(this.roomCode);
                    });

                    conn.on('error', (err) => {
                        clearTimeout(timeout);
                        reject(err);
                    });
                });

                this.peer.on('error', (err) => {
                    this.emit('error', err);
                    reject(err);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    setupConnection(conn, isHost, hostOptions = {}) {
        this.conn = conn;

        conn.on('open', () => {
            this.connected = true;
            this.startPing();
            this.emit('connected', {
                isHost: this.isHost,
                roomCode: this.roomCode,
                metadata: conn.metadata
            });

            if (isHost) {
                this.send('INIT_GAME', {
                    hostName: this.userName,
                    ...hostOptions
                });
            } else {
                this.send('GUEST_READY', {
                    guestName: this.userName
                });
            }
        });

        conn.on('data', (raw) => {
            if (!raw || !raw.type) return;

            if (raw.type === '__PING__') {
                this.conn.send({ type: '__PONG__', t: raw.t });
                return;
            }
            if (raw.type === '__PONG__') {
                this.currentPing = Math.round((Date.now() - raw.t) / 2);
                this.emit('ping', this.currentPing);
                return;
            }

            this.emit('data', raw);
            this.emit(raw.type, raw.payload);
        });

        conn.on('close', () => {
            this.connected = false;
            this.stopPing();
            this.emit('disconnected');
        });

        conn.on('error', (err) => {
            this.emit('error', err);
        });
    }

    send(type, payload = {}) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type, payload });
            return true;
        }
        return false;
    }

    startPing() {
        this.stopPing();
        this.pingInterval = setInterval(() => {
            if (this.conn && this.conn.open) {
                this.conn.send({ type: '__PING__', t: Date.now() });
            }
        }, 4000);
    }

    stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    sendChat(text) {
        if (!text || !text.trim()) return;
        const msg = {
            sender: this.userName,
            text: text.trim(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        this.send('CHAT_MSG', msg);
        this.emit('chat', { ...msg, self: true });
    }

    cleanup() {
        this.stopPing();
        this.connected = false;
        if (this.conn) {
            try { this.conn.close(); } catch (e) {}
            this.conn = null;
        }
        if (this.peer) {
            try { this.peer.destroy(); } catch (e) {}
            this.peer = null;
        }
    }
}

window.net = new NetworkManager();
