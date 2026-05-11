import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
}

export function Toast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-28 left-4 right-4 max-w-md mx-auto z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg animate-in slide-in-from-bottom duration-300 ${
        type === 'success'
          ? 'bg-[#1BAF8A]/20 border border-[#1BAF8A]/40 text-[#1BAF8A]'
          : 'bg-[#d4183d]/10 border border-[#d4183d]/40 text-[#d4183d]'
      }`}
    >
      <span className="text-base leading-none">{type === 'success' ? '✓' : '⚠'}</span>
      <span className="flex-1 text-sm">{message}</span>
    </div>
  );
}
