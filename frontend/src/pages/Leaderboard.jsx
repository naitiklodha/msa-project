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
  Loader2
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
      case 0: return 'bg-gradient-to-tr from-yellow-400 to-amber-600 text-cosmos-950 shadow-[0_0_20px_rgba(245,158,11,0.3)]';
      case 1: return 'bg-gradient-to-tr from-gray-300 to-gray-500 text-cosmos-950 shadow-[0_0_20px_rgba(156,163,175,0.3)]';
      case 2: return 'bg-gradient-to-tr from-amber-600 to-orange-800 text-cosmos-950 shadow-[0_0_20px_rgba(180,83,9,0.3)]';
      default: return 'bg-cosmos-800 text-gray-400 border border-white/5';
    }
  };

  const getMedal = (index) => {
    if (index === 0) return <Crown className="w-5 h-5" />;
    if (index === 1 || index === 2) return <Medal className="w-5 h-5" />;
    return null;
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-white tracking-tight uppercase">High Frequency Command</h1>
          <p className="font-body text-gray-400 text-sm">Real-time sync of the top global focus architectures.</p>
        </div>

        <div className="flex gap-4">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-pulse-cyan transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search Signatures..."
                    className="input-field pl-11 py-2 text-xs w-64 bg-cosmos-900/50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <button className="p-2 glass-interactive rounded-xl text-gray-400 hover:text-white">
                <Filter className="w-5 h-5" />
            </button>
        </div>
      </header>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end pt-12">
        {board.slice(0, 3).map((entry, i) => {
            const order = [1, 0, 2]; // Center top 1, left 2, right 3
            const index = order[i];
            const podiumEntry = board[index];
            if (!podiumEntry) return null;

            return (
                <motion.div
                    key={podiumEntry.userId || index}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex flex-col items-center gap-4 ${index === 0 ? 'order-2 scale-110 -translate-y-4' : index === 1 ? 'order-1' : 'order-3'}`}
                >
                    <div className="relative">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center p-1 bg-gradient-to-tr ${index === 0 ? 'from-yellow-400 to-amber-600' : index === 1 ? 'from-gray-300 to-gray-500' : 'from-amber-700 to-orange-900'}`}>
                            <div className="w-full h-full rounded-full bg-cosmos-950 flex items-center justify-center overflow-hidden border-2 border-cosmos-950">
                                <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${podiumEntry.email}`} alt="avatar" />
                            </div>
                        </div>
                        <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-lg flex items-center justify-center ${getRankStyle(index)}`}>
                            <span className="font-display font-bold text-xs">{index + 1}</span>
                        </div>
                    </div>
                    <div className="text-center relative z-10">
                        <h3 className="font-display font-bold text-white line-clamp-1 max-w-[150px] uppercase tracking-wider">{podiumEntry.email.split('@')[0]}</h3>
                        <div className="font-display text-3xl font-black text-pulse-cyan drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">{podiumEntry.score}<span className="text-[10px] ml-1 uppercase text-gray-500 font-bold">Flux</span></div>
                    </div>
                    <div className={`w-full h-2 rounded-t-xl opacity-20 ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-400' : 'bg-amber-800'}`}></div>
                </motion.div>
            );
        })}
      </div>

      {/* Main List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass overflow-hidden"
      >
        <div className="grid grid-cols-12 p-4 border-b border-white/5 font-display text-[10px] font-bold uppercase tracking-widest text-gray-500">
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-7 pl-6">Commander Signature</div>
            <div className="col-span-4 text-right pr-6 text-pulse-cyan">Accumulated Flux</div>
        </div>

        <div className="divide-y divide-white/[0.03]">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-8 h-8 text-pulse-cyan animate-spin" />
                    <span className="text-[10px] font-display text-gray-500 uppercase tracking-[0.3em] animate-pulse">Compiling Global Signal...</span>
                </div>
            ) : filteredBoard.length > 0 ? (
                filteredBoard.map((entry, i) => (
                    <motion.div 
                        key={entry.userId || i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`grid grid-cols-12 items-center p-4 hover:bg-white/[0.02] transition-all group ${entry.userId === 'current_user_placeholder_to_do' ? 'bg-pulse-cyan/[0.03]' : ''}`}
                    >
                        <div className="col-span-1 flex justify-center">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-xs ${getRankStyle(i)}`}>
                                {getMedal(i) || (i + 1)}
                            </div>
                        </div>
                        <div className="col-span-7 flex items-center gap-4 pl-6">
                            <div className="w-10 h-10 rounded-xl bg-cosmos-800 border border-white/5 overflow-hidden group-hover:scale-110 transition-transform">
                                <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${entry.email}`} alt="avatar" />
                            </div>
                            <div>
                                <span className="font-body font-bold text-gray-200 block">{entry.email}</span>
                                <div className="flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3 text-pulse-mint" />
                                    <span className="text-[10px] font-body text-gray-500">Steady Frequency</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-span-4 text-right pr-6">
                            <span className="font-display text-xl font-bold text-white group-hover:text-pulse-cyan transition-colors">{entry.score}</span>
                            <span className="text-[10px] font-display text-gray-500 ml-1 uppercase tracking-tighter">Flux</span>
                        </div>
                    </motion.div>
                ))
            ) : (
                <div className="py-20 text-center font-body text-gray-500 italic">
                    Search result null. No signatures found in this sector.
                </div>
            )}
        </div>
        
        <div className="p-6 bg-cosmos-900/40 border-t border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-body text-gray-500">Tracking <strong className="text-gray-300">{board.length}</strong> Commanders globally.</span>
            </div>
            <button className="btn-ghost py-1.5 px-4 text-xs">View My Sector</button>
        </div>
      </motion.div>
    </div>
  );
};

export default Leaderboard;
