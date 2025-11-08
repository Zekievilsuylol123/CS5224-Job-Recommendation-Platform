import { useEffect, useState } from 'react';

interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTourProps {
  steps: TourStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export default function OnboardingTour({ steps, isActive, onComplete, onSkip }: OnboardingTourProps): JSX.Element | null {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isActive || currentStep >= steps.length) return;

    const updatePosition = () => {
      const step = steps[currentStep];
      const element = document.querySelector(step.target);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      let top = 0;
      let left = 0;

      switch (step.position) {
        case 'bottom':
          top = rect.bottom + window.scrollY + 20;
          left = rect.left + window.scrollX + rect.width / 2;
          break;
        case 'top':
          top = rect.top + window.scrollY - 20;
          left = rect.left + window.scrollX + rect.width / 2;
          break;
        case 'right':
          top = rect.top + window.scrollY + rect.height / 2;
          left = rect.right + window.scrollX + 20;
          break;
        case 'left':
          top = rect.top + window.scrollY + rect.height / 2;
          left = rect.left + window.scrollX - 20;
          break;
      }

      setPosition({ top, left });

      // Add highlight to target element
      element.classList.add('tour-highlight');
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
      
      // Remove highlight from all elements
      document.querySelectorAll('.tour-highlight').forEach((el) => {
        el.classList.remove('tour-highlight');
      });
    };
  }, [currentStep, steps, isActive]);

  if (!isActive || currentStep >= steps.length) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getModalPosition = () => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      zIndex: 9999,
    };

    switch (step.position) {
      case 'bottom':
        return {
          ...baseStyle,
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: 'translateX(-50%)',
        };
      case 'top':
        return {
          ...baseStyle,
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: 'translate(-50%, -100%)',
        };
      case 'right':
        return {
          ...baseStyle,
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: 'translateY(-50%)',
        };
      case 'left':
        return {
          ...baseStyle,
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: 'translate(-100%, -50%)',
        };
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={onSkip} />

      {/* Tour Modal */}
      <div
        style={getModalPosition()}
        className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
            <p className="text-xs text-slate-500 mt-1">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
          <button
            onClick={onSkip}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            title="Skip tour"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">{step.content}</p>

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onSkip}
            className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
          >
            Skip tour
          </button>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
            >
              {isLastStep ? 'Got it!' : 'Next'}
            </button>
          </div>
        </div>

        {/* Arrow pointer */}
        <div
          className={`absolute w-0 h-0 ${
            step.position === 'bottom'
              ? 'border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-white -top-2 left-1/2 -translate-x-1/2'
              : step.position === 'top'
              ? 'border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white -bottom-2 left-1/2 -translate-x-1/2'
              : step.position === 'right'
              ? 'border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-white -left-2 top-1/2 -translate-y-1/2'
              : 'border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-white -right-2 top-1/2 -translate-y-1/2'
          }`}
        />
      </div>

      {/* Add global styles for highlight */}
      <style>{`
        .tour-highlight {
          position: relative;
          z-index: 9999;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.6), 0 0 20px 8px rgba(59, 130, 246, 0.3) !important;
          border-radius: 8px;
          background-color: white;
        }
      `}</style>
    </>
  );
}
