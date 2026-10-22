import { CircleHelp } from 'lucide-react';

interface NaoConhecoProps {
  ativo: boolean;
  onChange: (ativo: boolean) => void;
  disabled?: boolean;
  compacto?: boolean;          // rótulo curto, para caber no cartão do import
  sobre?: 'sheet' | 'cartao';  // cor de fundo onde o botão aparece
}

// Marca que o organizador não conhece o jogador: só o gênero é pedido e, no sorteio, ele entra
// com o nível médio da lista. Funciona igual nas duas avaliações (rápida e detalhada).
export function NaoConheco({ ativo, onChange, disabled, compacto, sobre = 'sheet' }: NaoConhecoProps) {
  const fundoInativo = sobre === 'cartao' ? 'bg-[#0D2847]' : 'bg-[#162844]';
  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={ativo}
        onClick={() => onChange(!ativo)}
        disabled={disabled}
        className={`w-full min-h-11 rounded-lg px-3 flex items-center justify-center gap-2 transition-all ${
          compacto ? 'text-xs' : 'text-sm'
        } ${
          ativo
            ? 'bg-[#1E8FD5]/15 border border-[#1E8FD5] text-[#F0F4FF] font-medium'
            : `${fundoInativo} border border-transparent text-[#7FB2DC] hover:bg-[#1E8FD5]/10`
        }`}
      >
        <CircleHelp size={compacto ? 14 : 16} aria-hidden="true" />
        {compacto ? 'Não conheço' : 'Não conheço este jogador'}
      </button>
      {ativo && (
        <p className="text-xs text-[#7FB2DC] mt-2">
          Entra no sorteio com o nível médio da lista. Dá para avaliar depois, pelo lápis.
        </p>
      )}
    </div>
  );
}
