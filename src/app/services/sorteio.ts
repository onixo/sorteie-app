import { Player, Time, ResultadoSorteio, ModoSorteio } from '../types';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTimes(bestTeams: Player[][]): { times: Time[]; nivelEquilibrado: boolean; generoEquilibrado: boolean } {
  const letras = ['A', 'B', 'C', 'D', 'E', 'F'];
  const times: Time[] = bestTeams.map((team, i) => ({
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

function scoreBalance(teams: Player[][], generoWeight: number): number {
  const sums = teams.map(t => t.reduce((s, p) => s + p.nivel, 0));
  const avg = sums.reduce((a, b) => a + b, 0) / sums.length;
  const nivelVariance = sums.reduce((s, v) => s + Math.abs(v - avg), 0);

  let genPenalty = 0;
  (['M', 'F'] as const).forEach(g => {
    const counts = teams.map(t => t.filter(p => p.genero === g).length);
    const avgG = counts.reduce((a, b) => a + b, 0) / counts.length;
    genPenalty += counts.reduce((s, v) => s + Math.abs(v - avgG), 0);
  });

  return nivelVariance + genPenalty * generoWeight;
}

function sortearComScore(
  titulares: Player[],
  numTimes: number,
  jogadoresPorTime: number,
  generoWeight: number,
): { bestTeams: Player[][]; bestScore: number } {
  let bestTeams: Player[][] | null = null;
  let bestScore = Infinity;

  for (let i = 0; i < 1000; i++) {
    const s = shuffle(titulares);
    const teams = Array.from(
      { length: numTimes },
      (_, t) => s.slice(t * jogadoresPorTime, (t + 1) * jogadoresPorTime)
    );
    const score = scoreBalance(teams, generoWeight);
    if (score < bestScore) {
      bestScore = score;
      bestTeams = teams;
    }
    if (bestScore === 0) break;
  }

  return { bestTeams: bestTeams!, bestScore };
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

  // 'equilibrado': nível peso 1, gênero peso 5 (balanceado)
  // 'genero': nível peso 1, gênero peso 20 (fortemente prioriza gênero)
  const generoWeight = modoSorteio === 'genero' ? 20 : 5;
  const { bestTeams, bestScore } = sortearComScore(titulares, numTimes, jogadoresPorTime, generoWeight);

  const { times, nivelEquilibrado, generoEquilibrado } = buildTimes(bestTeams);

  return {
    times,
    reservas,
    scoreEquilibrio: Math.round(bestScore * 100) / 100,
    nivelEquilibrado,
    generoEquilibrado,
  };
}
