import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { timerAPI } from '../api';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  History as HistoryIcon, 
  CheckCircle2, 
  XCircle,
  Clock,
  Zap,
  Target
} from 'lucide-react';

const Timer = () => {
  const [session, setSession] = useState(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('focus'); // focus, short, long
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPersisted, setIsPersisted] = useState(false);
  const timerRef = useRef(null);

  const MODES = {
    focus: { label: 'Deep Focus', duration: 25, color: 'text-pulse-cyan', glow: 'shadow-pulse-cyan' },
    short: { label: 'Short Break', duration: 5, color: 'text-pulse-mint', glow: 'shadow-pulse-mint' },
    long: { label: 'Long Break', duration: 15, color: 'text-pulse-amber', glow: 'shadow-pulse-amber' }
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const historyRes = await timerAPI.history();
        setHistory(historyRes.data.sessions || []);
      } catch (err) {
        console.error('Failed to fetch history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
 
    // Recovery Logic: Restore from localStorage
    const saved = localStorage.getItem('fp_timer_session');
    if (saved) {
        const { timeLeft: savedTime, mode: savedMode, session: savedSession, lastUpdate } = JSON.parse(saved);
        const elapsed = Math.floor((Date.now() - lastUpdate) / 1000);
        
        setMode(savedMode);
        setSession(savedSession);
        
        if (savedTime - elapsed > 0) {
            setTimeLeft(savedTime - elapsed);
            setIsActive(true);
        } else {
            setTimeLeft(0);
            setIsActive(false);
        }
    }
    setIsPersisted(true);
  }, []);

  // Save current state to handle refreshes
  useEffect(() => {
    if (!isPersisted) return;
    if (isActive) {
        const timerData = {
            timeLeft,
            mode,
            session,
            lastUpdate: Date.now()
        };
        localStorage.setItem('fp_timer_session', JSON.stringify(timerData));
    } else if (timeLeft === (MODES[mode].duration * 60)) {
        localStorage.removeItem('fp_timer_session');
    }
  }, [timeLeft, mode, session, isActive, isPersisted]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleComplete();
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft]);

  const handleStart = async () => {
    if (mode === 'focus') {
        try {
            const { data } = await timerAPI.start(MODES[mode].duration);
            setSession(data);
        } catch (err) {
            console.error('Failed to sync with mission control', err);
        }
    }
    setIsActive(true);
  };

  const handleComplete = async () => {
    if (mode === 'focus') {
        try {
            if (session?.id) await timerAPI.complete(session.id);
            const historyRes = await timerAPI.history();
            setHistory(historyRes.data.sessions || []);
        } catch (err) {
            console.error('Failed to archive session', err);
        }
    }
    
    // Auto-progress
    if (mode === 'focus') {
        switchMode('short');
    } else {
        switchMode('focus');
    }
    setSession(null);
    localStorage.removeItem('fp_timer_session');
  };

  const switchMode = (newMode) => {
    setIsActive(false);
    setMode(newMode);
    setTimeLeft(MODES[newMode].duration * 60);
    setSession(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalTime = MODES[mode].duration * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Clock className="w-12 h-12 text-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="flex flex-col items-center justify-center p-12 glass-premium relative overflow-hidden">
        {/* Orbital Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/[0.02] rounded-full pointer-events-none" />

        <div className="flex gap-4 p-1.5 glass-premium bg-cosmos-950/50 mb-16 relative z-10">
            {Object.entries(MODES).map(([key, config]) => (
                <button
                    key={key}
                    onClick={() => switchMode(key)}
                    className={`px-6 py-2.5 rounded-2xl font-display text-[10px] font-bold uppercase tracking-[0.2em] transition-all
                                ${mode === key ? 'bg-white text-cosmos-950 shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    {config.label}
                </button>
            ))}
        </div>

        <div className="relative w-96 h-96 flex items-center justify-center mb-16">
            <svg className="absolute w-full h-full -rotate-90">
                <circle
                    cx="192"
                    cy="192"
                    r="180"
                    fill="none"
                    stroke="rgba(255,255,255,0.03)"
                    strokeWidth="12"
                />
                <motion.circle
                    cx="192"
                    cy="192"
                    r="180"
                    fill="none"
                    stroke={mode === 'focus' ? "url(#pulseGradient)" : "currentColor"}
                    className={mode !== 'focus' ? MODES[mode].color : ''}
                    strokeWidth="12"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "1131", strokeDashoffset: "1131" }}
                    animate={{ strokeDashoffset: 1131 - (1131 * progress) / 100 }}
                    transition={{ duration: 1, ease: "linear" }}
                />
                <defs>
                    <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                </defs>
            </svg>

            <div className="text-center relative z-10 transition-all duration-500">
                <motion.div 
                    key={timeLeft}
                    initial={{ opacity: 0.5, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="font-display text-[100px] font-bold leading-none tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                >
                    {formatTime(timeLeft)}
                </motion.div>
                <div className={`stat-label mt-4 tracking-[0.4em] ${MODES[mode].color} font-black uppercase text-[10px]`}>
                    <span className="inline-block w-2 h-2 rounded-full bg-current mr-2 animate-pulse" />
                    Neural Sync: {mode}
                </div>
            </div>

            {/* Scanning Effect Overlay */}
            {isActive && (
                <motion.div 
                    initial={{ top: '10%' }}
                    animate={{ top: '90%' }}
                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                    className={`absolute left-0 right-0 h-px bg-current opacity-20 z-20 ${MODES[mode].color}`}
                />
            )}
        </div>

        <div className="flex items-center gap-8 relative z-10">
            <button 
                onClick={() => setIsActive(!isActive)}
                className="w-24 h-24 rounded-3xl bg-white text-cosmos-950 flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:scale-105 transition-all"
            >
                {isActive ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
            </button>
            <button 
                onClick={() => switchMode(mode)}
                className="w-16 h-16 rounded-2xl glass-premium flex items-center justify-center text-gray-500 hover:text-white"
            >
                <RotateCcw className="w-6 h-6" />
            </button>
        </div>
      </div>

      <div className="glass-premium p-10">
        <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                    <HistoryIcon className="w-6 h-6 text-pulse-cyan" />
                </div>
                <div>
                     <h2 className="text-xl font-display font-bold uppercase tracking-widest">Protocol History</h2>
                     <p className="text-xs text-gray-500 uppercase tracking-tighter mt-1">Archived Neural Sync Sessions</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {history.slice(0, 6).map((h) => (
                <div key={h.id} className="p-6 glass-premium border-white/5 bg-white/[0.02] flex items-center justify-between group">
                    <div>
                        <div className="font-display text-2xl font-bold text-white mb-1">{h.duration_minutes}m</div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                            {new Date(h.started_at).toLocaleDateString()}
                        </div>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${h.status === 'completed' ? 'bg-pulse-mint/10 text-pulse-mint' : 'bg-pulse-rose/10 text-pulse-rose'}`}>
                        {h.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Timer;
