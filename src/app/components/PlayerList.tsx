import { useState } from 'react';
import { Users, Plus, Loader2, ClipboardList, Trash2, Pencil, Shuffle, X } from 'lucide-react';
import { Player, ModoClassificacao } from '../types';
import { HABILIDADES } from '../habilidades';
import { HexBackground } from './HexBackground';
import { GeneroIcon } from './GeneroIcon';
import { ConfirmarInline } from './ConfirmarInline';

interface PlayerListProps {
  players: Player[];
  modo: ModoClassificacao | null;
  loading: boolean;
  onAddPlayer: () => void;
  onImportPlayers: () => void;
  onRemovePlayer: (id: number) => void;
  onEditPlayer: (player: Player) => void;
  onClearPlayers: () => Promise<void>;
  onConverter: (para: ModoClassificacao) => Promise<void>;
  elencoCount: number;
  onForgetElenco: () => Promise<void>;
  onSortear: () => void;
  ultimoSorteio: string | null;      // data do último sorteio guardado, se houver
  onVerUltimoSorteio: () => void;
}

const plural = (n: number, singular: string, pluralForma: string) => (n === 1 ? singular : pluralForma);

// Cada modo mostra uma dica sobre o outro; dispensar uma não esconde a outra.
// A chave 'simples' é a dica "escolha Detalhada" (nome antigo mantido para quem já a fechou).
const CHAVES_DICA = {
  simples: 'sorteie_dica_detalhada_dispensada',
  detalhado: 'sorteie_dica_rapida_dispensada',
} as const;

function lerDicasDispensadas(): Record<ModoClassificacao, boolean> {
  const ler = (chave: string) => {
    try {
      return localStorage.getItem(chave) === '1';
    } catch {
      return false;
    }
  };
  return { simples: ler(CHAVES_DICA.simples), detalhado: ler(CHAVES_DICA.detalhado) };
}

