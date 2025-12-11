import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Play, Pause, RotateCw, Brain } from 'lucide-react';
import './App.css';

/* ----- Layout sizing: change these to tweak the narrow/tall board ----- */
const BOARD_WIDTH = 10;   // number of columns (unchanged)
const BOARD_HEIGHT = 20;  // number of rows (unchanged)

/* To make the board look HALF as wide and DOUBLE as tall visually,
   we use rectangular cells: BLOCK_W small (half of previous) and BLOCK_H large (double) */
const BLOCK_W = 30; // px (narrower)
const BLOCK_H = 30; // px (taller)

/* piece shapes & colors */
const SHAPES = {
  I: [[1,1,1,1]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1]],
  S: [[0,1,1],[1,1,0]],
  Z: [[1,1,0],[0,1,1]],
  J: [[1,0,0],[1,1,1]],
  L: [[0,0,1],[1,1,1]],
};

const COLORS = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000',
};

const createEmptyBoard = () => Array.from({length: BOARD_HEIGHT}, ()=> Array(BOARD_WIDTH).fill(null));
const rotateShape = (shape) => shape[0].map((_,i)=> shape.map(row=>row[i]).reverse());
const createNewPiece = () => {
  const keys = Object.keys(SHAPES);
  const t = keys[Math.floor(Math.random()*keys.length)];
  return { type: t, shape: SHAPES[t] };
};

