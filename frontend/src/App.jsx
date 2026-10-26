import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider, useTheme } from './ThemeProvider';
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
  Sparkles,
  Sun,
  Moon,
  Monitor
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
            className="fixed inset-0 bg-bg-overlay backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Panel */}
      <aside className={`fixed top-0 left-0 bottom-0 w-72 bg-bg-elevated/80 backdrop-blur-2xl border-r border-border-primary z-50 transition-transform duration-500 ease-out-expo transform lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-16 px-4">
            <div className="w-10 h-10 bg-gradient-to-br from-accent-primary to-accent-tertiary rounded-xl flex items-center justify-center shadow-glow-primary">
              <Sparkles className="w-6 h-6 text-fg-inverse" />
            </div>
            <span className="font-display font-bold text-lg tracking-[0.2em] text-fg-primary uppercase italic">Opalite</span>
          </div>

          <nav className="space-y-1 flex-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => isOpen && toggle()}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-fg-secondary font-display text-label-sm font-semibold uppercase tracking-wider transition-all duration-fast
                    ${isActive
                      ? 'bg-accent-primary-dim text-accent-primary border border-accent-primary/30 shadow-glow-primary'
                      : 'hover:bg-bg-tertiary hover:text-fg-primary'}`}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-4 px-4 pb-4">
            <div className="flex items-center gap-3 py-3 border-t border-border-primary">
              <div className="w-10 h-10 rounded-xl bg-bg-tertiary border border-border-primary overflow-hidden shadow-inner relative">
                <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user?.email}`} alt="avatar" className="w-full h-full object-cover" />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-accent-tertiary border-2 border-bg-elevated rounded-full" />
              </div>
              <div className="overflow-hidden min-w-0 flex-1">
                <span className="font-display text-label-sm font-bold text-fg-primary block truncate uppercase tracking-widest">{user?.email?.split('@')[0]}</span>
                <span className="text-caption text-accent-tertiary font-bold uppercase tracking-tighter">Frequency Active</span>
              </div>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-fg-secondary font-display text-label-sm font-bold uppercase tracking-wider
                hover:bg-semantic-danger-dim hover:text-semantic-danger hover:border-semantic-danger/30
                border border-transparent transition-all duration-fast focus-ring"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span>Terminate</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

const ThemeToggle = () => {
  const { theme, resolvedTheme, cycleTheme } = useTheme();

  const icons = {
    light: <Sun className="w-4 h-4" />,
    dark: <Moon className="w-4 h-4" />,
    system: <Monitor className="w-4 h-4" />,
  };

  const labels = {
    light: 'Light',
    dark: 'Dark',
    system: 'System',
  };

  return (
    <button
      onClick={cycleTheme}
      className="w-10 h-10 flex items-center justify-center rounded-xl bg-bg-tertiary border border-border-primary text-fg-secondary hover:text-fg-primary hover:border-border-secondary transition-all duration-fast focus-ring"
      aria-label={`Theme: ${labels[theme]} (click to cycle)`}
      title={`Theme: ${labels[theme]} — click to cycle`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
          transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
        >
          {icons[theme]}
        </motion.div>
      </AnimatePresence>
    </button>
  );
};

const Header = ({ toggleSidebar }) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-bg-overlay backdrop-blur-xl border-b border-border-primary z-40 lg:left-72">
      <div className="h-full px-6 lg:px-12 flex items-center justify-between">
        <button onClick={toggleSidebar} className="lg:hidden p-2 text-fg-tertiary hover:text-fg-primary focus-ring rounded-lg">
          <Menu className="w-6 h-6" />
        </button>
        <div className="hidden lg:block flex-1">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-accent-tertiary animate-pulse" />
            <span className="text-label-sm font-display font-bold text-fg-tertiary uppercase tracking-[0.3em]">Sector Alpha-9 Base // Uplink Nominal</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-bg-tertiary border border-border-primary text-fg-tertiary hover:text-accent-primary hover:border-accent-primary/50 transition-all duration-fast focus-ring relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-accent-secondary rounded-full shadow-[0_0_8px_var(--color-accent-secondary-dim)]"></span>
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-bg-tertiary border border-border-primary text-fg-tertiary hover:text-fg-primary hover:border-border-secondary transition-all duration-fast focus-ring">
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
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <Sparkles className="w-12 h-12 text-accent-primary animate-pulse" />
    </div>
  );

  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-bg-primary transition-colors duration-500 overflow-x-hidden">
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
