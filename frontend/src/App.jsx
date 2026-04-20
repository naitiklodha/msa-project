import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Clock, Zap, Users, Moon, Sun, ArrowRight, CheckSquare, Square, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Quiz from './Quiz';

const StatCard = ({ title, value, icon: Icon, color, delay, featured, link }) => (
  <motion.a
    href={link}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`glass-panel block group hover:bg-white/40 dark:hover:bg-white/5 transition-all relative ${
      featured ? 'p-10 text-center shadow-2xl scale-105' : 'p-6'
    }`}
  >
    <div className={`flex items-center ${featured ? 'flex-col space-y-8' : 'flex-row space-x-6'}`}>
      <div className={`p-6 rounded-2xl bg-opacity-20 dark:bg-opacity-20 ${color} bg-current shadow-lg`}>
        <Icon className={`${featured ? 'w-24 h-24' : 'w-8 h-8'} ${color.replace('bg-', 'text-')} dark:${color.replace('bg-', 'text-')} text-current`} />
      </div>
      <div>
        <p className={`${featured ? 'text-lg text-gray-400' : 'text-sm text-gray-500 dark:text-gray-400'} font-bold uppercase tracking-widest`}>{title}</p>
        <h3 className={`${featured ? 'text-[8rem] leading-none mt-4 text-white drop-shadow-2xl' : 'text-3xl mt-1 text-gray-900 dark:text-white'} font-black tracking-tighter flex items-center justify-center`}>
          {value}
        </h3>
      </div>
    </div>
    {link && (
        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-white/20 dark:bg-white/10 rounded-full">
            <ArrowRight className="w-5 h-5 text-gray-800 dark:text-white" />
        </div>
    )}
  </motion.a>
);

const UploadDocumentButton = () => {
    const [fileName, setFileName] = useState(null);
    const inputRef = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) setFileName(file.name);
    };

    return (
        <div className="relative group/upload">
            <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                id="session-doc-upload"
                onChange={handleFileChange}
            />
            <label
                htmlFor="session-doc-upload"
                title="Upload a document to auto-generate sessions"
                className="flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/30 border border-blue-500/30 hover:border-blue-500/60 text-blue-500 dark:text-blue-400 transition-all duration-200 hover:scale-105 active:scale-95 select-none"
            >
                <Paperclip className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">
                    {fileName ? fileName.length > 12 ? fileName.slice(0, 12) + '…' : fileName : 'Upload Doc'}
                </span>
            </label>
            {/* Tooltip */}
            <div className="absolute -bottom-9 right-0 pointer-events-none opacity-0 group-hover/upload:opacity-100 transition-opacity duration-200 whitespace-nowrap bg-gray-900 dark:bg-gray-800 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-xl z-50">
                Upload PDF / DOCX to generate sessions
            </div>
        </div>
    );
};

