// src/components/AiPlanModal.tsx

'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';
import { ChevronDown, X } from 'lucide-react';

interface AiPlanModalProps {
  markdownContent: string;
  onClose: () => void;
  onRegisterClick: () => void;
}

// Internal component for each week's accordion item
const AccordionItem = ({ weekContent, index, isOpen, onClick }: { weekContent: string, index: number, isOpen: boolean, onClick: () => void }) => {
  // Extracts "Week 1: Foundations" from "### Week 1: Foundations"
  const weekTitle = weekContent.match(/###\s*(.*)/)?.[1] || `Week ${index + 1}`;
  
  // Removes the title line and parses the rest of the content
  const htmlContent = useMemo(() => {
    const contentWithoutTitle = weekContent.replace(/###\s*(.*)\n/, '');
    return marked.parse(contentWithoutTitle);
  }, [weekContent]);
  
  return (
    <div className="border-b border-slate-700 last:border-b-0">
      <button onClick={onClick} className="w-full flex justify-between items-center text-left py-4 px-1">
        <span className="text-lg font-bold text-cyan-300">{weekTitle}</span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: 'auto' },
              collapsed: { opacity: 0, height: 0 }
            }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div
              dangerouslySetInnerHTML={{ __html: htmlContent }}
              // The 'prose' classes from Tailwind Typography automatically style the HTML
              className="prose prose-invert prose-p:text-gray-300 prose-li:text-gray-300 prose-strong:text-white pb-6 px-1"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


export default function AiPlanModal({ markdownContent, onClose, onRegisterClick }: AiPlanModalProps) {
  const [openIndex, setOpenIndex] = useState(0); // Open the first week by default

  // Splits the AI's response into weekly plans based on the '---' separator
  const weeklyPlans = useMemo(() => markdownContent.split('---').filter(plan => plan.trim() !== ''), [markdownContent]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: -20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.95, opacity: 0, y: -20 }}
        onClick={(e) => e.stopPropagation()} 
        className="bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
      >
        <header className="p-5 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <h3 className="text-xl font-bold text-white">✨ Your Personal AI Study Plan</h3>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"><X size={20}/></button>
        </header>
        
        <div className="p-6 overflow-y-auto flex-grow">
            {weeklyPlans.length > 0 ? (
                weeklyPlans.map((plan, index) => (
                    <AccordionItem 
                        key={index}
                        index={index}
                        weekContent={plan}
                        isOpen={openIndex === index}
                        onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                    />
                ))
            ) : (
                 <div className="p-6 text-gray-400">{markdownContent}</div>
            )}
        </div>

        <footer className="p-6 border-t border-slate-700 bg-slate-900/50 rounded-b-lg text-center flex-shrink-0">
          <button onClick={() => { onClose(); onRegisterClick(); }} className="w-full sm:w-auto bg-cyan-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-cyan-500 transition-all duration-300">
            Sign Up to Start Practicing
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
}