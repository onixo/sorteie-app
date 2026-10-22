import { ChevronLeft } from 'lucide-react';

interface BotaoVoltarProps {
  onClick: () => void;
}

// Voltar padrão das telas: ícone + texto, com área de toque de 44 px.
export function BotaoVoltar({ onClick }: BotaoVoltarProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 min-h-11 -ml-2 pl-1 pr-3 text-[#7FB2DC] hover:text-[#1E8FD5] transition-colors"
    >
      <ChevronLeft size={20} aria-hidden="true" />
      <span>Voltar</span>
    </button>
  );
}