const TodoList = () => {
    const [pomodoros, setPomodoros] = useState([
        {
            id: 'p1',
            title: "Pomodoro 1",
            time: "25 min",
            topics: [
                { id: 11, text: "Read Documentation", done: true },
                { id: 12, text: "Define API schemas", done: true },
            ]
        },
        {
            id: 'p2',
            title: "Pomodoro 2",
            time: "25 min",
            topics: [
                { id: 21, text: "Write Gateway Config", done: false },
                { id: 22, text: "Review Kong Docs", done: false },
            ]
        },
        {
            id: 'p3',
            title: "Pomodoro 3 & 4",
            time: "50 min",
            topics: [
                { id: 31, text: "Design Microfrontend", done: false },
                { id: 32, text: "Setup WebSockets", done: false },
                { id: 33, text: "Prepare presentation", done: false },
            ]
        }
    ]);

    const toggleTask = (pomodoroId, topicId) => {
        setPomodoros(pomodoros.map(p => {
            if (p.id === pomodoroId) {
                return {
                    ...p,
                    topics: p.topics.map(t => t.id === topicId ? { ...t, done: !t.done } : t)
                };
            }
            return p;
        }));
    };

    const totalTopics = pomodoros.reduce((acc, p) => acc + p.topics.length, 0);
    const completedTopics = pomodoros.reduce((acc, p) => acc + p.topics.filter(t => t.done).length, 0);

    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel p-6 h-[550px] flex flex-col relative overflow-hidden"
        >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-white/10 pb-4 flex justify-between items-center">
                <span>Session Targets 🎯</span>
                <div className="flex items-center gap-2">
                    <UploadDocumentButton />
                    <span className="text-xs font-semibold bg-primary/20 text-primary px-3 py-1 rounded-full uppercase tracking-widest">Schedule</span>
                </div>
            </h3>
            
            <div className="flex-1 space-y-5 overflow-y-auto pr-2 custom-scrollbar">
                {pomodoros.map((pomodoro) => {
                    const allDone = pomodoro.topics.every(t => t.done);
                    return (
                        <div key={pomodoro.id} className={`p-4 rounded-xl border transition-colors ${allDone ? 'bg-green-500/10 border-green-500/20' : 'bg-white/40 dark:bg-card border-gray-200 dark:border-white/5 shadow-sm'}`}>
                            <div className="flex justify-between items-center mb-3">
                                <span className={`text-sm font-black uppercase tracking-wider ${allDone ? 'text-green-600 dark:text-green-400' : 'text-blue-500 dark:text-blue-400'}`}>
                                    {pomodoro.title}
                                </span>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center bg-black/5 dark:bg-white/5 px-2 py-1 rounded">
                                    <Clock className="w-3 h-3 mr-1"/> {pomodoro.time}
                                </span>
                            </div>
                            <div className="space-y-1">
                                {pomodoro.topics.map((topic) => (
                                    <div 
                                        key={topic.id}
                                        className={`flex items-start space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                            topic.done 
                                                ? 'opacity-50' 
                                                : 'hover:bg-white/60 dark:hover:bg-white/10'
                                        }`}
                                        onClick={() => toggleTask(pomodoro.id, topic.id)}
                                    >
                                        <div className="mt-0.5">
                                            {topic.done ? (
                                                <CheckSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
                                            ) : (
                                                <Square className="w-4 h-4 text-gray-400" />
                                            )}
                                        </div>
                                        <span className={`text-sm font-medium leading-snug ${topic.done ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                                            {topic.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
                <div className="flex justify-between text-sm font-semibold text-gray-500 dark:text-gray-400">
                    <span>Session Progress:</span>
                    <span>{completedTopics} / {totalTopics} topics</span>
                </div>
                <div className="mt-3 h-2.5 w-full bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(completedTopics / totalTopics) * 100}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div>
        </motion.div>
    );
};

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [data, setData] = useState({
    users: { count: 0, status: 'connecting' },
    timer: { active: 0, status: 'connecting' },
    games: { active: 0, status: 'connecting' }
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Initialize Dark Mode
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axios.get('/api/dashboard');
        setData(prev => ({ ...prev, ...res.data }));
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      }
    };
    fetchDashboard();

    const socket = io('/', { path: '/socket.io' });
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('dashboard_update', (update) => {
      setData(prev => ({ ...prev, ...update }));
    });

    return () => socket.disconnect();
  }, []);

  if (currentView === 'quiz') {
    return <Quiz onBack={() => setCurrentView('dashboard')} isDark={isDark} setIsDark={setIsDark} />;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 lg:p-12 mb-20 relative min-h-screen flex flex-col pt-12 md:pt-20">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-12 md:mb-16"
      >
        <div>
          <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-blue-500 mb-2">
            FocusPulse
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium tracking-wide">Real-time Service Dashboard</p>
        </div>
        
        <div className="flex items-center space-x-4 md:space-x-6">
          <button onClick={() => setCurrentView('quiz')} className="flex items-center space-x-3 glass-panel px-4 py-2.5 md:px-5 md:py-2.5 rounded-full hover:bg-white/40 dark:hover:bg-white/10 transition-all group shadow-sm z-10 hover:scale-105 active:scale-95 focus:outline-none">
            <Zap className="w-5 h-5 text-green-500" />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
              Quizzes: <span className="text-green-500 font-black ml-1">{data.games?.active || '---'}</span>
            </span>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-all hidden md:block" />
          </button>

          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-3 rounded-full glass-panel hover:scale-110 active:scale-95 transition-all text-gray-600 dark:text-yellow-400 focus:outline-none z-10"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 text-indigo-600" />}
          </button>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Stats Area - 8 columns */}
        <div className="lg:col-span-8 flex flex-col justify-center h-[550px]">
            {/* Pomodoro Timer Center Piece */}
            <div className="flex justify-center relative -top-10">
              <div className="w-full max-w-2xl">
                  <StatCard 
                    title="Live Pomodoros" 
                    value={data.timer?.active || '---'} 
                    icon={Clock} 
                    color="bg-purple-500 text-purple-600 dark:text-purple-400"
                    delay={0.1}
                    featured={true}
                  />
              </div>
            </div>
        </div>

        {/* To-Do List Area - 4 columns (Right Corner) */}
        <div className="lg:col-span-4 h-full">
            <TodoList />
        </div>
      </div>
    </div>
  );
}

export default App;
