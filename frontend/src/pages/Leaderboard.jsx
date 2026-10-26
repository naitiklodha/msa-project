import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { leaderboardAPI } from '../api';
import { io } from 'socket.io-client';
import { wsBaseUrl } from '../config';
import {
  Trophy,
  Medal,
  TrendingUp,
  Users,
  Crown,
  Search,
  Filter,
  Loader2,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const Leaderboard = () => {
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const { data } = await leaderboardAPI.global();
        setBoard(data.leaderboard || []);
      } catch (err) {
        console.error('Failed to fetch leaderboard', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBoard();

    const socket = io(wsBaseUrl, { path: '/ws/leaderboard' });

    socket.on('leaderboard_update', (update) => {
      setBoard(update.leaderboard || update || []);
    });

    return () => socket.disconnect();
  }, []);

  const filteredBoard = board.filter(entry =>
    entry.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRankStyle = (index) => {
    switch (index) {
      case 0: return 'bg-gradient-to-tr from-accent-secondary to-accent-primary text-fg-inverse shadow-glow-secondary';
      case 1: return 'bg-gradient-to-tr from-fg-tertiary to-fg-secondary text-fg-inverse shadow-elevation-2';
      case 2: return 'bg-gradient-to-tr from-accent-tertiary to-accent-secondary text-fg-inverse shadow-glow-tertiary';
      default: return 'bg-bg-tertiary text-fg-tertiary border border-border-primary';
    }
  };

  const getMedal = (index) => {
    if (index === 0) return <Crown className="w-5 h-5" />;
    if (index === 1 || index === 2) return <Medal className="w-5 h-5" />;
    return null;
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in animate-slide-up">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-display-lg font-display font-medium tracking-tight text-fg-primary"
          >
            High Frequency Command
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-body-md text-fg-secondary"
          >
            Real-time sync of the top global focus architectures.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-tertiary focus-within:text-accent-primary transition-colors" />
            <input
              type="text"
              placeholder="Search Signatures..."
              className="input pl-11 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search commanders"
            />
          </div>
          <button className="btn-icon text-fg-tertiary hover:text-fg-primary hover:border-border-secondary" aria-label="Filter">
            <Filter className="w-5 h-5" />
          </button>
        </motion.div>
      </header>

      {/* Top 3 Podium */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1, delayChildren: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-end"
      >
        {board.slice(0, 3).map((entry, i) => {
          const order = [1, 0, 2];
          const index = order[i];
          const podiumEntry = board[index];
          if (!podiumEntry) return null;

          return (
            <motion.div
              key={podiumEntry.userId || index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex flex-col items-center gap-4 ${index === 0 ? 'order-2 md:-translate-y-8 md:scale-110' : index === 1 ? 'order-1' : 'order-3'}`}
            >
              <div className="relative">
                <div className={`w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center p-1.5 ${getRankStyle(index)}`}>
                  <div className="w-full h-full rounded-full bg-bg-primary flex items-center justify-center overflow-hidden border-2 border-bg-primary shadow-elevation-2">
                    <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${podiumEntry.email}`} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className={`absolute -bottom-3 -right-3 w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-label-sm ${getRankStyle(index)}`}>
                  <span>{index + 1}</span>
                </div>
              </div>
              <div className="text-center relative z-10">
                <h3 className="font-display font-bold text-fg-primary line-clamp-1 max-w-[150px] uppercase tracking-wider">{podiumEntry.email.split('@')[0]}</h3>
                <div className="font-display text-3xl md:text-4xl font-bold text-accent-primary drop-shadow-[0_0_15px_var(--color-accent-primary-dim)]">{podiumEntry.score}<span className="text-label-sm ml-1 text-fg-tertiary font-bold">Flux</span></div>
              </div>
              <div className={`w-full h-2 rounded-t-xl opacity-30 ${index === 0 ? 'bg-accent-secondary' : index === 1 ? 'bg-fg-tertiary' : 'bg-accent-tertiary'}`}></div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Main List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card overflow-hidden"
      >
        <div className="grid grid-cols-12 px-4 py-4 border-b border-border-primary font-display text-label-sm font-bold uppercase tracking-wider text-fg-tertiary">
          <div className="col-span-1 text-center">Rank</div>
          <div className="col-span-7 pl-6">Commander Signature</div>
          <div className="col-span-4 text-right pr-6 text-accent-primary">Accumulated Flux</div>
        </div>

        <div className="divide-y divide-border-primary/50">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 gap-4"
            >
              <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
              <span className="text-label-sm font-display text-fg-tertiary uppercase tracking-wider animate-pulse">Compiling Global Signal...</span>
            </motion.div>
          ) : filteredBoard.length > 0 ? (
            filteredBoard.map((entry, i) => (
              <motion.div
                key={entry.userId || i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`grid grid-cols-12 items-center px-4 py-4 hover:bg-bg-tertiary/50 transition-colors ${entry.userId === 'current_user_placeholder_to_do' ? 'bg-accent-primary-dim/30' : ''}`}
              >
                <div className="col-span-1 flex justify-center">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-label-sm ${getRankStyle(i)}`}>
                    {getMedal(i) || (i + 1)}
                  </div>
                </div>
                <div className="col-span-7 flex items-center gap-4 pl-6">
                  <div className="w-10 h-10 rounded-xl bg-bg-tertiary border border-border-primary overflow-hidden group-hover:scale-110 transition-transform">
                    <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${entry.email}`} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-display font-semibold text-fg-primary block truncate">{entry.email}</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <TrendingUp className="w-3.5 h-3.5 text-accent-tertiary" />
                      <span className="text-label-sm font-body text-fg-tertiary">Active Frequency</span>
                    </div>
                  </div>
                </div>
                <div className="col-span-4 text-right pr-6">
                  <span className="font-display text-xl font-bold text-fg-primary group-hover:text-accent-primary transition-colors">{entry.score}</span>
                  <span className="text-label-sm font-display text-fg-tertiary ml-1 uppercase tracking-tighter">Flux</span>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 text-center"
            >
              <Search className="w-12 h-12 mx-auto mb-4 text-fg-tertiary/30" />
              <p className="text-body-md text-fg-tertiary italic">Search result null. No signatures found in this sector.</p>
            </motion.div>
          )}
        </div>

        <div className="px-4 py-4 border-t border-border-primary bg-bg-secondary/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-fg-tertiary" />
            <span className="text-label-sm font-body text-fg-secondary">Tracking <strong className="text-fg-primary">{board.length}</strong> Commanders globally.</span>
          </div>
          <button className="btn-outline whitespace-nowrap">
            View My Sector
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Leaderboard;