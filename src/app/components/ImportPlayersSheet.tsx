import { useState, useRef, useEffect } from 'react';
import { X, Loader2, ClipboardList, ChevronLeft, ChevronDown, Clipboard, Zap, SlidersHorizontal } from 'lucide-react';
import { NewPlayerPayload, Habilidades, ModoClassificacao } from '../types';
import { HABILIDADES, habilidadesCompletas, calcularNivel } from '../habilidades';
import { HabilidadesInput } from './HabilidadesInput';

interface ImportPlayersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (payload: NewPlayerPayload) => Promise<void>;
  modoLista: ModoClassificacao | null; // modo já definido pela lista; null = lista vazia (usuário escolhe)
}

interface PendingPlayer {
  nome: string;
  genero: 'M' | 'F' | 'O' | null;
  nivel: number | null;
  habilidades: Partial<Habilidades>;
}

type Step = 'paste' | 'modo' | 'configure';

const SKILL_LABELS = ['Iniciante', 'Praticante', 'Intermediário', 'Avançado', 'Expert'];

function parsePastedList(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line =>
      line
        .replace(/^\d+[\.\)\-\:]\s*/, '')   // remove "1. " "1) " etc.
        .replace(/[^\p{L}\p{N}\s]/gu, '')   // remove emojis e símbolos
        .trim()
    )
    .filter(name => name.length > 0 && name.length <= 60);
}

function isComplete(p: PendingPlayer, modo: ModoClassificacao): boolean {
  if (p.genero === null) return false;
  return modo === 'detalhado' ? habilidadesCompletas(p.habilidades) : p.nivel !== null;
}

