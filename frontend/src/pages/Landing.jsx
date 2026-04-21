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
  Layout
} from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-cosmos-950 selection:bg-pulse-cyan/30">
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
            <Link to="/login" className="font-display text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors">
              Access Console
            </Link>
            <Link to="/login" className="px-6 py-2.5 bg-white text-cosmos-950 font-display text-xs font-bold uppercase tracking-widest rounded-xl hover:scale-105 transition-all">
              Join Mission
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-pulse-cyan/10 blur-[120px] rounded-full" />
        
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-8">
              <Sparkles className="w-4 h-4 text-pulse-cyan" />
              <span className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-pulse-cyan">The Future of Neural Productivity</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-display font-bold mb-8 leading-tight tracking-tighter">
              Neural-Sync Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-pulse-cyan/50">Workspace Presence.</span>
            </h1>

            <p className="max-w-2xl mx-auto text-gray-400 text-lg md:text-xl font-body mb-12 leading-relaxed">
              Experience the evolution of deep work. Collaborative RAG-driven focus rooms, 
              AI-generated neural quizzes, and cosmic Pomodoro cycles designed for the elite mind.
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <Link to="/login" className="btn-premium flex items-center gap-4">
                Launch Console <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/login" className="btn-premium-outline">
                Explore The Sector
              </Link>
            </div>
          </motion.div>

          {/* Interactive UI Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="mt-24 relative max-w-5xl mx-auto"
          >
            <div className="glass-premium p-4 aspect-[16/9] relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-b from-transparent to-cosmos-950 z-20" />
               <div className="w-full h-full bg-cosmos-800 rounded-2xl border border-white/5 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.1)_0%,transparent_70%)] animate-pulse" />
                  <div className="flex flex-col items-center gap-6 relative z-10">
                    <BrainCircuit className="w-24 h-24 text-pulse-cyan/20" />
                    <div className="flex gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-32 h-20 glass-premium border-white/5" />
                        ))}
                    </div>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-display font-bold mb-4 uppercase italic">Advanced Subsystems</h2>
            <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">Engineered for Peak Cognitive Output</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Users}
              title="Focus Sectors"
              description="Collaborative rooms with real-time neural sync and shared document intelligence."
              color="text-pulse-cyan"
            />
            <FeatureCard 
              icon={BrainCircuit}
              title="RAG Quizzes"
              description="AI automatically generates rigorous test patterns from your uploaded materials."
              color="text-pulse-mint"
            />
            <FeatureCard 
              icon={Clock}
              title="Opalite Cycles"
              description="Cosmic Pomodoro patterns synchronized across your entire team."
              color="text-pulse-rose"
            />
          </div>
        </div>
      </section>

      {/* Dark Footer */}
      <footer className="border-t border-white/5 py-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <Sparkles className="w-6 h-6 text-white" />
                    <span className="font-display font-bold text-lg tracking-widest text-white uppercase italic">Opalite</span>
                </div>
                <p className="text-gray-500 text-sm max-w-xs">Built for the next generation of engineers, artists, and creators.</p>
            </div>
            <div className="flex gap-12">
                <FooterLinks title="Platform" links={['Rooms', 'Dashboard', 'Timer', 'Analytics']} />
                <FooterLinks title="Legal" links={['Privacy', 'Protocol', 'Terms']} />
            </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex justify-between items-center text-[10px] uppercase font-display font-bold tracking-widest text-gray-600">
            <span>© 2026 OPALITE PROTOCOL</span>
            <span>DESIGNED BY CORTEX SYSTEMS</span>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, description, color }) => (
  <div className="glass-card flex flex-col gap-6 group">
    <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center ${color} transition-transform group-hover:scale-110`}>
      <Icon className="w-8 h-8" />
    </div>
    <div>
        <h3 className="text-xl font-display font-bold mb-3">{title}</h3>
        <p className="text-gray-400 font-body leading-relaxed text-sm">{description}</p>
    </div>
  </div>
);

const FooterLinks = ({ title, links }) => (
    <div className="flex flex-col gap-4">
        <span className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-white">{title}</span>
        <ul className="space-y-2">
            {links.map(l => (
                <li key={l}>
                    <a href="#" className="text-xs text-gray-500 hover:text-white transition-colors">{l}</a>
                </li>
            ))}
        </ul>
    </div>
);

export default Landing;
