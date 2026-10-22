// ─── Jogador ──────────────────────────────────────────────────────────────────
// Alinhado com a tabela `players` do SQLite e as rotas do Express.

// Notas de 1 a 5 por habilidade (classificação detalhada).
export interface Habilidades {
  saque: number;
  levantamento: number;
  ataque: number;
  defesa: number;       // Defesa/Recepção
  movimentacao: number;
}

// 'simples' = nível único 1-5. 'detalhado' = 5 habilidades (nivel é derivado da média).
export type ModoClassificacao = 'simples' | 'detalhado';

export interface Player {
  id: number;
  nome: string;
  genero: 'M' | 'F' | 'O';
  nivel: number; // 1=Iniciante, 2=Básico, 3=Intermediário, 4=Avançado, 5=Craque (rótulos em NIVEL_LABELS)
  habilidades?: Habilidades; // presente apenas no modo detalhado
  criado_em?: string;
}

// Elenco: jogador já avaliado, lembrado entre as semanas e encontrado pelo nome normalizado
// (sem acento, sem diferença de maiúsculas). Guarda as notas do último cadastro/edição.
export interface ElencoItem {
  nome: string;
  genero: 'M' | 'F' | 'O';
  nivel: number;
  habilidades?: Habilidades; // presente quando foi avaliado no modo detalhado
}

// Payload para criar um novo jogador (sem id nem timestamp)
export type NewPlayerPayload = Pick<Player, 'nome' | 'genero' | 'nivel' | 'habilidades'>;

// ─── Time (resposta do POST /sorteio) ─────────────────────────────────────────

export interface Time {
  nome: string;         // ex: "Time A"
  jogadores: Player[];
  totalNivel: number;
  masculinos: number;
  femininos: number;
  outros: number;
  habilidades?: Habilidades; // média por jogador do time (modo detalhado)
}

// ─── Modo de Sorteio ──────────────────────────────────────────────────────────

export type ModoSorteio = 'equilibrado' | 'genero';

// ─── Resultado do Sorteio ─────────────────────────────────────────────────────

export interface ResultadoSorteio {
  sorteioId: number;
  criadoEm: string;
  config: {
    numTimes: number;
    jogadoresPorTime: number;
    modoSorteio: ModoSorteio;
  };
  times: Time[];
  reservas: Player[];
  scoreEquilibrio: number;
  nivelEquilibrado: boolean;
  generoEquilibrado: boolean;
  detalhado?: boolean;          // sorteio feito com classificação por habilidades
  levantadorPorTime?: boolean;  // todo time recebeu ao menos um levantador
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
