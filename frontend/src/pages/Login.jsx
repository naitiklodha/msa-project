import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, Mail, Lock, Loader2, Sparkles, Zap, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

const Login = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        navigate('/command');
      } else {
        await register(email, password);
        await login(email, password);
        navigate('/command');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication sequence failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-accent-primary-dim rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-accent-secondary-dim rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent-tertiary-dim rounded-full blur-3xl animate-breathe" />
      </div>

      {/* Noise overlay */}
      <div className="absolute inset-0 pointer-events-none -z-10 noise-overlay" />

      {/* Left Side: Branding/Visuals */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-between p-12 md:p-20 bg-bg-secondary/30 backdrop-blur-xl border-r border-border-primary">
        <div>
          <div className="flex items-center gap-4 mb-16">
            <div className="w-12 h-12 bg-gradient-to-br from-accent-primary to-accent-tertiary rounded-2xl flex items-center justify-center shadow-glow-primary">
              <Sparkles className="w-8 h-8 text-fg-inverse" />
            </div>
            <span className="font-display font-bold text-2xl tracking-[0.3em] text-fg-primary uppercase italic">Opalite</span>
          </div>

          <div className="space-y-8">
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-display-xl md:text-display-lg font-bold leading-none tracking-tight text-fg-primary"
            >
              The Neural <br />
              <span className="text-accent-primary italic">Command</span> Hub.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-body-lg text-fg-secondary max-w-md font-light leading-relaxed"
            >
              Synchronize your cognitive output with the largest collaborative deep-work network in the sector.
            </motion.p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-6"
        >
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-bg-primary bg-bg-tertiary flex items-center justify-center overflow-hidden shadow-elevation-1">
                <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=user${i}`} alt="user" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <span className="text-label-sm font-display font-bold text-fg-tertiary uppercase tracking-widest">
            +14.2k Active Commanders Online
          </span>
        </motion.div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-12 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={isLogin ? 'login' : 'register'}
            initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                className="w-14 h-14 mx-auto mb-6 bg-gradient-to-br from-accent-primary to-accent-tertiary rounded-2xl flex items-center justify-center shadow-glow-primary"
              >
                <Sparkles className="w-8 h-8 text-fg-inverse" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-display-sm font-display font-bold text-fg-primary uppercase tracking-wider mb-3 italic"
              >
                {isLogin ? 'Access Console' : 'Initialize Protocol'}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-label-sm font-display font-bold text-fg-tertiary uppercase tracking-[0.3em]"
              >
                {isLogin ? 'Enter neural uplink credentials' : 'Register neural signature identifier'}
              </motion.p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div className="form-field">
                <label htmlFor="email" className="label">
                  <Mail className="w-4 h-4 inline mr-1" /> Identifier
                </label>
                <div className="input-with-icon">
                  <Mail className="input-icon-element w-5 h-5" />
                  <input
                    id="email"
                    type="email"
                    placeholder="commander@sector.focuspulse"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input input-icon"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="form-field">
                <label htmlFor="password" className="label">
                  <Lock className="w-4 h-4 inline mr-1" /> Access Key
                </label>
                <div className="input-with-icon">
                  <Lock className="input-icon-element w-5 h-5" />
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input input-icon"
                    required
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                  />
                </div>
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    className="form-error p-4 rounded-xl bg-semantic-danger-dim border border-semantic-danger/30 text-semantic-danger flex items-center gap-3"
                    role="alert"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-body-sm">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={!loading ? { scale: 1.01 } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
                className="btn-primary w-full flex items-center justify-center gap-3 py-4 mt-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="tracking-wider">{isLogin ? 'Establishing Link...' : 'Initializing...'}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    <span className="tracking-wider">{isLogin ? 'Establish Link' : 'Begin Initialization'}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </form>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 text-center"
            >
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="flex items-center justify-center gap-2 text-label-sm font-display font-bold text-fg-tertiary hover:text-accent-primary uppercase tracking-wider transition-colors duration-fast"
              >
                {isLogin ? (
                  <>
                    No identifier? <span className="text-accent-primary">Initialize profile</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 -rotate-180" />
                    <span className="text-accent-primary">Return to access terminal</span>
                  </>
                )}
              </button>
            </motion.div>

            {/* Features hint */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-10 p-5 card bg-bg-secondary/50"
            >
              <div className="flex items-center gap-2 text-label-sm font-display font-bold text-fg-tertiary uppercase tracking-wider mb-4">
                <CheckCircle2 className="w-4 h-4 text-accent-tertiary" />
                Protocol Features
              </div>
              <ul className="space-y-2 text-body-sm text-fg-secondary">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-accent-tertiary flex-shrink-0" /> End-to-end encrypted neural sync</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-accent-tertiary flex-shrink-0" /> Distributed focus sectors</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-accent-tertiary flex-shrink-0" /> RAG-powered assessment generation</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-accent-tertiary flex-shrink-0" /> Real-time collaborative protocols</li>
              </ul>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Login;