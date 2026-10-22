import { useState, useEffect, useCallback } from 'react';
import { PlayerList } from './components/PlayerList';
import { AddPlayerSheet } from './components/AddPlayerSheet';
import { ImportPlayersSheet } from './components/ImportPlayersSheet';
import { EditPlayerSheet } from './components/EditPlayerSheet';
import { SorteioConfig } from './components/SorteioConfig';
import { TeamResults } from './components/TeamResults';
import { Toast } from './components/Toast';
import { Player, NewPlayerPayload, ResultadoSorteio, ModoSorteio, ElencoItem } from './types';
import { getPlayers, createPlayer, deletePlayer, restorePlayer, updatePlayer, clearPlayers, getElenco, clearElenco, sortear } from './services/api';
import { modoDaLista } from './habilidades';

type Screen = 'list' | 'config' | 'results';

export default function App() {
  const [screen, setScreen] = useState<Screen>('list');
  const [players, setPlayers] = useState<Player[]>([]);
  const [elenco, setElenco] = useState<ElencoItem[]>([]);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [resultado, setResultado] = useState<ResultadoSorteio | null>(null);
  const [vagasLivresCount, setVagasLivresCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; action?: { label: string; onClick: () => void } } | null>(null);

  // Modo de classificação da lista (definido pelo primeiro jogador; null = lista vazia)
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

  const addPlayer = async (payload: NewPlayerPayload) => {
    try {
      const newPlayer = await createPlayer(payload);
      setPlayers(prev => [...prev, newPlayer]);
      refreshElenco();
      showToast(`${newPlayer.nome} adicionado!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar jogador.');
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
      showToast(`${created.length} jogador${created.length !== 1 ? 'es' : ''} adicionado${created.length !== 1 ? 's' : ''}!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar jogadores.');
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
      showToast(`${player?.nome ?? 'Jogador'} removido.`, 'success', player ? {
        label: 'Desfazer',
        onClick: async () => {
          try {
            await restorePlayer(player);
            setPlayers(prev => [...prev.filter(p => p.id !== player.id), player].sort((a, b) => a.id - b.id));
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao desfazer.');
          }
        },
      } : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover jogador.');
    }
  };

  const handleUpdatePlayer = async (id: number, payload: NewPlayerPayload) => {
    try {
      const updated = await updatePlayer(id, payload);
      setPlayers(prev => prev.map(p => p.id === id ? updated : p));
      refreshElenco();
      showToast(`${updated.nome} atualizado!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao editar jogador.');
      throw err;
    }
  };

  const handleClearPlayers = async () => {
    try {
      await clearPlayers();
      setPlayers([]);
      showToast('Lista limpa.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao limpar lista.');
    }
  };

  const handleForgetElenco = async () => {
    try {
      await clearElenco();
      setElenco([]);
      showToast('Elenco esquecido.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao esquecer o elenco.');
    }
  };

  // Trocar o modo de classificação exige lista vazia: limpa e deixa o modo ser escolhido de novo
  const handleChangeMode = async () => {
    try {
      await clearPlayers();
      setPlayers([]);
      showToast('Lista limpa. Escolha o modo ao importar ou adicionar.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao limpar lista.');
    }
  };

  const generateTeams = async (numTimes: number, jogadoresPorTime: number, modoSorteio: ModoSorteio = 'equilibrado', vagasLivres: number = 0) => {
    try {
      setError(null);
      setVagasLivresCount(vagasLivres);
      const nivelMedio = players.length > 0
        ? Math.round(players.reduce((s, p) => s + p.nivel, 0) / players.length)
        : 3;
      const phantoms: Player[] = Array.from({ length: vagasLivres }, (_, i) => ({
        id: -(i + 1),
        nome: 'Vaga Livre',
        genero: 'O' as const,
        nivel: nivelMedio,
      }));
      const res = await sortear({ numTimes, jogadoresPorTime, modoSorteio }, phantoms);
      setResultado(res);
      setScreen('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao sortear times.');
    }
  };

  return (
    <div className="max-w-md mx-auto size-full bg-[#0A1628]">
      {/* Banner de erro global */}
      {error && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto bg-[#d4183d]/10 border border-[#d4183d]/40 text-[#d4183d] text-sm rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-[#d4183d]/60 hover:text-[#d4183d] transition-colors shrink-0"
          >
            ×
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
          <PlayerList
            players={players}
            modo={modoLista}
            loading={false}
            onAddPlayer={() => setIsAddPlayerOpen(true)}
            onImportPlayers={() => setIsImportOpen(true)}
            onRemovePlayer={removePlayer}
            onEditPlayer={setEditingPlayer}
            onClearPlayers={handleClearPlayers}
            onChangeMode={handleChangeMode}
            elencoCount={elenco.length}
            onForgetElenco={handleForgetElenco}
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
          {players.length >= 2 && (
            <button
              onClick={() => setScreen('config')}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 bg-[#1E8FD5] hover:bg-[#1E8FD5]/90 text-[#F0F4FF] font-medium rounded-xl transition-all shadow-lg"
            >
              Configurar Sorteio
            </button>
          )}
        </>
      )}

      {screen === 'config' && (
        <SorteioConfig
          players={players}
          modo={modoLista}
          onGenerateTeams={generateTeams}
          onBack={() => setScreen('list')}
        />
      )}

      {screen === 'results' && resultado && (
        <TeamResults
          resultado={resultado}
          onBack={() => setScreen('list')}
          onShuffle={() => {
            generateTeams(
              resultado.config.numTimes,
              resultado.config.jogadoresPorTime,
              resultado.config.modoSorteio,
              vagasLivresCount
            );
          }}
        />
      )}
    </div>
  );
}
