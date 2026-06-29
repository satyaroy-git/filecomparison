import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';

/**
 * Keyboard shortcuts for the application:
 * - Ctrl+E: Export Excel
 * - Ctrl+D: Jump to Differences tab
 * - Ctrl+1-5: Switch result tabs
 * - Escape: Go back / close
 * - F: Toggle filter (show only changes)
 */
export function useKeyboardShortcuts() {
  const {
    step,
    diffResult,
    setActiveResultsTab,
    setStep,
    reset,
  } = useAppStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger when typing in inputs
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return;
    }

    const isCtrl = e.ctrlKey || e.metaKey;

    // Ctrl+1-5: Switch tabs in results view
    if (isCtrl && step === 'results' && diffResult) {
      switch (e.key) {
        case '1':
          e.preventDefault();
          setActiveResultsTab('summary');
          return;
        case '2':
          e.preventDefault();
          setActiveResultsTab('differences');
          return;
        case '3':
          e.preventDefault();
          setActiveResultsTab('only-original');
          return;
        case '4':
          e.preventDefault();
          setActiveResultsTab('only-modified');
          return;
        case '5':
          e.preventDefault();
          setActiveResultsTab('matched');
          return;
      }
    }

    // Ctrl+D: Jump to differences tab
    if (isCtrl && e.key === 'd' && step === 'results') {
      e.preventDefault();
      setActiveResultsTab('differences');
      return;
    }

    // Escape: Go back
    if (e.key === 'Escape') {
      if (step === 'results') {
        setStep('configure');
      } else if (step === 'configure') {
        setStep('upload');
      }
      return;
    }

    // Ctrl+Shift+N: New comparison
    if (isCtrl && e.shiftKey && e.key === 'N') {
      e.preventDefault();
      reset();
      return;
    }
  }, [step, diffResult, setActiveResultsTab, setStep, reset]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
