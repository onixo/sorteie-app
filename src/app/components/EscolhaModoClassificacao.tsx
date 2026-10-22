import { Zap, SlidersHorizontal } from 'lucide-react';
import { ModoClassificacao } from '../types';

interface EscolhaModoClassificacaoProps {
  onEscolher: (modo: ModoClassificacao) => void;
}

// Pergunta "Rápido ou Detalhado?". Usada ao importar a lista (depois do preview) e ao
// adicionar o primeiro jogador (antes do formulário): o mesmo texto nos dois caminhos.
export function EscolhaModoClassificacao({ onEscolher }: EscolhaModoClassificacaoProps) {
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => onEscolher('simples')}
        className="w-full text-left p-4 rounded-xl border-2 border-[#1E8FD5]/20 bg-[#162844] hover:border-[#1BAF8A] transition-all"
      >
        <div className="flex items-center gap-3 mb-1">
          <Zap size={16} className="text-[#1BAF8A]" />
          <span className="font-medium text-sm text-[#F0F4FF]">Avaliação rápida</span>
        </div>
        <p className="text-xs text-[#7FB2DC] leading-relaxed">
          Um nível de 1 a 5 para cada jogador.
        </p>
      </button>

      <button
        type="button"
        onClick={() => onEscolher('detalhado')}
        className="w-full text-left p-4 rounded-xl border-2 border-[#1E8FD5]/20 bg-[#162844] hover:border-[#1E8FD5] transition-all"
      >
        <div className="flex items-center gap-3 mb-1">
          <SlidersHorizontal size={16} className="text-[#1E8FD5]" />
          <span className="font-medium text-sm text-[#F0F4FF]">Avaliação detalhada</span>
        </div>
        <p className="text-xs text-[#7FB2DC] leading-relaxed">
          Nota de 1 a 5 em saque, levantamento, ataque, defesa e movimentação. Os times saem equilibrados pelo conjunto das habilidades.
        </p>
      </button>
    </div>
  );
}