export function ImportPlayersSheet({ isOpen, onClose, onAdd, modoLista }: ImportPlayersSheetProps) {
  const [step, setStep] = useState<Step>('paste');
  const [modo, setModo] = useState<ModoClassificacao>('simples');
  const [text, setText] = useState('');
  const [players, setPlayers] = useState<PendingPlayer[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pasteError, setPasteError] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Rola até o jogador aberto (avanço automático para o próximo incompleto)
  useEffect(() => {
    if (expanded === null || step !== 'configure') return;
    const id = requestAnimationFrame(() => {
      cardRefs.current[expanded]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => cancelAnimationFrame(id);
  }, [expanded, step]);

  const handlePasteFromClipboard = async () => {
    try {
      const content = await navigator.clipboard.readText();
      if (content.trim()) setText(content);
      setPasteError(false);
    } catch {
      setPasteError(true);
    }
  };

  const startConfigure = (m: ModoClassificacao) => {
    setModo(m);
    setExpanded(m === 'detalhado' ? 0 : null);
    setStep('configure');
  };

  const handleParse = () => {
    const names = parsePastedList(text);
    if (names.length === 0) return;
    setPlayers(names.map(nome => ({ nome, genero: null, nivel: null, habilidades: {} })));
    // Lista já tem modo: segue direto. Lista vazia: pergunta qual classificação usar.
    if (modoLista) startConfigure(modoLista);
    else setStep('modo');
  };

  const updatePlayer = (index: number, update: Partial<PendingPlayer>) => {
    const atual = players[index];
    const novo = { ...atual, ...update };
    const next = players.map((p, i) => (i === index ? novo : p));
    setPlayers(next);

    // Modo detalhado: ao completar um jogador, abre o próximo incompleto
    if (modo === 'detalhado' && !isComplete(atual, modo) && isComplete(novo, modo)) {
      let proximo: number | null = null;
      for (let k = 1; k < next.length; k++) {
        const i = (index + k) % next.length;
        if (!isComplete(next[i], modo)) { proximo = i; break; }
      }
      setExpanded(proximo);
    }
  };

  const updateHabilidade = (index: number, key: keyof Habilidades, nota: number) => {
    updatePlayer(index, { habilidades: { ...players[index].habilidades, [key]: nota } });
  };

  const removeFromList = (index: number) => {
    setPlayers(prev => prev.filter((_, i) => i !== index));
    setExpanded(prev => (prev === null || prev === index ? null : prev > index ? prev - 1 : prev));
  };

  const allFilled = players.length > 0 && players.every(p => isComplete(p, modo));
  const incompleteCount = players.filter(p => !isComplete(p, modo)).length;

  const handleSubmit = async () => {
    if (submitting || !allFilled) return;
    try {
      setSubmitting(true);
      for (const player of players) {
        const base = { nome: player.nome, genero: player.genero as 'M' | 'F' | 'O' };
        if (modo === 'detalhado' && habilidadesCompletas(player.habilidades)) {
          await onAdd({ ...base, nivel: calcularNivel(player.habilidades), habilidades: player.habilidades });
        } else {
          await onAdd({ ...base, nivel: player.nivel as number });
        }
      }
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('paste');
    setText('');
    setPlayers([]);
    setExpanded(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={handleClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-[#0D2847] rounded-t-3xl border-t border-[#1E8FD5]/30 shadow-2xl max-h-[92dvh] flex flex-col animate-in slide-in-from-bottom duration-300">
        <div className="max-w-md mx-auto w-full flex flex-col flex-1 min-h-0">

          {/* Handle */}
          <div className="pt-4 pb-2 flex justify-center shrink-0">
            <div className="w-12 h-1 bg-[#4A90C4]/40 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-6 pb-4 flex items-center justify-between shrink-0">
            {step !== 'paste' ? (
              <button
                onClick={() => setStep(step === 'configure' && !modoLista ? 'modo' : 'paste')}
                className="text-[#4A90C4] hover:text-[#1E8FD5] flex items-center gap-1 transition-colors"
              >
                <ChevronLeft size={20} />
                Voltar
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <ClipboardList size={20} className="text-[#1BAF8A]" />
                <h2 className="text-[#F0F4FF]">Importar Lista</h2>
              </div>
            )}
            <button onClick={handleClose} className="text-[#4A90C4] hover:text-[#F0F4FF] transition-colors" aria-label="Fechar">
              <X size={24} />
            </button>
          </div>

          {/* ── STEP 1: Colar lista ── */}
          {step === 'paste' && (
            <div className="px-6 pb-6 flex flex-col gap-4 flex-1 min-h-0">
              <div className="flex items-center justify-between shrink-0">
                <p className="text-[#4A90C4] text-sm">
                  Cole a lista numerada do grupo (ex: do WhatsApp):
                </p>
                <button
                  onClick={handlePasteFromClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E8FD5]/10 hover:bg-[#1E8FD5]/20 border border-[#1E8FD5]/30 text-[#1E8FD5] rounded-lg text-xs transition-all shrink-0"
                >
                  <Clipboard size={13} />
                  Colar
                </button>
              </div>
              {pasteError && (
                <p className="text-[#d4183d] text-xs -mt-2 shrink-0">
                  Permissão negada. Cole manualmente na caixa abaixo.
                </p>
              )}
              <textarea
                value={text}
                onChange={e => { setText(e.target.value); setPasteError(false); }}
                placeholder={"1. Fernanda\n2. Lucas\n3. Beatriz\n4. Rodrigo\n5. Camila\n..."}
                className="flex-1 min-h-[200px] bg-[#162844] border border-[#1E8FD5]/30 focus:border-[#1E8FD5] rounded-xl p-4 text-[#F0F4FF] text-sm outline-none resize-none placeholder:text-[#4A90C4]/40 font-mono leading-relaxed"
              />
              <button
                onClick={handleParse}
                disabled={!text.trim()}
                className="w-full py-4 bg-[#1BAF8A] hover:bg-[#1BAF8A]/90 disabled:bg-[#162844] disabled:text-[#4A90C4] text-[#0A1628] font-medium rounded-xl transition-all disabled:cursor-not-allowed shrink-0"
              >
                Processar Lista
              </button>
            </div>
          )}

          {/* ── STEP 2: Escolher classificação ── */}
          {step === 'modo' && (
            <div className="px-6 pb-6 flex flex-col gap-4">
              <p className="text-[#4A90C4] text-sm">
                <span className="text-[#1BAF8A] font-medium">{players.length}</span> jogadores
                detectados. Como quer classificar?
              </p>

              <button
                onClick={() => startConfigure('simples')}
                className="w-full text-left p-4 rounded-xl border-2 border-[#1E8FD5]/20 bg-[#162844] hover:border-[#1BAF8A] transition-all"
              >
                <div className="flex items-center gap-3 mb-1">
                  <Zap size={16} className="text-[#1BAF8A]" />
                  <span className="font-medium text-sm text-[#F0F4FF]">Rápido</span>
                </div>
                <p className="text-xs text-[#4A90C4] leading-relaxed">
                  Um nível geral de 1 a 5 por jogador.
                </p>
              </button>

              <button
                onClick={() => startConfigure('detalhado')}
                className="w-full text-left p-4 rounded-xl border-2 border-[#1E8FD5]/20 bg-[#162844] hover:border-[#1E8FD5] transition-all"
              >
                <div className="flex items-center gap-3 mb-1">
                  <SlidersHorizontal size={16} className="text-[#1E8FD5]" />
                  <span className="font-medium text-sm text-[#F0F4FF]">Detalhado</span>
                </div>
                <p className="text-xs text-[#4A90C4] leading-relaxed">
                  Nota de 1 a 5 em saque, levantamento, ataque, defesa/recepção e movimentação.
                  Equilibra os times pelo conjunto das habilidades, sem depender de posição fixa.
                </p>
              </button>
            </div>
          )}

          {/* ── STEP 3: Configurar jogadores ── */}
          {step === 'configure' && (
            <>
              <div className="px-6 pb-3 shrink-0">
                <p className="text-[#4A90C4] text-sm">
                  <span className="text-[#1BAF8A] font-medium">{players.length}</span> jogadores
                  detectados. Defina o gênero e {modo === 'detalhado' ? 'as habilidades' : 'nível'} de cada um:
                </p>
              </div>

              {/* Lista scrollável */}
              <div className="px-6 overflow-y-auto flex-1 space-y-3 pb-2">
                {players.map((player, idx) => {
                  const incomplete = !isComplete(player, modo);
                  const notasPreenchidas = HABILIDADES.filter(h => player.habilidades[h.key] !== undefined).length;
                  const aberto = expanded === idx;
                  return (
                    <div
                      key={idx}
                      ref={el => { cardRefs.current[idx] = el; }}
                      className={`bg-[#162844] rounded-xl p-4 border transition-colors ${
                        incomplete ? 'border-[#d4183d]/40' : 'border-[#1E8FD5]/20'
                      }`}
                    >
                      {/* Nome + remover */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[#4A90C4]/50 text-xs shrink-0">{idx + 1}.</span>
                          <span className="text-[#F0F4FF] font-medium truncate">{player.nome}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          {incomplete && (
                            <span className="text-[#d4183d] text-xs">Preencha</span>
                          )}
                          <button
                            onClick={() => removeFromList(idx)}
                            className="text-[#4A90C4]/40 hover:text-[#d4183d] active:text-[#d4183d] transition-colors p-1"
                            aria-label={`Remover ${player.nome}`}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Gênero */}
                      <div className="mb-1">
                        <span className={`text-xs mb-2 block ${player.genero === null ? 'text-[#d4183d]/70' : 'text-[#4A90C4]'}`}>
                          Gênero
                        </span>
                        <div className="flex gap-2">
                          {(['M', 'F', 'O'] as const).map(g => {
                            const labels = { M: '♂ Masc', F: '♀ Fem', O: '⚥ Outro' };
                            return (
                              <button
                                key={g}
                                onClick={() => updatePlayer(idx, { genero: g })}
                                className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${
                                  player.genero === g
                                    ? 'bg-gradient-to-r from-[#1BAF8A] to-[#1E8FD5] text-[#0A1628] font-semibold'
                                    : 'bg-[#0D2847] text-[#4A90C4]'
                                }`}
                              >
                                {labels[g]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Nível (modo rápido) */}
                      {modo === 'simples' && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs ${player.nivel === null ? 'text-[#d4183d]/70' : 'text-[#4A90C4]'}`}>
                              Nível
                            </span>
                            <span className={`text-xs font-medium ${player.nivel !== null ? 'text-[#1BAF8A]' : 'text-[#4A90C4]/40'}`}>
                              {player.nivel !== null ? SKILL_LABELS[player.nivel - 1] : 'Selecione'}
                            </span>
                          </div>
                          <div className="flex gap-1.5">
                            {[1, 2, 3, 4, 5].map(lvl => (
                              <button
                                key={lvl}
                                onClick={() => updatePlayer(idx, { nivel: lvl })}
                                className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all ${
                                  player.nivel !== null && lvl <= player.nivel
                                    ? 'bg-gradient-to-t from-[#1BAF8A] to-[#1E8FD5] text-[#0A1628]'
                                    : 'bg-[#0D2847] text-[#4A90C4]/50'
                                }`}
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Habilidades (modo detalhado) */}
                      {modo === 'detalhado' && (
                        <div className="mt-3">
                          <button
                            onClick={() => setExpanded(aberto ? null : idx)}
                            className="w-full flex items-center justify-between py-1"
                            aria-expanded={aberto}
                          >
                            <span className={`text-xs ${notasPreenchidas < HABILIDADES.length ? 'text-[#d4183d]/70' : 'text-[#4A90C4]'}`}>
                              Habilidades
                            </span>
                            <span className="flex items-center gap-1.5 text-xs">
                              <span className={notasPreenchidas === HABILIDADES.length ? 'text-[#1BAF8A] font-medium' : 'text-[#4A90C4]/60'}>
                                {notasPreenchidas}/{HABILIDADES.length}
                              </span>
                              <ChevronDown size={14} className={`text-[#4A90C4] transition-transform ${aberto ? 'rotate-180' : ''}`} />
                            </span>
                          </button>
                          {aberto && (
                            <div className="mt-3">
                              <HabilidadesInput
                                value={player.habilidades}
                                onChange={(key, nota) => updateHabilidade(idx, key, nota)}
                                showMissing
                                showDica={false}
                                onCard
                              />
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

              {/* Botão confirmar */}
              <div className="px-6 pt-3 pb-6 border-t border-[#1E8FD5]/20 shrink-0 space-y-2">
                {incompleteCount > 0 && (
                  <p className="text-center text-xs text-[#d4183d]/80">
                    {incompleteCount} jogador{incompleteCount !== 1 ? 'es' : ''} sem gênero ou {modo === 'detalhado' ? 'habilidades' : 'nível'} definido{incompleteCount !== 1 ? 's' : ''}
                  </p>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !allFilled}
                  className="w-full py-4 bg-[#1BAF8A] hover:bg-[#1BAF8A]/90 disabled:bg-[#162844] disabled:text-[#4A90C4] text-[#0A1628] font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Adicionando...
                    </>
                  ) : (
                    `Adicionar ${players.length} jogador${players.length !== 1 ? 'es' : ''}`
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