export default function App(){
  const [board, setBoard] = useState(createEmptyBoard);
  const [currentPiece, setCurrentPiece] = useState(null);
  const [currentPos, setCurrentPos] = useState({x:3,y:-1});
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showAI, setShowAI] = useState(true);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const loopRef = useRef(null);

  const checkCollision = (piece,pos,b=board) => {
    for(let y=0;y<piece.shape.length;y++){
      for(let x=0;x<piece.shape[y].length;x++){
        if(piece.shape[y][x]){
          const nx = pos.x + x, ny = pos.y + y;
          if(nx < 0 || nx >= BOARD_WIDTH || ny >= BOARD_HEIGHT) return true;
          if(ny >= 0 && b[ny][nx]) return true;
        }
      }
    }
    return false;
  };

  const mergePiece = () => {
    const newB = board.map(r=>[...r]);
    for(let y=0;y<currentPiece.shape.length;y++){
      for(let x=0;x<currentPiece.shape[y].length;x++){
        if(currentPiece.shape[y][x]){
          const by = currentPos.y + y, bx = currentPos.x + x;
          if(by >= 0) newB[by][bx] = currentPiece.type;
        }
      }
    }
    // clear lines
    let cleared = 0;
    const filtered = newB.filter(r => {
      if(r.every(c=>c!==null)){ cleared++; return false; }
      return true;
    });
    while(filtered.length < BOARD_HEIGHT) filtered.unshift(Array(BOARD_WIDTH).fill(null));
    setBoard(filtered);
    if(cleared) setScore(s=> s + cleared*100);

    const np = createNewPiece();
    const start = { x: Math.floor(BOARD_WIDTH/2)-1, y: 0 };
    if(checkCollision(np, start, filtered)){
      setGameOver(true);
      clearInterval(loopRef.current);
      return;
    }
    setCurrentPiece(np);
    setCurrentPos(start);
    if(showAI) setAiSuggestion(findBestMove(np, filtered));
  };

  const findBestMove = useCallback((piece, curBoard) => {
    let best=null, bestScore=-Infinity;
    const rotations=[piece];
    let r=piece;
    for(let i=0;i<3;i++){ r = { ...r, shape: rotateShape(r.shape)}; rotations.push(r); }

    for(const rot of rotations){
      for(let x=-2;x<BOARD_WIDTH+2;x++){
        let y=-5;
        while(!checkCollision(rot,{x,y},curBoard)) y++;
        const land = y-1;
        if(land < -3) continue;
        // simulate
        const sim = curBoard.map(row=>[...row]);
        for(let py=0; py<rot.shape.length; py++){
          for(let px=0; px<rot.shape[py].length; px++){
            if(rot.shape[py][px]){
              const sy = land + py, sx = x + px;
              if(sy>=0 && sx>=0 && sx<BOARD_WIDTH && sy<BOARD_HEIGHT) sim[sy][sx] = rot.type;
            }
          }
        }
        const lines = sim.reduce((a,row)=> a + (row.every(c=>c!==null)?1:0), 0);
        let holes=0, heights=0;
        for(let cx=0; cx<BOARD_WIDTH; cx++){
          let found=false;
          for(let cy=0; cy<BOARD_HEIGHT; cy++){
            if(sim[cy][cx]) { if(!found){ heights += (BOARD_HEIGHT - cy); found=true; } }
            else if(found) holes++;
          }
        }
        const sc = lines*30 - holes*8 - heights*0.3;
        if(sc > bestScore){ bestScore = sc; best = { piece: rot, pos: { x: land, y: land } }; /* pos.x is not used later except center compute */ best = { piece: rot, pos: { x, y: land } }; }
      }
    }
    return best;
  }, [board]);

  const moveDown = useCallback(()=>{
    if(!currentPiece || isPaused || gameOver) return;
    const np = {...currentPos, y: currentPos.y + 1};
    if(checkCollision(currentPiece,np)) mergePiece();
    else setCurrentPos(np);
  }, [currentPiece, currentPos, isPaused, gameOver, board]);

  const moveLeft = ()=> { if(!currentPiece||isPaused||gameOver) return; const np={...currentPos,x:currentPos.x-1}; if(!checkCollision(currentPiece,np)) setCurrentPos(np); };
  const moveRight = ()=> { if(!currentPiece||isPaused||gameOver) return; const np={...currentPos,x:currentPos.x+1}; if(!checkCollision(currentPiece,np)) setCurrentPos(np); };
  const rotateCurrent = ()=> { if(!currentPiece||isPaused||gameOver) return; const rot = { ...currentPiece, shape: rotateShape(currentPiece.shape) }; if(!checkCollision(rot,currentPos)) setCurrentPiece(rot); };
  const hardDrop = ()=> { if(!currentPiece||isPaused||gameOver) return; let np={...currentPos}; while(!checkCollision(currentPiece,{...np,y:np.y+1})) np.y++; setCurrentPos(np); setTimeout(mergePiece,60); };

  useEffect(()=> {
    const onKey = (e) => {
      if(e.key === 'ArrowLeft') moveLeft();
      if(e.key === 'ArrowRight') moveRight();
      if(e.key === 'ArrowDown') moveDown();
      if(e.key === 'ArrowUp' || e.key === ' ') rotateCurrent();
      if(e.key === 'Enter') hardDrop();
      if(e.key === 'p') setIsPaused(v=>!v);
    };
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  });

  useEffect(()=>{
    if(!gameOver && !isPaused){
      if(loopRef.current) clearInterval(loopRef.current);
      loopRef.current = setInterval(moveDown, 700);
    }
    return ()=> clearInterval(loopRef.current);
  }, [moveDown, isPaused, gameOver]);

  useEffect(()=>{
    const first = createNewPiece();
    setCurrentPiece(first);
    setCurrentPos({ x: Math.floor(BOARD_WIDTH/2)-1, y: 0 });
    if(showAI) setAiSuggestion(findBestMove(first,board));
    // eslint-disable-next-line
  }, []);

  const renderBoard = () => {
    const disp = board.map(r=>[...r]);

    // single glowing center cell for AI suggestion
    if(showAI && aiSuggestion && !isPaused){
      const { piece, pos } = aiSuggestion;
      // compute center of piece
      let cx=0, cy=0, count=0;
      for(let y=0;y<piece.shape.length;y++){
        for(let x=0;x<piece.shape[y].length;x++){
          if(piece.shape[y][x]) { cx+=x; cy+=y; count++; }
        }
      }
      cx = Math.round(cx/count); cy = Math.round(cy/count);
      const gx = pos.x + cx;
      const gy = pos.y + cy;
      if(gy >= 0 && gy < BOARD_HEIGHT && gx >= 0 && gx < BOARD_WIDTH) disp[gy][gx] = 'AI';
    }

    // current piece overlay
    if(currentPiece){
      for(let y=0;y<currentPiece.shape.length;y++){
        for(let x=0;x<currentPiece.shape[y].length;x++){
          if(currentPiece.shape[y][x]){
            const by = currentPos.y + y, bx = currentPos.x + x;
            if(by>=0 && by<BOARD_HEIGHT && bx>=0 && bx<BOARD_WIDTH) disp[by][bx] = currentPiece.type;
          }
        }
      }
    }

    // render as grid (flat mapping)
    return (
      <div className="board-grid" style={{
        width: BLOCK_W*BOARD_WIDTH + 12, // + padding/border
        height: BLOCK_H*BOARD_HEIGHT + 12,
        gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${BLOCK_W}px)`,
        gridAutoRows: `${BLOCK_H}px`
      }}>
        {disp.flatMap((row, rIdx) =>
          row.map((cell, cIdx) => {
            const isAI = cell === 'AI';
            const color = cell && cell !== 'AI' ? COLORS[cell] : undefined;
            return (
              <div
                key={`${rIdx}-${cIdx}`}
                className={`board-cell ${isAI ? 'ai-cell' : ''}`}
                style={{
                  width: BLOCK_W,
                  height: BLOCK_H,
                  backgroundColor: !isAI && color ? color : undefined
                }}
              />
            );
          })
        )}
      </div>
    );
  };

  const startNew = () => {
    setBoard(createEmptyBoard());
    const p = createNewPiece();
    setCurrentPiece(p);
    setCurrentPos({ x: Math.floor(BOARD_WIDTH/2)-1, y: 0 });
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    if(showAI) setAiSuggestion(findBestMove(p, createEmptyBoard()));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-start justify-center py-12 px-6">
      <div className="max-w-6xl w-full">
        <div className="bg-gray-800/95 rounded-2xl p-8 shadow-2xl grid grid-cols-12 gap-8 items-start">
          {/* LEFT: board */}
          {/* LEFT: board (with Game Over overlay) */}
<div className="col-span-5 flex justify-center">
  <div className="board-card p-3 bg-black rounded-lg shadow-inner relative">
    {/* Board rendering */}
    {renderBoard()}

    {/* Game Over overlay */}
    {gameOver && (
      <div className="game-over-overlay">
        <div className="game-over-panel">
          <h2 className="game-over-title">Game Over</h2>
          <p className="game-over-score">Final Score: {score}</p>
          <div className="game-over-buttons">
            <button
              className="game-over-btn"
              onClick={() => {
                // reset using your existing startNew function (or modify if different)
                startNew();
              }}
            >
              New Game
            </button>
            <button
              className="game-over-btn secondary"
              onClick={() => {
                // just clear gameOver so user can inspect the board (optional)
                // if you prefer not to provide this, remove this button block
                // and only keep New Game above.
                // setGameOver(false); // uncomment if desired
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
</div>


          {/* RIGHT: controls (all text white) */}
          <div className="col-span-7 text-white">
            <div className="flex items-start justify-between mb-6">
              <h1 className="text-4xl font-extrabold text-white">Smart AI Tetris</h1>
              <div className="text-yellow-400 font-bold text-2xl">Score: {score}</div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gray-700 rounded-xl p-5 text-sm text-gray-100">
                <h3 className="font-semibold text-white mb-2">Controls</h3>
                <div className="text-gray-200 leading-6 text-white">
                  <div>← → Move</div>
                  <div>↑ / Space: Rotate</div>
                  <div>↓ Soft Drop</div>
                  <div>Enter: Hard Drop</div>
                </div>
              </div>

              {/* Buttons row: each button is half width of the sidebar and taller */}
              <div className="flex flex-wrap gap-3">
                {/* 1 - light green */}
                <button onClick={() => { setShowAI(s => !s); if(showAI && currentPiece) setAiSuggestion(findBestMove(currentPiece, board)); }}
                  className="btn-short py-4 bg-emerald-400 text-white font-semibold">
                  <Brain size={18}/> AI Helper {showAI ? 'ON' : 'OFF'}
                </button>

                {/* 2 - blue */}
                <button onClick={() => setIsPaused(p => !p)} className="btn-short py-4 bg-blue-500 text-white font-semibold">
                  {isPaused ? <Play size={18}/> : <Pause size={18}/>} {isPaused ? 'Resume' : 'Pause'}
                </button>

                {/* 3 - purple */}
                <button onClick={rotateCurrent} className="btn-short py-4 bg-purple-600 text-white font-semibold">
                  <RotateCw size={18}/> Rotate
                </button>

                {/* 4 - darker green */}
                <button onClick={startNew} className="btn-short py-4 bg-emerald-700 text-white font-semibold">
                  New Game
                </button>
              </div>

              <div className="bg-emerald-900 rounded-xl p-4 text-emerald-100">
                <div className="flex items-center gap-3 mb-1">
                  <Brain size={18} /> <span className="font-bold">AI Suggestion</span>
                </div>
                <p className="text-sm text-emerald-200">The glowing green box marks the single target position recommended by the AI. Rotate/move your piece to match the angle.</p>
              </div>

              <div className="flex gap-3 mt-2">
                <button onClick={hardDrop} className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold">Drop</button>
                <button onClick={() => setIsPaused(true)} className="py-2 px-4 rounded-lg bg-neutral-700 text-white font-semibold">Pause</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
