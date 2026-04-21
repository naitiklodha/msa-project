import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../api';
import { io } from 'socket.io-client';
import { 
  Users, 
  Clock, 
  Zap, 
  BarChart3, 
  Activity, 
  Send,
  Loader2,
  TrendingUp,
  BrainCircuit
} from 'lucide-react';
import Game2048 from '../games/Game2048';
import GameSnake from '../games/GameSnake';

const Dashboard = () => {
  const [stats, setStats] = useState({
    services: {},
    dashboard: { users: 0, activeGames: 0, activeTimers: 0 }
  });
  const [realtime, setRealtime] = useState({
    users: { count: 0 },
    games: { active: 0 },
    timer: { active: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await dashboardAPI.get();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    const socket = io('http://localhost:8000', { path: '/socket.io' });
    socket.on('dashboard_update', (update) => {
      setRealtime(update);
    });

    return () => socket.disconnect();
  }, []);

  // Removed handleQuery function

const StatCard = ({ label, value, icon: Icon, color, delay, onClick }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      onClick={onClick}
      className={`glass-card flex flex-col gap-6 ${onClick ? 'cursor-pointer hover:border-white/20 transition-all' : ''}`}
    >
      <div className="flex justify-between items-start">
        <div className={`p-4 rounded-2xl bg-white/5 border border-white/5 ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex flex-col items-end">
            <span className="text-[10px] font-display font-black text-pulse-mint uppercase tracking-widest animate-pulse">Live Uplink</span>
            <div className="w-12 h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                    className="w-1/2 h-full bg-pulse-cyan" 
                />
            </div>
        </div>
      </div>
      <div>
        <span className="text-[10px] font-display font-bold uppercase tracking-[0.3em] text-gray-500">{label}</span>
        <div className="text-4xl font-display font-bold mt-2 text-white tabular-nums">{value}</div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/5">
        <div>
          <h1 className="text-5xl font-display font-bold text-white tracking-tighter uppercase italic">
            Command Center
          </h1>
          <p className="font-display text-[10px] text-gray-500 uppercase tracking-[0.4em] mt-2">Neural Network // Sector Alpha-9 // Active Sector</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-6 py-3 glass-premium border-pulse-mint/20 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-pulse-mint shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
            <span className="text-[10px] font-display font-black text-white uppercase tracking-widest">Protocol Link Active</span>
          </div>
        </div>
      </header>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard 
          label="Neural Nodes" 
          value={realtime.users.count || stats.dashboard.users} 
          icon={Users} 
          color="text-pulse-cyan"
          delay={0.1}
        />
        <StatCard 
          label="Active Cycles" 
          value={realtime.timer.active || stats.dashboard.activeTimers} 
          icon={Clock} 
          color="text-pulse-amber"
          delay={0.2}
          onClick={() => navigate('/timer')}
        />
        <StatCard 
          label="Burst Quizzes" 
          value={realtime.games.active || stats.dashboard.activeGames} 
          icon={Zap} 
          color="text-pulse-mint"
          delay={0.3}
          onClick={() => navigate('/study')}
        />
        <StatCard 
          label="Retention Gap" 
          value="99.9%" 
          icon={Activity} 
          color="text-pulse-rose"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Microgames Hub */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-8 space-y-8"
        >
            {activeGame ? (
              activeGame === '2048' ? <Game2048 onBack={() => setActiveGame(null)} /> :
              activeGame === 'snake' ? <GameSnake onBack={() => setActiveGame(null)} /> : null
            ) : (
              <div className="glass-premium p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-pulse-cyan/5 blur-[80px] -mr-32 -mt-32" />
                
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                    <BrainCircuit className="w-6 h-6 text-pulse-cyan" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-bold uppercase tracking-widest">Cognitive Sandbox</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-tighter mt-1">Neural Refinement Training Protocols</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Game 2048 Card */}
                  <div 
                    onClick={() => setActiveGame('2048')}
                    className="p-8 glass-premium border-white/5 hover:border-pulse-cyan/40 hover:bg-pulse-cyan/5 cursor-pointer transition-all group/card flex flex-col items-center text-center"
                  >
                    <div className="w-20 h-20 rounded-3xl bg-white text-cosmos-950 flex items-center justify-center font-display font-black text-2xl mb-6 shadow-xl group-hover/card:scale-110 transition-transform">
                      2048
                    </div>
                    <h3 className="font-display font-bold text-white uppercase tracking-widest">Node Merger</h3>
                    <p className="text-gray-500 text-xs mt-3 leading-relaxed">Reach terminal capacity to unlock neural pathways.</p>
                  </div>

                  {/* Snake Card */}
                  <div 
                    onClick={() => setActiveGame('snake')}
                    className="p-8 glass-premium border-white/5 hover:border-pulse-mint/40 hover:bg-pulse-mint/5 cursor-pointer transition-all group/card flex flex-col items-center text-center"
                  >
                    <div className="w-20 h-20 rounded-3xl bg-cosmos-950 border border-white/10 flex items-center justify-center mb-6 shadow-xl group-hover/card:scale-110 transition-transform relative overflow-hidden">
                        <div className="w-10 h-4 bg-pulse-mint rounded-full flex justify-end items-center pr-1 blur-[1px] opacity-50" />
                        <div className="absolute w-10 h-4 bg-pulse-mint rounded-full flex justify-end items-center pr-1" />
                    </div>
                    <h3 className="font-display font-bold text-white uppercase tracking-widest">Neural Serpent</h3>
                    <p className="text-gray-500 text-xs mt-3 leading-relaxed">Collect fragmented packets to stabilize the grid.</p>
                  </div>
                </div>
              </div>
            )}
        </motion.div>

        {/* Global Activity Feed */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-4 space-y-8"
        >
          <div className="glass-premium p-8 h-full flex flex-col">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-pulse-amber" />
                </div>
                <h2 className="text-lg font-display font-bold uppercase tracking-widest">Neural Status</h2>
              </div>

              <div className="space-y-4 flex-1">
                {loading ? (
                  <div className="py-20 text-center animate-pulse text-gray-500 uppercase font-display text-[10px] tracking-widest">Awaiting Link...</div>
                ) : (
                    <div className="space-y-3">
                        {Object.entries(stats.services).map(([svc, status]) => (
                            <div key={svc} className="flex justify-between items-center p-4 glass-premium border-white/[0.03] bg-white/[0.01]">
                                <span className="text-[10px] font-display font-bold uppercase text-gray-400 tracking-widest">{svc}</span>
                                <span className={`text-[10px] font-display font-bold px-3 py-1 rounded-full ${status === 'ok' ? 'bg-pulse-mint/10 text-pulse-mint shadow-[0_0_15px_rgba(52,211,153,0.1)]' : 'bg-pulse-rose/10 text-pulse-rose'}`}>
                                    {status === 'ok' ? 'OPTIMAL' : 'OFFLINE'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
              </div>
              
              <div className="mt-8 p-6 rounded-3xl bg-pulse-cyan/5 border border-pulse-cyan/10">
                    <p className="text-[10px] font-display font-bold text-pulse-cyan uppercase leading-loose tracking-[0.1em]">
                        <span className="inline-block w-2 h-2 rounded-full bg-pulse-cyan mr-2 animate-ping" />
                        System Notice: High retention wave detected in primary sector. Performance at 112% of baseline.
                    </p>
              </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
