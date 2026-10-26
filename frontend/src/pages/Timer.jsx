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
  Target,
  Settings,
  Bell,
  Volume2,
  VolumeX
} from 'lucide-react';

const Timer = () => {
  const [session, setSession] = useState(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('focus'); // focus, short, long
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPersisted, setIsPersisted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const timerRef = useRef(null);
  const progressRef = useRef(0);
  const lastProgressRef = useRef(0);

  const MODES = {
    focus: { label: 'Deep Focus', duration: 25, accent: 'secondary', icon: Target },
    short: { label: 'Short Break', duration: 5, accent: 'tertiary', icon: Zap },
    long: { label: 'Long Break', duration: 15, accent: 'primary', icon: Bell },
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

    // Play completion sound
    if (soundEnabled) {
      playCompletionSound();
    }

    // Show notification
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`Opalite: ${MODES[mode].label} Complete`, {
        body: mode === 'focus' ? 'Neural sync archived. Ready for break protocol.' : 'Break complete. Ready for next cycle.',
        icon: '/favicon.ico',
      });
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

  const playCompletionSound = () => {
    // Create a pleasant completion tone using Web Audio API
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.2); // E5
    osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.4); // G5
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
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
  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
  const circumference = 2 * Math.PI * 160; // radius = 160
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 text-accent-primary"
          >
            <Clock className="w-12 h-12" />
          </motion.div>
          <p className="text-label-sm font-display font-bold uppercase tracking-widest text-fg-tertiary">Initializing Timer Core...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in animate-slide-up">
      {/* Timer Core */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="card p-8 md:p-12 relative overflow-hidden"
      >
        {/* Background decorative elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-accent-primary/5 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-accent-primary/10" />
        </div>

        {/* Mode Selector */}
        <div className="flex items-center justify-center gap-2 p-1.5 bg-bg-tertiary rounded-xl mb-8 relative z-10">
          {Object.entries(MODES).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <motion.button
                key={key}
                onClick={() => switchMode(key)}
                disabled={isActive}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-display text-label-sm font-semibold uppercase tracking-wider transition-all duration-fast
                  ${mode === key
                    ? 'bg-accent-primary text-fg-inverse shadow-elevation-2'
                    : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary'}
                  ${isActive && mode !== key ? 'opacity-50 cursor-not-allowed' : ''}`}
                whileHover={mode === key || !isActive ? { scale: 1.02 } : {}}
                whileTap={mode === key || !isActive ? { scale: 0.98 } : {}}
              >
                <Icon className="w-4 h-4" />
                <span>{config.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Main Timer Circle */}
        <div className="relative w-[360px] h-[360px] mx-auto mb-10 flex items-center justify-center">
          {/* Outer ambient ring */}
          <motion.div
            className="absolute inset-0 rounded-full border border-border-primary/50"
            animate={{ rotate: isActive ? 360 : 0 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />

          {/* Secondary ring */}
          <motion.div
            className="absolute inset-16 rounded-full border border-border-primary/30"
            animate={{ rotate: isActive ? -360 : 0 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          />

          {/* SVG Progress Ring */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 320 320">
            <defs>
              <linearGradient id="timerGradientPrimary" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--color-accent-secondary)" />
                <stop offset="100%" stopColor="var(--color-accent-tertiary)" />
              </linearGradient>
              <linearGradient id="timerGradientSecondary" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--color-accent-tertiary)" />
                <stop offset="100%" stopColor="var(--color-accent-primary)" />
              </linearGradient>
              <linearGradient id="timerGradientTertiary" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--color-accent-primary)" />
                <stop offset="100%" stopColor="var(--color-accent-secondary)" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background track */}
            <circle
              cx="160" cy="160" r="160"
              fill="none"
              stroke="var(--color-border-primary)"
              strokeWidth="8"
            />

            {/* Progress track */}
            <motion.circle
              cx="160" cy="160" r="160"
              fill="none"
              stroke={`url(#timerGradient${MODES[mode].accent.charAt(0).toUpperCase() + MODES[mode].accent.slice(1)})`}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ filter: isActive && progress > 0 ? 'url(#glow)' : 'none' }}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "linear" }}
              className="gpu-accelerated"
            />

            {/* Scanning line when active */}
            {isActive && (
              <motion.line
                x1="160" y1="160"
                x2="160" y2="20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className={`text-accent-${MODES[mode].accent} opacity-60`}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: totalTime, repeat: Infinity, ease: "linear" }}
                transformOrigin="160 160"
              />
            )}
          </svg>

          {/* Center Time Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={timeLeft}
                initial={{ opacity: 0.5, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0.5, scale: 1.05 }}
                transition={{ duration: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
                className="text-center"
              >
                <div className="font-display font-medium text-7xl md:text-9xl leading-none tracking-tight tabular-nums text-fg-primary font-mono">
                  {formatTime(timeLeft)}
                </div>
                <div className="mt-4 flex items-center justify-center gap-2 text-label-sm font-display font-bold uppercase tracking-widest text-accent-{MODES[mode].accent}">
                  <motion.div
                    animate={{ scale: isActive ? [1, 1.5, 1] : 1, opacity: isActive ? [0.5, 1, 0.5] : 1 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                    className="w-2 h-2 rounded-full bg-current"
                  />
                  Neural Sync: {MODES[mode].label}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Session indicator */}
            {session && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex items-center gap-2 px-4 py-2 bg-accent-primary-dim border border-accent-primary/30 rounded-full text-label-sm font-semibold text-accent-primary"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Session Active — Synced to Mission Control</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 md:gap-6 relative z-10">
          {/* Main Start/Pause Button */}
          <motion.button
            onClick={isActive ? () => setIsActive(false) : handleStart}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`w-24 h-24 md:w-28 md:h-28 rounded-2xl flex items-center justify-center shadow-elevation-3 transition-all duration-fast
              ${isActive
                ? 'bg-semantic-danger text-fg-inverse hover:shadow-[0_0_40px_var(--color-danger-dim)]'
                : 'bg-gradient-to-br from-accent-primary to-accent-tertiary text-fg-inverse hover:shadow-glow-primary'}`}
            aria-label={isActive ? 'Pause Cycle' : 'Start Cycle'}
          >
            {isActive ? (
              <Pause className="w-10 h-10 md:w-12 md:h-12 fill-current" />
            ) : (
              <Play className="w-10 h-10 md:w-12 md:h-12 fill-current ml-1" />
            )}
          </motion.button>

          {/* Reset Button */}
          <motion.button
            onClick={() => switchMode(mode)}
            disabled={timeLeft === totalTime && !isActive}
            whileHover={{ scale: 1.05, rotate: 180 }}
            whileTap={{ scale: 0.95 }}
            className="w-16 h-16 md:w-20 md:h-20 rounded-xl card-glass flex items-center justify-center text-fg-tertiary hover:text-fg-primary hover:border-border-secondary transition-all duration-fast disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Reset Cycle"
          >
            <RotateCcw className="w-6 h-6 md:w-7 md:h-7" />
          </motion.button>

          {/* Settings Button */}
          <motion.button
            onClick={() => {}}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-16 h-16 md:w-20 md:h-20 rounded-xl card-glass flex items-center justify-center text-fg-tertiary hover:text-fg-primary hover:border-border-secondary transition-all duration-fast"
            aria-label="Timer Settings"
          >
            <Settings className="w-6 h-6 md:w-7 md:h-7" />
          </motion.button>
        </div>

        {/* Sound/Notification Toggles */}
        <div className="mt-8 flex items-center justify-center gap-6 relative z-10">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-border-primary bg-bg-secondary text-accent-primary focus:ring-accent-primary/20"
            />
            <span className="text-label-sm text-fg-secondary">Completion Sound</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-border-primary bg-bg-secondary text-accent-primary focus:ring-accent-primary/20"
            />
            <span className="text-label-sm text-fg-secondary">Notifications</span>
          </label>
        </div>
      </motion.div>

      {/* History */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="card p-6 md:p-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent-secondary-dim border border-accent-secondary/30 flex items-center justify-center">
              <HistoryIcon className="w-6 h-6 text-accent-secondary" />
            </div>
            <div>
              <h2 className="text-heading-lg font-display font-bold uppercase tracking-wider text-fg-primary">Protocol History</h2>
              <p className="text-label-sm text-fg-tertiary uppercase tracking-tighter mt-1">Archived Neural Sync Sessions</p>
            </div>
          </div>
          {history.length > 6 && (
            <button className="btn-ghost text-label-sm whitespace-nowrap">
              View All
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <AnimatePresence mode="pop">
          {history.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="empty-state py-16"
            >
              <Clock className="empty-state-icon w-16 h-16" />
              <h3 className="empty-state-title">No Sessions Archived</h3>
              <p className="empty-state-description">Complete your first neural sync cycle to see history here.</p>
              <div className="empty-state-action">
                <motion.button
                  onClick={() => switchMode('focus')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-primary"
                >
                  Start First Cycle
                  <Play className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {history.slice(0, 9).map((h, i) => (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="card-hover p-5 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      h.status === 'completed'
                        ? 'bg-semantic-success-dim border border-semantic-success/30 text-semantic-success'
                        : 'bg-semantic-danger-dim border border-semantic-danger/30 text-semantic-danger'
                    }`}>
                      {h.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="font-display text-xl font-bold text-fg-primary tabular-nums">{h.duration_minutes}m</div>
                      <div className="text-label-sm text-fg-tertiary">
                        {new Date(h.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className={`text-label-sm font-display font-bold uppercase tracking-wider ${
                    h.status === 'completed' ? 'text-semantic-success' : 'text-semantic-danger'
                  }`}>
                    {h.status === 'completed' ? 'Synced' : 'Aborted'}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Timer;