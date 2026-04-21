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
  Layout
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
    try {
      const { data } = await roomAPI.create(newRoomName);
      // Immediately take the user inside the room
      navigate(`/rooms/${data.code}`);
    } catch (err) {
      setError('Failed to stabilize neural room. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pulse-cyan/10 border border-pulse-cyan/20 text-pulse-cyan text-xs font-bold uppercase tracking-widest mb-4"
            >
              <Zap className="w-3 h-3" />
              Collaborative Neural Space
            </motion.div>
            <h1 className="font-display text-5xl font-bold text-white mb-4">
              Opalite <span className="text-pulse-cyan">Sectors</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl">
              Sync your neural frequency with others. Share knowledge, compete in real-time quizzes, and sharpen your focus together.
            </p>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-2 px-8 py-4"
            >
              <Plus className="w-5 h-5" />
              Establish Room
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Column: Join & Info */}
            <div className="lg:col-span-4 space-y-8">
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass p-8 rounded-3xl border-pulse-cyan/20 shadow-[0_0_50px_rgba(34,211,238,0.1)]"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-pulse-cyan/10 flex items-center justify-center text-pulse-cyan font-display">
                            <DoorOpen className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Join Frequency</h2>
                    </div>

                    <form onSubmit={handleJoin} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 ml-1">Unique Room Code</label>
                            <div className="relative">
                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="ALPHA-X"
                                    value={roomCode}
                                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                    className="input-opalite pl-11 text-lg tracking-[0.2em] font-mono"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-pulse-rose text-xs font-medium px-2 py-3 bg-pulse-rose/10 rounded-xl border border-pulse-rose/20">
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full bg-pulse-cyan text-cosmos-950 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all disabled:opacity-50"
                        >
                            Sync Neural Link
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </form>
                </motion.div>

                {/* Feature Mini-cards */}
                <div className="space-y-4">
                    <div className="glass-sm p-5 rounded-2xl flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-sm">Persistent Intel</h4>
                            <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Real-time chat history</p>
                        </div>
                    </div>
                    <div className="glass-sm p-5 rounded-2xl flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-pulse-rose/10 flex items-center justify-center text-pulse-rose">
                            <Trophy className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-sm">Competitive Sync</h4>
                            <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Live group quizzes</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Your Frequencies (Room List) */}
            <div className="lg:col-span-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-white font-bold flex items-center gap-2">
                        <Layout className="w-4 h-4 text-pulse-cyan" />
                        Your Active Frequencies
                    </h2>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] bg-white/5 px-3 py-1 rounded-full">
                        {rooms.length} Archive Channels
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {loadingRooms ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-48 glass animate-pulse rounded-3xl" />
                        ))
                    ) : rooms.length > 0 ? (
                        rooms.map((room) => (
                            <motion.div
                                key={room.id}
                                whileHover={{ y: -5 }}
                                onClick={() => navigate(`/rooms/${room.code}`)}
                                className="glass p-7 rounded-3xl border-white/5 cursor-pointer group hover:bg-white/5 transition-all relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                                    <Sparkles className="w-12 h-12 text-pulse-cyan" />
                                </div>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-pulse-cyan/10 flex items-center justify-center text-pulse-cyan">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
                                        {room.code}
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-pulse-cyan transition-colors">{room.name}</h3>
                                <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                                    <div className="flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5" />
                                        <span className="text-white">{room.participant_count}</span> Linked
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        Active Now
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center glass border-dashed border-white/10 rounded-3xl">
                            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-600">
                                <Zap className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">No active frequencies detected.</h3>
                            <p className="text-gray-500 text-sm max-w-sm mx-auto mb-8">Establish your first collaborative room to begin synchronization and intel sharing.</p>
                            <button 
                                onClick={() => setShowCreateModal(true)}
                                className="text-pulse-cyan font-bold text-xs uppercase tracking-widest hover:text-white transition-colors"
                            >
                                + Initialize First Room
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </main>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-cosmos-950/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass max-w-md w-full p-8 rounded-3xl border-pulse-cyan/30 relative z-10"
            >
              <h2 className="text-2xl font-bold text-white mb-2">Establish New Room</h2>
              <p className="text-gray-400 text-sm mb-6">Define your focus parameters and invite collaborators.</p>

              <form onSubmit={handleCreate} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Room Identifier</label>
                  <input
                    autoFocus
                    required
                    type="text"
                    placeholder="e.g. Distributed Systems Lab"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="input-opalite"
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-6 py-4 rounded-xl font-bold text-gray-400 hover:text-white transition-colors"
                  >
                    Abort
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="btn-opal flex-1 py-4"
                  >
                    {loading ? 'Initializing...' : 'Construct'}
                  </button>
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
