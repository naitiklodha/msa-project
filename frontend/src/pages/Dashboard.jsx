import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../api';
import { io } from 'socket.io-client';
import { wsBaseUrl } from '../config';
import {
  Users,
  Clock,
  Zap,
  BarChart3,
  Activity,
  Send,
  Loader2,
  TrendingUp,
  BrainCircuit,
  ArrowRight,
  ExternalLink,
  Shield,
  CheckCircle2,
  AlertCircle
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

    const socket = io(wsBaseUrl, { path: '/socket.io' });
    socket.on('dashboard_update', (update) => {
      setRealtime(update);
    });

    return () => socket.disconnect();
  }, []);

  const StatCard = ({ label, value, icon: Icon, accent, delay, onClick, trend }) => (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={`card-hover p-6 flex flex-col gap-4 ${onClick ? 'cursor-pointer' : ''}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }} : undefined}
    >
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-xl bg-accent-${accent}-dim border border-accent-${accent}/30`}>
          <Icon className="w-5 h-5 text-accent-{accent}" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-tertiary animate-pulse" />
          <span className="text-label-sm font-display font-bold uppercase tracking-widest text-accent-tertiary">Live</span>
        </div>
      </div>
      <div className="flex-1">
        <span className="text-label-sm font-display font-bold uppercase tracking-wider text-fg-tertiary">{label}</span>
        <div className="text-display-sm md:text-display-md font-display font-medium mt-1 text-fg-primary tabular-nums flex items-baseline gap-2">
          {value}
          {trend && (
            <span className={`text-heading-sm font-semibold ${trend > 0 ? 'text-semantic-success' : 'text-semantic-danger'}`}>
              {trend > 0 ? '▲' : '▼'} {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
      {onClick && (
        <div className="pt-2 flex items-center justify-between text-label-sm font-medium text-accent-primary group">
          <span>Enter Sector</span>
          <motion.div
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-accent-primary"
          >
            <ArrowRight className="w-4 h-4" />
          </motion.div>
        </div>
      )}
    </motion.div>
  );

  const ServiceStatus = ({ name, status }) => (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="flex justify-between items-center p-4 card bg-bg-secondary/50 border-border-primary/50"
    >
      <div className="flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full ${status === 'ok' ? 'bg-semantic-success' : 'bg-semantic-danger'}`} />
        <span className="text-label-sm font-display font-bold uppercase tracking-widest text-fg-secondary">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-label-sm font-display font-bold px-3 py-1 rounded-full ${status === 'ok'
          ? 'bg-semantic-success-dim text-semantic-success border border-semantic-success/30'
          : 'bg-semantic-danger-dim text-semantic-danger border border-semantic-danger/30'}`}>
          {status === 'ok' ? 'OPTIMAL' : 'OFFLINE'}
        </span>
        {status === 'ok' && <CheckCircle2 className="w-4 h-4 text-semantic-success" />}
        {status !== 'ok' && <AlertCircle className="w-4 h-4 text-semantic-danger" />}
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-10 pb-20 animate-fade-in animate-slide-up">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-border-primary">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-display-lg font-display font-medium tracking-tight italic text-fg-primary"
          >
            Command Center
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-label-sm text-fg-tertiary uppercase tracking-[0.4em] mt-2"
          >
            Neural Network // Sector Alpha-9 // Active Sector
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3"
        >
          <div className="flex items-center gap-3 px-5 py-3 card-glass border-accent-tertiary/30">
            <div className="w-2 h-2 rounded-full bg-accent-tertiary shadow-[0_0_10px_var(--color-accent-tertiary-dim)] animate-pulse" />
            <span className="text-label-sm font-display font-bold text-fg-primary uppercase tracking-widest">Protocol Link Active</span>
          </div>
        </motion.div>
      </header>

      {/* Primary Stats Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.08 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
      >
        <StatCard
          label="Neural Nodes"
          value={realtime.users.count || stats.dashboard.users}
          icon={Users}
          accent="primary"
          delay={0.1}
        />
        <StatCard
          label="Active Cycles"
          value={realtime.timer.active || stats.dashboard.activeTimers}
          icon={Clock}
          accent="secondary"
          delay={0.2}
          onClick={() => navigate('/timer')}
          trend={12}
        />
        <StatCard
          label="Burst Quizzes"
          value={realtime.games.active || stats.dashboard.activeGames}
          icon={Zap}
          accent="tertiary"
          delay={0.3}
          onClick={() => navigate('/study')}
          trend={8}
        />
        <StatCard
          label="Retention Rate"
          value="99.9%"
          icon={Activity}
          accent="primary"
          delay={0.4}
          trend={2}
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Microgames Hub */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="lg:col-span-8 space-y-6"
        >
          <AnimatePresence mode="wait">
            {activeGame ? (
              <motion.div
                key={activeGame}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3 }}
                className="card p-0 overflow-hidden"
              >
                {activeGame === '2048' ? (
                  <Game2048 onBack={() => setActiveGame(null)} />
                ) : activeGame === 'snake' ? (
                  <GameSnake onBack={() => setActiveGame(null)} />
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                key="hub"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4 }}
                className="card p-6 md:p-8 relative overflow-hidden group"
              >
                {/* Background glow */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-accent-primary/5 blur-[100px] -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent-tertiary/5 blur-[100px] -ml-20 -mb-20" />

                <div className="flex items-center gap-4 mb-8 relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-accent-primary-dim border border-accent-primary/30 flex items-center justify-center">
                    <BrainCircuit className="w-6 h-6 text-accent-primary" />
                  </div>
                  <div>
                    <h2 className="text-heading-lg font-display font-bold uppercase tracking-wider text-fg-primary">Cognitive Sandbox</h2>
                    <p className="text-label-sm text-fg-tertiary uppercase tracking-tighter mt-1">Neural Refinement Training Protocols</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                  {/* Game 2048 Card */}
                  <motion.button
                    onClick={() => setActiveGame('2048')}
                    className="card-hover p-6 md:p-8 flex flex-col items-center text-center group relative overflow-hidden"
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ background: 'linear-gradient(135deg, var(--color-bg-elevated) 0%, var(--color-bg-secondary) 100%)' }}
                  >
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-tertiary flex items-center justify-center font-display font-black text-2xl md:text-3xl mb-6 shadow-glow-primary group-hover:scale-110 transition-transform duration-500">
                      2048
                    </div>
                    <h3 className="font-display font-bold text-fg-primary uppercase tracking-wider mb-2">Node Merger</h3>
                    <p className="text-body-sm text-fg-tertiary leading-relaxed">Reach terminal capacity to unlock neural pathways.</p>
                    <div className="mt-6 flex items-center gap-2 text-label-sm font-semibold text-accent-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span>Launch Protocol</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </motion.button>

                  {/* Snake Card */}
                  <motion.button
                    onClick={() => setActiveGame('snake')}
                    className="card-hover p-6 md:p-8 flex flex-col items-center text-center group relative overflow-hidden"
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ background: 'linear-gradient(135deg, var(--color-bg-elevated) 0%, var(--color-bg-secondary) 100%)' }}
                  >
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-bg-tertiary border border-border-primary flex items-center justify-center mb-6 shadow-elevation-2 group-hover:border-accent-tertiary/50 group-hover:bg-accent-tertiary-dim/50 transition-all duration-500 relative overflow-hidden">
                      <div className="w-10 h-4 bg-accent-tertiary rounded-full flex justify-end items-center pr-1 blur-[1px] opacity-50" />
                      <motion.div
                        className="absolute w-10 h-4 bg-accent-tertiary rounded-full flex justify-end items-center pr-1"
                        animate={{ x: [0, 20, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                    <h3 className="font-display font-bold text-fg-primary uppercase tracking-wider mb-2">Neural Serpent</h3>
                    <p className="text-body-sm text-fg-tertiary leading-relaxed">Collect fragmented packets to stabilize the grid.</p>
                    <div className="mt-6 flex items-center gap-2 text-label-sm font-semibold text-accent-tertiary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span>Launch Protocol</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Global Activity Feed */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="lg:col-span-4 space-y-6"
        >
          {/* Services Status */}
          <div className="card p-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-accent-secondary-dim border border-accent-secondary/30 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-accent-secondary" />
              </div>
              <h2 className="text-heading-md font-display font-bold uppercase tracking-wider text-fg-primary">Neural Status</h2>
            </div>

            <div className="space-y-3 flex-1">
              <AnimatePresence mode="pop">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-12 text-center"
                  >
                    <Loader2 className="w-8 h-8 mx-auto text-accent-primary animate-spin mb-4" />
                    <p className="text-label-sm font-display font-bold uppercase tracking-widest text-fg-tertiary">Establishing Uplink...</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="services"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ staggerChildren: 0.06 }}
                    className="space-y-3"
                  >
                    {Object.entries(stats.services).map(([svc, status]) => (
                      <ServiceStatus key={svc} name={svc} status={status} />
                    ))}
                    {Object.keys(stats.services).length === 0 && (
                      <div className="py-8 text-center">
                        <p className="text-label-sm font-display font-bold uppercase tracking-widest text-fg-tertiary">No Service Data</p>
                        <p className="text-body-sm text-fg-tertiary/60 mt-1">Services will appear once registered</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* System Notice */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-6 p-5 rounded-2xl bg-accent-primary-dim border border-accent-primary/30"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-accent-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield className="w-4 h-4 text-accent-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-label-sm font-display font-bold text-accent-primary uppercase tracking-wider mb-1">System Notice</p>
                  <p className="text-body-sm text-fg-secondary leading-relaxed">
                    High retention wave detected in primary sector. Performance at <span className="font-semibold text-fg-primary">112%</span> of baseline.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="card p-6"
          >
            <h3 className="text-heading-sm font-display font-bold uppercase tracking-wider text-fg-primary mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/timer')}
                className="btn-outline w-full justify-start gap-3"
              >
                <Clock className="w-5 h-5 text-accent-secondary" />
                <span>Start Focus Cycle</span>
              </button>
              <button
                onClick={() => navigate('/study')}
                className="btn-outline w-full justify-start gap-3"
              >
                <Zap className="w-5 h-5 text-accent-tertiary" />
                <span>Generate Quiz</span>
              </button>
              <button
                onClick={() => navigate('/rooms')}
                className="btn-outline w-full justify-start gap-3"
              >
                <Users className="w-5 h-5 text-accent-primary" />
                <span>Create Sector</span>
              </button>
              <button
                onClick={() => navigate('/leaderboard')}
                className="btn-outline w-full justify-start gap-3"
              >
                <TrendingUp className="w-5 h-5 text-semantic-warning" />
                <span>View Ranks</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;