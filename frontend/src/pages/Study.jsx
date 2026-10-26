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
  Clock,
  ArrowRight,
  Search,
  Eye,
  Sparkles
} from 'lucide-react';
import { ragAPI } from '../api';
import Quiz from '../Quiz';

const Study = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [chatDoc, setChatDoc] = useState(null);
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
      await fetchDocs();
      if (data.document_id) {
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
    <div className="space-y-8 pb-12 animate-fade-in animate-slide-up">
      {/* Header */}
      <header>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-display-lg font-display font-medium tracking-tight text-fg-primary"
            >
              Knowledge Library
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-body-md text-fg-secondary mt-1"
            >
              Upload materials to synthesize neural modules and generate assessments.
            </motion.p>
          </div>
        </div>
      </header>

      {/* Upload & Document Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
      >
        {/* Upload Card */}
        <motion.label
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="card-hover p-8 md:p-10 flex flex-col items-center justify-center border-2 border-dashed border-accent-primary/30 bg-accent-primary-dim/50 group relative overflow-hidden min-h-[280px] cursor-pointer"
          whileHover={{ borderColor: 'var(--color-accent-primary)', backgroundColor: 'var(--color-accent-primary-dim)', scale: 1.01 }}
        >
          <input
            type="file"
            id="doc-upload"
            className="hidden"
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.txt"
            disabled={uploading}
          />
          <div className="flex flex-col items-center text-center group-hover:scale-105 transition-transform duration-500">
            <motion.div
              className="p-4 rounded-2xl bg-accent-primary-dim border border-accent-primary/30 text-accent-primary mb-4"
              animate={uploading ? { rotate: 360 } : {}}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              {uploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
            </motion.div>
            <span className="font-display text-sm font-bold text-fg-primary uppercase tracking-wider">
              {uploading ? 'Processing Neural Signatures...' : 'Add Neural Module'}
            </span>
            <span className="text-body-sm text-fg-tertiary mt-2">Support: PDF, DOCX, TXT</span>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4 flex items-center gap-2 text-label-sm font-medium text-accent-primary"
            >
              <Sparkles className="w-4 h-4" />
              <span>Drag & drop or click to upload</span>
            </motion.div>
          </div>
        </motion.label>

        {/* Document Cards */}
        {documents.map((doc, i) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className={`card-hover p-6 flex flex-col ${selectedDoc?.id === doc.id ? 'border-accent-primary/50 shadow-glow-primary' : ''}`}
            onClick={() => handleSelectDoc(doc)}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl bg-accent-primary-dim border border-accent-primary/30 text-accent-primary">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-fast">
                <button
                  onClick={(e) => { e.stopPropagation(); setChatDoc(doc); setChatMessages([]); }}
                  className="p-2 rounded-lg text-fg-tertiary hover:text-accent-primary hover:bg-accent-primary-dim transition-colors"
                  title="Neural Chat"
                  aria-label="Neural Chat"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleDeleteDoc(e, doc.id)}
                  className="p-2 rounded-lg text-fg-tertiary hover:text-semantic-danger hover:bg-semantic-danger-dim transition-colors"
                  title="Prune Module"
                  aria-label="Delete Document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="font-display font-semibold text-fg-primary line-clamp-1 mb-2 flex-1">{doc.file_name}</h3>
            <div className="flex justify-between items-center pt-4 border-t border-border-primary">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-fg-tertiary" />
                <span className="text-label-sm font-display font-medium text-fg-tertiary uppercase tracking-wider">Blocks</span>
              </div>
              <span className="text-label-sm font-body text-fg-tertiary">
                {new Date(doc.created_at).toLocaleDateString()}
              </span>
            </div>
          </motion.div>
        ))}

        {documents.length === 0 && !uploading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="col-span-full card p-16 md:p-24 text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-accent-tertiary-dim border border-accent-tertiary/30 flex items-center justify-center text-accent-tertiary">
              <Library className="w-10 h-10" />
            </div>
            <h3 className="text-heading-lg font-display font-bold text-fg-primary mb-2">Library Empty</h3>
            <p className="text-body-md text-fg-secondary max-w-md mx-auto mb-6">
              No neural modules detected. Upload your first document to begin synthesis.
            </p>
            <label htmlFor="doc-upload" className="btn-primary inline-flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Upload First Module</span>
            </label>
          </motion.div>
        )}
      </motion.div>

      {/* Selected Doc Details (Topics) */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 20, height: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            <div className="card p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-accent-secondary-dim border border-accent-secondary/30 text-accent-secondary">
                    <Brain className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-heading-lg font-display font-bold text-fg-primary uppercase tracking-wider">{selectedDoc.file_name}</h2>
                    <p className="text-label-sm text-accent-tertiary uppercase tracking-wider mt-1">Neural Breakdown Complete • {selectedDoc.topics?.length || 0} Modules Detected</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="btn-ghost whitespace-nowrap"
                >
                  <X className="w-4 h-4 mr-1" />
                  Close View
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedDoc.topics && selectedDoc.topics.map((topic, i) => (
                  <motion.div
                    key={topic.chunk_id || i}
                    initial={{ opacity: 0, y: 16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                    className="card p-5"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-label-sm font-display font-bold text-accent-secondary uppercase tracking-wider">Module {i + 1}</span>
                      <div className="flex items-center gap-1 text-label-sm text-fg-tertiary">
                        <Clock className="w-3.5 h-3.5" />
                        ~{Math.ceil(topic.time_est_s / 60)}m
                      </div>
                    </div>
                    <h4 className="font-display font-semibold text-fg-primary mb-4 line-clamp-2">{topic.topic}</h4>
                    <motion.button
                      onClick={() => setActiveQuiz({ documentId: selectedDoc.id, chunkId: topic.chunk_id, topicTitle: topic.topic })}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="btn-secondary w-full flex items-center justify-center gap-2"
                    >
                      Initiate Quiz
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Neural Chat Drawer */}
      <AnimatePresence>
        {chatDoc && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChatDoc(null)}
              className="fixed inset-0 bg-bg-overlay backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-lg bg-bg-elevated border-l border-border-primary z-[70] shadow-elevation-4 flex flex-col"
            >
              <div className="p-5 border-b border-border-primary flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent-primary-dim border border-accent-primary/30 text-accent-primary">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h3 className="text-heading-sm font-display font-bold text-fg-primary uppercase tracking-wider">Neural Uplink: {chatDoc.file_name}</h3>
                </div>
                <button
                  onClick={() => setChatDoc(null)}
                  className="p-2 rounded-lg text-fg-tertiary hover:text-fg-primary hover:bg-bg-tertiary transition-colors focus-ring"
                  aria-label="Close Chat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-fg-tertiary/50">
                    <Brain className="w-16 h-16 mb-4" />
                    <p className="text-label-sm font-display font-bold uppercase tracking-wider max-w-[200px]">Awaiting inquiry parameters...</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`max-w-[85%] p-4 rounded-2xl text-body-sm ${
                      msg.role === 'user'
                        ? 'bg-accent-primary text-fg-inverse font-semibold'
                        : 'bg-bg-tertiary text-fg-secondary border border-border-primary'
                    }`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
              </div>

              <form onSubmit={handleChat} className="p-5 border-t border-border-primary bg-bg-secondary/50">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Query neural patterns..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="input pr-14"
                    disabled={querying}
                  />
                  <button
                    type="submit"
                    disabled={querying || !query.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-accent-primary text-fg-inverse hover:shadow-glow-primary transition-all disabled:opacity-50 focus-ring"
                    aria-label="Send Query"
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