import { Player, NewPlayerPayload, ResultadoSorteio, ModoSorteio } from '../types';
import { sortearTimes } from './sorteio';

const STORAGE_KEY = 'sorteie_players';

function loadPlayers(): Player[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function savePlayers(players: Player[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

function nextId(players: Player[]): number {
  return players.length === 0 ? 1 : Math.max(...players.map(p => p.id)) + 1;
}

// ─── Jogadores ────────────────────────────────────────────────────────────────

export async function getPlayers(): Promise<Player[]> {
  return loadPlayers();
}

export async function createPlayer(payload: NewPlayerPayload): Promise<Player> {
  const players = loadPlayers();
  const player: Player = {
    id: nextId(players),
    ...payload,
    criado_em: new Date().toLocaleString('pt-BR'),
  };
  savePlayers([...players, player]);
  return player;
}

export async function deletePlayer(id: number): Promise<void> {
  savePlayers(loadPlayers().filter(p => p.id !== id));
}

export async function updatePlayer(id: number, payload: NewPlayerPayload): Promise<Player> {
  const players = loadPlayers();
  const updated = players.map(p => p.id === id ? { ...p, ...payload } : p);
  savePlayers(updated);
  return updated.find(p => p.id === id)!;
}

export async function clearPlayers(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Sorteio ──────────────────────────────────────────────────────────────────

interface SorteioPayload {
  numTimes: number;
  jogadoresPorTime: number;
  modoSorteio: ModoSorteio;
}

export async function sortear(payload: SorteioPayload): Promise<ResultadoSorteio> {
  const players = loadPlayers();
  const resultado = sortearTimes(players, payload.numTimes, payload.jogadoresPorTime, payload.modoSorteio);
  return {
    sorteioId: Date.now(),
    criadoEm: new Date().toLocaleString('pt-BR'),
    config: payload,
    ...resultado,
  };
}
