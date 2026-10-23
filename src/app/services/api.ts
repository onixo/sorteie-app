import { Player, NewPlayerPayload, ResultadoSorteio, ModoSorteio, ModoClassificacao, ElencoItem } from '../types';
import { sortearTimes } from './sorteio';
import { normalizarNome } from '../elenco';
import { calcularNivel, converterAvaliacao } from '../habilidades';

const STORAGE_KEY = 'sorteie_players';
const ELENCO_KEY = 'sorteie_elenco';

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

// ─── Elenco (notas lembradas entre as semanas, por nome normalizado) ──────────

function loadElenco(): ElencoItem[] {
  try {
    const dados = JSON.parse(localStorage.getItem(ELENCO_KEY) ?? '[]');
    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

// Grava/atualiza o jogador no elenco. Quando o nome foi corrigido numa edição,
// remove também a entrada do nome anterior para não deixar registro órfão.
// Falha de gravação do elenco não pode impedir o cadastro do jogador.
function upsertElenco(player: NewPlayerPayload, nomeAnterior?: string): void {
  // Sem nota de verdade (não conheço, ou notas ainda iguais ao nível), não há o que lembrar
  if (player.desconhecido || player.detalhePendente) return;
  try {
    const chaveNova = normalizarNome(player.nome);
    const chaves = new Set([chaveNova]);
    if (nomeAnterior) chaves.add(normalizarNome(nomeAnterior));
    const elenco = loadElenco();

    // Cadastro sem habilidades (modo Rápido) não apaga as 5 notas já guardadas enquanto o
    // nível continuar o mesmo. Se o nível mudou, as notas guardadas estão desatualizadas.
    const existente =
      elenco.find(i => normalizarNome(i.nome) === chaveNova) ??
      (nomeAnterior ? elenco.find(i => normalizarNome(i.nome) === normalizarNome(nomeAnterior)) : undefined);
    const habilidades =
      player.habilidades ??
      (existente?.habilidades && calcularNivel(existente.habilidades) === player.nivel
        ? existente.habilidades
        : undefined);

    const item: ElencoItem = {
      nome: player.nome,
      genero: player.genero,
      nivel: player.nivel,
      ...(habilidades ? { habilidades } : {}),
    };
    const resto = elenco.filter(i => !chaves.has(normalizarNome(i.nome)));
    localStorage.setItem(ELENCO_KEY, JSON.stringify([...resto, item]));
  } catch (err) {
    console.warn('Não foi possível salvar o jogador no elenco.', err);
  }
}

export async function getElenco(): Promise<ElencoItem[]> {
  return loadElenco();
}

export async function clearElenco(): Promise<void> {
  localStorage.removeItem(ELENCO_KEY);
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
  upsertElenco(player);
  return player;
}

export async function deletePlayer(id: number): Promise<void> {
  savePlayers(loadPlayers().filter(p => p.id !== id));
}

// Desfazer remoção: reinsere o jogador com o mesmo id, mantendo a ordem de criação.
export async function restorePlayer(player: Player): Promise<void> {
  const players = loadPlayers().filter(p => p.id !== player.id);
  savePlayers([...players, player].sort((a, b) => a.id - b.id));
}

export async function updatePlayer(id: number, payload: NewPlayerPayload): Promise<Player> {
  const players = loadPlayers();
  const nomeAnterior = players.find(p => p.id === id)?.nome;
  const updated = players.map(p => p.id === id ? { ...p, ...payload } : p);
  savePlayers(updated);
  const atualizado = updated.find(p => p.id === id)!;
  upsertElenco(atualizado, nomeAnterior);
  return atualizado;
}

// Passa a lista para o outro tipo de avaliação, mantendo os jogadores. Não mexe nas notas salvas.
export async function convertPlayers(para: ModoClassificacao): Promise<Player[]> {
  const convertidos = converterAvaliacao(loadPlayers(), para);
  savePlayers(convertidos);
  return convertidos;
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

export async function sortear(payload: SorteioPayload, extraPlayers: Player[] = []): Promise<ResultadoSorteio> {
  const players = [...loadPlayers(), ...extraPlayers];
  const resultado = sortearTimes(players, payload.numTimes, payload.jogadoresPorTime, payload.modoSorteio);
  return {
    sorteioId: Date.now(),
    criadoEm: new Date().toLocaleString('pt-BR'),
    config: payload,
    ...resultado,
  };
}
