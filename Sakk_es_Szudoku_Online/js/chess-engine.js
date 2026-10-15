// Sakk játékszabályok, lépésgenerátor, érvényesség-ellenőrző és AI motor
class ChessEngine {
    constructor() {
        this.reset();
    }

    reset() {
        // 8x8 tábla: row 0 = rank 8 (fekete), row 7 = rank 1 (fehér)
        this.board = [
            ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
            ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
            ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
        ];
        this.turn = 'w'; // 'w' vagy 'b'
        this.castling = { wK: true, wQ: true, bK: true, bQ: true };
        this.enPassant = null; // { r, c } célmező
        this.halfMoves = 0; // 50 lépéses szabályhoz
        this.fullMoves = 1;
        this.history = [];
        this.captured = { w: [], b: [] }; // levett bábuk
    }

    clone() {
        const copy = new ChessEngine();
        copy.board = this.board.map(row => [...row]);
        copy.turn = this.turn;
        copy.castling = { ...this.castling };
        copy.enPassant = this.enPassant ? { ...this.enPassant } : null;
        copy.halfMoves = this.halfMoves;
        copy.fullMoves = this.fullMoves;
        copy.history = [...this.history];
        copy.captured = { w: [...this.captured.w], b: [...this.captured.b] };
        return copy;
    }

    getPiece(r, c) {
        if (r < 0 || r > 7 || c < 0 || c > 7) return null;
        return this.board[r][c];
    }

    isPieceColor(r, c, color) {
        const p = this.getPiece(r, c);
        return p !== null && p[0] === color;
    }

