import { useState, useEffect, useCallback } from 'react';
import { PlayerList } from './components/PlayerList';
import { AddPlayerSheet } from './components/AddPlayerSheet';
import { ImportPlayersSheet } from './components/ImportPlayersSheet';
import { EditPlayerSheet } from './components/EditPlayerSheet';
import { SorteioConfig } from './components/SorteioConfig';
import { TeamResults } from './components/TeamResults';
import { Toast } from './components/Toast';
import { InstallBanner } from './components/InstallBanner';
import { TriangleAlert, X } from 'lucide-react';
import { Player, NewPlayerPayload, ResultadoSorteio, ModoSorteio, ModoClassificacao, ElencoItem } from './types';
import { getPlayers, createPlayer, deletePlayer, restorePlayer, updatePlayer, clearPlayers, convertPlayers, getElenco, clearElenco, sortear } from './services/api';
import { ErroSorteio } from './services/sorteio';
import { modoDaLista, nivelMedioDaLista } from './habilidades';

type Screen = 'list' | 'config' | 'results';

interface UltimoSorteio {
  resultado: ResultadoSorteio;
  vagas: number;
}

const CHAVE_ULTIMO_SORTEIO = 'sorteie_ultimo_sorteio';

function lerUltimoSorteio(): UltimoSorteio | null {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE_ULTIMO_SORTEIO) ?? 'null');
    return dados && Array.isArray(dados.resultado?.times) ? dados : null;
  } catch {
    return null;
  }
}

function gravarUltimoSorteio(ultimo: UltimoSorteio): void {
  try {
    localStorage.setItem(CHAVE_ULTIMO_SORTEIO, JSON.stringify(ultimo));
  } catch {
    // sem armazenamento: o resultado continua na tela, só não fica guardado
  }
}

// Só mensagens escritas para o usuário (ErroSorteio) aparecem como estão; o resto vira o texto padrão.
const mensagemDeErro = (err: unknown, padrao: string) => (err instanceof ErroSorteio ? err.message : padrao);

const plural = (n: number, singular: string, pluralForma: string) => (n === 1 ? singular : pluralForma);

