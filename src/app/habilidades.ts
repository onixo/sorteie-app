import { Habilidades, ModoClassificacao, Player } from './types';

// ─── Habilidades (classificação detalhada) ────────────────────────────────────

export const HABILIDADES: { key: keyof Habilidades; label: string; abrev: string; dica: string }[] = [
  { key: 'saque',        label: 'Saque',            abrev: 'Saq', dica: 'Saque forte e que não erra' },
  { key: 'levantamento', label: 'Levantamento',     abrev: 'Lev', dica: 'Precisão ao colocar a bola para o atacante' },
  { key: 'ataque',       label: 'Ataque',           abrev: 'Ata', dica: 'Potência e colocação da cortada' },
  { key: 'defesa',       label: 'Defesa e recepção', abrev: 'Def', dica: 'Recebe o saque e defende a cortada com a bola controlada' },
  { key: 'movimentacao', label: 'Movimentação',     abrev: 'Mov', dica: 'Posicionamento, cobertura e leitura de jogo' },
];

export const NOTA_LABELS = ['Fraco', 'Regular', 'Bom', 'Muito bom', 'Excelente'];

// Rótulos do nível geral (avaliação rápida), de 1 a 5. Uma lista só para todas as telas.
export const NIVEL_LABELS = ['Iniciante', 'Básico', 'Intermediário', 'Avançado', 'Craque'];

// Valor guardado no lugar da nota de quem o organizador não conhece. No sorteio ele é trocado
// pelo nível médio da lista; o valor guardado só existe para o jogador ter os mesmos campos.
export const NIVEL_PADRAO = 3;

export function habilidadesNeutras(): Habilidades {
  return { saque: NIVEL_PADRAO, levantamento: NIVEL_PADRAO, ataque: NIVEL_PADRAO, defesa: NIVEL_PADRAO, movimentacao: NIVEL_PADRAO };
}

// Nota mínima em Levantamento para o jogador contar como levantador.
export const MIN_LEVANTADOR = 3;

// Completa = as 5 chaves presentes, cada uma um inteiro de 1 a 5.
export function habilidadesCompletas(h: Partial<Habilidades>): h is Habilidades {
  return HABILIDADES.every(({ key }) => Number.isInteger(h[key]) && h[key]! >= 1 && h[key]! <= 5);
}

// Média das 5 notas arredondada para o inteiro 1-5 (campo `nivel` do jogador).
export function calcularNivel(h: Habilidades): number {
  const media = HABILIDADES.reduce((s, { key }) => s + h[key], 0) / HABILIDADES.length;
  return Math.min(5, Math.max(1, Math.round(media)));
}

// ─── Leitura de força/habilidade de um jogador ────────────────────────────────

// Força usada no sorteio: média decimal das habilidades; sem habilidades, o nível.
export function forca(p: Player): number {
  if (!p.habilidades) return p.nivel;
  return HABILIDADES.reduce((s, { key }) => s + p.habilidades![key], 0) / HABILIDADES.length;
}

// Nota numa habilidade; jogador sem habilidades (ex: Vaga Livre) usa o nível.
export function valorHabilidade(p: Player, key: keyof Habilidades): number {
  return p.habilidades?.[key] ?? p.nivel;
}

// Quem não é conhecido nunca conta como levantador (não há nota de verdade).
export function ehLevantador(p: Player): boolean {
  return !p.desconhecido && !!p.habilidades && p.habilidades.levantamento >= MIN_LEVANTADOR;
}

// Nível médio (inteiro de 1 a 5) de quem foi avaliado. Ignora os jogadores "não conheço" e as
// vagas abertas (id negativo). Sem ninguém avaliado, usa o valor neutro.
export function nivelMedioDaLista(players: Player[]): number {
  const avaliados = players.filter(p => !p.desconhecido && p.id >= 0);
  if (avaliados.length === 0) return NIVEL_PADRAO;
  const media = avaliados.reduce((s, p) => s + p.nivel, 0) / avaliados.length;
  return Math.min(5, Math.max(1, Math.round(media)));
}

// ─── Modo da lista ────────────────────────────────────────────────────────────

// O modo é da lista inteira, definido pelo primeiro jogador. Lista vazia = ainda não escolhido.
export function modoDaLista(players: Player[]): ModoClassificacao | null {
  if (players.length === 0) return null;
  return players[0].habilidades ? 'detalhado' : 'simples';
}
