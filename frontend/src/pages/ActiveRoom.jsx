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
    Trash2
} from 'lucide-react';
import { io } from 'socket.io-client';
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
    const [activeQuiz, setActiveQuiz] = useState(null); // { documentId, topicName, chunkId, initiatorId }
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
                socketRef.current = io('http://localhost:8000', {
                    path: '/ws/rooms/socket.io',
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
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <Zap className="w-12 h-12 text-pulse-cyan animate-pulse" />
            <span className="text-gray-500 font-display text-xs uppercase tracking-widest animate-pulse">Syncing room frequency...</span>
        </div>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-140px)]">
            {/* Room Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 pb-8 border-b border-white/5">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate('/rooms')} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 text-gray-500 hover:text-white transition-all border border-white/5">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-4xl font-display font-bold text-white tracking-tighter uppercase italic">{room.name}</h1>
                            <div className="px-3 py-1 rounded-xl bg-pulse-cyan/10 border border-pulse-cyan/20 text-pulse-cyan text-[10px] font-display font-black tracking-widest uppercase">
                                Sector: {room.code}
                            </div>
                        </div>
                        <div className="flex items-center gap-6 text-[10px] font-display font-bold uppercase tracking-widest text-gray-500">
                            <div className="flex items-center gap-2 text-pulse-mint">
                                <div className="w-2 h-2 rounded-full bg-pulse-mint shadow-[0_0_10px_rgba(52,211,153,0.4)] animate-pulse" />
                                {participants.length} Active Neural Links
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5" />
                                Uplink Established
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowLeaderboard(!showLeaderboard)}
                        className={`btn-premium-outline flex items-center gap-3 px-6 py-3 lowercase tracking-widest ${showLeaderboard ? 'border-pulse-rose text-pulse-rose bg-pulse-rose/5' : ''}`}
                    >
                        <Trophy className="w-4 h-4" />
                        Rankings
                    </button>
                    <button className="btn-premium flex items-center gap-3 px-6 py-3">
                        <Info className="w-4 h-4" />
                        Status
                    </button>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-12 gap-8 min-h-0 overflow-hidden">
                {/* Main Workspace (Documents & Quizzes) */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 overflow-hidden min-h-0">
                    <AnimatePresence>
                        {showLeaderboard && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="glass-premium border-pulse-rose/20 p-8 rounded-[40px] overflow-hidden relative"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-pulse-rose/10 blur-3xl rounded-full -mr-16 -mt-16" />
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-display font-bold uppercase tracking-widest text-pulse-rose">Sector Leaderboard</h3>
                                    <Trophy className="w-6 h-6 text-pulse-rose" />
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                                    {leaderboard.length > 0 ? leaderboard.map((entry, i) => (
                                        <div key={i} className="p-4 glass-premium bg-white/[0.02] border-white/5 flex flex-col items-center text-center group cursor-default">
                                            <div className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-3">Priority {i + 1}</div>
                                            <div className="w-12 h-12 rounded-2xl bg-cosmos-800 border border-white/10 overflow-hidden mb-3 group-hover:scale-110 transition-transform">
                                                <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${entry.email}`} alt="avatar" />
                                            </div>
                                            <span className="text-[10px] font-display font-bold text-white truncate w-full mb-1">{entry.email.split('@')[0]}</span>
                                            <span className="text-sm font-display text-pulse-rose font-black">{entry.score} <span className="text-[8px] opacity-50 uppercase">Pt</span></span>
                                        </div>
                                    )) : (
                                        <div className="col-span-full py-8 text-center text-[10px] font-display text-gray-500 uppercase tracking-widest italic">Awaiting neural input patterns...</div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Collaborative Document Repository */}
                    <div className="glass-premium p-10 flex flex-col min-h-0 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-pulse-cyan/5 blur-[100px] rounded-full -mr-32 -mt-32" />
                        
                        <div className="flex items-center justify-between mb-10 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-pulse-cyan">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-display font-bold text-white uppercase tracking-widest">Shared Lore</h3>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-tighter font-bold mt-1">Synchronized Study Data Pool</p>
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
                                    className="cursor-pointer btn-premium flex items-center gap-3 px-8 py-3"
                                >
                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Inject Data
                                </label>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-3 scrollbar-hide relative z-10">
                            {documents.length > 0 ? (
                                documents.map((doc) => (
                                    <motion.div
                                        key={doc.id}
                                        whileHover={{ x: 10 }}
                                        className="p-6 rounded-[32px] glass-premium bg-white/[0.01] border-white/[0.03] flex items-center justify-between group hover:border-white/10 hover:bg-white/[0.03]"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 rounded-3xl bg-cosmos-950 border border-white/5 flex items-center justify-center text-gray-500 group-hover:text-pulse-cyan transition-colors">
                                                <FileText className="w-7 h-7" />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-display font-bold uppercase tracking-widest mb-1">{doc.file_name}</h4>
                                                <div className="flex gap-4">
                                                    <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Size: {(doc.content_length / 1024).toFixed(1)} KB</span>
                                                    <span className="text-[10px] text-pulse-cyan uppercase font-black tracking-widest">Lore Verified</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                                            <button
                                                onClick={() => initiateGroupQuiz(doc.id, doc.file_name)}
                                                className="btn-premium px-6 py-2.5 bg-pulse-rose text-white shadow-lg text-[10px]"
                                            >
                                                Sync Quiz
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteDoc(e, doc.id)}
                                                className="p-2.5 rounded-xl bg-white/5 text-gray-500 hover:text-pulse-rose hover:bg-pulse-rose/10 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-700">
                                    <FileText className="w-16 h-16 mb-6 opacity-10" />
                                    <p className="text-[10px] font-display font-black uppercase tracking-[0.3em] italic">No lore detected in this sector.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Chat Panel */}
                <div className="col-span-12 lg:col-span-4 flex flex-col min-h-0">
                    <div className="glass-premium flex-1 p-10 rounded-[40px] flex flex-col overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-cosmos-900/60 to-transparent z-10 pointer-events-none" />
                        
                        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/5 relative z-20">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                                <MessageSquare className="w-6 h-6 text-pulse-cyan" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-display font-bold uppercase tracking-widest">Neural Net</h3>
                                <p className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">{messages.length} Recorded Communications</p>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto space-y-8 pr-4 scrollbar-hide mb-8">
                            {messages.map((msg, idx) => (
                                <div key={msg.id || idx} className={`flex flex-col ${msg.userId === user.id ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-3 mb-2 px-1">
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${msg.userId === user.id ? 'text-pulse-cyan' : 'text-gray-500'}`}>
                                            {msg.user_email?.split('@')[0]}
                                        </span>
                                        <span className="text-[8px] text-gray-700 uppercase">
                                            {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Link:00'}
                                        </span>
                                    </div>
                                    <div className={`px-6 py-4 rounded-[28px] text-xs max-w-[90%] leading-relaxed tracking-wide ${msg.userId === user.id
                                            ? 'bg-white text-cosmos-950 font-bold shadow-xl shadow-white/5'
                                            : 'bg-white/5 text-gray-300 border border-white/10'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendMessage} className="relative mt-auto">
                            <input
                                type="text"
                                placeholder="Transmit focus signals..."
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-sm text-white focus:outline-none focus:border-pulse-cyan transition-colors"
                            />
                            <button
                                type="submit"
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-pulse-cyan text-cosmos-950 rounded-xl hover:shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Quiz Synchronization Lobby Overlay */}
            <AnimatePresence>
                {activeQuiz && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-cosmos-950/90 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="glass max-w-xl w-full p-12 text-center border-pulse-rose/30 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4">
                                {(String(activeQuiz.initiatorId) === String(user.id)) && (
                                    <button onClick={handleCancelLobby} className="text-gray-500 hover:text-white transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            <div className="w-20 h-20 bg-pulse-rose/10 rounded-full flex items-center justify-center mx-auto mb-8 text-pulse-rose">
                                <Zap className="w-10 h-10" />
                            </div>
                            <h2 className="text-3xl font-display font-bold text-white mb-4 uppercase tracking-tighter italic">Collaborative Neural Sync</h2>
                            <p className="text-gray-400 mb-8 lowercase tracking-wide">Evaluating parameters for: <span className="text-white font-bold">{activeQuiz.topicName}</span></p>

                            <div className="space-y-6 mb-12">
                                <div className="text-[10px] font-display font-black text-gray-500 uppercase tracking-[0.3em]">Synced Neural Links ({lobbyUsers.length})</div>
                                <div className="flex flex-wrap justify-center gap-3">
                                    {lobbyUsers.length === 0 && <span className="text-[10px] text-gray-600 italic font-display uppercase tracking-widest">Awaiting handshake...</span>}
                                    {lobbyUsers.map(u => (
                                        <div key={u.id} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-display text-[10px] font-bold uppercase tracking-widest">
                                            {u.email.split('@')[0]}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {!lobbyUsers.find(u => String(u.id) === String(user.id)) && (
                                    <button
                                        onClick={handleJoinLobby}
                                        className="btn-primary w-full py-4 bg-pulse-rose hover:bg-pulse-rose/80"
                                    >
                                        Establish Sync Link
                                    </button>
                                )}

                                {(String(activeQuiz.initiatorId) === String(user.id)) && (
                                    <button
                                        onClick={handleStartQuiz}
                                        disabled={lobbyUsers.length === 0}
                                        className="btn-premium w-full py-4 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        Initiate Collective Evaluation
                                    </button>
                                )}
                                
                                {String(activeQuiz.initiatorId) !== String(user.id) && lobbyUsers.find(u => String(u.id) === String(user.id)) && (
                                    <div className="flex items-center justify-center gap-3 py-4 text-pulse-mint animate-pulse">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em]">Awaiting Librarian signal...</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Topic Selection Modal */}
            <AnimatePresence>
                {topicSelectionDoc && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-cosmos-950/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="glass max-w-2xl w-full p-10 max-h-[80vh] flex flex-col"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-pulse-cyan text-cosmos-950">
                                        <Brain className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-display font-bold text-white uppercase tracking-widest">Select Neural Segment</h3>
                                </div>
                                <button onClick={() => setTopicSelectionDoc(null)} className="text-gray-500 hover:text-white">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-hide">
                                {topicSelectionDoc.topics.map((t, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleTopicSelect(t)}
                                        className="w-full p-5 rounded-[24px] glass-premium bg-white/[0.01] border-white/5 hover:border-pulse-cyan/30 hover:bg-pulse-cyan/[0.02] transition-all flex items-center justify-between group"
                                    >
                                        <div className="text-left">
                                            <div className="text-[10px] font-display font-black text-pulse-cyan uppercase tracking-widest mb-1">Module {idx + 1}</div>
                                            <div className="text-white font-body font-bold">{t.topic}</div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-pulse-cyan transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {quizStarted && (
                <div className="fixed inset-0 z-[120] bg-cosmos-950">
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
        </div>
    );
};

export default ActiveRoom;
