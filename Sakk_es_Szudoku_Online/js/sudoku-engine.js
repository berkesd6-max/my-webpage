// Szudoku motor: feladványgenerátor, egyedi megoldás ellenőrző és segédlogika
class SudokuEngine {
    constructor() {
        this.board = Array(9).fill(null).map(() => Array(9).fill(0));
        this.solution = Array(9).fill(null).map(() => Array(9).fill(0));
        this.initial = Array(9).fill(null).map(() => Array(9).fill(false));
    }

    // Új feladvány generálása
    generate(difficulty = 'medium') {
        // 1. Teljes érvényes tábla létrehozása (átlós 3x3 blokkok gyors kitöltésével)
        this.solution = Array(9).fill(null).map(() => Array(9).fill(0));
        this.fillDiagonalBoxes(this.solution);
        this.fillGrid(this.solution);

        // 2. Másolás a játékostáblába
        this.board = this.solution.map(row => [...row]);

        // 3. Mezők törlése nehézség szerint egyedi megoldás megőrzésével
        const cluesCount = {
            'easy': 40,
            'medium': 32,
            'hard': 27,
            'master': 23
        }[difficulty] || 32;

        const cellsToRemove = 81 - cluesCount;
        this.removeNumbers(cellsToRemove);

        // Kezdőértékek megjelölése
        this.initial = this.board.map(row => row.map(v => v !== 0));

        return {
            board: this.board.map(r => [...r]),
            solution: this.solution.map(r => [...r]),
            initial: this.initial.map(r => [...r])
        };
    }

    fillDiagonalBoxes(grid) {
        for (let b = 0; b < 9; b += 3) {
            const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
            let idx = 0;
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    grid[b + r][b + c] = nums[idx++];
                }
            }
        }
    }

    fillGrid(grid) {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (grid[r][c] === 0) {
                    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
                    for (let n of nums) {
                        if (this.isValid(grid, r, c, n)) {
                            grid[r][c] = n;
                            if (this.fillGrid(grid)) return true;
                            grid[r][c] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    isValid(grid, r, c, num) {
        // Sor és oszlop ellenőrzés
        for (let i = 0; i < 9; i++) {
            if (grid[r][i] === num) return false;
            if (grid[i][c] === num) return false;
        }

        // 3x3 blokk ellenőrzés
        const startR = Math.floor(r / 3) * 3;
        const startC = Math.floor(c / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (grid[startR + i][startC + j] === num) return false;
            }
        }

        return true;
    }

    countSolutions(grid, limit = 2) {
        let count = 0;

        const solve = (g) => {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (g[r][c] === 0) {
                        for (let n = 1; n <= 9; n++) {
                            if (this.isValid(g, r, c, n)) {
                                g[r][c] = n;
                                solve(g);
                                g[r][c] = 0;
                                if (count >= limit) return;
                            }
                        }
                        return;
                    }
                }
            }
            count++;
        };

        solve(grid.map(row => [...row]));
        return count;
    }

    removeNumbers(count) {
        const coords = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                coords.push({ r, c });
            }
        }
        coords.sort(() => Math.random() - 0.5);

        let removed = 0;
        for (let { r, c } of coords) {
            if (removed >= count) break;
            const temp = this.board[r][c];
            this.board[r][c] = 0;

            // Csak akkor vehetjük ki, ha még mindig pontosan 1 megoldás van
            if (this.countSolutions(this.board, 2) === 1) {
                removed++;
            } else {
                this.board[r][c] = temp;
            }
        }
    }

    // Ütközések megkeresése a táblán (duplikált számok jelzése)
    getConflicts(grid) {
        const conflicts = Array(9).fill(null).map(() => Array(9).fill(false));

        // Sorok és oszlopok
        for (let i = 0; i < 9; i++) {
            const rowSeen = {};
            const colSeen = {};

            for (let j = 0; j < 9; j++) {
                // Sor
                const rVal = grid[i][j];
                if (rVal !== 0) {
                    if (rowSeen[rVal]) {
                        conflicts[i][j] = true;
                        conflicts[i][rowSeen[rVal] - 1] = true;
                    } else {
                        rowSeen[rVal] = j + 1;
                    }
                }
                // Oszlop
                const cVal = grid[j][i];
                if (cVal !== 0) {
                    if (colSeen[cVal]) {
                        conflicts[j][i] = true;
                        conflicts[colSeen[cVal] - 1][i] = true;
                    } else {
                        colSeen[cVal] = j + 1;
                    }
                }
            }
        }

        // 3x3 blokkok
        for (let blockR = 0; blockR < 3; blockR++) {
            for (let blockC = 0; blockC < 3; blockC++) {
                const boxSeen = {};
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 3; c++) {
                        const row = blockR * 3 + r;
                        const col = blockC * 3 + c;
                        const val = grid[row][col];
                        if (val !== 0) {
                            if (boxSeen[val]) {
                                conflicts[row][col] = true;
                                const prev = boxSeen[val];
                                conflicts[prev.r][prev.c] = true;
                            } else {
                                boxSeen[val] = { r: row, c: col };
                            }
                        }
                    }
                }
            }
        }

        return conflicts;
    }

    isSolved(grid) {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (grid[r][c] !== this.solution[r][c]) {
                    return false;
                }
            }
        }
        return true;
    }

    countFilledCorrectly(grid) {
        let count = 0;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (grid[r][c] !== 0 && grid[r][c] === this.solution[r][c]) {
                    count++;
                }
            }
        }
        return count;
    }

    getHint(grid) {
        // Keressünk egy üres vagy hibás mezőt
        const emptyOrWrong = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (!this.initial[r][c] && grid[r][c] !== this.solution[r][c]) {
                    emptyOrWrong.push({ r, c, val: this.solution[r][c] });
                }
            }
        }
        if (emptyOrWrong.length === 0) return null;
        return emptyOrWrong[Math.floor(Math.random() * emptyOrWrong.length)];
    }
}

window.SudokuEngine = SudokuEngine;
