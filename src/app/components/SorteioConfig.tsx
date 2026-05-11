import { useState } from 'react';
import { Minus, Plus, Shuffle } from 'lucide-react';
import { Player } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { HexBackground } from './HexBackground';

interface SorteioConfigProps {
  players: Player[];
  onGenerateTeams: (numTimes: number, jogadoresPorTime: number) => Promise<void>;
  onBack: () => void;
}

export function SorteioConfig({ players, onGenerateTeams, onBack }: SorteioConfigProps) {
  const [numTimes, setNumTimes] = useState(2);
  const [jogadoresPorTime, setJogadoresPorTime] = useState(3);
  const [sorting, setSorting] = useState(false);

  const totalRequired = numTimes * jogadoresPorTime;
  const canGenerate = totalRequired <= players.length && totalRequired > 0;

  const handleGenerate = async () => {
    if (!canGenerate || sorting) return;
    try {
      setSorting(true);
      await onGenerateTeams(numTimes, jogadoresPorTime);
    } finally {
      setSorting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1628]">
      <HexBackground />

      {/* Header */}
      <div className="relative px-4 pt-6 pb-4 border-b border-[#1E8FD5]/20">
        <button
          onClick={onBack}
          className="text-[#4A90C4] hover:text-[#1E8FD5] mb-4 transition-colors flex items-center gap-2"
        >
          ← Voltar
        </button>
        <div className="flex items-center gap-3">
          <ImageWithFallback
            src="/src/imports/Logotipo_Bull_2026.png"
            alt="Bull Analytics"
            className="w-10 h-10 object-contain"
          />
          <h1 className="text-[#F0F4FF]">Configurar Sorteio</h1>
        </div>
      </div>

      <div className="relative px-4 pt-8 pb-24 space-y-8">
        {/* Number of Teams */}
        <div className="bg-[#0F2035] rounded-xl p-6 border border-[#1E8FD5]/20">
          <label className="block text-[#4A90C4] text-sm mb-4">Nº de Times</label>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setNumTimes(Math.max(2, numTimes - 1))}
              className="w-12 h-12 bg-[#162844] hover:bg-[#1E8FD5]/20 rounded-lg flex items-center justify-center text-[#1E8FD5] transition-colors"
            >
              <Minus size={20} />
            </button>
            <div className="flex-1 text-center">
              <div className="text-4xl text-[#F0F4FF] font-light tabular-nums">{numTimes}</div>
            </div>
            <button
              onClick={() => setNumTimes(Math.min(6, numTimes + 1))}
              className="w-12 h-12 bg-[#162844] hover:bg-[#1E8FD5]/20 rounded-lg flex items-center justify-center text-[#1E8FD5] transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Players Per Team */}
        <div className="bg-[#0F2035] rounded-xl p-6 border border-[#1E8FD5]/20">
          <label className="block text-[#4A90C4] text-sm mb-4">Jogadores por Time</label>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setJogadoresPorTime(Math.max(1, jogadoresPorTime - 1))}
              className="w-12 h-12 bg-[#162844] hover:bg-[#1E8FD5]/20 rounded-lg flex items-center justify-center text-[#1E8FD5] transition-colors"
            >
              <Minus size={20} />
            </button>
            <div className="flex-1 text-center">
              <div className="text-4xl text-[#F0F4FF] font-light tabular-nums">{jogadoresPorTime}</div>
            </div>
            <button
              onClick={() => setJogadoresPorTime(Math.min(12, jogadoresPorTime + 1))}
              className="w-12 h-12 bg-[#162844] hover:bg-[#1E8FD5]/20 rounded-lg flex items-center justify-center text-[#1E8FD5] transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-[#162844] rounded-xl p-6 border border-[#1E8FD5]/30">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-[#4A90C4] text-sm mb-1">Total Necessário</div>
              <div className={`text-2xl font-light tabular-nums ${
                totalRequired > players.length ? 'text-[#d4183d]' : 'text-[#1BAF8A]'
              }`}>
                {totalRequired}
              </div>
            </div>
            <div>
              <div className="text-[#4A90C4] text-sm mb-1">Disponíveis</div>
              <div className="text-2xl text-[#F0F4FF] font-light tabular-nums">{players.length}</div>
            </div>
          </div>

          {totalRequired > players.length && (
            <div className="mt-4 text-center text-sm text-[#d4183d]">
              Jogadores insuficientes
            </div>
          )}

          {totalRequired < players.length && (
            <div className="mt-4 text-center text-sm text-[#4A90C4]">
              {players.length - totalRequired} jogador(es) ficarão como reserva
            </div>
          )}
        </div>

        {/* Generate Button */}
        <button
          id="btn-sortear"
          onClick={handleGenerate}
          disabled={!canGenerate || sorting}
          className="w-full py-5 bg-[#1BAF8A] hover:bg-[#1BAF8A]/90 disabled:bg-[#162844] disabled:text-[#4A90C4] text-[#0A1628] font-medium rounded-xl transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#1BAF8A]/20 disabled:shadow-none"
        >
          <Shuffle size={20} className={sorting ? 'animate-spin' : ''} />
          {sorting ? 'Sorteando...' : 'Sortear Times'}
        </button>
      </div>
    </div>
  );
}
