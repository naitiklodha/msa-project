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
  Database,
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react';

const Landing = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
    }
  };

  const stats = [
    { value: '99.9%', label: 'Uptime SLA' },
    { value: '<50ms', label: 'Global Latency' },
    { value: '10k+', label: 'Active Sectors' },
    { value: 'Zero', label: 'Data Leaks' },
  ];

  const features = [
    {
      icon: Users,
      title: 'Collaborative Sectors',
      description: 'Synchronous focus rooms with live document intelligence and peer-to-peer neural state tracking.',
      accent: 'primary',
      large: true,
    },
    {
      icon: Zap,
      title: 'RAG Quizzes',
      description: 'Automated assessment generation from integrated knowledge vectors.',
      accent: 'secondary',
    },
    {
      icon: Clock,
      title: 'Atomic Cycles',
      description: 'Precision-timed Pomodoro protocols with adaptive break optimization.',
      accent: 'tertiary',
    },
    {
      icon: Shield,
      title: 'Encrypted by Default',
      description: 'End-to-end encryption on all neural sync channels. Your focus, your data.',
      accent: 'primary',
    },
    {
      icon: Layout,
      title: 'Custom Workflows',
      description: 'Compose focus protocols from modular primitives. Timer, quiz, break, repeat.',
      accent: 'secondary',
    },
    {
      icon: Globe,
      title: 'Global Edge Network',
      description: 'Sub-50ms latency worldwide. Deploy sectors anywhere, sync everywhere.',
      accent: 'tertiary',
    },
  ];

  return (
    <div className="min-h-screen bg-bg-primary selection:bg-accent-primary/30 overflow-hidden relative">
      {/* Animated background mesh */}
      <motion.div
        className="absolute inset-0 pointer-events-none -z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      >
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-accent-primary-dim rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent-secondary-dim rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent-tertiary-dim rounded-full blur-3xl animate-breathe" />
      </motion.div>

      {/* Noise overlay */}
      <div className="absolute inset-0 pointer-events-none -z-10 noise-overlay" />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border-primary bg-bg-overlay backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" aria-label="Opalite Home">
            <div className="w-10 h-10 bg-gradient-to-br from-accent-primary to-accent-tertiary rounded-xl flex items-center justify-center shadow-glow-primary">
              <Sparkles className="w-6 h-6 text-fg-inverse" />
            </div>
            <span className="font-display font-bold text-lg tracking-[0.2em] text-fg-primary uppercase italic">Opalite</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="btn-ghost hidden sm:inline-flex text-label-sm">
              Access Console
            </Link>
            <Link to="/login" className="btn-primary text-label-sm whitespace-nowrap">
              Join Mission
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 px-6 md:pt-56 md:pb-32">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-left relative z-10"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border-secondary bg-bg-elevated/80 backdrop-blur-xl mb-8">
              <div className="w-2 h-2 rounded-full bg-accent-tertiary animate-pulse" />
              <span className="text-label-sm font-display font-bold uppercase tracking-[0.3em] text-accent-tertiary">System Status: Optimal</span>
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-display-xl md:text-display-lg font-medium mb-8 leading-none tracking-tight italic text-fg-primary">
              Neural <br />
              <span className="bg-gradient-to-r from-fg-primary via-fg-primary to-accent-primary/60 bg-clip-text text-transparent">Dynamics.</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-body-lg text-fg-secondary max-w-xl mb-12 leading-relaxed font-light">
              The elite framework for cognitive synchronization. Deploy distributed focus rooms, generate neural-linked assessments, and architect your deep work environment.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link to="/login" className="btn-primary flex items-center justify-center gap-3 text-label-md py-4">
                Initialize
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/login" className="btn-outline text-label-md py-4 whitespace-nowrap">
                Review Protocol
              </Link>
            </motion.div>

            {/* Trust indicators */}
            <motion.div variants={itemVariants} className="mt-16 flex flex-wrap items-center gap-8 text-fg-tertiary">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-tertiary" />
                <span className="text-label-sm">SOC 2 Type II</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-tertiary" />
                <span className="text-label-sm">GDPR Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-tertiary" />
                <span className="text-label-sm">E2E Encrypted</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-tertiary" />
                <span className="text-label-sm">Open Source Core</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Visual Neural Node */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            className="relative flex items-center justify-center pointer-events-none"
          >
            <div className="relative w-80 h-80 md:w-[520px] md:h-[520px]">
              {/* Glow layers */}
              <div className="absolute inset-0 bg-accent-primary/20 blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '4s' }} />
              <div className="absolute inset-0 bg-accent-secondary/10 blur-[100px] rounded-full animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />

              {/* SVG Neural Network */}
              <svg viewBox="0 0 260 260" className="w-full h-full relative z-10 opacity-60" aria-hidden="true">
                <defs>
                  <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="var(--color-accent-primary)" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="var(--color-accent-primary)" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Orbit rings */}
                <motion.circle
                  cx="130" cy="130" r="100"
                  fill="none" stroke="currentColor" strokeWidth="0.5"
                  className="text-fg-tertiary/30"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                />
                <motion.circle
                  cx="130" cy="130" r="75"
                  fill="none" stroke="currentColor" strokeWidth="0.5"
                  className="text-accent-primary/40"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
                <motion.circle
                  cx="130" cy="130" r="50"
                  fill="none" stroke="currentColor" strokeWidth="0.3"
                  className="text-accent-tertiary/30"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                />

                {/* Crosshair */}
                <path d="M130 30 L130 230 M30 130 L230 130" stroke="currentColor" strokeWidth="0.2" className="text-fg-tertiary/10" />

                {/* Orbiting nodes */}
                {[...Array(12)].map((_, i) => (
                  <g key={i}>
                    <motion.circle
                      cx={130 + 100 * Math.cos(i * Math.PI / 6)}
                      cy={130 + 100 * Math.sin(i * Math.PI / 6)}
                      r="3"
                      fill="var(--color-accent-primary)"
                      className="text-accent-primary"
                      animate={{
                        scale: [1, 1.8, 1],
                        opacity: [0.4, 1, 0.4],
                        fill: ['var(--color-accent-primary)', 'var(--color-accent-tertiary)', 'var(--color-accent-primary)']
                      }}
                      transition={{ duration: 3, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                    />
                    {/* Trail */}
                    <motion.circle
                      cx={130 + 75 * Math.cos(i * Math.PI / 6)}
                      cy={130 + 75 * Math.sin(i * Math.PI / 6)}
                      r="1.5"
                      fill="var(--color-accent-secondary)"
                      className="text-accent-secondary"
                      animate={{
                        scale: [0.5, 1.5, 0.5],
                        opacity: [0.2, 0.8, 0.2]
                      }}
                      transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.15 + 0.5, ease: "easeInOut" }}
                    />
                  </g>
                ))}

                {/* Central core */}
                <motion.circle
                  cx="130" cy="130" r="18"
                  fill="url(#nodeGlow)"
                  className="text-accent-primary"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.circle
                  cx="130" cy="130" r="8"
                  fill="var(--color-fg-inverse)"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
                />
              </svg>

              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <BrainCircuit className="w-32 h-32 text-fg-tertiary/10" />
              </div>

              {/* Floating labels */}
              <motion.div
                className="absolute -top-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-bg-elevated/80 backdrop-blur-xl border border-border-primary rounded-xl text-label-sm font-display font-bold uppercase tracking-widest text-accent-primary shadow-elevation-2"
                animate={{ y: [-8, 0, -8] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                Neural Core v2.5.1
              </motion.div>

              <motion.div
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-bg-elevated/80 backdrop-blur-xl border border-border-primary rounded-xl text-label-sm font-display font-bold uppercase tracking-widest text-accent-tertiary shadow-elevation-2"
                animate={{ y: [8, 0, 8] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              >
                Uplink Stable
              </motion.div>

              <motion.div
                className="absolute left-6 top-1/2 -translate-y-1/2 px-3 py-2 bg-bg-elevated/80 backdrop-blur-xl border border-border-primary rounded-xl text-label-sm font-display font-bold uppercase tracking-widest text-accent-secondary shadow-elevation-2"
                animate={{ x: [-6, 0, -6] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                Sector 01
              </motion.div>

              <motion.div
                className="absolute right-6 top-1/2 -translate-y-1/2 px-3 py-2 bg-bg-elevated/80 backdrop-blur-xl border border-border-primary rounded-xl text-label-sm font-display font-bold uppercase tracking-widest text-accent-secondary shadow-elevation-2"
                animate={{ x: [6, 0, 6] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1.25 }}
              >
                Sector 07
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 px-6 border-y border-border-primary bg-bg-secondary/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="text-center"
              >
                <div className="text-display-md font-display font-medium text-fg-primary mb-1">{stat.value}</div>
                <div className="text-label-sm uppercase tracking-widest text-fg-tertiary">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features - Bento Grid */}
      <section className="section px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
            <div>
              <motion.h2
                className="text-display-md md:text-display-lg italic font-medium mb-4 uppercase"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                Subsystems
              </motion.h2>
              <motion.p
                className="text-label-sm font-display font-bold uppercase tracking-[0.4em] text-accent-primary max-w-lg"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                Engineered for Peak Cognitive Output
              </motion.p>
            </div>
            <motion.div
              className="text-body-sm text-fg-tertiary max-w-sm text-right font-light hidden md:block"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Distributed infrastructure built to sustain deep work cycles through neural synchronization and collaborative AI.
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-4 md:gap-6 min-h-[520px] md:min-h-[600px]">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              const accentClasses = {
                primary: 'border-l-4 border-accent-primary hover:shadow-glow-primary',
                secondary: 'border-l-4 border-accent-secondary hover:shadow-glow-secondary',
                tertiary: 'border-l-4 border-accent-tertiary hover:shadow-glow-tertiary',
              };

              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className={`card-hover relative overflow-hidden group ${accentClasses[feature.accent]} ${feature.large ? 'md:col-span-2 md:row-span-1' : 'md:col-span-1 md:row-span-2'}`}
                >
                  {/* Accent glow top */}
                  <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-${feature.accent}-primary/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                  <div className="relative z-10 h-full flex flex-col {feature.large ? 'justify-end' : 'justify-between'} p-6 md:p-8">
                    {!feature.large && (
                      <div className="w-12 h-12 rounded-xl bg-accent-{feature.accent}-dim flex items-center justify-center text-accent-{feature.accent} mb-6 group-hover:scale-110 transition-transform duration-500">
                        <Icon className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1">
                      {feature.large && (
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                          <Icon className="w-32 h-32 text-accent-primary/20" />
                        </div>
                      )}
                      <motion.h3
                        className={`text-heading-lg md:text-heading-xl italic mb-4 ${feature.large ? 'text-fg-primary' : ''}`}
                        whileHover={{ y: -4, transition: { duration: 0.3 } }}
                      >
                        {feature.title}
                      </motion.h3>
                      <p className={`text-body-sm md:text-body-md ${feature.large ? 'text-fg-secondary max-w-md' : 'text-fg-tertiary'}`}>
                        {feature.description}
                      </p>
                    </div>

                    {feature.large && (
                      <Link to="/login" className="btn-primary mt-8 w-fit group-hover:scale-105 transition-transform duration-fast">
                        Enter Sector
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section px-6 relative">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="card-glass p-12 md:p-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/5 via-transparent to-accent-secondary/5" />
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--color-accent-primary-dim)_0%,_transparent_70%)]" />

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border-secondary bg-bg-elevated/80 backdrop-blur-xl mb-8">
                <div className="w-2 h-2 rounded-full bg-accent-secondary animate-pulse" />
                <span className="text-label-sm font-display font-bold uppercase tracking-[0.3em] text-accent-secondary">Ready for Deployment</span>
              </div>

              <h2 className="text-display-sm md:text-display-md italic font-medium mb-6 text-fg-primary">
                Initialize Your First Sector
              </h2>

              <p className="text-body-lg text-fg-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
                Join 10,000+ operators synchronizing focus across the neural network. No credit card. Cancel anytime.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/login" className="btn-primary text-label-md px-8 py-4 group">
                  Create Free Account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-fast" />
                </Link>
                <Link to="/login" className="btn-outline text-label-md px-8 py-4 whitespace-nowrap">
                  View Documentation
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Dark Footer */}
      <footer className="border-t border-border-primary py-24 px-6 bg-bg-secondary/30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-accent-primary to-accent-tertiary rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-fg-inverse" />
              </div>
              <span className="font-display font-bold text-lg tracking-widest text-fg-primary uppercase italic">Opalite</span>
            </div>
            <p className="text-body-sm text-fg-tertiary max-w-xs font-light leading-relaxed">Built for the next generation of engineers and creators. Designed by Cortex Systems.</p>
          </div>
          <div className="grid grid-cols-2 gap-12 md:gap-24">
            <div className="flex flex-col gap-6">
              <span className="text-label-sm font-display font-bold uppercase tracking-[0.3em] text-fg-tertiary">Platform</span>
              <ul className="space-y-3">
                <li><Link href="#" className="text-body-sm text-fg-secondary hover:text-fg-primary transition-colors">Sectors</Link></li>
                <li><Link href="#" className="text-body-sm text-fg-secondary hover:text-fg-primary transition-colors">Dashboard</Link></li>
                <li><Link href="#" className="text-body-sm text-fg-secondary hover:text-fg-primary transition-colors">Neural Sync</Link></li>
                <li><Link href="#" className="text-body-sm text-fg-secondary hover:text-fg-primary transition-colors">Analytics</Link></li>
              </ul>
            </div>
            <div className="flex flex-col gap-6">
              <span className="text-label-sm font-display font-bold uppercase tracking-[0.3em] text-fg-tertiary">Legal</span>
              <ul className="space-y-3">
                <li><Link href="#" className="text-body-sm text-fg-secondary hover:text-fg-primary transition-colors">Privacy</Link></li>
                <li><Link href="#" className="text-body-sm text-fg-secondary hover:text-fg-primary transition-colors">Protocol</Link></li>
                <li><Link href="#" className="text-body-sm text-fg-secondary hover:text-fg-primary transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-24 pt-8 border-t border-border-primary flex justify-between items-center text-label-sm uppercase font-display font-bold tracking-widest text-fg-tertiary">
          <span>© 2026 OPALITE PROTOCOL</span>
          <span>SYSTEM VERSION 2.5.1</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;