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
  Sparkles,
  ArrowRight
} from 'lucide-react';

const Quiz = ({ documentId, chunkId, topicTitle, onBack, isRoomQuiz = false, roomCode = null }) => {
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null);
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
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 text-accent-primary"
        >
          <Loader2 className="w-12 h-12" />
        </motion.div>
        <span className="text-label-sm font-display font-bold uppercase tracking-wider text-fg-tertiary animate-pulse">Syncing Neural Chunks...</span>
      </div>
    );
  }

  if (completed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl mx-auto card-glass p-8 md:p-12 text-center space-y-8"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 150 }}
          className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-accent-secondary to-accent-primary rounded-2xl flex items-center justify-center shadow-glow-secondary"
        >
          <Trophy className="w-10 h-10 text-fg-inverse" />
        </motion.div>

        <div className="space-y-2">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-heading-lg font-display font-bold text-fg-primary uppercase tracking-tight"
          >
            Sync Complete
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-body-md text-fg-secondary"
          >
            Neural retention patterns recorded successfully.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <div className="card p-5">
            <span className="text-label-sm font-display font-bold text-fg-tertiary uppercase tracking-wider">Retention</span>
            <div className="text-display-sm font-display font-bold text-fg-primary mt-1">{Math.round((stats.correct / (stats.total || 1)) * 100)}%</div>
          </div>
          <div className="card p-5">
            <span className="text-label-sm font-display font-bold text-fg-tertiary uppercase tracking-wider">Sync Speed</span>
            <div className="text-display-sm font-display font-bold text-accent-secondary mt-1">{stats.duration}s</div>
          </div>
          <div className="card p-5">
            <span className="text-label-sm font-display font-bold text-fg-tertiary uppercase tracking-wider">Speed Bonus</span>
            <div className="text-display-sm font-display font-bold text-accent-tertiary mt-1">+{stats.speed_bonus}</div>
          </div>
          <div className="card p-5 border-accent-tertiary/30">
            <span className="text-label-sm font-display font-bold text-fg-tertiary uppercase tracking-wider">Total Flux</span>
            <div className="text-display-sm font-display font-bold text-accent-tertiary mt-1">+{stats.score}</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex gap-3 pt-4"
        >
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-ghost flex-1"
          >
            Exit Terminal
          </motion.button>
          <motion.button
            onClick={startQuiz}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retrain</span>
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in animate-slide-up">
      <header className="flex items-center justify-between">
        <motion.button
          onClick={onBack}
          whileHover={{ x: -4 }}
          whileTap={{ scale: 0.98 }}
          className="btn-ghost flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-label-sm font-display font-bold uppercase tracking-wider">Back</span>
        </motion.button>
        <div className="flex items-center gap-3">
          <div className="badge badge-primary flex items-center gap-2">
            <Timer className="w-3.5 h-3.5" />
            <span>Question {stats.total + 1} / {questionCount}</span>
          </div>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-accent-primary-dim border border-accent-primary/30 flex items-center justify-center text-accent-primary">
          <BrainCircuit className="w-5 h-5" />
        </div>
        <h2 className="text-body-md text-fg-secondary italic">{topicTitle}</h2>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion?.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="card p-6 md:p-8 space-y-8"
        >
          <motion.h3
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-heading-lg md:text-heading-xl font-display font-medium tracking-tight text-fg-primary leading-snug"
          >
            {currentQuestion?.question}
          </motion.h3>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            {currentQuestion?.options.map((option, i) => {
              const isSelected = selectedOption === option;
              const isCorrect = option === currentQuestion.answer;
              let variant = 'ghost';

              if (feedback) {
                if (isCorrect) variant = 'success';
                else if (isSelected) variant = 'danger';
              } else if (isSelected) variant = 'primary';

              return (
                <motion.button
                  key={i}
                  disabled={!!feedback || submitting}
                  onClick={() => handleOptionSelect(option)}
                  whileHover={!feedback && !submitting ? { scale: 1.01 } : {}}
                  whileTap={!feedback && !submitting ? { scale: 0.98 } : {}}
                  className={`btn-${variant} w-full text-left justify-start gap-3 ${feedback ? 'animate-none' : ''}`}
                >
                  <span className="font-display font-medium text-fg-primary flex-1">{option}</span>
                  <AnimatePresence>
                    {feedback && isCorrect && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', damping: 12, stiffness: 150 }}
                        className="text-semantic-success"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </motion.div>
                    )}
                    {feedback && isSelected && !isCorrect && (
                      <motion.div
                        initial={{ scale: 0, rotate: 180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', damping: 12, stiffness: 150 }}
                        className="text-semantic-danger"
                      >
                        <XCircle className="w-5 h-5" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </motion.div>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="flex flex-col items-center gap-3 pt-4 border-t border-border-primary"
              >
                <motion.p
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 150 }}
                  className={`font-display text-label-md font-bold uppercase tracking-wider ${feedback.correct ? 'text-semantic-success' : 'text-semantic-danger'}`}
                >
                  {feedback.message}
                </motion.p>
                <motion.button
                  onClick={() => fetchNextQuestion()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-primary flex items-center gap-2"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex justify-center gap-1.5"
      >
        {Array.from({ length: questionCount }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.05, type: 'spring', damping: 15, stiffness: 150 }}
            className={`rounded-full transition-all duration-300 ${
              i === stats.total ? 'w-8 bg-accent-primary' : i < stats.total ? 'w-3 bg-accent-tertiary' : 'w-3 bg-border-primary'
            }`}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default Quiz;