import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  BrainCircuit, 
  Users, 
  Clock, 
  ArrowRight,
  Shield,
  Zap,
  Layout,
  Globe,
  Database
} from 'lucide-react';

const Landing = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    }
  };

  return (
    <div className="min-h-screen bg-cosmos-950 selection:bg-pulse-cyan/30 overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-cosmos-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-cosmos-950" />
            </div>
            <span className="font-display font-bold text-lg tracking-[0.2em] text-white uppercase italic">Opalite</span>
          </div>
          <div className="flex items-center gap-8">
            <Link to="/login" className="font-display text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-all whitespace-nowrap">
              Access Console
            </Link>
            <Link to="/login" className="px-6 py-2.5 bg-white text-cosmos-950 font-display text-[10px] font-bold uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all whitespace-nowrap">
              Join Mission
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Asymmetrical */}
      <section className="relative pt-48 pb-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-left relative z-10"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-8">
              <div className="w-2 h-2 rounded-full bg-pulse-cyan animate-pulse" />
              <span className="text-[10px] font-display font-bold uppercase tracking-[0.3em] text-pulse-cyan">System Status: Optimal</span>
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-7xl md:text-9xl font-semibold mb-8 leading-none tracking-tighter italic">
              Neural <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-pulse-cyan/30">Dynamics.</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="max-w-lg text-gray-400 text-lg font-light mb-12 leading-relaxed">
              The elite framework for cognitive synchronization. Deploy distributed focus rooms, 
              generate neural-linked assessments, and architect your deep work environment.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6">
              <Link to="/login" className="btn-opal flex items-center justify-center gap-4">
                Initialize <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/login" className="px-8 py-4 border border-white/10 text-white rounded-2xl font-display text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all text-center">
                Review Protocol
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex items-center justify-center pointer-events-none"
          >
            {/* Visual Neural Node */}
            <div className="relative w-80 h-80 md:w-[500px] md:h-[500px]">
              <div className="absolute inset-0 bg-pulse-cyan/20 blur-[120px] rounded-full animate-pulse" />
              <svg viewBox="0 0 200 200" className="w-full h-full relative z-10 opacity-40">
                <motion.circle
                  cx="100" cy="100" r="80"
                  fill="none" stroke="currentColor" strokeWidth="0.5"
                  className="text-white"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
                <motion.circle
                  cx="100" cy="100" r="60"
                  fill="none" stroke="currentColor" strokeWidth="0.5"
                  className="text-pulse-cyan"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                />
                <path d="M100 20 L100 180 M20 100 L180 100" stroke="currentColor" strokeWidth="0.2" className="text-white/20" />
                {[...Array(8)].map((_, i) => (
                  <motion.circle
                    key={i}
                    cx={100 + 80 * Math.cos(i * Math.PI / 4)}
                    cy={100 + 80 * Math.sin(i * Math.PI / 4)}
                    r="2"
                    fill="currentColor"
                    className="text-pulse-cyan"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <BrainCircuit className="w-24 h-24 text-white/10" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features - Bento Grid Layout */}
      <section className="py-32 px-6 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
            <div>
              <h2 className="text-5xl md:text-7xl italic font-medium mb-4 uppercase">Subsystems</h2>
              <p className="text-pulse-cyan font-display text-[10px] font-bold uppercase tracking-[0.4em]">Engineered for Peak Cognitive Output</p>
            </div>
            <div className="text-gray-500 text-sm max-w-sm text-right font-light">
              Distributed infrastructure built to sustain deep work cycles through neural synchronization and collaborative AI.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-4 h-full md:h-[600px]">
            <div className="md:col-span-2 md:row-span-1 glass-card overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users className="w-32 h-32" />
              </div>
              <div className="relative z-10 h-full flex flex-col justify-end">
                <h3 className="text-3xl mb-4 italic">Collaborative Sectors</h3>
                <p className="text-gray-400 text-sm max-w-md">Synchronous focus rooms with live document intelligence and peer-to-peer neural state tracking.</p>
              </div>
            </div>

            <div className="md:col-span-1 md:row-span-2 glass-card flex flex-col justify-between group">
              <div className="w-12 h-12 rounded-xl bg-pulse-mint/20 flex items-center justify-center text-pulse-mint mb-8">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-3xl mb-4 italic">RAG Quizzes</h3>
                <p className="text-gray-400 text-sm">Automated assessment generation from integrated knowledge vectors.</p>
              </div>
            </div>

            <div className="md:col-span-1 md:row-span-1 glass-card group">
               <Clock className="w-10 h-10 text-pulse-rose mb-6 opacity-30" />
               <h3 className="text-2xl mb-2 italic">Atomic Cycles</h3>
               <p className="text-gray-400 text-xs">Precision-timed Pomodoro protocols.</p>
            </div>

            <div className="md:col-span-1 md:row-span-1 glass-card group flex flex-col items-center justify-center text-center">
               <Globe className="w-8 h-8 text-white/20 mb-4" />
               <span className="text-[10px] font-display font-bold uppercase tracking-widest text-pulse-cyan">99.9% Net Uptime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Dark Footer */}
      <footer className="border-t border-white/5 py-24 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
            <div>
                <div className="flex items-center gap-3 mb-8">
                    <Sparkles className="w-6 h-6 text-white" />
                    <span className="font-display font-bold text-lg tracking-widest text-white uppercase italic">Opalite</span>
                </div>
                <p className="text-gray-500 text-sm max-w-xs font-light leading-relaxed">Built for the next generation of engineers and creators. Designed by Cortex Systems.</p>
            </div>
            <div className="grid grid-cols-2 gap-24">
                <FooterLinks title="Platform" links={['Sectors', 'Dashboard', 'Neural Sync', 'Analytics']} />
                <FooterLinks title="Legal" links={['Privacy', 'Protocol', 'Terms']} />
            </div>
        </div>
        <div className="max-w-7xl mx-auto mt-24 pt-8 border-t border-white/5 flex justify-between items-center text-[10px] uppercase font-display font-bold tracking-widest text-gray-700">
            <span>© 2026 OPALITE PROTOCOL</span>
            <span>SYSTEM VERSION 2.5.1</span>
        </div>
      </footer>
    </div>
  );
};

const FooterLinks = ({ title, links }) => (
    <div className="flex flex-col gap-6">
        <span className="text-[10px] font-display font-bold uppercase tracking-[0.3em] text-white/50">{title}</span>
        <ul className="space-y-3">
            {links.map(l => (
                <li key={l}>
                    <a href="#" className="text-xs text-gray-500 hover:text-white transition-colors">{l}</a>
                </li>
            ))}
        </ul>
    </div>
);

export default Landing;

