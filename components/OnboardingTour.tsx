
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

interface Step {
  targetId: string;
  title: string;
  content: string;
}

const steps: Step[] = [
  {
    targetId: 'tour-language',
    title: 'Choose Your Language',
    content: 'Kavach AI speaks many Indian languages. Select the one you are most comfortable with here.',
  },
  {
    targetId: 'tour-text',
    title: 'Paste Suspicious Text',
    content: 'Got a weird SMS or WhatsApp message? Paste the text here for a quick check.',
  },
  {
    targetId: 'tour-image',
    title: 'Share a Screenshot',
    content: 'If it’s a picture or a complicated app screen, upload the screenshot here. I can "read" it for you.',
  },
  {
    targetId: 'tour-btn',
    title: 'Analyze & Protect',
    content: 'Click this button to start the analysis. I’ll tell you if it’s safe or a trick!',
  },
];

export const OnboardingTour: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, placement: 'bottom' as 'top' | 'bottom' });

  useEffect(() => {
    const isDone = localStorage.getItem('kavach_onboarding_done');
    if (!isDone) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  useLayoutEffect(() => {
    if (isVisible) {
      const updatePosition = () => {
        const target = document.getElementById(steps[currentStep].targetId);
        if (target) {
          const rect = target.getBoundingClientRect();
          setSpotlightRect(rect);
          
          // Scroll target into view if it's not fully visible
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });

          const tooltipWidth = 320;
          const estimatedHeight = 220;
          const padding = 24;

          // Determine horizontal position (constrained to screen)
          let left = rect.left + rect.width / 2 - tooltipWidth / 2;
          left = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, left));

          // Determine vertical position (prefer bottom, fallback to top)
          let top = rect.bottom + padding;
          let placement: 'top' | 'bottom' = 'bottom';

          if (top + estimatedHeight > window.innerHeight && rect.top > estimatedHeight + padding) {
            top = rect.top - estimatedHeight - padding;
            placement = 'top';
          }
          
          setTooltipPos({ top, left, placement });
        }
      };

      // Initial position
      updatePosition();
      
      // Delay slightly for scroll to settle
      const timeout = setTimeout(updatePosition, 100);

      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
        clearTimeout(timeout);
      };
    }
  }, [isVisible, currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    setIsVisible(false);
    localStorage.setItem('kavach_onboarding_done', 'true');
  };

  if (!isVisible || !spotlightRect) return null;

  const PADDING = 12;
  const clipPath = `polygon(
    0% 0%, 0% 100%, 
    ${spotlightRect.left - PADDING}px 100%, 
    ${spotlightRect.left - PADDING}px ${spotlightRect.top - PADDING}px, 
    ${spotlightRect.right + PADDING}px ${spotlightRect.top - PADDING}px, 
    ${spotlightRect.right + PADDING}px ${spotlightRect.bottom + PADDING}px, 
    ${spotlightRect.left - PADDING}px ${spotlightRect.bottom + PADDING}px, 
    ${spotlightRect.left - PADDING}px 100%, 
    100% 100%, 100% 0%
  )`;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none overflow-hidden select-none">
      {/* Dimmer Overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] transition-all duration-500 ease-in-out pointer-events-auto"
        style={{ clipPath }}
      />

      {/* Focus Ring */}
      <div 
        className="absolute border-2 border-indigo-400 rounded-2xl transition-all duration-500 ease-in-out animate-pulse shadow-[0_0_0_1000px_rgba(0,0,0,0)]"
        style={{
          top: spotlightRect.top - PADDING,
          left: spotlightRect.left - PADDING,
          width: spotlightRect.width + PADDING * 2,
          height: spotlightRect.height + PADDING * 2,
          boxShadow: '0 0 20px 2px rgba(99, 102, 241, 0.5)'
        }}
      />

      {/* Tooltip Card */}
      <div 
        className="absolute pointer-events-auto transition-all duration-500 ease-in-out"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: '320px',
        }}
      >
        <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] p-8 space-y-5 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-[0.3em]">
                  Guardian Tutorial
                </h4>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Step {currentStep + 1} of {steps.length}</p>
              </div>
            </div>
            <button 
              onClick={completeTour}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-2">
            <h5 className="font-black text-slate-900 dark:text-white text-2xl tracking-tighter leading-tight">
              {steps[currentStep].title}
            </h5>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed">
              {steps[currentStep].content}
            </p>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="flex gap-2">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-indigo-600' : 'w-1.5 bg-slate-200 dark:bg-slate-800'}`} 
                />
              ))}
            </div>
            <div className="flex gap-3">
              {currentStep > 0 && (
                <button 
                  onClick={handlePrev}
                  className="p-3 text-slate-500 hover:text-indigo-600 dark:text-slate-400 transition-colors bg-slate-50 dark:bg-slate-800 rounded-2xl"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={handleNext}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 px-6 rounded-2xl flex items-center gap-2 text-sm transition-all active:scale-95 shadow-xl shadow-indigo-600/30"
              >
                {currentStep === steps.length - 1 ? 'Shield Me' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