export default function App() {
  const [screen, setScreen] = useState<Screen>('list');
  const [players, setPlayers] = useState<Player[]>([]);
  const [elenco, setElenco] = useState<ElencoItem[]>([]);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [resultado, setResultado] = useState<ResultadoSorteio | null>(null);
  const [vagasLivresCount, setVagasLivresCount] = useState(0);
  const [ultimoSorteio, setUltimoSorteio] = useState<UltimoSorteio | null>(lerUltimoSorteio);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; action?: { label: string; onClick: () => void } } | null>(null);

  // Modo de avaliação da lista (definido pelo primeiro jogador; null = lista vazia)
  const modoLista = modoDaLista(players);

  const showToast = useCallback((
    message: string,
    type: 'success' | 'error' = 'success',
    action?: { label: string; onClick: () => void },
  ) => {
    setToast({ message, type, action });
  }, []);

  // O elenco é gravado pela camada de dados a cada cadastro/edição; aqui só relemos para a tela
  const refreshElenco = useCallback(() => {
    getElenco().then(setElenco);
  }, []);

  useEffect(() => {
    getPlayers().then(setPlayers);
    refreshElenco();
  }, [refreshElenco]);

  // Cada tela começa no topo (antes herdava a rolagem da anterior)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  // O aviso de erro some sozinho
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(null), 8000);
    return () => clearTimeout(id);
  }, [error]);

  const addPlayer = async (payload: NewPlayerPayload) => {
    try {
      const newPlayer = await createPlayer(payload);
      setPlayers(prev => [...prev, newPlayer]);
      refreshElenco();
      showToast(`${newPlayer.nome} entrou na lista!`);
    } catch (err) {
      setError(mensagemDeErro(err, 'Não deu para adicionar o jogador. Tente de novo.'));
      throw err;
    }
  };

  // Importação em lote: um único toast. Retorna quantos foram salvos; em falha parcial
  // mantém os já salvos na lista e informa o erro, para o sheet não reenviar duplicados.
  const addPlayers = async (payloads: NewPlayerPayload[]): Promise<number> => {
    const created: Player[] = [];
    try {
      for (const payload of payloads) {
        created.push(await createPlayer(payload));
      }
      showToast(`${created.length} ${plural(created.length, 'entrou', 'entraram')} na lista!`);
    } catch (err) {
      setError(mensagemDeErro(err, 'Não deu para adicionar os jogadores. Tente de novo.'));
    }
    if (created.length > 0) {
      setPlayers(prev => [...prev, ...created]);
      refreshElenco();
    }
    return created.length;
  };

  const removePlayer = async (id: number) => {
    try {
      const player = players.find(p => p.id === id);
      await deletePlayer(id);
      setPlayers(prev => prev.filter(p => p.id !== id));
      showToast(player ? `${player.nome} saiu da lista.` : 'Jogador removido da lista.', 'success', player ? {
        label: 'Desfazer',
        onClick: async () => {
          try {
            await restorePlayer(player);
            setPlayers(prev => [...prev.filter(p => p.id !== player.id), player].sort((a, b) => a.id - b.id));
          } catch (err) {
            setError(mensagemDeErro(err, 'Não deu para desfazer. Adicione o jogador de novo.'));
          }
        },
      } : undefined);
    } catch (err) {
      setError(mensagemDeErro(err, 'Não deu para tirar o jogador da lista. Tente de novo.'));
    }
  };

  const handleUpdatePlayer = async (id: number, payload: NewPlayerPayload) => {
    try {
      const updated = await updatePlayer(id, payload);
      setPlayers(prev => prev.map(p => p.id === id ? updated : p));
      refreshElenco();
      showToast(`Dados de ${updated.nome} atualizados.`);
    } catch (err) {
      setError(mensagemDeErro(err, 'Não deu para salvar as mudanças. Tente de novo.'));
      throw err;
    }
  };

  // Limpa a lista inteira, com Desfazer (reinsere os mesmos jogadores, com os mesmos ids)
  const limparLista = async (mensagem: string) => {
    const copia = players;
    try {
      await clearPlayers();
      setPlayers([]);
      showToast(mensagem, 'success', copia.length > 0 ? {
        label: 'Desfazer',
        onClick: async () => {
          try {
            for (const p of copia) await restorePlayer(p);
            setPlayers(copia);
          } catch (err) {
            setError(mensagemDeErro(err, 'Não deu para desfazer. Adicione os jogadores de novo.'));
          }
        },
      } : undefined);
    } catch (err) {
      setError(mensagemDeErro(err, 'Não deu para limpar a lista. Tente de novo.'));
    }
  };

  const handleClearPlayers = () => limparLista('Lista limpa. As notas salvas continuam guardadas.');

  // Troca o tipo de avaliação da lista inteira: ficam nome e gênero, as notas zeram. Desfazer devolve a lista como estava.
  const converterLista = async (para: ModoClassificacao) => {
    const antes = players;
    try {
      const convertidos = await convertPlayers(para);
      setPlayers(convertidos);
      showToast(
        para === 'detalhado'
          ? 'Avaliação detalhada ativada. Toque no lápis para avaliar cada jogador.'
          : 'Avaliação rápida ativada. Toque no lápis para avaliar cada jogador.',
        'success',
        {
          label: 'Desfazer',
          onClick: async () => {
            try {
              for (const p of antes) await restorePlayer(p);
              setPlayers(antes);
            } catch (err) {
              setError(mensagemDeErro(err, 'Não deu para desfazer. Use a opção Avaliação para voltar.'));
            }
          },
        },
      );
    } catch (err) {
      setError(mensagemDeErro(err, 'Não deu para mudar a avaliação. Tente de novo.'));
    }
  };

  const handleForgetElenco = async () => {
    try {
      await clearElenco();
      setElenco([]);
      showToast('Notas salvas apagadas.');
    } catch (err) {
      setError(mensagemDeErro(err, 'Não deu para apagar as notas salvas. Tente de novo.'));
    }
  };

  const generateTeams = async (
    numTimes: number,
    jogadoresPorTime: number,
    modoSorteio: ModoSorteio = 'equilibrado',
    vagasLivres: number = 0,
  ): Promise<ResultadoSorteio | null> => {
    try {
      setError(null);
      setVagasLivresCount(vagasLivres);
      const nivelMedio = nivelMedioDaLista(players);
      const phantoms: Player[] = Array.from({ length: vagasLivres }, (_, i) => ({
        id: -(i + 1),
        nome: 'Vaga aberta',
        genero: 'O' as const,
        nivel: nivelMedio,
      }));
      const res = await sortear({ numTimes, jogadoresPorTime, modoSorteio }, phantoms);
      const ultimo = { resultado: res, vagas: vagasLivres };
      setResultado(res);
      setUltimoSorteio(ultimo);
      gravarUltimoSorteio(ultimo);
      setScreen('results');
      return res;
    } catch (err) {
      setError(mensagemDeErro(err, 'Não deu para sortear. Tente de novo.'));
      return null;
    }
  };

  // Sortear de novo guarda o resultado anterior para o Desfazer
  const refazerSorteio = async () => {
    if (!resultado) return;
    const anterior = { resultado, vagas: vagasLivresCount };
    const novo = await generateTeams(
      resultado.config.numTimes,
      resultado.config.jogadoresPorTime,
      resultado.config.modoSorteio,
      vagasLivresCount,
    );
    if (novo) {
      showToast('Novo sorteio feito.', 'success', {
        label: 'Desfazer',
        onClick: () => {
          setResultado(anterior.resultado);
          setVagasLivresCount(anterior.vagas);
          setUltimoSorteio(anterior);
          gravarUltimoSorteio(anterior);
        },
      });
    }
  };

  const verUltimoSorteio = () => {
    if (!ultimoSorteio) return;
    setResultado(ultimoSorteio.resultado);
    setVagasLivresCount(ultimoSorteio.vagas);
    setScreen('results');
  };

  return (
    <div className="max-w-md mx-auto size-full bg-[#0A1628]">
      {/* Aviso de erro (some sozinho em 8 s) */}
      {error && (
        <div
          role="alert"
          className="fixed top-[max(1rem,env(safe-area-inset-top))] left-4 right-4 z-50 max-w-md mx-auto bg-[#3A1420] border border-[#d4183d]/50 text-[#ff6b86] text-sm rounded-xl px-4 py-3 flex items-start gap-3 shadow-lg"
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            aria-label="Fechar aviso"
            className="text-[#ff6b86] hover:text-[#F0F4FF] transition-colors shrink-0 min-w-11 min-h-11 -m-3 flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          action={toast.action}
          onClose={() => setToast(null)}
        />
      )}

      {screen === 'list' && (
        <>
          <InstallBanner />
          <PlayerList
            players={players}
            modo={modoLista}
            loading={false}
            onAddPlayer={() => setIsAddPlayerOpen(true)}
            onImportPlayers={() => setIsImportOpen(true)}
            onRemovePlayer={removePlayer}
            onEditPlayer={setEditingPlayer}
            onClearPlayers={handleClearPlayers}
            onConverter={converterLista}
            elencoCount={elenco.length}
            onForgetElenco={handleForgetElenco}
            onSortear={() => setScreen('config')}
            ultimoSorteio={ultimoSorteio ? ultimoSorteio.resultado.criadoEm.replace(/:\d{2}$/, '') : null}
            onVerUltimoSorteio={verUltimoSorteio}
          />
          <AddPlayerSheet
            isOpen={isAddPlayerOpen}
            onClose={() => setIsAddPlayerOpen(false)}
            onAdd={addPlayer}
            modoLista={modoLista}
          />
          <ImportPlayersSheet
            isOpen={isImportOpen}
            onClose={() => setIsImportOpen(false)}
            onAddMany={addPlayers}
            nomesExistentes={players.map(p => p.nome)}
            elenco={elenco}
            modoLista={modoLista}
          />
          <EditPlayerSheet
            player={editingPlayer}
            isOpen={editingPlayer !== null}
            onClose={() => setEditingPlayer(null)}
            onUpdate={handleUpdatePlayer}
          />
        </>
      )}

      {/* Sem animate-in nos wrappers abaixo: o transform da animação desloca as barras fixed de baixo */}
      {screen === 'config' && (
        <div>
          <SorteioConfig
            players={players}
            modo={modoLista}
            inicial={resultado?.config}
            onGenerateTeams={generateTeams}
            onBack={() => setScreen('list')}
          />
        </div>
      )}

      {screen === 'results' && resultado && (
        <div key={resultado.sorteioId}>
          <TeamResults
            resultado={resultado}
            onBack={() => setScreen('config')}
            onShuffle={refazerSorteio}
          />
        </div>
      )}
    </div>
  );
}
