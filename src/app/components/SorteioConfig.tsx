import { useState, useEffect } from 'react';
import { Minus, Plus, Shuffle, Scale, Venus, UserPlus } from 'lucide-react';
import { Player, ModoSorteio } from '../types';
import { HexBackground } from './HexBackground';

interface SorteioConfigProps {
  players: Player[];
  onGenerateTeams: (numTimes: number, jogadoresPorTime: number, modoSorteio: ModoSorteio, vagasLivres?: number) => Promise<void>;
  onBack: () => void;
}

export function SorteioConfig({ players, onGenerateTeams, onBack }: SorteioConfigProps) {
  const [numTimes, setNumTimes] = useState(2);
  const [jogadoresPorTime, setJogadoresPorTime] = useState(3);
  const [modoSorteio, setModoSorteio] = useState<ModoSorteio>('equilibrado');
  const [sorting, setSorting] = useState(false);
  const [usarVagasLivres, setUsarVagasLivres] = useState(false);

  const totalRequired = numTimes * jogadoresPorTime;
  const deficit = Math.max(0, totalRequired - players.length);
  const podeAdicionarVagas = deficit > 0 && deficit <= numTimes;
  const vagasLivres = usarVagasLivres && podeAdicionarVagas ? deficit : 0;
  const nivelMedio = players.length > 0
    ? Math.round(players.reduce((s, p) => s + p.nivel, 0) / players.length)
    : 3;

  useEffect(() => {
    if (!podeAdicionarVagas) setUsarVagasLivres(false);
  }, [podeAdicionarVagas]);

  const canGenerate = (players.length + vagasLivres) >= totalRequired && totalRequired > 0;

  const handleGenerate = async () => {
    if (!canGenerate || sorting) return;
    try {
      setSorting(true);
      await onGenerateTeams(numTimes, jogadoresPorTime, modoSorteio, vagasLivres);
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
          <img src="/logo.png" alt="Bull Analytics" className="w-10 h-10 object-contain" />
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
                players.length + vagasLivres < totalRequired ? 'text-[#d4183d]' : 'text-[#1BAF8A]'
              }`}>
                {totalRequired}
              </div>
            </div>
            <div>
              <div className="text-[#4A90C4] text-sm mb-1">Disponíveis</div>
              <div className="text-2xl text-[#F0F4FF] font-light tabular-nums">
                {players.length}{vagasLivres > 0 && <span className="text-[#4A90C4] text-lg"> +{vagasLivres}</span>}
              </div>
            </div>
          </div>

          {podeAdicionarVagas && !usarVagasLivres && (
            <div className="mt-4 space-y-2">
              <p className="text-center text-sm text-[#d4183d]">
                Falta{deficit > 1 ? 'm' : ''} {deficit} jogador(es)
              </p>
              <button
                onClick={() => setUsarVagasLivres(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#1E8FD5]/40 bg-[#1E8FD5]/10 text-[#1E8FD5] text-sm hover:bg-[#1E8FD5]/20 transition-colors"
              >
                <UserPlus size={15} />
                Adicionar {deficit} Vaga{deficit > 1 ? 's' : ''} Livre{deficit > 1 ? 's' : ''} (nível médio {nivelMedio})
              </button>
            </div>
          )}

          {podeAdicionarVagas && usarVagasLivres && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-[#1BAF8A]">
                  {deficit} Vaga{deficit > 1 ? 's' : ''} Livre{deficit > 1 ? 's' : ''} adicionada{deficit > 1 ? 's' : ''} (nível {nivelMedio})
                </span>
                <button
                  onClick={() => setUsarVagasLivres(false)}
                  className="text-xs text-[#4A90C4] hover:text-[#d4183d] transition-colors"
                >
                  remover
                </button>
              </div>
            </div>
          )}

          {!podeAdicionarVagas && totalRequired > players.length && (
            <div className="mt-4 text-center text-sm text-[#d4183d]">
              Jogadores insuficientes
            </div>
          )}

          {players.length + vagasLivres > totalRequired && (
            <div className="mt-4 text-center text-sm text-[#4A90C4]">
              {players.length + vagasLivres - totalRequired} jogador(es) ficarão como reserva
            </div>
          )}
        </div>

        {/* Modo de Sorteio */}
        <div className="bg-[#0F2035] rounded-xl p-6 border border-[#1E8FD5]/20">
          <label className="block text-[#4A90C4] text-sm mb-4">Modo de Sorteio</label>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setModoSorteio('equilibrado')}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                modoSorteio === 'equilibrado'
                  ? 'border-[#1BAF8A] bg-[#1BAF8A]/10'
                  : 'border-[#1E8FD5]/20 bg-[#162844] hover:border-[#1E8FD5]/40'
              }`}
            >
              <div className="flex items-center gap-3 mb-1">
                <Scale size={16} className={modoSorteio === 'equilibrado' ? 'text-[#1BAF8A]' : 'text-[#4A90C4]'} />
                <span className={`font-medium text-sm ${modoSorteio === 'equilibrado' ? 'text-[#1BAF8A]' : 'text-[#F0F4FF]'}`}>
                  Equilibrado
                </span>
              </div>
              <p className="text-xs text-[#4A90C4] leading-relaxed">
                Tenta balancear nível e gênero ao mesmo tempo. Pode haver pequena variação nos dois.
              </p>
            </button>

            <button
              onClick={() => setModoSorteio('genero')}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                modoSorteio === 'genero'
                  ? 'border-[#1E8FD5] bg-[#1E8FD5]/10'
                  : 'border-[#1E8FD5]/20 bg-[#162844] hover:border-[#1E8FD5]/40'
              }`}
            >
              <div className="flex items-center gap-3 mb-1">
                <Venus size={16} className={modoSorteio === 'genero' ? 'text-[#1E8FD5]' : 'text-[#4A90C4]'} />
                <span className={`font-medium text-sm ${modoSorteio === 'genero' ? 'text-[#1E8FD5]' : 'text-[#F0F4FF]'}`}>
                  Prioridade de Gênero
                </span>
              </div>
              <p className="text-xs text-[#4A90C4] leading-relaxed">
                Garante a distribuição mais igualitária possível de mulheres e homens entre os times, mesmo que o nível fique desequilibrado.
              </p>
            </button>
          </div>
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
