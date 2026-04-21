import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy, RefreshCcw, Save } from 'lucide-react';
import { gameAPI } from '../api';

const GRID_SIZE = 4;

const initializeGrid = () => {
  const grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
  addRandomTile(grid);
  addRandomTile(grid);
  return grid;
};

const addRandomTile = (grid) => {
  const emptyCells = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 0) {
        emptyCells.push({ r, c });
      }
    }
  }
  if (emptyCells.length > 0) {
    const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }
};

const Game2048 = ({ onBack }) => {
  const [grid, setGrid] = useState(initializeGrid());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Core move logic
  const move = useCallback((direction) => {
    if (gameOver) return;
    
    let newGrid = JSON.parse(JSON.stringify(grid));
    let moved = false;
    let addedScore = 0;

    const transpose = (matrix) => matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
    const reverse = (matrix) => matrix.map(row => [...row].reverse());

    if (direction === 'Up' || direction === 'Down') {
      newGrid = transpose(newGrid);
    }
    if (direction === 'Right' || direction === 'Down') {
      newGrid = reverse(newGrid);
    }

    // Process rows
    for (let i = 0; i < GRID_SIZE; i++) {
      let row = newGrid[i].filter(cell => cell !== 0);
      for (let j = 0; j < row.length - 1; j++) {
        if (row[j] === row[j + 1]) {
          row[j] *= 2;
          addedScore += row[j];
          row.splice(j + 1, 1);
        }
      }
      while (row.length < GRID_SIZE) row.push(0);
      if (JSON.stringify(newGrid[i]) !== JSON.stringify(row)) {
        moved = true;
      }
      newGrid[i] = row;
    }

    if (direction === 'Right' || direction === 'Down') {
      newGrid = reverse(newGrid);
    }
    if (direction === 'Up' || direction === 'Down') {
      newGrid = transpose(newGrid);
    }

    if (moved) {
      addRandomTile(newGrid);
      setGrid(newGrid);
      setScore(prev => prev + addedScore);
      
      // Check game over (simplified)
      let isOver = true;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (newGrid[r][c] === 0) isOver = false;
          if (c < GRID_SIZE - 1 && newGrid[r][c] === newGrid[r][c + 1]) isOver = false;
          if (r < GRID_SIZE - 1 && newGrid[r][c] === newGrid[r + 1][c]) isOver = false;
        }
      }
      if (isOver) {
        setGameOver(true);
      }
    }
  }, [grid, gameOver]);

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp': move('Up'); break;
        case 'ArrowDown': move('Down'); break;
        case 'ArrowLeft': move('Left'); break;
        case 'ArrowRight': move('Right'); break;
        default: return;
      }
      // e.preventDefault(); // allow scrolling unless playing heavily, but block specifically for game UI
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  const handleSaveScore = async () => {
    if (saving || saved || score === 0) return;
    setSaving(true);
    try {
      await gameAPI.minigame('2048', score);
      setSaved(true);
      setTimeout(() => onBack(), 1500); // go back to dashboard
    } catch (err) {
      console.error('Failed to save score', err);
      alert('Failed to sync score to Leaderboard.');
    } finally {
      setSaving(false);
    }
  };

  const getTileColor = (val) => {
    const colors = {
      0: 'bg-cosmos-900 border-white/5',
      2: 'bg-cosmos-800 text-gray-300 border-pulse-cyan/20',
      4: 'bg-cosmos-700 text-gray-200 border-pulse-cyan/30',
      8: 'bg-pulse-cyan/20 text-pulse-cyan border-pulse-cyan/40',
      16: 'bg-pulse-cyan/40 text-pulse-cyan border-pulse-cyan',
      32: 'bg-pulse-mint/30 text-pulse-mint border-pulse-mint',
      64: 'bg-pulse-mint/50 text-pulse-mint font-bold',
      128: 'bg-yellow-500/40 text-yellow-500 font-bold',
      256: 'bg-yellow-500/60 text-yellow-500 font-bold',
      512: 'bg-pulse-amber/60 text-pulse-amber font-black drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]',
      1024: 'bg-pulse-rose/60 text-pulse-rose font-black drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]',
      2048: 'bg-gradient-to-tr from-pulse-cyan to-pulse-rose text-white font-black drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]'
    };
    return colors[val] || 'bg-white text-black font-black';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass p-8 max-w-md mx-auto aurora-border flex flex-col items-center"
    >
      <div className="w-full flex justify-between items-center mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-white">2048 <span className="text-pulse-cyan">Pulse</span></h2>
          <p className="font-body text-xs text-gray-400">Arrow keys to merge tiles</p>
        </div>
        <div className="text-right">
          <div className="bg-cosmos-900 border border-white/10 px-4 py-2 rounded-xl">
            <div className="text-[10px] font-display font-bold uppercase text-gray-500">Score</div>
            <div className="font-display text-xl font-bold text-pulse-mint">{score}</div>
          </div>
        </div>
      </div>

      <div className="bg-cosmos-950 p-3 rounded-2xl border border-white/5 relative">
        {gameOver && (
          <div className="absolute inset-0 bg-cosmos-950/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-2xl">
            <h3 className="font-display text-2xl font-bold text-pulse-rose mb-4 uppercase">Grid Locked</h3>
            <div className="flex gap-4">
              <button 
                onClick={() => { setGrid(initializeGrid()); setScore(0); setGameOver(false); setSaved(false); }}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-colors"
              >
                <RefreshCcw className="w-5 h-5" />
              </button>
              <button 
                onClick={handleSaveScore}
                disabled={saving || saved || score === 0}
                className="flex items-center gap-2 px-6 py-3 bg-pulse-cyan text-cosmos-950 font-display font-bold uppercase rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                {saved ? <Trophy className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                {saved ? 'Logged.' : saving ? 'Transmitting...' : 'Upload Score'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-3 bg-cosmos-900/50 p-3 rounded-xl border border-white/5">
          {grid.map((row, rConfig) => 
            row.map((cell, cConfig) => (
              <motion.div 
                key={`${rConfig}-${cConfig}`}
                layout
                className={`flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl border ${getTileColor(cell)} transition-colors duration-200`}
              >
                <motion.span 
                  key={cell}
                  initial={{ scale: 0 }}
                  animate={{ scale: cell === 0 ? 0 : 1 }}
                  className="font-display text-xl sm:text-2xl"
                >
                  {cell !== 0 ? cell : ''}
                </motion.span>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-center w-full">
        <button onClick={onBack} className="btn-ghost w-full">Back to Control Console</button>
      </div>
    </motion.div>
  );
};

export default Game2048;
