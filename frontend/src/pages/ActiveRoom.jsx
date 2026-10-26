import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Users,
  FileText,
  Trophy,
  Info,
  ChevronRight,
  Plus,
  MessageSquare,
  Zap,
  Clock,
  ExternalLink,
  Target,
  ArrowLeft,
  X,
  Upload,
  Brain,
  Loader2,
  Trash2,
  Shield,
  Globe,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX
} from 'lucide-react';
import { io } from 'socket.io-client';
import { wsBaseUrl } from '../config';
import { useAuth } from '../AuthContext';
import { roomAPI, docAPI, quizAPI } from '../api';
import Quiz from '../Quiz';

const ActiveRoom = () => {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Quiz Sync State
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [lobbyUsers, setLobbyUsers] = useState([]);
  const [topicSelectionDoc, setTopicSelectionDoc] = useState(null);
  const [quizStarted, setQuizStarted] = useState(false);

  // Socket
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const initRoom = async () => {
      try {
        const { data: roomData } = await roomAPI.get(code);
        setRoom(roomData);

        const { data: history } = await roomAPI.history(code);
        setMessages(history);

        const docsResponse = await docAPI.list(roomData.id);
        setDocuments(docsResponse?.data?.documents || []);

        const { data: lb } = await roomAPI.leaderboard(code);
        setLeaderboard(lb);

        // Initialize Socket
        socketRef.current = io(wsBaseUrl, {
          path: '/ws/rooms',
          transports: ['websocket']
        });

        socketRef.current.on('connect', () => {
          socketRef.current.emit('join_room', { roomCode: code, userId: user.id });
        });

        socketRef.current.on('room_state', ({ activeUsers }) => {
          setParticipants(activeUsers);
        });

        socketRef.current.on('new_message', (msg) => {
          setMessages(prev => [...prev, msg].slice(-100));
        });

        socketRef.current.on('quiz_lobby_opened', ({ documentId, topicName, chunkId, initiatorId }) => {
          setActiveQuiz({ documentId, topicName, chunkId, initiatorId });
          setLobbyUsers([]);
        });

        socketRef.current.on('quiz_lobby_update', ({ joinedUsers }) => {
          setLobbyUsers(joinedUsers);
        });

        socketRef.current.on('quiz_lobby_closed', () => {
          setActiveQuiz(null);
          setLobbyUsers([]);
        });

        socketRef.current.on('quiz_commence', () => {
          setQuizStarted(true);
        });

        socketRef.current.on('leaderboard_refresh', async () => {
          const { data: lb } = await roomAPI.leaderboard(code);
          setLeaderboard(lb);
        });

        setLoading(false);
      } catch (err) {
        console.error(err);
        navigate('/rooms');
      }
    };

    if (code && user) initRoom();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [code, user, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socketRef.current) return;
    socketRef.current.emit('send_message', { content: inputMessage });
    setInputMessage('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !room) return;
    setUploading(true);
    try {
      await docAPI.upload(file, room.id);
      const docsResponse = await docAPI.list(room.id);
      setDocuments(docsResponse?.data?.documents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (e, docId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this shared lore module?')) return;
    try {
      await docAPI.delete(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      console.error('Deletion failed', err);
    }
  };

  const initiateGroupQuiz = async (docId, fileName) => {
    try {
      const { data: topicsData } = await docAPI.topics(docId);
      setTopicSelectionDoc({ id: docId, fileName, topics: topicsData?.topics || [] });
    } catch (err) {
      console.error('Failed to fetch topics:', err);
    }
  };

  const handleTopicSelect = (topic) => {
    if (!socketRef.current || !topicSelectionDoc) return;
    socketRef.current.emit('quiz_start_init', {
      documentId: topicSelectionDoc.id,
      topicName: topic.topic,
      chunkId: topic.chunk_id
    });
    setTopicSelectionDoc(null);
  };

  const handleJoinLobby = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('quiz_lobby_join');
  };

  const handleStartQuiz = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('quiz_lobby_start');
  };

  const handleCancelLobby = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('quiz_lobby_close');
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 text-accent-primary"
      >
        <Zap className="w-12 h-12" />
      </motion.div>
      <span className="text-label-sm font-display font-bold uppercase tracking-wider text-fg-tertiary animate-pulse">Syncing room frequency...</span>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-fade-in animate-slide-up">
      {/* Room Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-border-primary">
        <div className="flex items-center gap-4">
          <motion.button
            onClick={() => navigate('/rooms')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-icon text-fg-tertiary hover:text-fg-primary"
            aria-label="Back to Sectors"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-display-md font-display font-medium tracking-tight text-fg-primary"
              >
                {room?.name}
              </motion.h1>
              <span className="badge badge-primary">
                Sector: {room?.code}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-label-sm font-display font-bold uppercase tracking-wider text-fg-tertiary">
              <div className="flex items-center gap-2 text-accent-tertiary">
                <motion.div
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                  className="w-2 h-2 rounded-full bg-accent-tertiary"
                />
                {participants.length} Active Neural Links
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Uplink Established
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <motion.button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`btn-outline flex items-center gap-2 ${showLeaderboard ? 'border-semantic-danger text-semantic-danger' : ''}`}
          >
            <Trophy className="w-4 h-4" />
            <span>Rankings</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary flex items-center gap-2"
          >
            <Info className="w-4 h-4" />
            <span>Status</span>
          </motion.button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-hidden">
        {/* Main Workspace */}
        <div className="lg:col-span-8 flex flex-col gap-4 overflow-hidden min-h-0">
          {/* Leaderboard Panel */}
          <AnimatePresence>
            {showLeaderboard && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="card-glass p-6 border-accent-secondary/30"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-secondary-dim border border-accent-secondary/30 flex items-center justify-center text-accent-secondary">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <h3 className="text-heading-lg font-display font-bold text-fg-primary uppercase tracking-wider">Sector Leaderboard</h3>
                  </div>
                  <Trophy className="w-6 h-6 text-accent-secondary" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                  {leaderboard.length > 0 ? leaderboard.map((entry, i) => (
                    <motion.div
                      key={entry.userId || i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="card p-4 flex flex-col items-center text-center"
                    >
                      <div className="text-label-sm font-display font-bold text-fg-tertiary uppercase tracking-wider mb-2">Priority {i + 1}</div>
                      <div className="w-12 h-12 rounded-xl bg-bg-tertiary border border-border-primary overflow-hidden mb-3 group-hover:scale-110 transition-transform">
                        <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${entry.email}`} alt="avatar" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-label-sm font-display font-semibold text-fg-primary truncate w-full mb-1">{entry.email.split('@')[0]}</span>
                      <span className="text-body-sm font-display font-bold text-accent-secondary">{entry.score} <span className="text-label-sm opacity-50">Flux</span></span>
                    </motion.div>
                  )) : (
                    <div className="col-span-full py-8 text-center text-label-sm font-display text-fg-tertiary uppercase tracking-wider italic">Awaiting neural input patterns...</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collaborative Document Repository */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: showLeaderboard ? 0.3 : 0.1 }}
            className="card p-6 flex flex-col flex-1 min-h-0 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent-primary/5 blur-2xl rounded-full -mr-16 -mt-16" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent-primary-dim border border-accent-primary/30 flex items-center justify-center text-accent-primary">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-heading-lg font-display font-bold text-fg-primary uppercase tracking-wider">Shared Lore</h3>
                  <p className="text-label-sm text-fg-tertiary uppercase tracking-tighter font-bold mt-1">Synchronized Study Data Pool</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="file"
                  id="room-doc-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.txt"
                />
                <label
                  htmlFor="room-doc-upload"
                  className="btn-primary flex items-center gap-2 cursor-pointer"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Inject Data
                </label>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 relative z-10">
              {documents.length > 0 ? (
                documents.map((doc, i) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    whileHover={{ x: 8 }}
                    className="card-hover p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-bg-tertiary border border-border-primary flex items-center justify-center text-fg-tertiary group-hover:text-accent-primary transition-colors shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-display font-semibold text-fg-primary mb-1 truncate">{doc.file_name}</h4>
                        <div className="flex flex-wrap gap-3 text-label-sm">
                          <span className="text-fg-tertiary">Size: {(doc.content_length / 1024).toFixed(1)} KB</span>
                          <span className="badge badge-tertiary text-xs">Lore Verified</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-fast shrink-0">
                      <motion.button
                        onClick={() => initiateGroupQuiz(doc.id, doc.file_name)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn-secondary px-4 py-2 text-label-sm"
                      >
                        <Zap className="w-4 h-4 mr-1" />
                        Sync Quiz
                      </motion.button>
                      <motion.button
                        onClick={(e) => handleDeleteDoc(e, doc.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="btn-icon text-fg-tertiary hover:text-semantic-danger hover:bg-semantic-danger-dim"
                        aria-label="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <FileText className="w-16 h-16 mb-4 text-fg-tertiary/20" />
                  <p className="text-label-sm font-display font-bold uppercase tracking-wider text-fg-tertiary italic">No lore detected in this sector.</p>
                  <p className="text-body-sm text-fg-tertiary/60 mt-1">Inject data to begin synchronization.</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Chat Panel */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-4 flex flex-col min-h-0"
        >
          <div className="card flex-1 p-6 flex flex-col overflow-hidden relative">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-accent-primary-dim border border-accent-primary/30 flex items-center justify-center text-accent-primary">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-heading-md font-display font-bold text-fg-primary uppercase tracking-wider">Neural Net</h3>
                <p className="text-label-sm text-fg-tertiary uppercase tracking-wider mt-0.5">{messages.length} Recorded Communications</p>
              </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-5" ref={chatEndRef}>
              <AnimatePresence>
                {messages.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center h-full text-center text-fg-tertiary/50"
                  >
                    <MessageSquare className="w-12 h-12 mb-3" />
                    <p className="text-label-sm font-display font-bold uppercase tracking-wider max-w-[200px]">Awaiting transmission...</p>
                  </motion.div>
                ) : (
                  messages.map((msg, idx) => (
                    <motion.div
                      key={msg.id || idx}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.2 }}
                      className={`flex flex-col ${msg.userId === user.id ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className={`text-caption font-display font-bold uppercase tracking-wider ${msg.userId === user.id ? 'text-accent-primary' : 'text-fg-tertiary'}`}>
                          {msg.user_email?.split('@')[0]}
                        </span>
                        <span className="text-caption text-fg-tertiary/50">
                          {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Link:00'}
                        </span>
                      </div>
                      <motion.div
                        layout
                        className={`px-4 py-3 rounded-2xl text-body-sm max-w-[85%] leading-relaxed ${msg.userId === user.id
                          ? 'bg-accent-primary text-fg-inverse font-semibold shadow-elevation-2'
                          : 'bg-bg-tertiary text-fg-secondary border border-border-primary'}`}
                      >
                        {msg.content}
                      </motion.div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="relative">
              <input
                type="text"
                placeholder="Transmit focus signals..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="input pr-14"
              />
              <motion.button
                type="submit"
                disabled={!inputMessage.trim()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-accent-primary text-fg-inverse hover:shadow-glow-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed focus-ring"
                aria-label="Send Message"
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Quiz Synchronization Lobby Overlay */}
      <AnimatePresence>
        {activeQuiz && (
          <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancelLobby}
              className="absolute inset-0 bg-bg-overlay backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="card-glass max-w-xl w-full p-8 text-center border-accent-secondary/30 relative"
            >
              <div className="absolute top-4 right-4">
                {(String(activeQuiz.initiatorId) === String(user.id)) && (
                  <motion.button
                    onClick={handleCancelLobby}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className="btn-icon text-fg-tertiary hover:text-fg-primary"
                    aria-label="Close Lobby"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                )}
              </div>

              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 bg-accent-secondary-dim border border-accent-secondary/30 rounded-full flex items-center justify-center mx-auto mb-6 text-accent-secondary"
              >
                <Zap className="w-10 h-10" />
              </motion.div>
              <h2 className="text-heading-lg font-display font-bold text-fg-primary mb-3 uppercase tracking-tight italic">Collaborative Neural Sync</h2>
              <p className="text-body-md text-fg-secondary mb-8">Evaluating parameters for: <span className="font-display font-bold text-fg-primary">{activeQuiz.topicName}</span></p>

              <div className="space-y-4 mb-8">
                <div className="text-label-sm font-display font-bold text-fg-tertiary uppercase tracking-wider">Synced Neural Links ({lobbyUsers.length})</div>
                <div className="flex flex-wrap justify-center gap-2">
                  {lobbyUsers.length === 0 && (
                    <span className="text-label-sm text-fg-tertiary/60 italic font-display uppercase tracking-wider">Awaiting handshake...</span>
                  )}
                  {lobbyUsers.map(u => (
                    <motion.div
                      key={u.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="badge badge-primary"
                    >
                      {u.email.split('@')[0]}
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {!lobbyUsers.find(u => String(u.id) === String(user.id)) && (
                  <motion.button
                    onClick={handleJoinLobby}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-secondary py-4"
                  >
                    <Users className="w-5 h-5 mr-2" />
                    Establish Sync Link
                  </motion.button>
                )}

                {(String(activeQuiz.initiatorId) === String(user.id)) && (
                  <motion.button
                    onClick={handleStartQuiz}
                    disabled={lobbyUsers.length === 0}
                    whileHover={!lobbyUsers.length === 0 ? { scale: 1.02 } : {}}
                    whileTap={!lobbyUsers.length === 0 ? { scale: 0.98 } : {}}
                    className="btn-primary py-4 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Initiate Collective Evaluation
                  </motion.button>
                )}

                {String(activeQuiz.initiatorId) !== String(user.id) && lobbyUsers.find(u => String(u.id) === String(user.id)) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    className="flex items-center justify-center gap-2 py-3 text-accent-tertiary"
                    transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="font-display text-label-sm font-bold uppercase tracking-wider">Awaiting Librarian signal...</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Topic Selection Modal */}
      <AnimatePresence>
        {topicSelectionDoc && (
          <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTopicSelectionDoc(null)}
              className="absolute inset-0 bg-bg-overlay backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="card-glass max-w-2xl w-full max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-5 border-b border-border-primary">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-primary-dim border border-accent-primary/30 flex items-center justify-center text-accent-primary">
                    <Brain className="w-5 h-5" />
                  </div>
                  <h3 className="text-heading-lg font-display font-bold text-fg-primary uppercase tracking-wider">Select Neural Segment</h3>
                </div>
                <motion.button
                  onClick={() => setTopicSelectionDoc(null)}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  className="btn-icon text-fg-tertiary hover:text-fg-primary"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-2 p-5">
                {topicSelectionDoc.topics.map((t, idx) => (
                  <motion.button
                    key={t.chunk_id || idx}
                    onClick={() => handleTopicSelect(t)}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className="card-hover p-4 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-label-sm font-display font-bold text-accent-primary uppercase tracking-wider mb-1">Module {idx + 1}</div>
                        <div className="font-display font-semibold text-fg-primary">{t.topic}</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-fg-tertiary group-hover:text-accent-primary transition-colors" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quiz Component */}
      <AnimatePresence>
        {quizStarted && (
          <div className="fixed inset-0 z-[var(--z-modal)] bg-bg-primary">
            <Quiz
              documentId={activeQuiz?.documentId}
              chunkId={activeQuiz?.chunkId}
              topicTitle={activeQuiz?.topicName}
              isRoomQuiz={true}
              roomCode={code}
              onBack={() => {
                setQuizStarted(false);
                setActiveQuiz(null);
              }}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActiveRoom;