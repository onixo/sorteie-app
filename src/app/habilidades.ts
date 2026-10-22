import { Habilidades, ModoClassificacao, Player } from './types';

// ─── Habilidades (classificação detalhada) ────────────────────────────────────

export const HABILIDADES: { key: keyof Habilidades; label: string; abrev: string; dica: string }[] = [
  { key: 'saque',        label: 'Saque',            abrev: 'Saq', dica: 'Força e consistência. Entra na quadra?' },
  { key: 'levantamento', label: 'Levantamento',     abrev: 'Lev', dica: 'Precisão ao colocar a bola pro atacante' },
  { key: 'ataque',       label: 'Ataque',           abrev: 'Ata', dica: 'Potência e colocação da cortada' },
  { key: 'defesa',       label: 'Defesa/Recepção',  abrev: 'Def', dica: 'Segura saque e cortada, bola controlada' },
  { key: 'movimentacao', label: 'Movimentação',     abrev: 'Mov', dica: 'Posicionamento, cobertura e leitura de jogo' },
];

export const NOTA_LABELS = ['Fraco', 'Regular', 'Bom', 'Muito bom', 'Excelente'];

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

export function ehLevantador(p: Player): boolean {
  return !!p.habilidades && p.habilidades.levantamento >= MIN_LEVANTADOR;
}

// ─── Modo da lista ────────────────────────────────────────────────────────────

// O modo é da lista inteira, definido pelo primeiro jogador. Lista vazia = ainda não escolhido.
export function modoDaLista(players: Player[]): ModoClassificacao | null {
  if (players.length === 0) return null;
  return players[0].habilidades ? 'detalhado' : 'simples';
}