    findKing(color) {
        const target = color + 'K';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.board[r][c] === target) return { r, c };
            }
        }
        return null;
    }

    isSquareAttacked(targetR, targetC, attackerColor) {
        // Gyalog támadások
        const pawnDir = attackerColor === 'w' ? 1 : -1;
        const pawnRow = targetR + pawnDir;
        if (pawnRow >= 0 && pawnRow <= 7) {
            for (let dc of [-1, 1]) {
                const pawnCol = targetC + dc;
                if (pawnCol >= 0 && pawnCol <= 7) {
                    if (this.board[pawnRow][pawnCol] === attackerColor + 'P') return true;
                }
            }
        }

        // Huszár támadások
        const knightDeltas = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (let [dr, dc] of knightDeltas) {
            const nr = targetR + dr, nc = targetC + dc;
            if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                if (this.board[nr][nc] === attackerColor + 'N') return true;
            }
        }

        // Király támadások (1 mező távolság)
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = targetR + dr, nc = targetC + dc;
                if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                    if (this.board[nr][nc] === attackerColor + 'K') return true;
                }
            }
        }

        // Egyenes irányok (Bástya, Vezér)
        const straightDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (let [dr, dc] of straightDirs) {
            let nr = targetR + dr, nc = targetC + dc;
            while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                const p = this.board[nr][nc];
                if (p) {
                    if (p[0] === attackerColor && (p[1] === 'R' || p[1] === 'Q')) return true;
                    break;
                }
                nr += dr;
                nc += dc;
            }
        }

        // Átlós irányok (Futó, Vezér)
        const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        for (let [dr, dc] of diagDirs) {
            let nr = targetR + dr, nc = targetC + dc;
            while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                const p = this.board[nr][nc];
                if (p) {
                    if (p[0] === attackerColor && (p[1] === 'B' || p[1] === 'Q')) return true;
                    break;
                }
                nr += dr;
                nc += dc;
            }
        }

        return false;
    }

    inCheck(color = this.turn) {
        const kingPos = this.findKing(color);
        if (!kingPos) return false;
        const enemy = color === 'w' ? 'b' : 'w';
        return this.isSquareAttacked(kingPos.r, kingPos.c, enemy);
    }

    generatePseudoMoves(fromR, fromC) {
        const piece = this.getPiece(fromR, fromC);
        if (!piece) return [];
        const color = piece[0];
        const type = piece[1];
        const moves = [];

        // 1. Gyalog (Pawn)
        if (type === 'P') {
            const dir = color === 'w' ? -1 : 1;
            const startRow = color === 'w' ? 6 : 1;
            const promoRow = color === 'w' ? 0 : 7;

            // 1 lépés előre
            const r1 = fromR + dir;
            if (r1 >= 0 && r1 <= 7 && !this.board[r1][fromC]) {
                const isPromo = r1 === promoRow;
                moves.push({ from: { r: fromR, c: fromC }, to: { r: r1, c: fromC }, isPromo });

                // 2 lépés előre a kezdősorból
                const r2 = fromR + dir * 2;
                if (fromR === startRow && !this.board[r2][fromC]) {
                    moves.push({ from: { r: fromR, c: fromC }, to: { r: r2, c: fromC }, isPawnDouble: true });
                }
            }

            // Átlós ütések
            for (let dc of [-1, 1]) {
                const targetC = fromC + dc;
                if (targetC >= 0 && targetC <= 7) {
                    const targetP = this.board[r1][targetC];
                    if (targetP && targetP[0] !== color) {
                        const isPromo = r1 === promoRow;
                        moves.push({ from: { r: fromR, c: fromC }, to: { r: r1, c: targetC }, isPromo, captured: targetP });
                    } else if (this.enPassant && this.enPassant.r === r1 && this.enPassant.c === targetC) {
                        moves.push({ from: { r: fromR, c: fromC }, to: { r: r1, c: targetC }, isEnPassant: true, captured: color === 'w' ? 'bP' : 'wP' });
                    }
                }
            }
        }

        // 2. Huszár (Knight)
        else if (type === 'N') {
            const deltas = [
                [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                [1, -2], [1, 2], [2, -1], [2, 1]
            ];
            for (let [dr, dc] of deltas) {
                const nr = fromR + dr, nc = fromC + dc;
                if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                    const p = this.board[nr][nc];
                    if (!p) {
                        moves.push({ from: { r: fromR, c: fromC }, to: { r: nr, c: nc } });
                    } else if (p[0] !== color) {
                        moves.push({ from: { r: fromR, c: fromC }, to: { r: nr, c: nc }, captured: p });
                    }
                }
            }
        }

        // 3. Futó (Bishop), Bástya (Rook), Vezér (Queen)
        else if (type === 'B' || type === 'R' || type === 'Q') {
            let dirs = [];
            if (type === 'B' || type === 'Q') {
                dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
            }
            if (type === 'R' || type === 'Q') {
                dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
            }

            for (let [dr, dc] of dirs) {
                let nr = fromR + dr, nc = fromC + dc;
                while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                    const p = this.board[nr][nc];
                    if (!p) {
                        moves.push({ from: { r: fromR, c: fromC }, to: { r: nr, c: nc } });
                    } else {
                        if (p[0] !== color) {
                            moves.push({ from: { r: fromR, c: fromC }, to: { r: nr, c: nc }, captured: p });
                        }
                        break;
                    }
                    nr += dr;
                    nc += dc;
                }
            }
        }

        // 4. Király (King)
        else if (type === 'K') {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = fromR + dr, nc = fromC + dc;
                    if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                        const p = this.board[nr][nc];
                        if (!p) {
                            moves.push({ from: { r: fromR, c: fromC }, to: { r: nr, c: nc } });
                        } else if (p[0] !== color) {
                            moves.push({ from: { r: fromR, c: fromC }, to: { r: nr, c: nc }, captured: p });
                        }
                    }
                }
            }

            // Sáncolás (Castling)
            const enemy = color === 'w' ? 'b' : 'w';
            if (!this.inCheck(color)) {
                // Kis sánc (Kingside)
                if ((color === 'w' && this.castling.wK) || (color === 'b' && this.castling.bK)) {
                    const r = color === 'w' ? 7 : 0;
                    if (!this.board[r][5] && !this.board[r][6] && this.board[r][7] === color + 'R') {
                        if (!this.isSquareAttacked(r, 5, enemy) && !this.isSquareAttacked(r, 6, enemy)) {
                            moves.push({ from: { r: fromR, c: fromC }, to: { r, c: 6 }, isCastle: 'K' });
                        }
                    }
                }
                // Nagy sánc (Queenside)
                if ((color === 'w' && this.castling.wQ) || (color === 'b' && this.castling.bQ)) {
                    const r = color === 'w' ? 7 : 0;
                    if (!this.board[r][1] && !this.board[r][2] && !this.board[r][3] && this.board[r][0] === color + 'R') {
                        if (!this.isSquareAttacked(r, 3, enemy) && !this.isSquareAttacked(r, 2, enemy)) {
                            moves.push({ from: { r: fromR, c: fromC }, to: { r, c: 2 }, isCastle: 'Q' });
                        }
                    }
                }
            }
        }

        return moves;
    }

    applyMove(move, promoChoice = 'Q') {
        const piece = this.board[move.from.r][move.from.c];
        const color = piece[0];
        const type = piece[1];

        // Rögzítés előzményekbe visszavonáshoz
        const prevCastling = { ...this.castling };
        const prevEnPassant = this.enPassant ? { ...this.enPassant } : null;
        const prevHalfMoves = this.halfMoves;
        let capturedPiece = move.captured || this.board[move.to.r][move.to.c];

        // En passant ütés
        if (move.isEnPassant) {
            const pawnRow = color === 'w' ? move.to.r + 1 : move.to.r - 1;
            capturedPiece = this.board[pawnRow][move.to.c];
            this.board[pawnRow][move.to.c] = null;
        }

        // Lépés végrehajtása
        this.board[move.from.r][move.from.c] = null;

        if (move.isPromo) {
            this.board[move.to.r][move.to.c] = color + promoChoice;
        } else {
            this.board[move.to.r][move.to.c] = piece;
        }

        // Sáncolás bástya mozgatás
        if (move.isCastle === 'K') {
            const r = color === 'w' ? 7 : 0;
            this.board[r][5] = color + 'R';
            this.board[r][7] = null;
        } else if (move.isCastle === 'Q') {
            const r = color === 'w' ? 7 : 0;
            this.board[r][3] = color + 'R';
            this.board[r][0] = null;
        }

        // Levett bábu elmentése
        if (capturedPiece) {
            const capColor = capturedPiece[0];
            this.captured[capColor].push(capturedPiece);
        }

        // Sáncolási jogok frissítése
        if (type === 'K') {
            if (color === 'w') { this.castling.wK = false; this.castling.wQ = false; }
            else { this.castling.bK = false; this.castling.bQ = false; }
        }
        if (type === 'R') {
            if (move.from.r === 7 && move.from.c === 7) this.castling.wK = false;
            if (move.from.r === 7 && move.from.c === 0) this.castling.wQ = false;
            if (move.from.r === 0 && move.from.c === 7) this.castling.bK = false;
            if (move.from.r === 0 && move.from.c === 0) this.castling.bQ = false;
        }
        // Ha ellenfél bástyáját ütjük le
        if (move.to.r === 7 && move.to.c === 7) this.castling.wK = false;
        if (move.to.r === 7 && move.to.c === 0) this.castling.wQ = false;
        if (move.to.r === 0 && move.to.c === 7) this.castling.bK = false;
        if (move.to.r === 0 && move.to.c === 0) this.castling.bQ = false;

        // En passant állapot
        if (move.isPawnDouble) {
            this.enPassant = { r: (move.from.r + move.to.r) / 2, c: move.from.c };
        } else {
            this.enPassant = null;
        }

        // 50 lépéses szabály
        if (type === 'P' || capturedPiece) {
            this.halfMoves = 0;
        } else {
            this.halfMoves++;
        }

        if (color === 'b') {
            this.fullMoves++;
        }

        this.turn = color === 'w' ? 'b' : 'w';

        this.history.push({
            move,
            piece,
            captured: capturedPiece,
            prevCastling,
            prevEnPassant,
            prevHalfMoves,
            promoChoice: move.isPromo ? promoChoice : null
        });
    }

    undo() {
        const last = this.history.pop();
        if (!last) return null;

        const { move, piece, captured, prevCastling, prevEnPassant, prevHalfMoves, promoChoice } = last;
        const color = piece[0];

        // Visszahelyezés
        this.board[move.from.r][move.from.c] = piece;
        this.board[move.to.r][move.to.c] = null;

        if (move.isEnPassant) {
            const pawnRow = color === 'w' ? move.to.r + 1 : move.to.r - 1;
            this.board[pawnRow][move.to.c] = captured;
        } else if (captured) {
            this.board[move.to.r][move.to.c] = captured;
        }

        if (captured) {
            this.captured[captured[0]].pop();
        }

        // Sánc bástya vissza
        if (move.isCastle === 'K') {
            const r = color === 'w' ? 7 : 0;
            this.board[r][7] = color + 'R';
            this.board[r][5] = null;
        } else if (move.isCastle === 'Q') {
            const r = color === 'w' ? 7 : 0;
            this.board[r][0] = color + 'R';
            this.board[r][3] = null;
        }

        this.castling = prevCastling;
        this.enPassant = prevEnPassant;
        this.halfMoves = prevHalfMoves;
        this.turn = color;
        if (color === 'b') this.fullMoves--;

        return last;
    }

    getLegalMoves(fromR, fromC) {
        const piece = this.getPiece(fromR, fromC);
        if (!piece || piece[0] !== this.turn) return [];

        const pseudoMoves = this.generatePseudoMoves(fromR, fromC);
        const legal = [];

        for (let m of pseudoMoves) {
            this.applyMove(m, 'Q');
            // Ha a lépés után a lépő játékos királya sakkban van, a lépés érvénytelen
            if (!this.inCheck(piece[0])) {
                legal.push(m);
            }
            this.undo();
        }

        return legal;
    }

    getAllLegalMoves(color = this.turn) {
        const all = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.isPieceColor(r, c, color)) {
                    const moves = this.getLegalMoves(r, c);
                    all.push(...moves);
                }
            }
        }
        return all;
    }

    getGameStatus() {
        const legalMoves = this.getAllLegalMoves(this.turn);
        const check = this.inCheck(this.turn);

        if (legalMoves.length === 0) {
            if (check) {
                return { over: true, winner: this.turn === 'w' ? 'b' : 'w', reason: 'checkmate' };
            } else {
                return { over: true, winner: null, reason: 'stalemate' };
            }
        }

        if (this.halfMoves >= 100) {
            return { over: true, winner: null, reason: '50-move-rule' };
        }

        // Elégtelen készlet
        if (this.hasInsufficientMaterial()) {
            return { over: true, winner: null, reason: 'insufficient-material' };
        }

        return { over: false, check };
    }

    hasInsufficientMaterial() {
        const pieces = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.board[r][c]) pieces.push(this.board[r][c]);
            }
        }
        // K vs K
        if (pieces.length === 2) return true;
        // K+N vs K vagy K+B vs K
        if (pieces.length === 3) {
            const hasMinor = pieces.some(p => p[1] === 'N' || p[1] === 'B');
            if (hasMinor) return true;
        }
        return false;
    }

    // AI Értékelő függvény (Piece-Square Tables és anyagi előny)
    evaluate() {
        const pieceValues = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

        // Pozíciós táblák fehér szemszögből
        const pawnPst = [
            [0,  0,  0,  0,  0,  0,  0,  0],
            [50, 50, 50, 50, 50, 50, 50, 50],
            [10, 10, 20, 30, 30, 20, 10, 10],
            [5,  5, 10, 25, 25, 10,  5,  5],
            [0,  0,  0, 20, 20,  0,  0,  0],
            [5, -5,-10,  0,  0,-10, -5,  5],
            [5, 10, 10,-20,-20, 10, 10,  5],
            [0,  0,  0,  0,  0,  0,  0,  0]
        ];

        const knightPst = [
            [-50,-40,-30,-30,-30,-30,-40,-50],
            [-40,-20,  0,  0,  0,  0,-20,-40],
            [-30,  0, 10, 15, 15, 10,  0,-30],
            [-30,  5, 15, 20, 20, 15,  5,-30],
            [-30,  0, 15, 20, 20, 15,  0,-30],
            [-30,  5, 10, 15, 15, 10,  5,-30],
            [-40,-20,  0,  5,  5,  0,-20,-40],
            [-50,-40,-30,-30,-30,-30,-40,-50]
        ];

        let score = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.board[r][c];
                if (!p) continue;
                const col = p[0];
                const type = p[1];
                let val = pieceValues[type] || 0;

                // PST bónusz
                let bonus = 0;
                const pstRow = col === 'w' ? r : 7 - r;
                if (type === 'P') bonus = pawnPst[pstRow][c];
                else if (type === 'N') bonus = knightPst[pstRow][c];

                if (col === 'w') score += val + bonus;
                else score -= (val + bonus);
            }
        }
        return score;
    }

    // Minimax algoritmus Alpha-Beta nyeséssel
    minimax(depth, alpha, beta, isMaximizing) {
        const status = this.getGameStatus();
        if (status.over) {
            if (status.winner === 'w') return 100000 + depth;
            if (status.winner === 'b') return -100000 - depth;
            return 0;
        }
        if (depth === 0) {
            return this.evaluate();
        }

        const moves = this.getAllLegalMoves(isMaximizing ? 'w' : 'b');
        // Lépésrendezés (ütések előre) a gyorsabb nyeséshez
        moves.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0));

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (let m of moves) {
                this.applyMove(m, 'Q');
                const ev = this.minimax(depth - 1, alpha, beta, false);
                this.undo();
                maxEval = Math.max(maxEval, ev);
                alpha = Math.max(alpha, ev);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (let m of moves) {
                this.applyMove(m, 'Q');
                const ev = this.minimax(depth - 1, alpha, beta, true);
                this.undo();
                minEval = Math.min(minEval, ev);
                beta = Math.min(beta, ev);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    getBestMove(difficulty = 'medium') {
        const moves = this.getAllLegalMoves(this.turn);
        if (moves.length === 0) return null;

        // Kezdő (Easy): véletlenszerű vagy 1 lépés előre
        if (difficulty === 'easy') {
            if (Math.random() < 0.35) {
                return moves[Math.floor(Math.random() * moves.length)];
            }
        }

        const depth = difficulty === 'hard' ? 3 : (difficulty === 'medium' ? 2 : 1);
        const isMax = this.turn === 'w';
        let bestMove = null;
        let bestScore = isMax ? -Infinity : Infinity;

        // Kisebb randomizáció egyenlő lépéseknél
        moves.sort(() => Math.random() - 0.5);

        for (let m of moves) {
            this.applyMove(m, 'Q');
            const score = this.minimax(depth - 1, -Infinity, Infinity, !isMax);
            this.undo();

            if (isMax) {
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = m;
                }
            } else {
                if (score < bestScore) {
                    bestScore = score;
                    bestMove = m;
                }
            }
        }

        return bestMove || moves[0];
    }

    moveToSAN(move, promoChoice) {
        const p = this.board[move.from.r][move.from.c];
        if (!p) return '';
        const files = 'abcdefgh';
        const fromSquare = files[move.from.c] + (8 - move.from.r);
        const toSquare = files[move.to.c] + (8 - move.to.r);
        const type = p[1];
        if (move.isCastle === 'K') return 'O-O';
        if (move.isCastle === 'Q') return 'O-O-O';

        let str = type !== 'P' ? type : '';
        if (move.captured) {
            if (type === 'P') str += files[move.from.c];
            str += 'x';
        }
        str += toSquare;
        if (move.isPromo) str += '=' + (promoChoice || 'Q');
        return str;
    }
}

window.ChessEngine = ChessEngine;
