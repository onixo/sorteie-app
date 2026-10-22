import { useState, useRef, useEffect } from 'react';
import { Share2, Copy, Check, CheckCircle, TriangleAlert, Shuffle } from 'lucide-react';
import { ResultadoSorteio, Player, Time } from '../types';
import { HABILIDADES, ehLevantador } from '../habilidades';
import { HexBackground } from './HexBackground';
import { GeneroIcon } from './GeneroIcon';
import { BotaoVoltar } from './BotaoVoltar';

interface TeamResultsProps {
  resultado: ResultadoSorteio;
  onBack: () => void;
  onShuffle: () => void;
}

// Uma cor diferente para cada um dos 6 times possíveis
const CORES_DOS_TIMES = ['#1BAF8A', '#1E8FD5', '#8B7CF6', '#E0A526', '#F2788C', '#3DD9B0'];

const isVaga = (player: { id: number }) => player.id < 0;

const plural = (n: number, singular: string, pluralForma: string) => (n === 1 ? singular : pluralForma);

// Números com vírgula decimal, como o resto do app
const fmt = (n: number) => n.toFixed(1).replace('.', ',');

// Texto que vai para o grupo do WhatsApp (com negrito) ou para a área de transferência (sem negrito).
// Só o que os amigos precisam ler: título, times numerados e reservas.
function montarTexto(times: Time[], reservas: Player[], negrito: boolean): string {
  const b = (t: string) => (negrito ? `*${t}*` : t);
  const nomeDe = (p: Player) => (isVaga(p) ? '(vaga aberta)' : p.nome);
  const blocos = times.map(time =>
    `${b(time.nome)}\n${time.jogadores.map((p, i) => `${i + 1}. ${nomeDe(p)}`).join('\n')}`
  );
  const reservaTexto = reservas.length > 0
    ? `\n\n${b('Reservas')}\n${reservas.map(p => `- ${p.nome}`).join('\n')}`
    : '';
  return `🏐 ${b('Times do vôlei')}\n\n${blocos.join('\n\n')}${reservaTexto}`;
}

// Copia o texto. Tenta a API moderna e, se o navegador negar, o método antigo (campo temporário).
async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const campo = document.createElement('textarea');
      campo.value = texto;
      campo.setAttribute('readonly', '');
      campo.style.position = 'fixed';
      campo.style.opacity = '0';
      document.body.appendChild(campo);
      campo.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(campo);
      return ok;
    } catch {
      return false;
    }
  }
}

// Pontinhos de nível; os vazios ficam visíveis para dar para ler "2 de 5" de relance
function Pontos({ nivel, apagado }: { nivel: number; apagado?: boolean }) {
  return (
    <div className="flex gap-1 shrink-0" role="img" aria-label={`Nível ${nivel} de 5`}>
      {[1, 2, 3, 4, 5].map(level => (
        <div
          key={level}
          className={`w-2 h-2 rounded-full ${
            level <= nivel ? (apagado ? 'bg-[#7FB2DC]/60' : 'bg-[#1BAF8A]') : 'bg-[#7FB2DC]/25'
          }`}
        />
      ))}
    </div>
  );
}

interface SeloProps {
  ok: boolean;
  children: React.ReactNode;
}

