import { useState, useEffect, useCallback } from 'react';
import { PlayerList } from './components/PlayerList';
import { AddPlayerSheet } from './components/AddPlayerSheet';
import { ImportPlayersSheet } from './components/ImportPlayersSheet';
import { EditPlayerSheet } from './components/EditPlayerSheet';
import { SorteioConfig } from './components/SorteioConfig';
import { TeamResults } from './components/TeamResults';
import { Toast } from './components/Toast';
import { Player, NewPlayerPayload, ResultadoSorteio, ModoSorteio } from './types';
import { getPlayers, createPlayer, deletePlayer, updatePlayer, clearPlayers, sortear } from './services/api';

type Screen = 'list' | 'config' | 'results';

export default function App() {
  const [screen, setScreen] = useState<Screen>('list');
  const [players, setPlayers] = useState<Player[]>([]);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [resultado, setResultado] = useState<ResultadoSorteio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    getPlayers().then(setPlayers);
  }, []);

  const addPlayer = async (payload: NewPlayerPayload) => {
    try {
      const newPlayer = await createPlayer(payload);
      setPlayers(prev => [...prev, newPlayer]);
      showToast(`${newPlayer.nome} adicionado!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar jogador.');
      throw err;
    }
  };

  const removePlayer = async (id: number) => {
    try {
      const player = players.find(p => p.id === id);
      await deletePlayer(id);
      setPlayers(prev => prev.filter(p => p.id !== id));
      showToast(`${player?.nome ?? 'Jogador'} removido.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover jogador.');
    }
  };

  const handleUpdatePlayer = async (id: number, payload: NewPlayerPayload) => {
    try {
      const updated = await updatePlayer(id, payload);
      setPlayers(prev => prev.map(p => p.id === id ? updated : p));
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

  const generateTeams = async (numTimes: number, jogadoresPorTime: number, modoSorteio: ModoSorteio = 'equilibrado') => {
    try {
      setError(null);
      const res = await sortear({ numTimes, jogadoresPorTime, modoSorteio });
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
          onClose={() => setToast(null)}
        />
      )}

      {screen === 'list' && (
        <>
          <PlayerList
            players={players}
            loading={false}
            onAddPlayer={() => setIsAddPlayerOpen(true)}
            onImportPlayers={() => setIsImportOpen(true)}
            onRemovePlayer={removePlayer}
            onEditPlayer={setEditingPlayer}
            onClearPlayers={handleClearPlayers}
          />
          <AddPlayerSheet
            isOpen={isAddPlayerOpen}
            onClose={() => setIsAddPlayerOpen(false)}
            onAdd={addPlayer}
          />
          <ImportPlayersSheet
            isOpen={isImportOpen}
            onClose={() => setIsImportOpen(false)}
            onAdd={addPlayer}
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
              resultado.config.modoSorteio
            );
          }}
        />
      )}
    </div>
  );
}
