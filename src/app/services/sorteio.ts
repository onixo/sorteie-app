import { Player, Time, ResultadoSorteio, ModoSorteio } from '../types';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTimes(teams: Player[][]): { times: Time[]; nivelEquilibrado: boolean; generoEquilibrado: boolean } {
  const letras = ['A', 'B', 'C', 'D', 'E', 'F'];
  const times: Time[] = teams.map((team, i) => ({
    nome: `Time ${letras[i]}`,
    jogadores: team,
    totalNivel: team.reduce((s, p) => s + p.nivel, 0),
    masculinos: team.filter(p => p.genero === 'M').length,
    femininos: team.filter(p => p.genero === 'F').length,
    outros: team.filter(p => p.genero === 'O').length,
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

function scoreBalance(teams: Player[][]): number {
  const sums = teams.map(t => t.reduce((s, p) => s + p.nivel, 0));
  const avg = sums.reduce((a, b) => a + b, 0) / sums.length;
  const nivelVariance = sums.reduce((s, v) => s + Math.abs(v - avg), 0);

  let genPenalty = 0;
  (['M', 'F'] as const).forEach(g => {
    const counts = teams.map(t => t.filter(p => p.genero === g).length);
    const avgG = counts.reduce((a, b) => a + b, 0) / counts.length;
    genPenalty += counts.reduce((s, v) => s + Math.abs(v - avgG), 0);
  });

  return nivelVariance + genPenalty * 5;
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
    nivelSum[bestTeam] += p.nivel;
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
): { bestTeams: Player[][]; bestScore: number } {
  const nF = titulares.filter(p => p.genero === 'F').length;
  const nM = titulares.filter(p => p.genero === 'M').length;
  const maxF = Math.ceil(nF / numTimes);
  const maxM = Math.ceil(nM / numTimes);

  let bestTeams: Player[][] | null = null;
  let bestScore = Infinity;

  for (let i = 0; i < 200; i++) {
    // Embaralha para aleatorizar empates de nível, depois ordena desc
    const sorted = shuffle(titulares).sort((a, b) => b.nivel - a.nivel);
    const teams = greedyAssign(sorted, numTimes, jogadoresPorTime, maxF, maxM);
    const score = scoreBalance(teams);
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
): Player[][] {
  const byNivel = (arr: Player[]) =>
    shuffle(arr).sort((a, b) => b.nivel - a.nivel);

  const femininos = byNivel(titulares.filter(p => p.genero === 'F'));
  const naoFemininos = byNivel(titulares.filter(p => p.genero !== 'F'));

  const maxFPerTeam = Math.floor(femininos.length / numTimes) + 1;

  const teams: Player[][] = Array.from({ length: numTimes }, () => []);
  const nivelSum = Array(numTimes).fill(0);
  const femCount = Array(numTimes).fill(0);

  for (const p of femininos) {
    let bestTeam = 0;
    let lowestNivel = Infinity;
    for (let t = 0; t < numTimes; t++) {
      if (femCount[t] < maxFPerTeam && nivelSum[t] < lowestNivel) {
        bestTeam = t;
        lowestNivel = nivelSum[t];
      }
    }
    teams[bestTeam].push(p);
    nivelSum[bestTeam] += p.nivel;
    femCount[bestTeam]++;
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
    nivelSum[bestTeam] += p.nivel;
  }

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

  const shuffled = shuffle(players);
  const titulares = shuffled.slice(0, needed);
  const reservas = shuffled.slice(needed);

  let bestTeams: Player[][];
  let bestScore: number;

  if (modoSorteio === 'genero') {
    bestTeams = sortearGeneroGarantido(titulares, numTimes, jogadoresPorTime);
    bestScore = scoreBalance(bestTeams);
  } else {
    ({ bestTeams, bestScore } = sortearEquilibrado(titulares, numTimes, jogadoresPorTime));
  }

  const { times, nivelEquilibrado, generoEquilibrado } = buildTimes(bestTeams);

  return {
    times,
    reservas,
    scoreEquilibrio: Math.round(bestScore * 100) / 100,
    nivelEquilibrado,
    generoEquilibrado,
  };
}
