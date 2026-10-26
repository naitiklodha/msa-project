import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  ArrowRight,
  DoorOpen,
  Hash,
  Shield,
  Zap,
  Globe,
  MessageSquare,
  FileText,
  Trophy,
  Sparkles,
  ChevronRight,
  Clock,
  Layout,
  Loader2,
  X,
  CheckCircle2
} from 'lucide-react';
import { roomAPI } from '../api';

const FocusRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomCode, setRoomCode] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchRooms = async () => {
    try {
      const { data } = await roomAPI.mine();
      setRooms(data);
    } catch (err) {
      console.error("Failed to fetch rooms", err);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!roomCode) return;
    setLoading(true);
    setError('');
    try {
      await roomAPI.get(roomCode.toUpperCase());
      navigate(`/rooms/${roomCode.toUpperCase()}`);
    } catch (err) {
      setError('Neural frequency not found. Check your room code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newRoomName) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await roomAPI.create(newRoomName);
      navigate(`/rooms/${data.code}`);
    } catch (err) {
      setError('Failed to stabilize neural room. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen animate-fade-in animate-slide-up">
      <main className="max-w-7xl mx-auto px-6 py-8 lg:py-12 space-y-10">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6"
        >
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-primary-dim border border-accent-primary/30 text-accent-primary text-label-sm font-bold uppercase tracking-wider mb-4"
            >
              <Zap className="w-3.5 h-3.5" />
              Collaborative Neural Space
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-display-lg font-display font-medium tracking-tight text-fg-primary"
            >
              Opalite <span className="text-accent-primary italic">Sectors</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-body-lg text-fg-secondary max-w-2xl mt-3"
            >
              Sync your neural frequency with others. Share knowledge, compete in real-time quizzes, and sharpen your focus together.
            </motion.p>
          </div>

          <motion.button
            onClick={() => setShowCreateModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span>Establish Room</span>
          </motion.button>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Left Column: Join & Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-4 space-y-6"
          >
            {/* Join Room Card */}
            <div className="card-glass-hover p-6 md:p-8 border-accent-primary/30 shadow-glow-primary">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-accent-primary-dim border border-accent-primary/30 flex items-center justify-center text-accent-primary">
                  <DoorOpen className="w-5 h-5" />
                </div>
                <h2 className="text-heading-lg font-display font-bold text-fg-primary">Join Frequency</h2>
              </div>

              <form onSubmit={handleJoin} className="space-y-5">
                <div>
                  <label htmlFor="room-code" className="label">Unique Room Code</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-tertiary" />
                    <input
                      id="room-code"
                      type="text"
                      placeholder="ALPHA-X"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      className="input input-icon text-lg tracking-[0.2em] font-mono"
                      aria-describedby="room-code-hint"
                    />
                  </div>
                  <p id="room-code-hint" className="form-hint">Enter the 5-8 character sector code</p>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      className="form-error p-3 rounded-xl bg-semantic-danger-dim border border-semantic-danger/30 text-semantic-danger flex items-center gap-2"
                      role="alert"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-body-sm">{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={!loading ? { scale: 1.01 } : {}}
                  whileTap={!loading ? { scale: 0.98 } : {}}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <span>Sync Neural Link</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </form>
            </div>

            {/* Feature Cards */}
            <div className="space-y-3">
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="card p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent-secondary-dim border border-accent-secondary/30 flex items-center justify-center text-accent-secondary">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-display font-semibold text-fg-primary text-sm">Persistent Intel</h4>
                    <p className="text-label-sm text-fg-tertiary uppercase tracking-tighter mt-0.5">Real-time chat history</p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
                className="card p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent-tertiary-dim border border-accent-tertiary/30 flex items-center justify-center text-accent-tertiary">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-display font-semibold text-fg-primary text-sm">Competitive Sync</h4>
                    <p className="text-label-sm text-fg-tertiary uppercase tracking-tighter mt-0.5">Live group quizzes</p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="card p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent-primary-dim border border-accent-primary/30 flex items-center justify-center text-accent-primary">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-display font-semibold text-fg-primary text-sm">Encrypted Channels</h4>
                    <p className="text-label-sm text-fg-tertiary uppercase tracking-tighter mt-0.5">E2E secured uplinks</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Column: Room List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-accent-tertiary-dim border border-accent-tertiary/30 flex items-center justify-center text-accent-tertiary">
                  <Layout className="w-5 h-5" />
                </div>
                <h2 className="text-heading-lg font-display font-bold text-fg-primary">Your Active Frequencies</h2>
              </div>
              <span className="badge badge-primary">
                {rooms.length} Archive Channels
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loadingRooms ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="card animate-pulse h-[220px]"
                  />
                ))
              ) : rooms.length > 0 ? (
                rooms.map((room, i) => (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ y: -4 }}
                    onClick={() => navigate(`/rooms/${room.code}`)}
                    className="card-hover p-6 cursor-pointer relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <Sparkles className="w-10 h-10 text-accent-primary/50" />
                    </div>
                    <div className="flex justify-between items-start mb-5">
                      <div className="w-10 h-10 rounded-xl bg-accent-primary-dim border border-accent-primary/30 flex items-center justify-center text-accent-primary">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="text-label-sm font-display font-bold text-fg-tertiary uppercase tracking-wider font-mono bg-bg-tertiary px-2 py-1 rounded">
                        {room.code}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-fg-primary mb-3 group-hover:text-accent-primary transition-colors">{room.name}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-label-sm text-fg-tertiary">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-fg-primary font-semibold">{room.participant_count}</span> Linked
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-accent-tertiary" />
                        Active Now
                      </div>
                    </div>
                    <motion.div
                      className="mt-4 pt-4 border-t border-border-primary flex items-center justify-end gap-2 text-label-sm font-medium text-accent-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    >
                      <span>Enter Sector</span>
                      <ArrowRight className="w-4 h-4" />
                    </motion.div>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="col-span-full card p-12 md:p-16 text-center border-2 border-dashed border-border-primary"
                >
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-accent-primary-dim border border-accent-primary/30 flex items-center justify-center text-accent-primary">
                    <Zap className="w-10 h-10" />
                  </div>
                  <h3 className="text-heading-lg font-display font-bold text-fg-primary mb-2">No Active Frequencies Detected</h3>
                  <p className="text-body-md text-fg-secondary max-w-sm mx-auto mb-8">
                    Establish your first collaborative sector to begin synchronization and intel sharing.
                  </p>
                  <motion.button
                    onClick={() => setShowCreateModal(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Initialize First Sector
                  </motion.button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-bg-overlay backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="card-glass max-w-md w-full p-6 md:p-8 relative z-10"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-heading-lg font-display font-bold text-fg-primary">Establish New Sector</h2>
                  <p className="text-body-sm text-fg-secondary mt-1">Define your focus parameters and invite collaborators.</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-icon text-fg-tertiary hover:text-fg-primary"
                  aria-label="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-5">
                <div>
                  <label htmlFor="room-name" className="label">Room Identifier</label>
                  <input
                    id="room-name"
                    autoFocus
                    required
                    type="text"
                    placeholder="e.g. Distributed Systems Lab"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="input"
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="form-error p-3 rounded-xl bg-semantic-danger-dim border border-semantic-danger/30 text-semantic-danger flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-body-sm">{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3 pt-2">
                  <motion.button
                    type="button"
                    onClick={() => { setNewRoomName(''); setShowCreateModal(false); }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-ghost flex-1"
                  >
                    Abort
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={!loading ? { scale: 1.01 } : {}}
                    whileTap={!loading ? { scale: 0.98 } : {}}
                    className="btn-primary flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Initializing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Construct Sector</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FocusRooms;