// Selo de resultado: verde com check quando está bom, âmbar com alerta quando há diferença
function Selo({ ok, children }: SeloProps) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
      ok
        ? 'bg-[#1BAF8A]/15 text-[#1BAF8A] border border-[#1BAF8A]/30'
        : 'bg-[#E0A526]/10 text-[#E0A526] border border-[#E0A526]/30'
    }`}>
      {ok ? <CheckCircle size={12} aria-hidden="true" /> : <TriangleAlert size={12} aria-hidden="true" />}
      {children}
    </div>
  );
}

export function TeamResults({ resultado, onBack, onShuffle }: TeamResultsProps) {
  const { times, reservas, nivelEquilibrado, generoEquilibrado, detalhado, levantadorPorTime } = resultado;
  const modoSorteio = resultado.config.modoSorteio;

  const [copia, setCopia] = useState<'ocioso' | 'ok' | 'erro'>('ocioso');
  const copiaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copiaTimer.current) clearTimeout(copiaTimer.current); }, []);

  // Modo detalhado: times sem ninguém com Levantamento 3 ou mais, e a habilidade
  // com maior diferença de média entre os times
  const isSemLevantador = (time: Time) => !time.jogadores.some(ehLevantador);
  const timesSemLevantador = times.filter(isSemLevantador).length;

  const maiorDiferenca = detalhado
    ? HABILIDADES.map(({ key, label }) => {
        const valores = times.map(t => t.habilidades?.[key] ?? 0);
        return { label, dif: Math.max(...valores) - Math.min(...valores) };
      }).sort((a, b) => b.dif - a.dif)[0]
    : null;
  const habilidadesEquilibradas = maiorDiferenca ? maiorDiferenca.dif <= 0.5 : true;

  const modoLabel = modoSorteio === 'genero' ? 'Dividir por gênero' : 'Equilibrado';
  const avaliacaoLabel = detalhado ? 'Avaliação detalhada' : 'Avaliação rápida';

  const copiar = async () => {
    const ok = await copiarTexto(montarTexto(times, reservas, false));
    setCopia(ok ? 'ok' : 'erro');
    if (copiaTimer.current) clearTimeout(copiaTimer.current);
    copiaTimer.current = setTimeout(() => setCopia('ocioso'), 2500);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(montarTexto(times, reservas, true))}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#0A1628] pb-44">
      <HexBackground />

      {/* Header */}
      <div className="relative px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 border-b border-[#1E8FD5]/20">
        <BotaoVoltar onClick={onBack} />
        <h1 className="text-[#F0F4FF] text-xl mt-1">Times sorteados</h1>
        <p className="text-[#7FB2DC] text-xs mt-0.5">{modoLabel} · {avaliacaoLabel}</p>
      </div>

      {/* Selos de equilíbrio */}
      <div className="relative px-4 pt-4 flex flex-wrap gap-2">
        <Selo ok={nivelEquilibrado}>{nivelEquilibrado ? 'Nível parelho' : 'Nível com diferença'}</Selo>
        <Selo ok={generoEquilibrado}>{generoEquilibrado ? 'Gênero parelho' : 'Gênero com diferença'}</Selo>

        {levantadorPorTime !== undefined && (
          <Selo ok={levantadorPorTime}>
            {levantadorPorTime
              ? 'Levantador em todos os times'
              : `${timesSemLevantador} ${plural(timesSemLevantador, 'time sem levantador', 'times sem levantador')}`}
          </Selo>
        )}

        {detalhado && maiorDiferenca && (
          <Selo ok={habilidadesEquilibradas}>
            {habilidadesEquilibradas
              ? 'Habilidades equilibradas'
              : `${maiorDiferenca.label}: ${fmt(maiorDiferenca.dif)} de diferença entre os times`}
          </Selo>
        )}
      </div>

      {/* Times */}
      <div className="relative px-4 pt-4 space-y-4">
        {times.map((time, idx) => {
          const cor = CORES_DOS_TIMES[idx % CORES_DOS_TIMES.length];
          return (
            <div
              key={idx}
              className="relative bg-[#0F2035] rounded-xl border border-[#1E8FD5]/20 overflow-hidden"
            >
              <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: cor }} aria-hidden="true" />
              <div className="pl-1">
                {/* Cabeçalho do time */}
                <div className="p-4 border-b border-[#1E8FD5]/10">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <h2 className="text-[#F0F4FF] text-lg flex items-center gap-2 min-w-0">
                      {time.nome}
                      {levantadorPorTime !== undefined && isSemLevantador(time) && (
                        <span className="text-xs font-normal text-[#E0A526] border border-[#E0A526]/40 rounded px-1.5 py-0.5 shrink-0">sem levantador</span>
                      )}
                    </h2>
                    <span
                      className="px-2 py-1 rounded text-xs font-medium shrink-0"
                      style={{ backgroundColor: `${cor}20`, color: cor }}
                    >
                      {detalhado
                        ? `nível médio ${fmt(time.totalNivel / Math.max(1, time.jogadores.length))}`
                        : `nível total ${time.totalNivel}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#7FB2DC]">
                    <span className="flex items-center gap-1"><GeneroIcon genero="M" size={14} />{time.masculinos}</span>
                    <span className="flex items-center gap-1"><GeneroIcon genero="F" size={14} />{time.femininos}</span>
                    {time.outros > 0 && <span className="flex items-center gap-1"><GeneroIcon genero="O" size={14} />{time.outros}</span>}
                  </div>

                  {/* Média por habilidade do time (avaliação detalhada) */}
                  {time.habilidades && (
                    <div className="grid grid-cols-5 gap-2 mt-3">
                      {HABILIDADES.map(({ key, label, abrev }) => (
                        <div key={key} className="text-center" title={label}>
                          <div className="text-sm text-[#F0F4FF] tabular-nums mb-1" aria-label={`${label}: ${fmt(time.habilidades![key])}`}>
                            {fmt(time.habilidades![key])}
                          </div>
                          <div className="h-1 rounded-full bg-[#7FB2DC]/20 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(time.habilidades![key] / 5) * 100}%`, backgroundColor: cor }}
                            />
                          </div>
                          <div className="text-xs text-[#7FB2DC] mt-1">{abrev}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Jogadores */}
                <ol className="divide-y divide-[#1E8FD5]/10">
                  {time.jogadores.map((player, pIdx) => (
                    <li
                      key={pIdx}
                      className={`px-4 py-3 flex items-center justify-between gap-3 ${isVaga(player) ? 'opacity-70' : ''}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`truncate ${isVaga(player) ? 'text-[#7FB2DC] italic' : 'text-[#F0F4FF]'}`}>
                          {player.nome}
                        </span>
                        {!isVaga(player) && (
                          <span className="text-[#7FB2DC] flex items-center shrink-0"><GeneroIcon genero={player.genero} size={14} /></span>
                        )}
                        {ehLevantador(player) && (
                          <span className="text-xs text-[#1E8FD5] border border-[#1E8FD5]/40 rounded px-1.5 py-0.5 shrink-0">Levantador</span>
                        )}
                      </div>
                      <Pontos nivel={player.nivel} apagado={isVaga(player)} />
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          );
        })}

        {/* Reservas */}
        {reservas.length > 0 && (
          <div className="relative bg-[#0F2035] rounded-xl border border-[#1E8FD5]/20 overflow-hidden">
            <span className="absolute inset-y-0 left-0 w-1 bg-[#7FB2DC]/40" aria-hidden="true" />
            <div className="pl-1">
              <div className="p-4 border-b border-[#1E8FD5]/10">
                <h2 className="text-[#7FB2DC] text-lg">Reservas ({reservas.length})</h2>
              </div>
              <ul className="divide-y divide-[#1E8FD5]/10">
                {reservas.map((player, pIdx) => (
                  <li key={pIdx} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[#7FB2DC] truncate">{player.nome}</span>
                      <span className="text-[#7FB2DC] flex items-center shrink-0"><GeneroIcon genero={player.genero} size={14} /></span>
                    </div>
                    <Pontos nivel={player.nivel} apagado />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Barra fixa: enviar para o grupo é a ação principal */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-[#0A1628]/95 backdrop-blur border-t border-[#1E8FD5]/20">
        <div className="max-w-md mx-auto px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
          <button
            id="btn-share-whatsapp"
            onClick={shareWhatsApp}
            className="w-full min-h-14 bg-[#1BAF8A] hover:bg-[#1BAF8A]/90 text-[#0A1628] font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Share2 size={18} aria-hidden="true" />
            Enviar no WhatsApp
          </button>
          <div className="flex gap-3">
            <button
              id="btn-copy-result"
              onClick={copiar}
              className="flex-1 min-h-12 border border-[#1E8FD5]/60 hover:bg-[#1E8FD5]/10 text-[#1E8FD5] font-medium rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {copia === 'ok' ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
              <span role="status" aria-live="polite">
                {copia === 'ok' ? 'Copiado!' : copia === 'erro' ? 'Não deu para copiar' : 'Copiar times'}
              </span>
            </button>
            <button
              id="btn-resortear"
              onClick={onShuffle}
              className="flex-1 min-h-12 border border-[#1E8FD5]/60 hover:bg-[#1E8FD5]/10 text-[#1E8FD5] font-medium rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Shuffle size={18} aria-hidden="true" />
              Sortear de novo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
