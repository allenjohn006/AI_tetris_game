## 🎮 Smart AI Tetris

A modern Tetris game enhanced with a heuristic-search AI assistant that helps players learn smarter strategies.

Smart AI Tetris is a fully interactive Tetris clone built using React, Vite, and Tailwind CSS, featuring a clean UI and an integrated AI Helper.
The AI evaluates all possible moves (rotations + columns) using a heuristic scoring function and highlights the best possible placement.

Unlike auto-playing AIs, the player must still rotate and drop the piece themselves — making this a learning tool, not an autopilot.

## How the AI Helper Works

Every time a new piece appears (or the board changes), the AI:

1️⃣ Generates all rotations of the tetromino

0°, 90°, 180°, 270°

2️⃣ Simulates dropping each rotation in every column

It tries:

x = -2 → BOARD_WIDTH + 2

to allow moves near edges.

3️⃣ Measures board outcome using a heuristic:

score =
  linesCleared * 30
  - holes * 8
  - heights * 0.3;

This balances clearing lines, avoiding holes, and minimizing uneven towers.

4️⃣ Picks the placement with the best score

Then displays it as a single glowing green cell that marks the piece’s ideal landing center.

This encourages players to:

Learn better decision patterns

Reduce holes

Predict tower growth

Understand Tetris evaluation functions used in real bots

## Gameplay Controls

**Key**	   **Action**
← →	        Move left/right
↑ or Space	Rotate piece
↓	        Soft drop
Enter	    Hard drop
P	        Pause
T	        Toggle AI Helper
New Game 	Restart it

## Tech Stack

**Frontend:**
React 18
Vite
Tailwind CSS
Lucide Icons

**AI / Game Logic:**
Custom heuristic evaluation
Collision detection
Hard drop logic
Line-clearing system
Simulated rotations & placements