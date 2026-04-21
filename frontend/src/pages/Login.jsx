import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, Mail, Lock, Loader2, Sparkles, Zap, AlertCircle } from 'lucide-react';

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
        <div className="min-h-screen bg-cosmos-950 flex relative overflow-hidden">
            {/* Cinematic Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-pulse-cyan/10 blur-[150px] rounded-full -mr-96 -mt-96" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-pulse-rose/5 blur-[120px] rounded-full -ml-40 -mb-40" />
            </div>

            {/* Left Side: Branding/Visuals */}
            <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-between p-20 bg-white/[0.02] border-r border-white/5">
                <div>
                     <div className="flex items-center gap-4 mb-24">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                            <Sparkles className="w-8 h-8 text-cosmos-950" />
                        </div>
                        <span className="font-display font-bold text-2xl tracking-[0.3em] text-white uppercase italic">Opalite</span>
                    </div>

                    <div className="space-y-8">
                        <h1 className="text-8xl font-display font-bold leading-[0.9] tracking-tighter text-white">
                            The Neural <br />
                            <span className="text-pulse-cyan italic">Command</span> Hub.
                        </h1>
                        <p className="text-gray-500 text-lg max-w-md font-body leading-relaxed mt-8">
                            Synchronize your cognitive output with the largest collaborative deep-work network in the sector.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="flex -space-x-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="w-10 h-10 rounded-full border-2 border-cosmos-950 bg-cosmos-800 flex items-center justify-center overflow-hidden">
                                <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=user${i}`} alt="user" />
                            </div>
                        ))}
                    </div>
                    <span className="text-[10px] font-display font-bold text-gray-400 uppercase tracking-widest">
                        +14.2k Active Commanders Online
                    </span>
                </div>
            </div>

            {/* Right Side: Auth Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-display font-bold text-white uppercase tracking-widest mb-4 italic">
                            {isLogin ? 'Access Console' : 'Initialize Protocol'}
                        </h2>
                        <p className="text-gray-500 text-[10px] font-display font-black uppercase tracking-[0.3em]">
                            {isLogin ? 'Enter neural uplink credentials' : 'Register neural signature identifier'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-display font-bold text-gray-500 uppercase tracking-[0.2em] ml-6">Identifier</label>
                            <input 
                                type="email" 
                                placeholder="commander@sector.opalite"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-premium"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-display font-bold text-gray-500 uppercase tracking-[0.2em] ml-6">Access Key</label>
                            <input 
                                type="password" 
                                placeholder="••••••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-premium"
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-4 rounded-2xl bg-pulse-rose/10 border border-pulse-rose/20 text-pulse-rose text-[10px] font-display font-bold uppercase tracking-widest flex items-center gap-3">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="btn-premium w-full flex items-center justify-center gap-4 py-5 mt-4"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-4 h-4" />}
                            <span className="tracking-[0.2em]">{isLogin ? 'Establish Link' : 'Begin Initialization'}</span>
                        </button>
                    </form>

                    <div className="mt-12 text-center">
                        <button 
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-[10px] font-display font-black text-gray-500 hover:text-white uppercase tracking-[0.4em] transition-colors"
                        >
                            {isLogin ? "No identifier? Initialize profile" : "Return to access terminal"}
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
