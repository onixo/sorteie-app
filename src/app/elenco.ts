import { ElencoItem } from './types';

// Chave de comparação de nomes: sem acento, sem diferença de maiúsculas, espaços normalizados.
// "Dédé", "dede" e " DEDÉ " viram a mesma chave.
export function normalizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Índice do elenco por nome normalizado, para consulta rápida.
export function indexarElenco(elenco: ElencoItem[]): Map<string, ElencoItem> {
  return new Map(elenco.map(item => [normalizarNome(item.nome), item]));
}
