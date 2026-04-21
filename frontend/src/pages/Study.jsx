import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { docAPI } from '../api';
import { 
  FileUp, 
  BookOpen, 
  FileText, 
  Layers, 
  ChevronRight, 
  Brain, 
  Trash2, 
  CheckCircle2, 
  Loader2,
  Library,
  Upload,
  MessageSquare,
  Send,
  X,
  Clock
} from 'lucide-react';
import { ragAPI } from '../api';
import Quiz from '../Quiz';

const Study = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null); // { documentId, chunkId, topicTitle }
  const [chatDoc, setChatDoc] = useState(null); // Document currently being chatted with
  const [chatMessages, setChatMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [querying, setQuerying] = useState(false);

  const fetchDocs = async () => {
    try {
      const { data } = await docAPI.list();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data } = await docAPI.upload(file);
      // Process upload also returns topics if newly processed
      // Or just refresh the whole list
      await fetchDocs();
      if (data.document_id) {
        // Find the new doc and select it to show topics
        const newDoc = { id: data.document_id, file_name: file.name, topics: data.topics };
        setSelectedDoc(newDoc);
      }
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSelectDoc = async (doc) => {
    if (selectedDoc?.id === doc.id) {
        setSelectedDoc(null);
        return;
    }
    setLoading(true);
    try {
        const { data } = await docAPI.topics(doc.id);
        setSelectedDoc({ ...doc, topics: data.topics });
    } catch (err) {
        console.error('Failed to fetch topics', err);
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteDoc = async (e, docId) => {
    e.stopPropagation();
    if (!window.confirm('Terminate this neural module? All associated retention data will be lost.')) return;
    try {
      await docAPI.delete(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      if (selectedDoc?.id === docId) setSelectedDoc(null);
    } catch (err) {
      console.error('Deletion failed', err);
    }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    if (!query.trim() || querying) return;
    
    const userMsg = { role: 'user', content: query };
    setChatMessages(prev => [...prev, userMsg]);
    setQuery('');
    setQuerying(true);
    
    try {
      const { data } = await ragAPI.query(query);
      const assistantMsg = { role: 'assistant', content: data.answer };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Neural uplink failed', err);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Connection unstable. Frequency mismatch detected.' }]);
    } finally {
      setQuerying(false);
    }
  };

  if (activeQuiz) {
    return (
      <Quiz 
        documentId={activeQuiz.documentId} 
        chunkId={activeQuiz.chunkId} 
        topicTitle={activeQuiz.topicTitle}
        onBack={() => setActiveQuiz(null)} 
      />
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="font-display text-3xl font-bold text-white tracking-tight uppercase">Knowledge Library</h1>
        <p className="font-body text-gray-400 text-sm">Upload materials to synthesize neural modules and quizzes.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Document List */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-12"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Upload Card */}
                <div className="glass p-8 flex flex-col items-center justify-center border-dashed border-pulse-cyan/30 bg-pulse-cyan/5 hover:bg-pulse-cyan/10 transition-all group relative overflow-hidden h-64">
                    <input 
                        type="file" 
                        id="doc-upload" 
                        className="hidden" 
                        onChange={handleFileUpload}
                        accept=".pdf,.doc,.docx,.txt"
                        disabled={uploading}
                    />
                    <label htmlFor="doc-upload" className="flex flex-col items-center cursor-pointer">
                        <div className="p-4 rounded-2xl bg-pulse-cyan/20 text-pulse-cyan mb-4 group-hover:scale-110 transition-transform">
                            {uploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                        </div>
                        <span className="font-display text-sm font-bold text-white uppercase tracking-wider">
                            {uploading ? 'Processing Neural Signatures...' : 'Add Neural Module'}
                        </span>
                        <span className="font-body text-xs text-gray-500 mt-2">Support: PDF, DOCX, TXT</span>
                    </label>
                </div>

                {documents.map((doc, i) => (
                    <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className={`glass p-6 glass-interactive cursor-pointer border-l-4 ${selectedDoc?.id === doc.id ? 'border-pulse-cyan' : 'border-transparent'}`}
                        onClick={() => handleSelectDoc(doc)}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 rounded-xl bg-cosmos-800 text-pulse-cyan">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setChatDoc(doc); setChatMessages([]); }}
                                    className="p-2 text-gray-600 hover:text-pulse-cyan transition-colors"
                                    title="Neural Chat"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={(e) => handleDeleteDoc(e, doc.id)} 
                                    className="p-2 text-gray-600 hover:text-pulse-rose transition-colors"
                                    title="Prune Module"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <h3 className="font-body font-bold text-white line-clamp-1">{doc.file_name}</h3>
                        <div className="flex justify-between items-center mt-4">
                            <div className="flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-gray-500" />
                                <span className="text-[10px] font-display font-medium text-gray-400 uppercase tracking-widest">Aggregate Blocks</span>
                            </div>
                            <span className="text-[10px] font-body bg-white/5 px-2 py-1 rounded text-gray-400">
                                {new Date(doc.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>

        {/* Selected Doc Details (Topics) */}
        <AnimatePresence>
            {selectedDoc && (
                <motion.div 
                    initial={{ opacity: 0, y: 20, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: 20, height: 0 }}
                    className="lg:col-span-12 overflow-hidden"
                >
                    <div className="glass p-8 space-y-8 aurora-border">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-pulse-cyan text-cosmos-950">
                                    <Brain className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="font-display text-xl font-bold text-white uppercase tracking-widest">{selectedDoc.file_name}</h2>
                                    <p className="font-body text-xs text-pulse-cyan">Neural Breakdown Complete • {selectedDoc.topics?.length || 0} Modules Detected</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedDoc(null)} className="btn-ghost">Close View</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {selectedDoc.topics && selectedDoc.topics.map((topic, i) => (
                                <div key={i} className="p-5 glass-sm border-white/[0.03] hover:border-white/[0.1] transition-all group">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-[10px] font-display font-bold text-pulse-amber uppercase tracking-widest">Module {i + 1}</span>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                            <Clock className="w-3 h-3" />
                                            ~{Math.ceil(topic.time_est_s / 60)}m
                                        </div>
                                    </div>
                                    <h4 className="font-body font-bold text-gray-200 mb-4">{topic.topic}</h4>
                                    <button 
                                        onClick={() => setActiveQuiz({ documentId: selectedDoc.id, chunkId: topic.chunk_id, topicTitle: topic.topic })}
                                        className="flex items-center justify-center gap-2 w-full py-2 bg-pulse-cyan/10 hover:bg-pulse-cyan/20 text-pulse-cyan border border-pulse-cyan/20 rounded-lg text-xs font-display font-bold uppercase transition-all"
                                    >
                                        Initiate Quiz
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* Neural Chat Drawer */}
      <AnimatePresence>
        {chatDoc && (
            <>
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    onClick={() => setChatDoc(null)}
                    className="fixed inset-0 bg-cosmos-950/60 backdrop-blur-sm z-[60]"
                />
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed top-0 right-0 h-full w-full max-w-lg bg-cosmos-900 border-l border-white/10 z-[70] shadow-2xl flex flex-col"
                >
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-pulse-cyan/10 text-pulse-cyan">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <h3 className="font-display font-bold text-white uppercase tracking-widest text-sm">Neural Uplink: {chatDoc.file_name}</h3>
                        </div>
                        <button onClick={() => setChatDoc(null)} className="p-2 text-gray-500 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                        {chatMessages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center opacity-20">
                                <Brain className="w-16 h-16 mb-4" />
                                <p className="font-display text-xs uppercase tracking-[0.2em] max-w-[200px]">Awaiting inquiry parameters...</p>
                            </div>
                        )}
                        {chatMessages.map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-pulse-cyan text-cosmos-950 font-bold' : 'bg-white/5 text-gray-300 border border-white/5'}`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleChat} className="p-6 border-t border-white/5 bg-cosmos-950/50">
                        <div className="relative">
                            <input 
                                type="text"
                                placeholder="Query neural patterns..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="input-opalite pr-14 text-sm"
                            />
                            <button 
                                type="submit"
                                disabled={querying || !query.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-pulse-cyan text-cosmos-950 rounded-lg hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all disabled:opacity-50"
                            >
                                {querying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Study;
