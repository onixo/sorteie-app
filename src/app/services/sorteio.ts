import { Player, Time, ResultadoSorteio, ModoSorteio, Habilidades } from '../types';
import { HABILIDADES, forca, valorHabilidade, ehLevantador, habilidadesCompletas } from '../habilidades';

// Ruído aplicado à força no modo detalhado: com médias decimais quase não há empates,
// então sem isso as 200 iterações e o "Sortear novamente" gerariam o mesmo resultado.
const RUIDO_DETALHADO = 0.6;

// Modo detalhado: sorteia entre todas as tentativas com score até (melhor + tolerância),
// em vez de sempre o único melhor. Mantém o equilíbrio e devolve variedade no "Sortear novamente".
const TOLERANCIA_DETALHADO = 1.5;
const TENTATIVAS_GENERO_DETALHADO = 50;

interface Tentativa {
  teams: Player[][];
  score: number;
}

function escolherEntreMelhores(tentativas: Tentativa[]): Tentativa {
  const melhor = Math.min(...tentativas.map(t => t.score));
  const pool = tentativas.filter(t => t.score <= melhor + TOLERANCIA_DETALHADO);
  return pool[Math.floor(Math.random() * pool.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Embaralha (aleatoriza empates) e ordena por força desc.
function ordenarPorForca(arr: Player[], detalhado: boolean): Player[] {
  return shuffle(arr)
    .map(p => ({ p, k: forca(p) + (detalhado ? (Math.random() - 0.5) * RUIDO_DETALHADO : 0) }))
    .sort((a, b) => b.k - a.k)
    .map(x => x.p);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function mediaHabilidades(team: Player[]): Habilidades {
  const out = {} as Habilidades;
  for (const { key } of HABILIDADES) {
    out[key] = round1(team.reduce((s, p) => s + valorHabilidade(p, key), 0) / Math.max(1, team.length));
  }
  return out;
}

function buildTimes(
  teams: Player[][],
  detalhado: boolean,
): { times: Time[]; nivelEquilibrado: boolean; generoEquilibrado: boolean } {
  const letras = ['A', 'B', 'C', 'D', 'E', 'F'];
  const times: Time[] = teams.map((team, i) => ({
    nome: `Time ${letras[i]}`,
    jogadores: team,
    totalNivel: round1(team.reduce((s, p) => s + forca(p), 0)),
    masculinos: team.filter(p => p.genero === 'M').length,
    femininos: team.filter(p => p.genero === 'F').length,
    outros: team.filter(p => p.genero === 'O').length,
    ...(detalhado ? { habilidades: mediaHabilidades(team) } : {}),
  }));

  const allSums = times.map(t => t.totalNivel);
  const nivelEquilibrado = Math.max(...allSums) - Math.min(...allSums) <= 3;

  let generoEquilibrado = true;
  (['M', 'F'] as const).forEach(g => {
    const counts = times.map(t => t.jogadores.filter(p => p.genero === g).length);
    if (Math.max(...counts) - Math.min(...counts) > 1) generoEquilibrado = false;
  });

  return { times, nivelEquilibrado, generoEquilibrado };
}

function scoreBalance(teams: Player[][], detalhado: boolean, regraLev: boolean): number {
  const sums = teams.map(t => t.reduce((s, p) => s + forca(p), 0));
  const avg = sums.reduce((a, b) => a + b, 0) / sums.length;
  const nivelVariance = sums.reduce((s, v) => s + Math.abs(v - avg), 0);

  let genPenalty = 0;
  (['M', 'F'] as const).forEach(g => {
    const counts = teams.map(t => t.filter(p => p.genero === g).length);
    const avgG = counts.reduce((a, b) => a + b, 0) / counts.length;
    genPenalty += counts.reduce((s, v) => s + Math.abs(v - avgG), 0);
  });

  // Evita acumular várias Vagas Livres (id < 0) no mesmo time
  const vagasExcesso = teams.reduce((s, t) => s + Math.max(0, t.filter(p => p.id < 0).length - 1), 0);

  let score = nivelVariance + genPenalty * 5 + vagasExcesso * 3;

  if (detalhado) {
    // Variância por habilidade entre os times (média das 5), para evitar
    // um time só de atacantes e outro só de defensores.
    let habVariance = 0;
    for (const { key } of HABILIDADES) {
      const hs = teams.map(t => t.reduce((s, p) => s + valorHabilidade(p, key), 0));
      const hAvg = hs.reduce((a, b) => a + b, 0) / hs.length;
      habVariance += hs.reduce((s, v) => s + Math.abs(v - hAvg), 0);
    }
    habVariance /= HABILIDADES.length;

    // Penalidade forte por time sem levantador (só quando há levantadores suficientes)
    const semLevantador = regraLev ? teams.filter(t => !t.some(ehLevantador)).length : 0;

    score += habVariance + semLevantador * 10;
  }

  return score;
}

// Regra "um levantador por time": para cada time sem levantador, troca um
// levantador de um time que tem 2 ou mais por um jogador do mesmo gênero (preserva
// a distribuição de gênero), escolhendo a troca de menor diferença de força.
// Se não houver troca possível (levantadores insuficientes), deixa como está.
// `trocaLivreNaoFeminino`: no modo Gênero só a distribuição de mulheres é garantida, então
// trocas entre não-femininos (M, O, Vaga Livre) são permitidas e não violam essa garantia.
function garantirLevantadores(teams: Player[][], trocaLivreNaoFeminino = false): void {
  for (let guard = 0; guard < teams.length * 4; guard++) {
    const semLev = teams.map((_, i) => i).filter(i => !teams[i].some(ehLevantador));
    const comSobra = teams.map((_, i) => i).filter(i => teams[i].filter(ehLevantador).length >= 2);
    if (semLev.length === 0 || comSobra.length === 0) return;

    let best: { s: number; is: number; t: number; ic: number; custo: number } | null = null;
    for (const t of semLev) {
      for (const s of comSobra) {
        for (let is = 0; is < teams[s].length; is++) {
          const levantador = teams[s][is];
          if (!ehLevantador(levantador)) continue;
          for (let ic = 0; ic < teams[t].length; ic++) {
            const cand = teams[t][ic];
            const mesmoGenero = cand.genero === levantador.genero;
            const ambosNaoFem = trocaLivreNaoFeminino && cand.genero !== 'F' && levantador.genero !== 'F';
            if (!mesmoGenero && !ambosNaoFem) continue;
            const custo = Math.abs(forca(levantador) - forca(cand));
            if (!best || custo < best.custo) best = { s, is, t, ic, custo };
          }
        }
      }
    }
    if (!best) return;

    const { s, is, t, ic } = best;
    [teams[s][is], teams[t][ic]] = [teams[t][ic], teams[s][is]];
  }
}

// Garante que os titulares tenham levantadores suficientes (até um por time),
// trazendo levantadores das reservas no lugar de titulares que não são levantadores.
function priorizarLevantadoresTitulares(titulares: Player[], reservas: Player[], numTimes: number): void {
  const totalLevantadores = titulares.filter(ehLevantador).length + reservas.filter(ehLevantador).length;
  let faltam = Math.min(numTimes, totalLevantadores) - titulares.filter(ehLevantador).length;

  for (let i = 0; i < reservas.length && faltam > 0; i++) {
    if (!ehLevantador(reservas[i])) continue;
    const idx = titulares.findIndex(p => !ehLevantador(p));
    if (idx === -1) break;
    [titulares[idx], reservas[i]] = [reservas[i], titulares[idx]];
    faltam--;
  }
}

// Atribui cada jogador (já ordenado por nível desc) ao time com menor nível acumulado,
// respeitando teto de gênero. Fallback sem teto se não houver vaga elegível.
function greedyAssign(
  sorted: Player[],
  numTimes: number,
  jogadoresPorTime: number,
  maxF: number,
  maxM: number,
): Player[][] {
  const teams: Player[][] = Array.from({ length: numTimes }, () => []);
  const nivelSum = Array(numTimes).fill(0);
  const femCount = Array(numTimes).fill(0);
  const mascCount = Array(numTimes).fill(0);

  for (const p of sorted) {
    const gMax = p.genero === 'F' ? maxF : p.genero === 'M' ? maxM : jogadoresPorTime;
    const gCnt = p.genero === 'F' ? femCount : p.genero === 'M' ? mascCount : null;

    // Tenta respeitar teto de gênero
    let bestTeam = -1;
    let lowestNivel = Infinity;
    for (let t = 0; t < numTimes; t++) {
      const gc = gCnt ? gCnt[t] : 0;
      if (teams[t].length < jogadoresPorTime && gc < gMax && nivelSum[t] < lowestNivel) {
        bestTeam = t;
        lowestNivel = nivelSum[t];
      }
    }

    // Fallback: ignora teto de gênero se necessário
    if (bestTeam === -1) {
      lowestNivel = Infinity;
      for (let t = 0; t < numTimes; t++) {
        if (teams[t].length < jogadoresPorTime && nivelSum[t] < lowestNivel) {
          bestTeam = t;
          lowestNivel = nivelSum[t];
        }
      }
    }

    teams[bestTeam].push(p);
    nivelSum[bestTeam] += forca(p);
    if (p.genero === 'F') femCount[bestTeam]++;
    else if (p.genero === 'M') mascCount[bestTeam]++;
  }

  return teams;
}

// Modo Equilibrado: todos os jogadores ordenados por nível desc, distribuídos
// greedy ao time mais fraco, com teto de gênero para distribuição igualitária.
// Roda 200 vezes com tie-breaking aleatório e retorna o melhor resultado.
function sortearEquilibrado(
  titulares: Player[],
  numTimes: number,
  jogadoresPorTime: number,
  detalhado: boolean,
  regraLev: boolean,
): { bestTeams: Player[][]; bestScore: number } {
  const nF = titulares.filter(p => p.genero === 'F').length;
  const nM = titulares.filter(p => p.genero === 'M').length;
  const maxF = Math.ceil(nF / numTimes);
  const maxM = Math.ceil(nM / numTimes);

  // Modo detalhado: guarda todas as tentativas e sorteia entre as quase melhores
  if (detalhado) {
    const tentativas: Tentativa[] = [];
    for (let i = 0; i < 200; i++) {
      const teams = greedyAssign(ordenarPorForca(titulares, true), numTimes, jogadoresPorTime, maxF, maxM);
      if (regraLev) garantirLevantadores(teams);
      tentativas.push({ teams, score: scoreBalance(teams, true, regraLev) });
    }
    const escolhida = escolherEntreMelhores(tentativas);
    return { bestTeams: escolhida.teams, bestScore: escolhida.score };
  }

  let bestTeams: Player[][] | null = null;
  let bestScore = Infinity;

  for (let i = 0; i < 200; i++) {
    const sorted = ordenarPorForca(titulares, false);
    const teams = greedyAssign(sorted, numTimes, jogadoresPorTime, maxF, maxM);
    const score = scoreBalance(teams, false, false);
    if (score < bestScore) {
      bestScore = score;
      bestTeams = teams;
    }
    if (bestScore === 0) break;
  }

  return { bestTeams: bestTeams!, bestScore };
}

// Modo Gênero: mulheres distribuídas primeiro (greedy por nível, garantindo
// distribuição igualitária), depois demais jogadores (greedy por nível).
// Gênero é garantido; nível é equilibrado dentro dessa restrição.
function sortearGeneroGarantido(
  titulares: Player[],
  numTimes: number,
  jogadoresPorTime: number,
  detalhado: boolean,
  regraLev: boolean,
): Player[][] {
  const femininos = ordenarPorForca(titulares.filter(p => p.genero === 'F'), detalhado);
  const naoFemininos = ordenarPorForca(titulares.filter(p => p.genero !== 'F'), detalhado);

  // Distribuição exata de mulheres: cada time recebe `baseF`, e só `extrasF` times (nF mod
  // numTimes) podem ter uma a mais. Assim a diferença entre times nunca passa de 1.
  // (O teto antigo, baseF + 1 para todos, deixava um time com 3 e outro com 1.)
  const baseF = Math.floor(femininos.length / numTimes);
  let extrasF = femininos.length % numTimes;

  const teams: Player[][] = Array.from({ length: numTimes }, () => []);
  const nivelSum = Array(numTimes).fill(0);
  const femCount = Array(numTimes).fill(0);

  for (const p of femininos) {
    // Respeita o tamanho do time além do teto de mulheres (sem isso, titulares só
    // femininas estouravam jogadoresPorTime em um time e deixavam outro incompleto)
    let bestTeam = -1;
    let lowestNivel = Infinity;
    for (let t = 0; t < numTimes; t++) {
      const dentroDoLimite = femCount[t] < baseF || (femCount[t] === baseF && extrasF > 0);
      if (teams[t].length < jogadoresPorTime && dentroDoLimite && nivelSum[t] < lowestNivel) {
        bestTeam = t;
        lowestNivel = nivelSum[t];
      }
    }
    if (bestTeam === -1) {
      lowestNivel = Infinity;
      for (let t = 0; t < numTimes; t++) {
        if (teams[t].length < jogadoresPorTime && nivelSum[t] < lowestNivel) {
          bestTeam = t;
          lowestNivel = nivelSum[t];
        }
      }
    }
    teams[bestTeam].push(p);
    nivelSum[bestTeam] += forca(p);
    femCount[bestTeam]++;
    if (femCount[bestTeam] === baseF + 1) extrasF = Math.max(0, extrasF - 1);
  }

  for (const p of naoFemininos) {
    let bestTeam = 0;
    let lowestNivel = Infinity;
    for (let t = 0; t < numTimes; t++) {
      if (teams[t].length < jogadoresPorTime && nivelSum[t] < lowestNivel) {
        bestTeam = t;
        lowestNivel = nivelSum[t];
      }
    }
    teams[bestTeam].push(p);
    nivelSum[bestTeam] += forca(p);
  }

  if (regraLev) garantirLevantadores(teams, true);
  return teams;
}

export function sortearTimes(
  players: Player[],
  numTimes: number,
  jogadoresPorTime: number,
  modoSorteio: ModoSorteio = 'equilibrado'
): Omit<ResultadoSorteio, 'sorteioId' | 'criadoEm' | 'config'> {
  const needed = numTimes * jogadoresPorTime;

  if (players.length < needed) {
    throw new Error(
      `Jogadores insuficientes. Necessário: ${needed}, disponível: ${players.length}.`
    );
  }

  // Dado inválido não é corrigido em silêncio: interrompe com erro claro
  for (const p of players) {
    if (p.habilidades && !habilidadesCompletas(p.habilidades)) {
      throw new Error(`${p.nome}: habilidades incompletas ou inválidas. Edite o jogador.`);
    }
  }

  const detalhado = players.some(p => !!p.habilidades);

  // Espalhar levantadores só faz sentido se houver pelo menos um por time
  const regraLev = detalhado && players.filter(ehLevantador).length >= numTimes;

  const shuffled = shuffle(players);
  const titulares = shuffled.slice(0, needed);
  const reservas = shuffled.slice(needed);

  if (regraLev) priorizarLevantadoresTitulares(titulares, reservas, numTimes);

  let bestTeams: Player[][];
  let bestScore: number;

  if (modoSorteio === 'genero' && detalhado) {
    // Passada única é gulosa e pouco variada: gera várias e sorteia entre as quase melhores
    const tentativas: Tentativa[] = Array.from({ length: TENTATIVAS_GENERO_DETALHADO }, () => {
      const teams = sortearGeneroGarantido(titulares, numTimes, jogadoresPorTime, true, regraLev);
      return { teams, score: scoreBalance(teams, true, regraLev) };
    });
    const escolhida = escolherEntreMelhores(tentativas);
    bestTeams = escolhida.teams;
    bestScore = escolhida.score;
  } else if (modoSorteio === 'genero') {
    bestTeams = sortearGeneroGarantido(titulares, numTimes, jogadoresPorTime, false, false);
    bestScore = scoreBalance(bestTeams, false, false);
  } else {
    ({ bestTeams, bestScore } = sortearEquilibrado(titulares, numTimes, jogadoresPorTime, detalhado, regraLev));
  }

  const { times, nivelEquilibrado, generoEquilibrado } = buildTimes(bestTeams, detalhado);

  return {
    times,
    reservas,
    scoreEquilibrio: Math.round(bestScore * 100) / 100,
    nivelEquilibrado,
    generoEquilibrado,
    detalhado,
    // undefined quando a regra não se aplica (sem levantadores suficientes ou modo Rápido)
    levantadorPorTime: regraLev ? bestTeams.every(t => t.some(ehLevantador)) : undefined,
  };
}
