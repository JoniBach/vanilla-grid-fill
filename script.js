/*************************************************************
 * Basic Cathedral Board Project (Prototype)
 *
 * - 10x10 board stored in a 2D array (board[row][col]).
 * - occupant: null (empty), 'A', or 'B'
 * - belongsTo: null, 'A', or 'B'
 * - On each click, place piece for the current player.
 * - Then run a two-perspective BFS to see which cells
 *   each player can/cannot reach from the edges.
 * - If a cell is unreachable by B => belongs to A,
 *   if unreachable by A => belongs to B.
 *************************************************************/

// Board dimensions
const BOARD_SIZE = 10;

// Data structure for the board
// occupant is null, 'A', or 'B'
// belongsTo is null, 'A', or 'B' (who "controls" that empty space)
let board = Array.from({ length: BOARD_SIZE }, () =>
  Array.from({ length: BOARD_SIZE }, () => ({
    occupant: null,
    belongsTo: null,
  }))
);

// Keep track of current player
let currentPlayer = "A";

// Once DOM is loaded, build the board UI
window.addEventListener("DOMContentLoaded", () => {
  renderBoard();
});

/**
 * Render the board in the #board-container element.
 * We create rows and cells, each cell gets an event listener for clicks.
 */
function renderBoard() {
  const container = document.getElementById("board-container");
  container.innerHTML = ""; // Clear existing (if any)

  for (let row = 0; row < BOARD_SIZE; row++) {
    // Create a row div
    const rowDiv = document.createElement("div");
    rowDiv.classList.add("board-row");

    for (let col = 0; col < BOARD_SIZE; col++) {
      const cellDiv = document.createElement("div");
      cellDiv.classList.add("cell");

      const { occupant, belongsTo } = board[row][col];

      // Occupied cells
      if (occupant === "A") {
        cellDiv.classList.add("playerA");
        cellDiv.textContent = "A";
      } else if (occupant === "B") {
        cellDiv.classList.add("playerB");
        cellDiv.textContent = "B";
      } else {
        // Empty
        cellDiv.classList.add("empty");
        cellDiv.textContent = "";
        if (belongsTo === "A") {
          // Belongs to A
          cellDiv.classList.add("belongsToA");
        } else if (belongsTo === "B") {
          // Belongs to B
          cellDiv.classList.add("belongsToB");
        }
      }

      // On click, place a piece (if empty)
      cellDiv.addEventListener("click", () => {
        if (occupant === null) {
          placePiece(row, col);
        }
      });

      rowDiv.appendChild(cellDiv);
    }

    container.appendChild(rowDiv);
  }
}

/**
 * Place a piece for the current player, then run encapsulation checks.
 */
function placePiece(row, col) {
  board[row][col].occupant = currentPlayer;
  board[row][col].belongsTo = null; // reset any territory mark

  // Switch to the other player
  currentPlayer = currentPlayer === "A" ? "B" : "A";

  // Recalculate encapsulated areas
  checkEncapsulation();

  // Re-render
  renderBoard();
}

/**
 * Check for all encapsulated/trapped areas from each player's perspective:
 *  1. Create visitedByA + visitedByB to track cells each player can reach from the edges.
 *  2. BFS from all edge cells where occupant == player or occupant == null
 *     (for that player's perspective).
 *  3. For each cell occupant == null:
 *     - If not visited by B => belongsTo = 'A'
 *     - If not visited by A => belongsTo = 'B'
 *     - If unreachable by both => up to you (could belong to 'A' & 'B', or neither)
 */
function checkEncapsulation() {
  // Step 0: Clear all belongsTo flags
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      // If it's empty, reset belongsTo. We'll recalculate below
      if (board[r][c].occupant === null) {
        board[r][c].belongsTo = null;
      }
    }
  }

  // Step 1: Build visited arrays for each player
  let visitedByA = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => false)
  );
  let visitedByB = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => false)
  );

  // Step 2: BFS from edges for each player
  // For each edge cell, if passable by A => BFS fill visitedByA
  //                if passable by B => BFS fill visitedByB
  for (let row = 0; row < BOARD_SIZE; row++) {
    // Left edge
    checkAndFloodFill(row, 0, "A", visitedByA);
    checkAndFloodFill(row, 0, "B", visitedByB);
    // Right edge
    checkAndFloodFill(row, BOARD_SIZE - 1, "A", visitedByA);
    checkAndFloodFill(row, BOARD_SIZE - 1, "B", visitedByB);
  }
  for (let col = 0; col < BOARD_SIZE; col++) {
    // Top edge
    checkAndFloodFill(0, col, "A", visitedByA);
    checkAndFloodFill(0, col, "B", visitedByB);
    // Bottom edge
    checkAndFloodFill(BOARD_SIZE - 1, col, "A", visitedByA);
    checkAndFloodFill(BOARD_SIZE - 1, col, "B", visitedByB);
  }

  // Step 3: Decide belongsTo for each empty cell
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c].occupant === null) {
        const canAReach = visitedByA[r][c];
        const canBReach = visitedByB[r][c];

        // If B can't reach => belongs to A
        // If A can't reach => belongs to B
        // If both can't reach => you might label it differently if you want
        if (!canBReach && canAReach) {
          board[r][c].belongsTo = "A";
        }
        if (!canAReach && canBReach) {
          board[r][c].belongsTo = "B";
        }
        // If BOTH cannot reach => board[r][c].belongsTo = ??? (optional)
        // If BOTH can reach => null (belongs to no one)
      }
    }
  }
}

/**
 * Attempt a BFS flood fill for 'player' from (row,col) if it's passable.
 */
function checkAndFloodFill(row, col, player, visited) {
  if (!isInBounds(row, col)) return;

  // If passable by 'player' and not visited yet, do BFS.
  if (canPass(row, col, player) && !visited[row][col]) {
    floodFill(row, col, player, visited);
  }
}

/**
 * BFS for a given player's perspective.
 * 'player' can pass through occupant == null or occupant == player.
 */
function floodFill(startRow, startCol, player, visited) {
  let queue = [{ row: startRow, col: startCol }];
  visited[startRow][startCol] = true;

  while (queue.length > 0) {
    let { row, col } = queue.shift();

    // Explore neighbors
    const directions = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (let [dr, dc] of directions) {
      let nr = row + dr;
      let nc = col + dc;
      if (isInBounds(nr, nc) && !visited[nr][nc]) {
        if (canPass(nr, nc, player)) {
          visited[nr][nc] = true;
          queue.push({ row: nr, col: nc });
        }
      }
    }
  }
}

/**
 * Determine if (row,col) is passable for 'player':
 * occupant == null or occupant == player
 */
function canPass(r, c, player) {
  let occupant = board[r][c].occupant;
  return occupant === null || occupant === player;
}

/**
 * Check if (row,col) is within the board boundary
 */
function isInBounds(r, c) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}
