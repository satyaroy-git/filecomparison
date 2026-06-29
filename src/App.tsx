import { Header } from '@/components/layout/Header';
import { UploadStep } from '@/components/upload/UploadStep';
import { ConfigStep } from '@/components/config/ConfigStep';
import { ResultsStep } from '@/components/results/ResultsStep';
import { useAppStore } from '@/stores/app-store';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function App() {
  const { step } = useAppStore();
  useKeyboardShortcuts();

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 'upload' && <UploadStep />}
        {(step === 'configure' || step === 'compare') && <ConfigStep />}
        {step === 'results' && <ResultsStep />}
      </main>
    </div>
  );
}
