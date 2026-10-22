import { Share2, Copy, CheckCircle, XCircle, Scale, Venus } from 'lucide-react';
import { ResultadoSorteio } from '../types';
import { HABILIDADES, ehLevantador } from '../habilidades';
import { HexBackground } from './HexBackground';

interface TeamResultsProps {
  resultado: ResultadoSorteio;
  onBack: () => void;
  onShuffle: () => void;
}

export function TeamResults({ resultado, onBack, onShuffle }: TeamResultsProps) {
  const { times, reservas, nivelEquilibrado, generoEquilibrado, detalhado, levantadorPorTime } = resultado;

  // Modo detalhado: times sem ninguém com Levantamento 3 ou mais, e a habilidade
  // com maior diferença de média entre os times
  const isSemLevantador = (time: ResultadoSorteio['times'][number]) => !time.jogadores.some(ehLevantador);
  const timesSemLevantador = times.filter(isSemLevantador).length;

  const maiorDiferenca = detalhado
    ? HABILIDADES.map(({ key, label }) => {
        const valores = times.map(t => t.habilidades?.[key] ?? 0);
        return { label, dif: Math.max(...valores) - Math.min(...valores) };
      }).sort((a, b) => b.dif - a.dif)[0]
    : null;
  const habilidadesEquilibradas = maiorDiferenca ? maiorDiferenca.dif <= 0.5 : true;
  const modoSorteio = resultado.config.modoSorteio;
  const teamColors = ['#1BAF8A', '#1E8FD5', '#1565A8', '#4A90C4', '#1BAF8A', '#1E8FD5'];

  const isVaga = (player: { id: number }) => player.id < 0;

  const getGenderIcon = (genero: 'M' | 'F' | 'O') => {
    if (genero === 'M') return '♂';
    if (genero === 'F') return '♀';
    return '⚥';
  };

  const modoLabel = modoSorteio === 'genero' ? 'Prioridade de Gênero' : 'Equilibrado';
  const classificacaoLabel = detalhado ? 'Detalhada (5 habilidades)' : 'Rápida (nível 1-5)';

  const copyToClipboard = () => {
    const header = `Modo de Sorteio: ${modoLabel}\nClassificação: ${classificacaoLabel}\n\n`;
    const text = times.map((time) => {
      const jogadores = time.jogadores.map(p => `- ${p.nome}`).join('\n');
      return `${time.nome}\n${jogadores}`;
    }).join('\n\n');

    const reservaText = reservas.length > 0
      ? `\n\nReservas:\n${reservas.map(p => `- ${p.nome}`).join('\n')}`
      : '';

    navigator.clipboard.writeText(header + text + reservaText);
  };

  const shareWhatsApp = () => {
    const header = `*Modo de Sorteio: ${modoLabel}*\nClassificação: ${classificacaoLabel}\n\n`;
    const text = times.map((time) => {
      const jogadores = time.jogadores.map(p => `- ${p.nome}`).join('\n');
      return `*${time.nome}*\n${jogadores}`;
    }).join('\n\n');

    const reservaText = reservas.length > 0
      ? `\n\n*Reservas:*\n${reservas.map(p => `- ${p.nome}`).join('\n')}`
      : '';

    window.open(`https://wa.me/?text=${encodeURIComponent(header + text + reservaText)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#0A1628] pb-32">
      <HexBackground />

      {/* Header */}
      <div className="relative px-4 pt-6 pb-4 border-b border-[#1E8FD5]/20">
        <button
          onClick={onBack}
          className="text-[#4A90C4] hover:text-[#1E8FD5] mb-4 transition-colors flex items-center gap-2"
        >
          ← Voltar
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/logo.png" alt="Bull Analytics" className="w-10 h-10 object-contain shrink-0" />
            <h1 className="text-[#F0F4FF] text-xl whitespace-nowrap truncate">Times Sorteados</h1>
          </div>
          <button
            onClick={onShuffle}
            className="text-[#1BAF8A] hover:text-[#1BAF8A]/80 text-sm transition-colors min-h-11 px-1 whitespace-nowrap shrink-0"
          >
            Sortear novamente
          </button>
        </div>
      </div>

      {/* Balance Badges */}
      <div className="relative px-4 pt-4 flex flex-wrap gap-2">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
          nivelEquilibrado
            ? 'bg-[#1BAF8A]/15 text-[#1BAF8A] border border-[#1BAF8A]/30'
            : 'bg-[#d4183d]/10 text-[#d4183d] border border-[#d4183d]/30'
        }`}>
          {nivelEquilibrado ? <CheckCircle size={12} /> : <XCircle size={12} />}
          Nível {nivelEquilibrado ? 'equilibrado' : 'desbalanceado'}
        </div>

        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
          generoEquilibrado
            ? 'bg-[#1BAF8A]/15 text-[#1BAF8A] border border-[#1BAF8A]/30'
            : 'bg-[#d4183d]/10 text-[#d4183d] border border-[#d4183d]/30'
        }`}>
          {generoEquilibrado ? <CheckCircle size={12} /> : <XCircle size={12} />}
          Gênero {generoEquilibrado ? 'equilibrado' : 'desbalanceado'}
        </div>

        {levantadorPorTime !== undefined && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            levantadorPorTime
              ? 'bg-[#1BAF8A]/15 text-[#1BAF8A] border border-[#1BAF8A]/30'
              : 'bg-[#E0A526]/10 text-[#E0A526] border border-[#E0A526]/30'
          }`}>
            {levantadorPorTime ? <CheckCircle size={12} /> : <XCircle size={12} />}
            {levantadorPorTime
              ? 'Levantamento distribuído'
              : `${timesSemLevantador} time${timesSemLevantador !== 1 ? 's' : ''} sem Levantamento 3+`}
          </div>
        )}

        {detalhado && maiorDiferenca && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            habilidadesEquilibradas
              ? 'bg-[#1BAF8A]/15 text-[#1BAF8A] border border-[#1BAF8A]/30'
              : 'bg-[#E0A526]/10 text-[#E0A526] border border-[#E0A526]/30'
          }`}>
            {habilidadesEquilibradas ? <CheckCircle size={12} /> : <XCircle size={12} />}
            {habilidadesEquilibradas
              ? 'Habilidades equilibradas'
              : `Habilidades: ${maiorDiferenca.label} difere ${maiorDiferenca.dif.toFixed(1).replace('.', ',')}`}
          </div>
        )}

        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
          modoSorteio === 'genero'
            ? 'bg-[#1E8FD5]/15 text-[#1E8FD5] border border-[#1E8FD5]/30'
            : 'bg-[#1BAF8A]/15 text-[#1BAF8A] border border-[#1BAF8A]/30'
        }`}>
          {modoSorteio === 'genero' ? <Venus size={12} /> : <Scale size={12} />}
          {modoLabel}
        </div>
      </div>

      {/* Team Cards */}
      <div className="relative px-4 pt-4 space-y-4">
        {times.map((time, idx) => (
          <div
            key={idx}
            className="bg-[#0F2035] rounded-xl border border-[#1E8FD5]/20 overflow-hidden"
            style={{
              borderLeftColor: teamColors[idx % teamColors.length],
              borderLeftWidth: '4px'
            }}
          >
            {/* Team Header */}
            <div className="p-4 border-b border-[#1E8FD5]/10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[#F0F4FF]">
                  {time.nome}
                  {levantadorPorTime !== undefined && isSemLevantador(time) && (
                    <span className="ml-2 text-[10px] font-normal text-[#E0A526] border border-[#E0A526]/40 rounded px-1">sem Lev 3+</span>
                  )}
                </h3>
                <div className="flex gap-2">
                  <span
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: `${teamColors[idx % teamColors.length]}20`,
                      color: teamColors[idx % teamColors.length]
                    }}
                  >
                    {detalhado
                      ? `média ${(time.totalNivel / Math.max(1, time.jogadores.length)).toFixed(1).replace('.', ',')}`
                      : `${time.totalNivel} pts`}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 text-sm text-[#4A90C4]">
                <span>♂ {time.masculinos}</span>
                <span>♀ {time.femininos}</span>
                {time.outros > 0 && <span>⚥ {time.outros}</span>}
              </div>

              {/* Média por habilidade do time (modo detalhado) */}
              {time.habilidades && (
                <div className="grid grid-cols-5 gap-2 mt-3">
                  {HABILIDADES.map(({ key, abrev }) => (
                    <div key={key} className="text-center">
                      <div className="text-xs text-[#F0F4FF] tabular-nums mb-1">{time.habilidades![key].toFixed(1)}</div>
                      <div className="h-1 rounded-full bg-[#0D2847] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(time.habilidades![key] / 5) * 100}%`,
                            backgroundColor: teamColors[idx % teamColors.length],
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-[#4A90C4] mt-1">{abrev}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Player List */}
            <div className="divide-y divide-[#1E8FD5]/10">
              {time.jogadores.map((player, pIdx) => (
                <div
                  key={pIdx}
                  className={`px-4 py-3 flex items-center justify-between ${
                    isVaga(player) ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isVaga(player) ? 'text-[#4A90C4] italic' : 'text-[#F0F4FF]'}>
                      {player.nome}
                    </span>
                    {isVaga(player)
                      ? <span className="text-[10px] text-[#4A90C4] border border-[#4A90C4]/40 rounded px-1">LIVRE</span>
                      : <span className="text-[#4A90C4] text-sm">{getGenderIcon(player.genero)}</span>
                    }
                    {ehLevantador(player) && (
                      <span className="text-[10px] text-[#1E8FD5] border border-[#1E8FD5]/40 rounded px-1">LEV</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`w-1.5 h-1.5 rounded-full ${
                          level <= player.nivel
                            ? isVaga(player) ? 'bg-[#4A90C4]/60' : 'bg-[#1BAF8A]'
                            : 'bg-[#0D2847]'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Reservas */}
        {reservas.length > 0 && (
          <div className="bg-[#0F2035] rounded-xl border border-[#1E8FD5]/20 overflow-hidden border-l-4 border-l-[#4A90C4]/40">
            <div className="p-4 border-b border-[#1E8FD5]/10">
              <h3 className="text-[#4A90C4]">Reservas ({reservas.length})</h3>
            </div>
            <div className="divide-y divide-[#1E8FD5]/10">
              {reservas.map((player, pIdx) => (
                <div key={pIdx} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[#4A90C4]">{player.nome}</span>
                    <span className="text-[#4A90C4]/60 text-sm">{getGenderIcon(player.genero)}</span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`w-1.5 h-1.5 rounded-full ${
                          level <= player.nivel ? 'bg-[#4A90C4]/60' : 'bg-[#0D2847]'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0A1628] border-t border-[#1E8FD5]/20 p-4">
        <div className="flex gap-3 max-w-md mx-auto">
          <button
            id="btn-share-whatsapp"
            onClick={shareWhatsApp}
            className="flex-1 py-4 bg-[#1BAF8A] hover:bg-[#1BAF8A]/90 text-[#0A1628] font-medium rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Share2 size={18} />
            WhatsApp
          </button>
          <button
            id="btn-copy-result"
            onClick={copyToClipboard}
            className="flex-1 py-4 bg-transparent border-2 border-[#1E8FD5] hover:bg-[#1E8FD5]/10 text-[#1E8FD5] font-medium rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Copy size={18} />
            Copiar
          </button>
        </div>
      </div>
    </div>
  );
}