export function PlayerList({
  players, modo, loading, onAddPlayer, onImportPlayers, onRemovePlayer, onEditPlayer,
  onClearPlayers, onConverter, elencoCount, onForgetElenco, onSortear, ultimoSorteio, onVerUltimoSorteio,
}: PlayerListProps) {
  // Só uma confirmação aberta por vez: 'limpar' | 'trocar' | 'apagarNotas'
  const [confirmando, setConfirmando] = useState<'limpar' | 'trocar' | 'apagarNotas' | null>(null);
  const [destino, setDestino] = useState<ModoClassificacao>('simples');
  const [ocupado, setOcupado] = useState(false);
  const [dicasDispensadas, setDicasDispensadas] = useState(lerDicasDispensadas);

  const dispensarDica = (doModo: ModoClassificacao) => {
    setDicasDispensadas(prev => ({ ...prev, [doModo]: true }));
    try {
      localStorage.setItem(CHAVES_DICA[doModo], '1');
    } catch {
      // sem armazenamento: a dica some só até recarregar
    }
  };

  // Trocar a avaliação zera as notas (ficam nome e gênero). Se já há notas a perder, confirma antes.
  const escolherAvaliacao = (opcao: ModoClassificacao) => {
    if (opcao === modo || ocupado) return;
    if (comNota > 0) {
      setDestino(opcao);
      setConfirmando('trocar');
    } else {
      setConfirmando(null);
      executar(() => onConverter(opcao));
    }
  };

  const executar = async (acao: () => Promise<void>) => {
    try {
      setOcupado(true);
      await acao();
    } finally {
      setOcupado(false);
      setConfirmando(null);
    }
  };

  const totalPlayers = players.length;
  const maleCount = players.filter(p => p.genero === 'M').length;
  const femaleCount = players.filter(p => p.genero === 'F').length;
  const otherCount = players.filter(p => p.genero === 'O').length;
  const podeSortear = totalPlayers >= 2;
  // Jogadores com nota de verdade (os que se perderiam ao trocar) e os que ainda esperam avaliação
  const comNota = players.filter(p => !p.desconhecido && !p.semAvaliacao).length;
  const semAvaliacao = players.filter(p => p.semAvaliacao).length;

  const getInitials = (nome: string) =>
    nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className={`min-h-screen bg-[#0A1628] ${podeSortear ? (semAvaliacao > 0 ? 'pb-56' : 'pb-48') : 'pb-36'}`}>
      <HexBackground />

      {/* Header compacto: marca em uma linha para a lista aparecer já na primeira tela */}
      <div className="relative px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 border-b border-[#1E8FD5]/20">
        <div className="flex items-center gap-3 mb-3">
          <img src="/favicon.png" alt="" className="w-10 h-10 object-contain shrink-0" />
          <h1 className="text-[#F0F4FF] text-xl font-semibold tracking-widest uppercase">Sorteie</h1>
          <span className="ml-auto flex items-center gap-1.5 text-[#C9A952] text-xs">
            <img src="/logo.png" alt="" className="h-6 w-auto" />
            Bull Analytics
          </span>
        </div>

        {/* Resumo */}
        <div className="flex items-center justify-between bg-[#0F2035] rounded-lg px-4 py-3 border border-[#1E8FD5]/20">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-[#1BAF8A]" aria-hidden="true" />
            <span className="text-[#F0F4FF]">{totalPlayers} {plural(totalPlayers, 'jogador', 'jogadores')}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-[#7FB2DC]"><GeneroIcon genero="M" size={14} />{maleCount}</span>
            <span className="flex items-center gap-1 text-[#7FB2DC]"><GeneroIcon genero="F" size={14} />{femaleCount}</span>
            {otherCount > 0 && (
              <span className="flex items-center gap-1 text-[#7FB2DC]"><GeneroIcon genero="O" size={14} />{otherCount}</span>
            )}
            {totalPlayers > 0 && (
              <button
                onClick={() => setConfirmando('limpar')}
                className="text-[#7FB2DC] hover:text-[#ff6b86] transition-colors min-w-11 min-h-11 -my-3 -mr-3 flex items-center justify-center"
                aria-label="Limpar lista"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {confirmando === 'limpar' && (
          <ConfirmarInline
            texto={`Tirar todos os ${totalPlayers} ${plural(totalPlayers, 'jogador', 'jogadores')} da lista?`}
            confirmar="Tirar todos"
            ocupadoTexto="Limpando…"
            ocupado={ocupado}
            onConfirmar={() => executar(onClearPlayers)}
            onCancelar={() => setConfirmando(null)}
          />
        )}

        {/* Notas salvas entre as semanas */}
        {elencoCount > 0 && confirmando !== 'apagarNotas' && (
          <div className="flex items-center justify-center gap-2">
            <p className="text-[#7FB2DC] text-xs">
              Notas salvas: {elencoCount} {plural(elencoCount, 'jogador', 'jogadores')}
            </p>
            <button
              onClick={() => setConfirmando('apagarNotas')}
              className="text-xs text-[#1E8FD5] underline underline-offset-2 min-h-11 px-2 -my-2"
            >
              Apagar
            </button>
          </div>
        )}
        {elencoCount > 0 && confirmando === 'apagarNotas' && (
          <ConfirmarInline
            texto={`Apagar as notas salvas de ${elencoCount} ${plural(elencoCount, 'jogador', 'jogadores')}? Na próxima importação você terá que avaliar todo mundo de novo. A lista atual não muda.`}
            confirmar="Apagar notas"
            ocupadoTexto="Apagando…"
            ocupado={ocupado}
            onConfirmar={() => executar(onForgetElenco)}
            onCancelar={() => setConfirmando(null)}
          />
        )}

        {/* Último sorteio guardado: dá para rever os times sem sortear de novo */}
        {ultimoSorteio && (
          <div className="flex items-center justify-center gap-2">
            <p className="text-[#7FB2DC] text-xs">Último sorteio: {ultimoSorteio}</p>
            <button
              onClick={onVerUltimoSorteio}
              className="text-xs text-[#1E8FD5] underline underline-offset-2 min-h-11 px-2 -my-2"
            >
              Ver
            </button>
          </div>
        )}
      </div>

      {/* Jogadores */}
      <div className="relative px-4 pt-4 space-y-3">
        {/* Como os jogadores são avaliados nesta lista: dá para trocar a qualquer momento, sem perder ninguém */}
        {!loading && modo && (
          <div className="pb-1">
            <p id="rotulo-avaliacao" className="text-[#7FB2DC] text-sm mb-2">Como avaliar os jogadores</p>
            <div role="radiogroup" aria-labelledby="rotulo-avaliacao" className="grid grid-cols-2 gap-2">
              {([
                { opcao: 'simples', titulo: 'Rápida', detalhe: 'Um nível de 1 a 5' },
                { opcao: 'detalhado', titulo: 'Detalhada', detalhe: '5 habilidades' },
              ] as const).map(({ opcao, titulo, detalhe }) => {
                const ativo = modo === opcao;
                return (
                  <button
                    key={opcao}
                    role="radio"
                    aria-checked={ativo}
                    disabled={ocupado}
                    onClick={() => escolherAvaliacao(opcao)}
                    className={`min-h-14 px-3 py-2 rounded-xl border text-left transition-colors ${
                      ativo
                        ? 'bg-[#1BAF8A]/15 border-[#1BAF8A]/60'
                        : 'bg-[#0F2035] border-[#1E8FD5]/20 hover:border-[#1E8FD5]/50'
                    }`}
                  >
                    <span className={`block text-sm font-medium ${ativo ? 'text-[#1BAF8A]' : 'text-[#F0F4FF]'}`}>{titulo}</span>
                    <span className="block text-xs text-[#7FB2DC]">{detalhe}</span>
                  </button>
                );
              })}
            </div>
            {!dicasDispensadas[modo] && confirmando !== 'trocar' && (
              <div className="mt-2 flex items-start gap-2 rounded-xl border border-[#1E8FD5]/30 bg-[#1E8FD5]/10 pl-4 pr-1 py-2">
                <p className="flex-1 text-xs text-[#7FB2DC] py-1.5">
                  {modo === 'simples' ? (
                    <>Quer avaliar saque, levantamento, ataque, defesa e movimentação? Escolha <span className="text-[#F0F4FF]">Detalhada</span>.</>
                  ) : (
                    <>Prefere avaliar cada jogador com um único nível de 1 a 5? Escolha <span className="text-[#F0F4FF]">Rápida</span>.</>
                  )}
                </p>
                <button
                  onClick={() => dispensarDica(modo)}
                  aria-label="Fechar dica"
                  className="text-[#7FB2DC] hover:text-[#F0F4FF] shrink-0 min-w-11 min-h-11 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {confirmando === 'trocar' && (
              <ConfirmarInline
                texto={`Trocar para a avaliação ${destino === 'detalhado' ? 'detalhada' : 'rápida'}? As notas de ${comNota} ${plural(comNota, 'jogador', 'jogadores')} serão apagadas e você avalia de novo. Nome e gênero ficam. Dá para desfazer.`}
                confirmar="Trocar avaliação"
                ocupadoTexto="Trocando…"
                ocupado={ocupado}
                onConfirmar={() => executar(() => onConverter(destino))}
                onCancelar={() => setConfirmando(null)}
              />
            )}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16 gap-3 text-[#7FB2DC]">
            <Loader2 size={24} className="animate-spin" />
            <span>Carregando jogadores…</span>
          </div>
        )}

        {/* Estado vazio: diz o que fazer e em que ordem */}
        {!loading && players.length === 0 && (
          <div className="text-center py-10 text-[#7FB2DC]">
            <Users size={44} className="mx-auto mb-4 opacity-60" aria-hidden="true" />
            <p className="text-[#F0F4FF] mb-1">Sua lista está vazia</p>
            <p className="text-sm mb-5">Cole a lista do WhatsApp ou toque em Adicionar para incluir um por um.</p>
            <ol className="text-sm text-left inline-block space-y-1 mb-6">
              <li><span className="text-[#1BAF8A] font-medium">1.</span> Cole a lista do WhatsApp</li>
              <li><span className="text-[#1BAF8A] font-medium">2.</span> Avalie cada jogador</li>
              <li><span className="text-[#1BAF8A] font-medium">3.</span> Sorteie os times</li>
            </ol>
            <div>
              <button
                onClick={onImportPlayers}
                className="inline-flex items-center gap-2 px-5 min-h-12 bg-[#1BAF8A] hover:bg-[#1BAF8A]/90 text-[#0A1628] font-medium rounded-xl text-sm transition-all"
              >
                <ClipboardList size={16} />
                Importar lista do WhatsApp
              </button>
            </div>
          </div>
        )}

        {!loading && players.map((player) => (
          <div
            key={player.id}
            className="bg-[#0F2035] rounded-xl border border-[#1E8FD5]/20 overflow-hidden"
          >
            <div className="flex items-center gap-4 p-4">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#1E8FD5]/20 to-[#1BAF8A]/20 flex items-center justify-center border border-[#1E8FD5]/30 shrink-0">
                <span className="text-[#1E8FD5] font-medium" aria-hidden="true">{getInitials(player.nome)}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#F0F4FF] truncate">{player.nome}</span>
                  <span className="text-[#7FB2DC] shrink-0 flex items-center"><GeneroIcon genero={player.genero} size={15} /></span>
                </div>
                {player.desconhecido ? (
                  <p className="text-xs text-[#7FB2DC]">Não conheço · entra com o nível médio</p>
                ) : player.semAvaliacao ? (
                  <p className="text-xs text-[#1E8FD5]">Sem avaliação · toque no lápis para avaliar</p>
                ) : (
                  <>
                    <div className="flex gap-1" role="img" aria-label={`Nível ${player.nivel} de 5`}>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`w-2 h-2 rounded-full ${level <= player.nivel ? 'bg-[#1BAF8A]' : 'bg-[#7FB2DC]/25'}`}
                        />
                      ))}
                    </div>
                    {player.habilidades && (
                      <div className="grid grid-cols-5 gap-1 mt-2 text-center">
                        {HABILIDADES.map(({ key, label, abrev }) => (
                          <div key={key} title={label}>
                            <div className="text-xs leading-none text-[#7FB2DC]">{abrev}</div>
                            <div className="text-sm mt-1 leading-none text-[#F0F4FF] tabular-nums" aria-label={`${label}: ${player.habilidades![key]}`}>{player.habilidades![key]}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Editar e remover */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onEditPlayer(player)}
                  className="text-[#7FB2DC] hover:text-[#1E8FD5] active:text-[#1E8FD5] transition-colors min-w-11 min-h-11 flex items-center justify-center"
                  aria-label={`Editar ${player.nome}`}
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => onRemovePlayer(player.id)}
                  className="text-[#7FB2DC] hover:text-[#ff6b86] active:text-[#ff6b86] transition-colors min-w-11 min-h-11 flex items-center justify-center text-2xl leading-none"
                  aria-label={`Tirar ${player.nome} da lista`}
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Barra inferior única: ações da lista e o botão principal, sem nada flutuando sobre os cartões */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-[#0A1628]/95 backdrop-blur border-t border-[#1E8FD5]/20">
        <div className="max-w-md mx-auto px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
          <div className="flex gap-3">
            <button
              id="btn-add-player"
              onClick={onAddPlayer}
              className="flex-1 min-h-12 flex items-center justify-center gap-2 rounded-xl border border-[#1E8FD5]/40 text-[#F0F4FF] hover:bg-[#1E8FD5]/10 transition-colors"
              aria-label="Adicionar jogador"
            >
              <Plus size={18} aria-hidden="true" />
              Adicionar
            </button>
            <button
              onClick={onImportPlayers}
              className="flex-1 min-h-12 flex items-center justify-center gap-2 rounded-xl border border-[#1E8FD5]/40 text-[#F0F4FF] hover:bg-[#1E8FD5]/10 transition-colors"
              aria-label="Importar lista do WhatsApp"
              title="Importar lista do WhatsApp"
            >
              <ClipboardList size={18} aria-hidden="true" />
              Importar
            </button>
          </div>
          {podeSortear ? (
            <>
              {semAvaliacao > 0 && (
                <p className="text-center text-xs text-[#1E8FD5]">
                  {semAvaliacao} {plural(semAvaliacao, 'jogador ainda está', 'jogadores ainda estão')} sem avaliação. Toque no lápis para avaliar.
                </p>
              )}
              <button
                id="btn-ir-sortear"
                onClick={onSortear}
                disabled={semAvaliacao > 0}
                className="w-full min-h-14 flex items-center justify-center gap-2 rounded-xl bg-[#1BAF8A] hover:bg-[#1BAF8A]/90 disabled:bg-[#162844] disabled:text-[#7FB2DC] disabled:shadow-none disabled:cursor-not-allowed text-[#0A1628] font-semibold shadow-lg shadow-[#1BAF8A]/20 transition-all"
              >
                <Shuffle size={18} aria-hidden="true" />
                Sortear times
              </button>
            </>
          ) : totalPlayers === 1 ? (
            <p className="text-center text-xs text-[#7FB2DC]">Adicione pelo menos 2 jogadores para sortear.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
