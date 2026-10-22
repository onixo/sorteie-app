import { GeneroIcon } from './GeneroIcon';

type Genero = 'M' | 'F' | 'O';

interface SeletorGeneroProps {
  valor: Genero | null;
  onChange: (g: Genero) => void;
  disabled?: boolean;
  sobre?: 'sheet' | 'cartao'; // cor de fundo onde o seletor aparece
  compacto?: boolean;         // texto menor, para caber no cartão do import
}

const ROTULOS: Record<Genero, string> = { M: 'Masculino', F: 'Feminino', O: 'Outro' };

// Escolha de gênero (um dos três). O mesmo componente no Adicionar, Editar e Importar.
export function SeletorGenero({ valor, onChange, disabled, sobre = 'sheet', compacto }: SeletorGeneroProps) {
  const fundoInativo = sobre === 'cartao' ? 'bg-[#0D2847]' : 'bg-[#162844] hover:bg-[#1E8FD5]/10';
  return (
    <div role="radiogroup" aria-label="Gênero" className="flex gap-2">
      {(['M', 'F', 'O'] as const).map(g => (
        <button
          key={g}
          type="button"
          role="radio"
          aria-checked={valor === g}
          onClick={() => onChange(g)}
          disabled={disabled}
          className={`flex-1 min-h-11 rounded-lg transition-all flex items-center justify-center gap-1 ${
            compacto ? 'text-xs' : 'text-sm'
          } ${
            valor === g
              ? 'bg-gradient-to-r from-[#1BAF8A] to-[#1E8FD5] text-[#0A1628] font-medium'
              : `${fundoInativo} text-[#7FB2DC]`
          }`}
        >
          <GeneroIcon genero={g} size={compacto ? 14 : 16} decorativo />
          <span>{ROTULOS[g]}</span>
        </button>
      ))}
    </div>
  );
}
