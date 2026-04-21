import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { quizAPI } from './api';
import { 
  ChevronLeft, 
  ChevronRight, 
  Timer, 
  BrainCircuit, 
  CheckCircle2, 
  XCircle, 
  RotateCcw,
  Trophy,
  Loader2,
  Sparkles
} from 'lucide-react';

const Quiz = ({ documentId, chunkId, topicTitle, onBack, isRoomQuiz = false, roomCode = null }) => {
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null); // { correct: bool, message: string }
  const [stats, setStats] = useState({ correct: 0, total: 0, score: 0, duration: 0, speed_bonus: 0 });
  const [questionCount, setQuestionCount] = useState(0);

  useEffect(() => {
    startQuiz();
  }, []);

  const startQuiz = async () => {
    setLoading(true);
    setCompleted(false);
    setStats({ correct: 0, total: 0, score: 0 });
    try {
      const { data } = await quizAPI.start(documentId, chunkId, isRoomQuiz ? roomCode : null);
      setSessionId(data.session_id);
      setQuestionCount(data.question_count);
      await fetchNextQuestion(data.session_id);
    } catch (err) {
      console.error('Failed to start quiz', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNextQuestion = async (id) => {
    setLoading(true);
    setSelectedOption(null);
    setFeedback(null);
    try {
      const { data } = await quizAPI.next(id || sessionId);
      if (data.completed) {
        await handleComplete();
      } else {
        setCurrentQuestion(data.question);
      }
    } catch (err) {
      console.error('Failed to fetch next question', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = async (option) => {
    if (feedback || submitting) return;
    setSelectedOption(option);
    setSubmitting(true);

    const isCorrect = option === currentQuestion.answer;
    
    try {
      await quizAPI.submit(sessionId, currentQuestion.id, isCorrect);
      setFeedback({
        correct: isCorrect,
        message: isCorrect ? 'Neural Match Confirmed.' : `Neural Signal Mismatch. Correct value: ${currentQuestion.answer}`
      });
      setStats(prev => ({
        ...prev,
        total: prev.total + 1,
        correct: isCorrect ? prev.correct + 1 : prev.correct
      }));
    } catch (err) {
      console.error('Failed to submit answer', err);
    } finally {
      setSubmitting(false);
      // Auto-advance logic
      setTimeout(() => {
        fetchNextQuestion();
      }, 1500);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data } = await quizAPI.complete(sessionId, isRoomQuiz ? roomCode : null);
      setStats({
        correct: data.correct_count,
        total: data.total,
        score: data.score,
        duration: data.duration,
        speed_bonus: data.speed_bonus
      });
      setCompleted(true);
    } catch (err) {
      console.error('Failed to complete quiz', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !currentQuestion && !completed) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-6">
        <Loader2 className="w-12 h-12 text-pulse-cyan animate-spin" />
        <span className="font-display text-sm text-gray-500 uppercase tracking-[0.3em] animate-pulse">Syncing Neural Chunks...</span>
      </div>
    );
  }

  if (completed) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto glass p-12 text-center space-y-8 aurora-border"
      >
        <div className="flex justify-center">
            <div className="w-24 h-24 bg-gradient-to-tr from-pulse-cyan to-pulse-mint rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.4)]">
                <Trophy className="w-12 h-12 text-cosmos-950" />
            </div>
        </div>

        <div className="space-y-2">
            <h2 className="font-display text-3xl font-bold text-white uppercase tracking-tight">Sync Complete</h2>
            <p className="font-body text-gray-400">Neural retention patterns recorded successfully.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 glass-sm">
                <span className="stat-label">Retention</span>
                <div className="stat-value text-white mt-1">{Math.round((stats.correct / (stats.total || 1)) * 100)}%</div>
            </div>
            <div className="p-6 glass-sm">
                <span className="stat-label">Sync Speed</span>
                <div className="stat-value text-pulse-amber mt-1">{stats.duration}s</div>
            </div>
            <div className="p-6 glass-sm">
                <span className="stat-label">Speed Bonus</span>
                <div className="stat-value text-pulse-cyan mt-1">+{stats.speed_bonus}</div>
            </div>
            <div className="p-6 glass-sm border-pulse-mint/20">
                <span className="stat-label">Total Flux</span>
                <div className="stat-value text-pulse-mint mt-1">+{stats.score}</div>
            </div>
        </div>

        <div className="flex gap-4 pt-4">
            <button 
                onClick={() => window.location.reload()} 
                className="btn-ghost flex-1 py-4"
            >
                Exit Terminal
            </button>
            <button onClick={startQuiz} className="btn-primary flex-1 py-4 flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Retrain
            </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-display text-xs font-bold uppercase tracking-widest">Back to Library</span>
        </button>
        <div className="flex items-center gap-4">
            <div className="glass-sm px-4 py-2 flex items-center gap-2">
                <Timer className="w-4 h-4 text-pulse-amber" />
                <span className="font-display text-xs font-bold text-white">Question {stats.total + 1} / {questionCount}</span>
            </div>
        </div>
      </header>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pulse-cyan/10 text-pulse-cyan">
                <BrainCircuit className="w-5 h-5" />
            </div>
            <h2 className="font-body text-gray-400 text-sm italic">{topicTitle}</h2>
        </div>

        <AnimatePresence mode='wait'>
            <motion.div 
                key={currentQuestion?.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass p-8 lg:p-12 space-y-12"
            >
                <h3 className="font-display text-2xl lg:text-3xl font-bold text-white leading-tight">
                    {currentQuestion?.question}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentQuestion?.options.map((option, i) => {
                        const isSelected = selectedOption === option;
                        const isCorrect = option === currentQuestion.answer;
                        let borderClass = 'border-white/[0.08]';
                        let bgClass = 'bg-cosmos-800/40';
                        
                        if (feedback) {
                            if (isCorrect) {
                                borderClass = 'border-pulse-mint ring-1 ring-pulse-mint/20';
                                bgClass = 'bg-pulse-mint/10';
                            } else if (isSelected) {
                                borderClass = 'border-pulse-rose ring-1 ring-pulse-rose/20';
                                bgClass = 'bg-pulse-rose/10';
                            }
                        } else if (isSelected) {
                            borderClass = 'border-pulse-cyan ring-1 ring-pulse-cyan/20';
                            bgClass = 'bg-pulse-cyan/5';
                        }

                        return (
                            <button
                                key={i}
                                disabled={!!feedback || submitting}
                                onClick={() => handleOptionSelect(option)}
                                className={`p-6 border rounded-2xl text-left transition-all duration-300 relative group overflow-hidden ${borderClass} ${bgClass} ${feedback ? '' : 'hover:border-white/20 hover:bg-white/[0.02]'}`}
                            >
                                <div className="flex items-center justify-between relative z-10">
                                    <span className="font-body text-gray-200">{option}</span>
                                    {feedback && isCorrect && <CheckCircle2 className="w-5 h-5 text-pulse-mint shrink-0" />}
                                    {feedback && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-pulse-rose shrink-0" />}
                                </div>
                                {isSelected && !feedback && (
                                    <motion.div layoutId="choice-glow" className="absolute inset-0 bg-pulse-cyan/5" />
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="h-20 flex items-center justify-center">
                    <AnimatePresence>
                        {feedback && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center gap-4"
                            >
                                <p className={`font-display text-sm font-bold uppercase tracking-widest ${feedback.correct ? 'text-pulse-mint' : 'text-pulse-rose'}`}>
                                    {feedback.message}
                                </p>
                                <button onClick={() => fetchNextQuestion()} className="btn-primary px-8 py-3 flex items-center gap-2">
                                    Continue Frequency
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-2">
        {Array.from({ length: questionCount }).map((_, i) => (
            <div 
                key={i} 
                className={`h-1 rounded-full transition-all duration-500 ${i === stats.total ? 'w-8 bg-pulse-cyan ring-4 ring-pulse-cyan/20' : i < stats.total ? 'w-4 bg-pulse-mint' : 'w-4 bg-white/10'}`} 
            />
        ))}
      </div>
    </div>
  );
};

export default Quiz;
