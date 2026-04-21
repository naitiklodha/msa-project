import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Save, RefreshCcw } from 'lucide-react';
import { gameAPI } from '../api';

const GRID_SIZE = 15;
const INITIAL_SNAKE = [{ x: 7, y: 7 }, { x: 7, y: 8 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const SPEED = 150;

const GameSnake = ({ onBack }) => {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [running, setRunning] = useState(false);

  const directionRef = useRef(direction);

  const generateFood = (currentSnake) => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      if (!currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
        break;
      }
    }
    return newFood;
  };

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    setFood(generateFood(INITIAL_SNAKE));
    setScore(0);
    setGameOver(false);
    setSaved(false);
    setRunning(true);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameOver) return;
      if (!running) setRunning(true);

      const currentDir = directionRef.current;
      switch (e.key) {
        case 'ArrowUp':
          if (currentDir.y === 0) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
          if (currentDir.y === 0) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
          if (currentDir.x === 0) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
          if (currentDir.x === 0) setDirection({ x: 1, y: 0 });
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, running]);

  useEffect(() => {
    if (gameOver || !running) return;

    const moveSnake = () => {
      setSnake(prev => {
        const newSnake = [...prev];
        const head = { ...newSnake[0] };
        const currentDir = directionRef.current;
        head.x += currentDir.x;
        head.y += currentDir.y;

        // Collision with walls
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setGameOver(true);
          setRunning(false);
          return prev;
        }

        // Collision with self
        if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
          setGameOver(true);
          setRunning(false);
          return prev;
        }

        newSnake.unshift(head);

        // Check food collision
        if (head.x === food.x && head.y === food.y) {
          setScore(s => s + 10);
          setFood(generateFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const intervalId = setInterval(moveSnake, SPEED);
    return () => clearInterval(intervalId);
  }, [food, gameOver, running]);

  const handleSaveScore = async () => {
    if (saving || saved || score === 0) return;
    setSaving(true);
    try {
      await gameAPI.minigame('snake', score);
      setSaved(true);
      setTimeout(() => onBack(), 1500);
    } catch (err) {
      console.error('Failed to save score', err);
      alert('Failed to sync score to Leaderboard.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass p-8 max-w-md mx-auto aurora-border flex flex-col items-center"
    >
      <div className="w-full flex justify-between items-center mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-white">Neural <span className="text-pulse-mint">Snake</span></h2>
          <p className="font-body text-xs text-gray-400">Arrow keys to navigate</p>
        </div>
        <div className="text-right">
          <div className="bg-cosmos-900 border border-white/10 px-4 py-2 rounded-xl">
            <div className="text-[10px] font-display font-bold uppercase text-gray-500">Score</div>
            <div className="font-display text-xl font-bold text-pulse-mint">{score}</div>
          </div>
        </div>
      </div>

      <div className="bg-cosmos-950 p-[2px] rounded-sm relative" style={{ width: '310px', height: '310px' }}>
        {!running && !gameOver && score === 0 && (
          <div className="absolute inset-0 bg-cosmos-950/80 backdrop-blur-sm z-10 flex items-center justify-center cursor-pointer" onClick={resetGame}>
            <span className="font-display font-bold uppercase text-pulse-cyan hover:scale-110 transition-transform">Click or press Arrow to Start</span>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 bg-cosmos-950/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <h3 className="font-display text-2xl font-bold text-pulse-rose mb-4 uppercase">CRASHED</h3>
            <div className="flex gap-4">
              <button 
                onClick={resetGame}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-colors"
              >
                <RefreshCcw className="w-5 h-5" />
              </button>
              <button 
                onClick={handleSaveScore}
                disabled={saving || saved || score === 0}
                className="flex items-center gap-2 px-6 py-3 bg-pulse-mint text-cosmos-950 font-display font-bold uppercase rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                {saved ? <Trophy className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                {saved ? 'Logged.' : saving ? 'Transmitting...' : 'Upload Score'}
              </button>
            </div>
          </div>
        )}

        <div 
          className="grid gap-[2px] bg-cosmos-900 border border-white/5 h-full w-full"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)` }}
        >
          {Array(GRID_SIZE * GRID_SIZE).fill(0).map((_, i) => {
            const x = i % GRID_SIZE;
            const y = Math.floor(i / GRID_SIZE);
            const isSnake = snake.some(s => s.x === x && s.y === y);
            const isHead = snake[0].x === x && snake[0].y === y;
            const isFood = food.x === x && food.y === y;

            return (
              <div 
                key={i} 
                className={`
                  ${isHead ? 'bg-pulse-cyan drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 
                    isSnake ? 'bg-pulse-mint border border-cosmos-950/20' : 
                    isFood ? 'bg-pulse-amber rounded-full scale-75 drop-shadow-[0_0_5px_rgba(245,158,11,1)]' : 
                    'bg-cosmos-950/50'}
                `}
              ></div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex justify-center w-full">
        <button onClick={onBack} className="btn-ghost w-full">Back to Control Console</button>
      </div>
    </motion.div>
  );
};

export default GameSnake;
