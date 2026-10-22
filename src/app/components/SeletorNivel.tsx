interface SeletorNivelProps {
  valor: number | null;
  onChange: (n: number) => void;
  disabled?: boolean;
  sobre?: 'sheet' | 'cartao'; // cor de fundo onde o seletor aparece
  alto?: boolean;             // botões mais altos (formulários); o cartão do import usa o normal
}

// Nível geral de 1 a 5 (avaliação rápida): cinco botões, os de baixo do escolhido ficam preenchidos.
export function SeletorNivel({ valor, onChange, disabled, sobre = 'sheet', alto }: SeletorNivelProps) {
  const fundoInativo = sobre === 'cartao' ? 'bg-[#0D2847]' : 'bg-[#162844]';
  return (
    <div role="radiogroup" aria-label="Nível de 1 a 5" className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={valor === n}
          aria-label={`Nível ${n} de 5`}
          onClick={() => onChange(n)}
          disabled={disabled}
          className={`flex-1 ${alto ? 'h-14' : 'h-11'} rounded-lg text-sm font-medium transition-all ${
            valor !== null && n <= valor
              ? 'bg-gradient-to-t from-[#1BAF8A] to-[#1E8FD5] text-[#0A1628]'
              : `${fundoInativo} text-[#7FB2DC]`
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
