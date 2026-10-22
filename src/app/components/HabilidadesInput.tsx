import { Habilidades } from '../types';
import { HABILIDADES, NOTA_LABELS } from '../habilidades';

interface HabilidadesInputProps {
  value: Partial<Habilidades>;
  onChange: (key: keyof Habilidades, nota: number) => void;
  disabled?: boolean;
  showMissing?: boolean; // destaca em vermelho as habilidades ainda sem nota
  showDica?: boolean;    // dica de uma linha sob o nome (desligada no import, para caber na tela)
  onCard?: boolean;      // sobre um cartão (#162844): botões mais escuros. Nos sheets (#0D2847): mais claros
}

// 5 habilidades, uma linha de 5 botões cada: 1 toque por habilidade.
export function HabilidadesInput({ value, onChange, disabled, showMissing, showDica = true, onCard = false }: HabilidadesInputProps) {
  return (
    <div className={showDica ? 'space-y-4' : 'space-y-2.5'}>
      {HABILIDADES.map(({ key, label, dica }) => {
        const nota = value[key];
        const missing = showMissing && nota === undefined;
        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-sm ${missing ? 'text-[#ff6b86]' : 'text-[#F0F4FF]'}`}>{label}</span>
              <span className={`text-xs font-medium ${nota !== undefined ? 'text-[#1BAF8A]' : 'text-[#4A90C4]/70'}`}>
                {nota !== undefined ? NOTA_LABELS[nota - 1] : missing ? 'Falta' : 'Selecione'}
              </span>
            </div>
            {showDica && <p className="text-xs text-[#4A90C4]/90 mb-2">{dica}</p>}
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(key, n)}
                  aria-label={`${label} ${n} de 5`}
                  aria-pressed={nota === n}
                  className={`flex-1 h-11 rounded-lg text-sm font-medium transition-all ${
                    nota !== undefined && n <= nota
                      ? 'bg-gradient-to-t from-[#1BAF8A] to-[#1E8FD5] text-[#0A1628]'
                      : `${onCard ? 'bg-[#0D2847]' : 'bg-[#1A3050]'} text-[#4A90C4]/70`
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
