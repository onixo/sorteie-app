import { useState } from 'react';
import { Users, Plus, Loader2, ClipboardList, Trash2 } from 'lucide-react';
import { Player } from '../types';
import { HexBackground } from './HexBackground';

interface PlayerListProps {
  players: Player[];
  loading: boolean;
  onAddPlayer: () => void;
  onImportPlayers: () => void;
  onRemovePlayer: (id: number) => void;
  onClearPlayers: () => Promise<void>;
}

export function PlayerList({ players, loading, onAddPlayer, onImportPlayers, onRemovePlayer, onClearPlayers }: PlayerListProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleClearClick = () => setConfirmClear(true);

  const handleConfirmClear = async () => {
    try {
      setClearing(true);
      await onClearPlayers();
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  };
  const totalPlayers = players.length;
  const maleCount = players.filter(p => p.genero === 'M').length;
  const femaleCount = players.filter(p => p.genero === 'F').length;

  const getInitials = (nome: string) =>
    nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getGenderIcon = (genero: 'M' | 'F' | 'O') => {
    if (genero === 'M') return '♂';
    if (genero === 'F') return '♀';
    return '⚥';
  };

  return (
    <div className="min-h-screen bg-[#0A1628] pb-28">
      <HexBackground />

      {/* Header */}
      <div className="relative px-4 pt-6 pb-4 border-b border-[#1E8FD5]/20">
        <div className="flex items-center gap-3 mb-4">
          <img src="/logo.png" alt="Bull Analytics" className="w-12 h-12 object-contain" />
          <div>
            <div className="text-xs text-[#4A90C4] tracking-wide">BULL ANALYTICS</div>
            <h1 className="text-[#F0F4FF] tracking-tight">Sorteie</h1>
          </div>
        </div>

        {/* Summary Bar */}
        <div className="flex items-center justify-between bg-[#0F2035] rounded-lg px-4 py-3 border border-[#1E8FD5]/20">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-[#1BAF8A]" />
            <span className="text-[#F0F4FF]">{totalPlayers} jogadores</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-[#4A90C4]">♂ {maleCount}</span>
            <span className="text-[#4A90C4]">♀ {femaleCount}</span>
            {totalPlayers > 0 && !confirmClear && (
              <button
                onClick={handleClearClick}
                className="text-[#4A90C4]/50 hover:text-[#d4183d] transition-colors"
                aria-label="Limpar lista"
              >
                <Trash2 size={16} />
              </button>
            )}
            {confirmClear && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleConfirmClear}
                  disabled={clearing}
                  className="text-xs text-[#d4183d] font-medium hover:text-[#d4183d]/80 transition-colors"
                >
                  {clearing ? 'Limpando...' : 'Limpar tudo'}
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="text-xs text-[#4A90C4] hover:text-[#F0F4FF] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Player Cards */}
      <div className="relative px-4 pt-4 space-y-3">
        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-3 text-[#4A90C4]">
            <Loader2 size={24} className="animate-spin" />
            <span>Carregando jogadores...</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && players.length === 0 && (
          <div className="text-center py-16 text-[#4A90C4]">
            <Users size={48} className="mx-auto mb-4 opacity-30" />
            <p className="mb-2">Nenhum jogador adicionado</p>
            <p className="text-sm mb-6">Adicione um por um ou importe a lista do grupo</p>
            <button
              onClick={onImportPlayers}
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#1E8FD5]/10 border border-[#1E8FD5]/30 text-[#1E8FD5] rounded-xl text-sm transition-all hover:bg-[#1E8FD5]/20"
            >
              <ClipboardList size={16} />
              Importar lista do grupo
            </button>
          </div>
        )}

        {/* Player list */}
        {!loading && players.map((player) => (
          <div
            key={player.id}
            className="bg-[#0F2035] rounded-xl border border-[#1E8FD5]/20 overflow-hidden"
            style={{ background: 'linear-gradient(90deg, #1BAF8A08 0px, transparent 4px, #0F2035 4px)' }}
          >
            <div className="flex items-center gap-4 p-4">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#1E8FD5]/20 to-[#1BAF8A]/20 flex items-center justify-center border border-[#1E8FD5]/30 shrink-0">
                <span className="text-[#1E8FD5] font-medium">{getInitials(player.nome)}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#F0F4FF] truncate">{player.nome}</span>
                  <span className="text-[#4A90C4] text-sm shrink-0">{getGenderIcon(player.genero)}</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`w-2 h-2 rounded-full ${level <= player.nivel ? 'bg-[#1BAF8A]' : 'bg-[#0D2847]'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Remove Button — sempre visível no mobile */}
              <button
                onClick={() => onRemovePlayer(player.id)}
                className="text-[#4A90C4]/40 hover:text-[#d4183d] active:text-[#d4183d] transition-colors px-2 text-2xl leading-none shrink-0"
                aria-label={`Remover ${player.nome}`}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* FABs */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3">
        {/* Importar lista — só aparece quando já há jogadores */}
        {players.length > 0 && (
          <button
            onClick={onImportPlayers}
            className="w-14 h-14 bg-[#0F2035] border border-[#1E8FD5]/40 hover:border-[#1E8FD5] text-[#1E8FD5] rounded-full flex items-center justify-center shadow-lg transition-all hover:bg-[#1E8FD5]/10"
            aria-label="Importar lista"
          >
            <ClipboardList size={20} />
          </button>
        )}

        {/* Adicionar jogador */}
        <button
          id="btn-add-player"
          onClick={onAddPlayer}
          className="w-14 h-14 bg-[#1BAF8A] hover:bg-[#1BAF8A]/90 rounded-full flex items-center justify-center shadow-xl shadow-[#1BAF8A]/30 transition-all hover:scale-105 active:scale-95"
          aria-label="Adicionar jogador"
        >
          <Plus size={24} className="text-[#0A1628]" />
        </button>
      </div>
    </div>
  );
}
