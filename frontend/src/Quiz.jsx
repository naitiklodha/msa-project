import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ArrowLeft, CheckCircle2, Circle, Sun, Moon, XCircle } from 'lucide-react';

const Quiz = ({ onBack, isDark, setIsDark }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const question = "Which architectural pattern is best suited for building scalable microservices?";
  const options = [
    { id: 'A', text: "Monolithic Architecture" },
    { id: 'B', text: "Event-Driven Architecture" },
    { id: 'C', text: "Layered Architecture" },
    { id: 'D', text: "Service-Oriented Architecture (SOA)" }
  ];
  const correctOptionId = 'B';
  const score = 1250;

  return (
    <div className="container mx-auto p-2 md:p-6 lg:p-8 mb-4 relative flex flex-col pt-4 md:pt-6 h-screen overflow-hidden">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-6 md:mb-8 shrink-0"
      >
        <div className="flex items-center space-x-3 md:space-x-4">
          <button 
            onClick={onBack}
            className="p-2 md:p-3 rounded-full glass-panel hover:scale-110 active:scale-95 transition-all text-gray-600 dark:text-gray-300 focus:outline-none z-10"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-blue-500 mb-0.5">
              Knowledge Check
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium tracking-wide">Select the correct option below</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 md:space-x-4">
          <div className="flex items-center space-x-2 md:space-x-3 glass-panel px-3 py-1.5 md:px-4 md:py-2 rounded-full shadow-sm z-10 border-yellow-500/20">
            <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
            <span className="text-sm md:text-base font-black text-gray-800 dark:text-white">
              {score} <span className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">pts</span>
            </span>
          </div>
          
          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-2 md:p-3 rounded-full glass-panel hover:scale-110 active:scale-95 transition-all text-gray-600 dark:text-yellow-400 focus:outline-none z-10 hidden md:block"
          >
            {isDark ? <Sun className="w-4 h-4 md:w-5 md:h-5" /> : <Moon className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />}
          </button>
        </div>
      </motion.header>

      <div className="flex flex-col items-center flex-1 justify-center relative w-full pt-2">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="glass-panel w-full max-w-3xl p-5 md:p-8 shadow-2xl relative overflow-hidden flex flex-col"
        >
          {/* Question Number and Progress */}
          <div className="flex justify-between items-center mb-4 md:mb-6 border-b border-gray-200 dark:border-white/10 pb-4">
            <span className="text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full uppercase tracking-widest mt-1">
              Question 1 of 5
            </span>
            <div className="flex space-x-1 border border-gray-200 dark:border-white/10 p-1 rounded-full">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-1.5 w-4 md:w-6 rounded-full transition-colors ${i === 1 ? 'bg-gradient-to-r from-green-400 to-blue-500' : 'bg-gray-200 dark:bg-white/10'}`}></div>
              ))}
            </div>
          </div>

          {/* Question text */}
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-6 md:mb-8 leading-snug">
            {question}
          </h2>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-2">
            {options.map((option) => {
              const isSelected = selectedOption === option.id;
              const isCorrect = option.id === correctOptionId;
              
              let buttonStyle = 'border-transparent bg-white/40 dark:bg-black/20 hover:bg-white/60 dark:hover:bg-black/40 hover:border-gray-300 dark:hover:border-white/20 hover:scale-[1.01]';
              let circleStyle = 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-300 group-hover:bg-gray-100 dark:group-hover:bg-white/20';
              let Icon = isSelected ? CheckCircle2 : Circle;
              let iconColor = isSelected ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100';

              if (isSubmitted) {
                if (isCorrect) {
                  buttonStyle = 'border-green-500 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.15)] dark:bg-green-500/20 scale-[1.02]';
                  circleStyle = 'bg-green-500 text-white shadow-md scale-110';
                  Icon = CheckCircle2;
                  iconColor = 'text-green-500 opacity-100';
                } else if (isSelected && !isCorrect) {
                  buttonStyle = 'border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.15)] dark:bg-red-500/20 scale-[1.02]';
                  circleStyle = 'bg-red-500 text-white shadow-md scale-110';
                  Icon = XCircle;
                  iconColor = 'text-red-500 opacity-100';
                } else {
                  buttonStyle = 'border-transparent bg-white/20 dark:bg-black/20 opacity-50 cursor-not-allowed';
                  circleStyle = 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500';
                }
              } else if (isSelected) {
                 buttonStyle = 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)] dark:bg-blue-500/20 scale-[1.02]';
                 circleStyle = 'bg-blue-500 text-white shadow-md scale-110';
                 iconColor = 'text-blue-500 opacity-100';
              }

              return (
                <button
                  key={option.id}
                  onClick={() => !isSubmitted && setSelectedOption(option.id)}
                  disabled={isSubmitted}
                  className={`w-full flex items-center p-3 md:p-4 rounded-xl border-[2px] transition-all duration-300 text-left group min-h-[70px] ${buttonStyle}`}
                >
                  <div className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full mr-3 md:mr-4 shrink-0 transition-all shadow-sm ${circleStyle}`}>
                    <span className="font-bold text-sm md:text-base">{option.id}</span>
                  </div>
                  
                  <span className={`text-sm md:text-base font-medium pr-2 ${
                    isSubmitted && isCorrect 
                      ? 'text-green-700 dark:text-green-400 font-bold'
                      : isSubmitted && isSelected && !isCorrect
                      ? 'text-red-700 dark:text-red-400 font-bold'
                      : isSelected 
                      ? 'text-blue-700 dark:text-blue-300 font-bold' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {option.text}
                  </span>

                  <div className="ml-auto justify-self-end -mr-1 self-center">
                    <Icon className={`w-5 h-5 md:w-6 md:h-6 transition-opacity ${iconColor}`} />
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* Action Buttons */}
          <div className="mt-6 md:mt-8 flex justify-between items-center pt-4 md:pt-5 border-t border-gray-200 dark:border-white/10">
            <button 
              className="text-xs md:text-sm font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              onClick={onBack}
            >
              Back to Dashboard
            </button>
            {!isSubmitted ? (
                <button 
                disabled={!selectedOption}
                onClick={() => setIsSubmitted(true)}
                className={`px-5 py-2.5 md:px-6 md:py-3 rounded-full font-bold text-sm md:text-base shadow-lg transition-all flex items-center space-x-2 ${
                    selectedOption 
                    ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white hover:-translate-y-1 hover:shadow-blue-500/40 active:scale-95' 
                    : 'bg-gray-200 dark:bg-white/5 text-gray-400 dark:text-gray-600 cursor-not-allowed hidden md:flex'
                }`}
                >
                <span>Submit Answer</span>
                </button>
            ) : (
                <button 
                onClick={onBack}
                className="px-5 py-2.5 md:px-6 md:py-3 rounded-full font-bold text-sm md:text-base shadow-lg transition-all flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:-translate-y-1 hover:shadow-indigo-500/40 active:scale-95 hidden md:flex"
                >
                <span>Next / Close Module</span>
                </button>
            )}
          </div>
        </motion.div>
      </div>
      
      {/* Mobile-only Submit/Theme button footer */}
      {!isSubmitted && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 glass-panel border-t border-gray-200 dark:border-white/10 flex justify-between items-center z-50 mt-10">
            <button 
              onClick={() => setIsDark(!isDark)}
              className="p-3 rounded-full glass-panel active:scale-95 transition-all text-gray-600 dark:text-yellow-400 focus:outline-none"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 text-indigo-600" />}
            </button>
            <button 
                disabled={!selectedOption}
                onClick={() => setIsSubmitted(true)}
                className={`px-6 py-2.5 rounded-full font-bold text-sm shadow-lg transition-all ${
                  selectedOption 
                    ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white active:scale-95' 
                    : 'bg-gray-200 dark:bg-white/5 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
              >
                Submit
            </button>
        </div>
      )}
      {isSubmitted && (
         <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 glass-panel border-t border-gray-200 dark:border-white/10 flex justify-center items-center z-50 mt-10">
            <button 
                onClick={onBack}
                className="w-full px-6 py-3 rounded-full font-bold text-sm shadow-lg transition-all bg-gradient-to-r from-purple-500 to-indigo-600 text-white active:scale-95"
            >
                Next
            </button>
         </div>
      )}
    </div>
  );
};

export default Quiz;
