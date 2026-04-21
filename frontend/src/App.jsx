import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { 
  LayoutDashboard, 
  Timer as TimerIcon, 
  Library, 
  Trophy, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Sparkles
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Timer from './pages/Timer';
import Study from './pages/Study';
import Leaderboard from './pages/Leaderboard';
import FocusRooms from './pages/FocusRooms';
import ActiveRoom from './pages/ActiveRoom';

const Sidebar = ({ isOpen, toggle }) => {
  const location = useLocation();
  const { logout, user } = useAuth();

  const menuItems = [
    { name: 'Command', path: '/command', icon: LayoutDashboard },
    { name: 'Focus', path: '/timer', icon: TimerIcon },
    { name: 'Rooms', path: '/rooms', icon: Sparkles },
    { name: 'Library', path: '/study', icon: Library },
    { name: 'Ranks', path: '/leaderboard', icon: Trophy },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggle}
            className="fixed inset-0 bg-cosmos-950/80 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Panel */}
      <aside className={`fixed top-0 left-0 bottom-0 w-72 bg-cosmos-950/50 backdrop-blur-xl border-r border-white/5 z-50 transition-transform duration-500 transform lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-16 px-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-cosmos-950" />
            </div>
            <span className="font-display font-bold text-lg tracking-[0.2em] text-white uppercase italic">Opalite</span>
          </div>

          <nav className="space-y-1 flex-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  onClick={() => isOpen && toggle()}
                  className={`nav-item-v2 ${isActive ? 'active' : ''}`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-8 px-4">
             <div className="flex items-center gap-4 py-4 border-t border-white/5">
                <div className="w-10 h-10 rounded-xl bg-cosmos-800 border border-white/10 overflow-hidden shadow-lg">
                    <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user?.email}`} alt="avatar" />
                </div>
                <div className="overflow-hidden">
                    <span className="font-display text-[10px] font-bold text-white block truncate uppercase tracking-widest">{user?.email?.split('@')[0]}</span>
                    <span className="text-[8px] text-pulse-cyan font-bold uppercase tracking-tighter">Frequency Active</span>
                </div>
             </div>

            <button className="flex items-center gap-4 w-full text-pulse-rose hover:text-white transition-colors py-2" onClick={logout}>
              <LogOut className="w-5 h-5" />
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em]">Terminate</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

const Header = ({ toggleSidebar }) => {
    return (
        <header className="fixed top-0 left-0 right-0 h-20 bg-cosmos-950/20 backdrop-blur-xl border-b border-white/5 z-40 lg:left-72">
            <div className="h-full px-12 flex items-center justify-between">
                <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-400 hover:text-white">
                    <Menu className="w-6 h-6" />
                </button>
                <div className="hidden lg:block">
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-pulse-mint animate-pulse" />
                        <span className="text-[10px] font-display font-bold text-gray-400 uppercase tracking-[0.3em]">Sector Alpha-9 Base // Uplink Nominal</span>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-gray-400 hover:text-pulse-cyan transition-colors relative border border-white/5">
                        <Bell className="w-4 h-4" />
                        <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-pulse-rose rounded-full shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span>
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-gray-400 hover:text-white transition-colors border border-white/5">
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </header>
    );
};

const ProtectedLayout = ({ children }) => {
  const { token, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return (
      <div className="min-h-screen bg-cosmos-950 flex items-center justify-center">
          <Sparkles className="w-12 h-12 text-white animate-pulse" />
      </div>
  );
  
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-cosmos-950 transition-colors duration-500 overflow-x-hidden">
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />
      <Header toggleSidebar={() => setSidebarOpen(true)} />
      <main className="lg:ml-72 pt-32 px-6 lg:px-20 pb-20 max-w-[1600px] mx-auto">
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/command" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/timer" element={<ProtectedLayout><Timer /></ProtectedLayout>} />
          <Route path="/study" element={<ProtectedLayout><Study /></ProtectedLayout>} />
          <Route path="/leaderboard" element={<ProtectedLayout><Leaderboard /></ProtectedLayout>} />
          <Route path="/rooms" element={<ProtectedLayout><FocusRooms /></ProtectedLayout>} />
          <Route path="/rooms/:code" element={<ProtectedLayout><ActiveRoom /></ProtectedLayout>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
