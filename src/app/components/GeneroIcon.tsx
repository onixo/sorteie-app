import { Mars, Venus, VenusAndMars } from 'lucide-react';

const NOMES = { M: 'Masculino', F: 'Feminino', O: 'Outro' } as const;

interface GeneroIconProps {
  genero: 'M' | 'F' | 'O';
  size?: number;
  className?: string;
  decorativo?: boolean; // true quando o texto do gênero já aparece ao lado (botões com rótulo)
}

// Ícone SVG de gênero. Os caracteres de texto (♂ ♀ ⚥) usam uma fonte de reserva no celular
// e ficam fora da linha dos números; o SVG renderiza igual em qualquer aparelho.
export function GeneroIcon({ genero, size = 14, className, decorativo = false }: GeneroIconProps) {
  const Icone = genero === 'M' ? Mars : genero === 'F' ? Venus : VenusAndMars;
  return decorativo ? (
    <Icone size={size} className={className} aria-hidden="true" />
  ) : (
    <Icone size={size} className={className} role="img" aria-label={NOMES[genero]} />
  );
}
