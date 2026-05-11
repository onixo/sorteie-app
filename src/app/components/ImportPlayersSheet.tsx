import { useState } from 'react';
import { X, Loader2, ClipboardList, ChevronLeft, Clipboard } from 'lucide-react';
import { NewPlayerPayload } from '../types';

interface ImportPlayersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (payload: NewPlayerPayload) => Promise<void>;
}

interface PendingPlayer {
  nome: string;
  genero: 'M' | 'F' | 'O';
  nivel: number;
}

const SKILL_LABELS = ['Iniciante', 'Intermediário', 'Avançado', 'Expert'];

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

export function ImportPlayersSheet({ isOpen, onClose, onAdd }: ImportPlayersSheetProps) {
  const [step, setStep] = useState<'paste' | 'configure'>('paste');
  const [text, setText] = useState('');
  const [players, setPlayers] = useState<PendingPlayer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [pasteError, setPasteError] = useState(false);

  const handlePasteFromClipboard = async () => {
    try {
      const content = await navigator.clipboard.readText();
      if (content.trim()) setText(content);
      setPasteError(false);
    } catch {
      setPasteError(true);
    }
  };

  const handleParse = () => {
    const names = parsePastedList(text);
    if (names.length === 0) return;
    setPlayers(names.map(nome => ({ nome, genero: 'M', nivel: 2 })));
    setStep('configure');
  };

  const updatePlayer = (index: number, update: Partial<PendingPlayer>) => {
    setPlayers(prev => prev.map((p, i) => (i === index ? { ...p, ...update } : p)));
  };

  const removeFromList = (index: number) => {
    setPlayers(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (submitting || players.length === 0) return;
    try {
      setSubmitting(true);
      for (const player of players) {
        await onAdd(player);
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
            {step === 'configure' ? (
              <button
                onClick={() => setStep('paste')}
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
            <button onClick={handleClose} className="text-[#4A90C4] hover:text-[#F0F4FF] transition-colors">
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

          {/* ── STEP 2: Configurar jogadores ── */}
          {step === 'configure' && (
            <>
              <div className="px-6 pb-3 shrink-0">
                <p className="text-[#4A90C4] text-sm">
                  <span className="text-[#1BAF8A] font-medium">{players.length}</span> jogadores
                  detectados. Defina o gênero e nível de cada um:
                </p>
              </div>

              {/* Lista scrollável */}
              <div className="px-6 overflow-y-auto flex-1 space-y-3 pb-2">
                {players.map((player, idx) => (
                  <div key={idx} className="bg-[#162844] rounded-xl p-4 border border-[#1E8FD5]/20">
                    {/* Nome + remover */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[#F0F4FF] font-medium truncate flex-1 mr-2">{player.nome}</span>
                      <button
                        onClick={() => removeFromList(idx)}
                        className="text-[#4A90C4]/50 hover:text-[#d4183d] transition-colors text-xl leading-none shrink-0"
                        aria-label={`Remover ${player.nome}`}
                      >
                        ×
                      </button>
                    </div>

                    {/* Gênero */}
                    <div className="flex gap-2 mb-3">
                      {(['M', 'F', 'O'] as const).map(g => {
                        const labels = { M: '♂ Masc', F: '♀ Fem', O: '⚥ Outro' };
                        return (
                          <button
                            key={g}
                            onClick={() => updatePlayer(idx, { genero: g })}
                            className={`flex-1 py-2 rounded-lg text-xs transition-all ${
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

                    {/* Nível */}
                    <div className="flex gap-2 items-center">
                      <span className="text-[#4A90C4] text-xs w-12 shrink-0">
                        {SKILL_LABELS[player.nivel - 1]}
                      </span>
                      <div className="flex gap-1.5 flex-1">
                        {[1, 2, 3, 4].map(lvl => (
                          <button
                            key={lvl}
                            onClick={() => updatePlayer(idx, { nivel: lvl })}
                            className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all ${
                              lvl <= player.nivel
                                ? 'bg-gradient-to-t from-[#1BAF8A] to-[#1E8FD5] text-[#0A1628]'
                                : 'bg-[#0D2847] text-[#4A90C4]/50'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botão confirmar */}
              <div className="px-6 pt-3 pb-6 border-t border-[#1E8FD5]/20 shrink-0">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || players.length === 0}
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
