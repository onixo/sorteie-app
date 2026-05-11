import { useState, useEffect } from 'react';
import { PlayerList } from './components/PlayerList';
import { AddPlayerSheet } from './components/AddPlayerSheet';
import { ImportPlayersSheet } from './components/ImportPlayersSheet';
import { SorteioConfig } from './components/SorteioConfig';
import { TeamResults } from './components/TeamResults';
import { Player, NewPlayerPayload, ResultadoSorteio } from './types';
import { getPlayers, createPlayer, deletePlayer, clearPlayers, sortear } from './services/api';

type Screen = 'list' | 'config' | 'results';

export default function App() {
  const [screen, setScreen] = useState<Screen>('list');
  const [players, setPlayers] = useState<Player[]>([]);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [resultado, setResultado] = useState<ResultadoSorteio | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Carregar jogadores do localStorage ao montar ────────────────────────
  useEffect(() => {
    getPlayers().then(setPlayers);
  }, []);

  // ─── Adicionar jogador ───────────────────────────────────────────────────
  const addPlayer = async (payload: NewPlayerPayload) => {
    try {
      const newPlayer = await createPlayer(payload);
      setPlayers(prev => [...prev, newPlayer]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar jogador.');
      throw err; // repropaga para o ImportPlayersSheet saber que falhou
    }
  };

  // ─── Remover jogador ─────────────────────────────────────────────────────
  const removePlayer = async (id: number) => {
    try {
      await deletePlayer(id);
      setPlayers(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover jogador.');
    }
  };

  // ─── Limpar lista ────────────────────────────────────────────────────────
  const handleClearPlayers = async () => {
    try {
      await clearPlayers();
      setPlayers([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao limpar lista.');
    }
  };

  // ─── Sortear times ───────────────────────────────────────────────────────
  const generateTeams = async (numTimes: number, jogadoresPorTime: number) => {
    try {
      setError(null);
      const res = await sortear({ numTimes, jogadoresPorTime });
      setResultado(res);
      setScreen('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao sortear times.');
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────
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

      {screen === 'list' && (
        <>
          <PlayerList
            players={players}
            loading={false}
            onAddPlayer={() => setIsAddPlayerOpen(true)}
            onImportPlayers={() => setIsImportOpen(true)}
            onRemovePlayer={removePlayer}
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
              resultado.config.jogadoresPorTime
            );
          }}
        />
      )}
    </div>
  );
}