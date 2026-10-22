import { useState, useEffect } from 'react';
import { Minus, Plus, Shuffle, Scale, Venus, UserPlus } from 'lucide-react';
import { Player, ModoSorteio, ModoClassificacao } from '../types';
import { ehLevantador } from '../habilidades';
import { HexBackground } from './HexBackground';
import { BotaoVoltar } from './BotaoVoltar';

interface SorteioConfigProps {
  players: Player[];
  modo: ModoClassificacao | null;
  inicial?: { numTimes: number; jogadoresPorTime: number; modoSorteio: ModoSorteio }; // última escolha
  onGenerateTeams: (numTimes: number, jogadoresPorTime: number, modoSorteio: ModoSorteio, vagasLivres?: number) => Promise<unknown>;
  onBack: () => void;
}

const MAX_TIMES = 6;
const MAX_POR_TIME = 12;

const plural = (n: number, singular: string, pluralForma: string) => (n === 1 ? singular : pluralForma);

interface StepperProps {
  titulo: string;
  valor: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  menosLabel: string;
  maisLabel: string;
}

// Escolha de um número com - e +; os botões têm nome para leitor de tela e travam nos limites
function Stepper({ titulo, valor, min, max, onChange, menosLabel, maisLabel }: StepperProps) {
  return (
    <div className="bg-[#0F2035] rounded-xl p-6 border border-[#1E8FD5]/20">
      <p className="text-[#7FB2DC] text-sm mb-4">{titulo}</p>
      <div className="flex items-center justify-between">
        <button
          onClick={() => onChange(Math.max(min, valor - 1))}
          disabled={valor <= min}
          aria-label={menosLabel}
          className="w-12 h-12 bg-[#162844] hover:bg-[#1E8FD5]/20 disabled:opacity-40 rounded-lg flex items-center justify-center text-[#1E8FD5] transition-colors"
        >
          <Minus size={20} />
        </button>
        <div className="flex-1 text-center">
          <div className="text-4xl text-[#F0F4FF] font-light tabular-nums" aria-live="polite">{valor}</div>
        </div>
        <button
          onClick={() => onChange(Math.min(max, valor + 1))}
          disabled={valor >= max}
          aria-label={maisLabel}
          className="w-12 h-12 bg-[#162844] hover:bg-[#1E8FD5]/20 disabled:opacity-40 rounded-lg flex items-center justify-center text-[#1E8FD5] transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}

export function SorteioConfig({ players, modo, inicial, onGenerateTeams, onBack }: SorteioConfigProps) {
  // Sugestão inicial: 2 times com o máximo de jogadores que a lista permite
  const [numTimes, setNumTimes] = useState(inicial?.numTimes ?? 2);
  const [jogadoresPorTime, setJogadoresPorTime] = useState(
    inicial?.jogadoresPorTime ?? Math.min(MAX_POR_TIME, Math.max(1, Math.floor(players.length / 2))),
  );
  const [modoSorteio, setModoSorteio] = useState<ModoSorteio>(inicial?.modoSorteio ?? 'equilibrado');
  const [sorting, setSorting] = useState(false);
  const [usarVagasLivres, setUsarVagasLivres] = useState(false);

  const totalRequired = numTimes * jogadoresPorTime;
  const deficit = Math.max(0, totalRequired - players.length);
  const podeAdicionarVagas = deficit > 0 && deficit <= numTimes;
  const vagasLivres = usarVagasLivres && podeAdicionarVagas ? deficit : 0;
  const sobram = players.length + vagasLivres - totalRequired;
  const nivelMedio = players.length > 0
    ? Math.round(players.reduce((s, p) => s + p.nivel, 0) / players.length)
    : 3;

  useEffect(() => {
    if (!podeAdicionarVagas) setUsarVagasLivres(false);
  }, [podeAdicionarVagas]);

  const canGenerate = (players.length + vagasLivres) >= totalRequired && totalRequired > 0;

  // Regra do modo detalhado: espalhar quem levanta bem (Levantamento 3 ou mais) entre os times
  const levantadores = players.filter(ehLevantador).length;

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
    <div className="min-h-screen bg-[#0A1628] pb-40">
      <HexBackground />

      {/* Header */}
      <div className="relative px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 border-b border-[#1E8FD5]/20">
        <BotaoVoltar onClick={onBack} />
        <h1 className="text-[#F0F4FF] text-xl mt-1">Configurar sorteio</h1>
      </div>

      <div className="relative px-4 pt-6 space-y-6">
        <Stepper
          titulo="Quantos times?"
          valor={numTimes}
          min={2}
          max={MAX_TIMES}
          onChange={setNumTimes}
          menosLabel="Um time a menos"
          maisLabel="Um time a mais"
        />

        <Stepper
          titulo="Quantos jogadores por time?"
          valor={jogadoresPorTime}
          min={1}
          max={MAX_POR_TIME}
          onChange={setJogadoresPorTime}
          menosLabel="Um jogador a menos por time"
          maisLabel="Um jogador a mais por time"
        />

        {/* Resumo */}
        <div className="bg-[#162844] rounded-xl p-6 border border-[#1E8FD5]/30" aria-live="polite">
          <p className="text-center text-[#F0F4FF] mb-4">
            {numTimes} times de {jogadoresPorTime} = <span className="font-medium">{totalRequired} jogadores</span>
          </p>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-[#7FB2DC] text-sm mb-1">Jogadores necessários</div>
              <div className={`text-2xl font-light tabular-nums ${
                players.length + vagasLivres < totalRequired ? 'text-[#ff6b86]' : 'text-[#1BAF8A]'
              }`}>
                {totalRequired}
              </div>
            </div>
            <div>
              <div className="text-[#7FB2DC] text-sm mb-1">Na lista</div>
              <div className="text-2xl text-[#F0F4FF] font-light tabular-nums">
                {players.length}{vagasLivres > 0 && <span className="text-[#7FB2DC] text-lg"> +{vagasLivres}</span>}
              </div>
            </div>
          </div>

          {podeAdicionarVagas && !usarVagasLivres && (
            <div className="mt-4 space-y-2">
              <p className="text-center text-sm text-[#ff6b86]">
                {plural(deficit, 'Falta', 'Faltam')} {deficit} {plural(deficit, 'jogador', 'jogadores')}
              </p>
              <button
                onClick={() => setUsarVagasLivres(true)}
                className="w-full flex items-center justify-center gap-2 min-h-11 rounded-lg border border-[#1E8FD5]/40 bg-[#1E8FD5]/10 text-[#1E8FD5] text-sm hover:bg-[#1E8FD5]/20 transition-colors"
              >
                <UserPlus size={15} />
                Completar com {deficit} {plural(deficit, 'vaga aberta', 'vagas abertas')} (nível médio {nivelMedio})
              </button>
              <p className="text-center text-xs text-[#7FB2DC]">
                {plural(deficit, 'A vaga entra', 'As vagas entram')} no sorteio como {plural(deficit, 'um jogador', 'jogadores')} de nível médio, para o time ficar completo.
              </p>
            </div>
          )}

          {podeAdicionarVagas && usarVagasLivres && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-[#1BAF8A]">
                  {deficit} {plural(deficit, 'vaga aberta adicionada', 'vagas abertas adicionadas')} (nível {nivelMedio})
                </span>
                <button
                  onClick={() => setUsarVagasLivres(false)}
                  className="text-sm text-[#7FB2DC] hover:text-[#ff6b86] transition-colors min-h-11 px-2 -my-2"
                >
                  Tirar
                </button>
              </div>
            </div>
          )}

          {!podeAdicionarVagas && totalRequired > players.length && (
            <div className="mt-4 text-center text-sm text-[#ff6b86]">
              {plural(deficit, 'Falta', 'Faltam')} {deficit} {plural(deficit, 'jogador', 'jogadores')}. Adicione mais gente ou reduza o tamanho dos times.
            </div>
          )}

          {sobram > 0 && (
            <div className="mt-4 text-center text-sm text-[#7FB2DC]">
              {sobram} {plural(sobram, 'jogador fica', 'jogadores ficam')} de reserva
            </div>
          )}
        </div>

        {/* Quem levanta bem (avaliação detalhada): só informa, não é um alerta. É uma tentativa, não há posição fixa. */}
        {modo === 'detalhado' && (
          <div className={`rounded-xl px-4 py-3 border text-sm ${
            levantadores >= numTimes
              ? 'bg-[#1BAF8A]/10 border-[#1BAF8A]/30 text-[#1BAF8A]'
              : 'bg-[#1E8FD5]/10 border-[#1E8FD5]/30 text-[#7FB2DC]'
          }`}>
            {levantadores >= numTimes
              ? `Quem levanta bem (nota 3 ou mais em Levantamento) fica em times diferentes sempre que possível. Na lista: ${levantadores}.`
              : `Há ${levantadores} ${plural(levantadores, 'jogador', 'jogadores')} com nota 3 ou mais em Levantamento para ${numTimes} times. Os times serão montados pelo conjunto das notas.`}
          </div>
        )}

        {/* Tipo de sorteio */}
        <div className="bg-[#0F2035] rounded-xl p-6 border border-[#1E8FD5]/20">
          <p id="rotulo-tipo-sorteio" className="text-[#7FB2DC] text-sm mb-4">Tipo de sorteio</p>
          <div role="radiogroup" aria-labelledby="rotulo-tipo-sorteio" className="flex flex-col gap-3">
            <button
              role="radio"
              aria-checked={modoSorteio === 'equilibrado'}
              onClick={() => setModoSorteio('equilibrado')}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                modoSorteio === 'equilibrado'
                  ? 'border-[#1BAF8A] bg-[#1BAF8A]/10'
                  : 'border-[#1E8FD5]/20 bg-[#162844] hover:border-[#1E8FD5]/40'
              }`}
            >
              <div className="flex items-center gap-3 mb-1">
                <Scale size={16} className={modoSorteio === 'equilibrado' ? 'text-[#1BAF8A]' : 'text-[#7FB2DC]'} aria-hidden="true" />
                <span className={`font-medium text-sm ${modoSorteio === 'equilibrado' ? 'text-[#1BAF8A]' : 'text-[#F0F4FF]'}`}>
                  Equilibrado
                </span>
              </div>
              <p className="text-xs text-[#7FB2DC] leading-relaxed">
                Monta times parelhos em nível e em gênero ao mesmo tempo.
              </p>
            </button>

            <button
              role="radio"
              aria-checked={modoSorteio === 'genero'}
              onClick={() => setModoSorteio('genero')}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                modoSorteio === 'genero'
                  ? 'border-[#1E8FD5] bg-[#1E8FD5]/10'
                  : 'border-[#1E8FD5]/20 bg-[#162844] hover:border-[#1E8FD5]/40'
              }`}
            >
              <div className="flex items-center gap-3 mb-1">
                <Venus size={16} className={modoSorteio === 'genero' ? 'text-[#1E8FD5]' : 'text-[#7FB2DC]'} aria-hidden="true" />
                <span className={`font-medium text-sm ${modoSorteio === 'genero' ? 'text-[#1E8FD5]' : 'text-[#F0F4FF]'}`}>
                  Dividir por gênero
                </span>
              </div>
              <p className="text-xs text-[#7FB2DC] leading-relaxed">
                Divide mulheres e homens do jeito mais igual possível entre os times. O nível é equilibrado dentro dessa divisão.
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Barra fixa: o botão de sortear fica sempre à vista, sem precisar rolar */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-[#0A1628]/95 backdrop-blur border-t border-[#1E8FD5]/20">
        <div className="max-w-md mx-auto px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            id="btn-sortear"
            onClick={handleGenerate}
            disabled={!canGenerate || sorting}
            className="w-full min-h-14 bg-[#1BAF8A] hover:bg-[#1BAF8A]/90 disabled:bg-[#162844] disabled:text-[#7FB2DC] text-[#0A1628] font-semibold rounded-xl transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#1BAF8A]/20 disabled:shadow-none"
          >
            <Shuffle size={20} className={sorting ? 'animate-spin' : ''} aria-hidden="true" />
            {sorting ? 'Sorteando…' : 'Sortear agora'}
          </button>
        </div>
      </div>
    </div>
  );
}
