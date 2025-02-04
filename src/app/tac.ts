type Player = 'X' | 'O';
type Cell = Player | null;
type Board = Cell[][];

export class TicTacToe {
    private board: Board;
    private currentPlayer: Player;
    private gameOver: boolean;

    constructor() {
        this.board = [
            [null, null, null],
            [null, null, null],
            [null, null, null]
        ];
        this.currentPlayer = 'X';
        this.gameOver = false;
    }

    // Make a move at the specified position
    public makeMove(row: number, col: number): boolean {
        // Check if the move is valid
        if (this.gameOver || row < 0 || row > 2 || col < 0 || col > 2 || this.board[row][col] !== null) {
            return false;
        }

        // Make the move
        this.board[row][col] = this.currentPlayer;

        // Check if the game is won
        if (this.checkWin()) {
            this.gameOver = true;
            return true;
        }

        // Check if the game is a draw
        if (this.checkDraw()) {
            this.gameOver = true;
            return true;
        }

        // Switch players
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        return true;
    }

    // Check if the current player has won
    private checkWin(): boolean {
        // Check rows
        for (let i = 0; i < 3; i++) {
            if (this.board[i][0] === this.currentPlayer &&
                this.board[i][1] === this.currentPlayer &&
                this.board[i][2] === this.currentPlayer) {
                return true;
            }
        }

        // Check columns
        for (let i = 0; i < 3; i++) {
            if (this.board[0][i] === this.currentPlayer &&
                this.board[1][i] === this.currentPlayer &&
                this.board[2][i] === this.currentPlayer) {
                return true;
            }
        }

        // Check diagonals
        if (this.board[0][0] === this.currentPlayer &&
            this.board[1][1] === this.currentPlayer &&
            this.board[2][2] === this.currentPlayer) {
            return true;
        }

        if (this.board[0][2] === this.currentPlayer &&
            this.board[1][1] === this.currentPlayer &&
            this.board[2][0] === this.currentPlayer) {
            return true;
        }

        return false;
    }

    // Check if the game is a draw
    private checkDraw(): boolean {
        return this.board.every(row => row.every(cell => cell !== null));
    }

    // Get the current game state
    public getBoard(): Board {
        return this.board;
    }

    // Get the current player
    public getCurrentPlayer(): Player {
        return this.currentPlayer;
    }

    // Check if the game is over
    public isGameOver(): boolean {
        return this.gameOver;
    }

    // Reset the game
    public reset(): void {
        this.board = [
            [null, null, null],
            [null, null, null],
            [null, null, null]
        ];
        this.currentPlayer = 'X';
        this.gameOver = false;
    }
}

// Example usage:
/*
const game = new TicTacToe();

// Make moves
game.makeMove(0, 0); // X plays at (0,0)
game.makeMove(1, 1); // O plays at (1,1)

// Get current state
console.log(game.getBoard());
console.log(game.getCurrentPlayer());
console.log(game.isGameOver());

// Reset game
game.reset();
*/ 