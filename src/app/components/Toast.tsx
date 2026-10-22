import { useEffect } from 'react';
import { Check, TriangleAlert } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  action?: { label: string; onClick: () => void }; // ex: "Desfazer"
  onClose: () => void;
}

export function Toast({ message, type = 'success', action, onClose }: ToastProps) {
  // Com ação (Desfazer) o toast fica mais tempo na tela
  useEffect(() => {
    const timer = setTimeout(onClose, action ? 6000 : 3000);
    return () => clearTimeout(timer);
  }, [onClose, action]);

  return (
    <div
      className={`fixed bottom-40 left-4 right-4 max-w-md mx-auto z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg animate-in slide-in-from-bottom duration-300 ${
        type === 'success'
          ? 'bg-[#0E3B38] border border-[#1BAF8A]/50 text-[#3DD9B0]'
          : 'bg-[#3A1420] border border-[#d4183d]/50 text-[#ff6b86]'
      }`}
    >
      <span className="shrink-0 flex items-center">
        {type === 'success' ? <Check size={18} aria-hidden="true" /> : <TriangleAlert size={18} aria-hidden="true" />}
      </span>
      <span className="flex-1 text-sm">{message}</span>
      {action && (
        <button
          onClick={() => { action.onClick(); onClose(); }}
          className="text-sm font-semibold underline underline-offset-2 min-h-11 px-2 -my-2 -mr-2"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
