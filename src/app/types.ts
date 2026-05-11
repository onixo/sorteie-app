// ─── Jogador ──────────────────────────────────────────────────────────────────
// Alinhado com a tabela `players` do SQLite e as rotas do Express.

export interface Player {
  id: number;
  nome: string;
  genero: 'M' | 'F' | 'O';
  nivel: number; // 1=Iniciante, 2=Praticante, 3=Intermediário, 4=Avançado, 5=Expert
  criado_em?: string;
}

// Payload para criar um novo jogador (sem id nem timestamp)
export type NewPlayerPayload = Pick<Player, 'nome' | 'genero' | 'nivel'>;

// ─── Time (resposta do POST /sorteio) ─────────────────────────────────────────

export interface Time {
  nome: string;         // ex: "Time A"
  jogadores: Player[];
  totalNivel: number;
  masculinos: number;
  femininos: number;
  outros: number;
}

// ─── Resultado do Sorteio ─────────────────────────────────────────────────────

export interface ResultadoSorteio {
  sorteioId: number;
  criadoEm: string;
  config: {
    numTimes: number;
    jogadoresPorTime: number;
  };
  times: Time[];
  reservas: Player[];
  scoreEquilibrio: number;
  nivelEquilibrado: boolean;
  generoEquilibrado: boolean;
}

// ─── Histórico ────────────────────────────────────────────────────────────────

export interface HistoricoItem {
  id: number;
  criadoEm: string;
  config: ResultadoSorteio['config'];
  times: Time[];
  reservas: Player[];
  nivelEquilibrado: boolean;
  generoEquilibrado: boolean;
}
