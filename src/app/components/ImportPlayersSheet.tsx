import { useState, useRef, useEffect } from 'react';
import { X, Loader2, ClipboardList, ChevronLeft, ChevronDown, Clipboard } from 'lucide-react';
import { NewPlayerPayload, Habilidades, ModoClassificacao, ElencoItem } from '../types';
import { HABILIDADES, NIVEL_LABELS, habilidadesCompletas, calcularNivel } from '../habilidades';
import { normalizarNome, indexarElenco } from '../elenco';
import { HabilidadesInput } from './HabilidadesInput';
import { SeletorGenero } from './SeletorGenero';
import { SeletorNivel } from './SeletorNivel';
import { EscolhaModoClassificacao } from './EscolhaModoClassificacao';

interface ImportPlayersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMany: (payloads: NewPlayerPayload[]) => Promise<number>; // retorna quantos foram salvos
  modoLista: ModoClassificacao | null; // modo já definido pela lista; null = lista vazia (usuário escolhe)
  nomesExistentes: string[]; // nomes já na lista, para avisar de duplicados no preview
  elenco: ElencoItem[]; // jogadores já avaliados em semanas anteriores
}

interface PendingPlayer {
  nome: string;
  genero: 'M' | 'F' | 'O' | null;
  nivel: number | null;
  habilidades: Partial<Habilidades>;
  preenchidoModo?: ModoClassificacao; // modo em que o elenco já foi aplicado a este jogador
}

type Step = 'paste' | 'preview' | 'modo' | 'configure';

// Animação de abrir/fechar o cartão e pausa antes de avançar para o próximo jogador
const ANIMACAO_MS = 300;
const PAUSA_AVANCO_MS = 450;

// Tempo que o aviso "Desfazer" fica na tela após remover um jogador
const DESFAZER_MS = 6000;

const plural = (n: number, singular: string, pluralForma: string) => (n === 1 ? singular : pluralForma);

// Prefixo de numeração: "1.", "1)", "1 -", "1:", "1 " e "1️⃣" (emoji keycap do WhatsApp)
const PREFIXO_NUMERADO = /^\d+[\uFE0F\u20E3]*(?:\s*[.)\-:]\s*|\s+)/;

function parsePastedList(text: string): string[] {
  const linhas = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Se a lista é numerada, linhas sem numeração (cabeçalho como "Vôlei quinta 20h") são ignoradas
  const numeradas = linhas.filter(line => PREFIXO_NUMERADO.test(line)).length;
  const base = numeradas >= 2 ? linhas.filter(line => PREFIXO_NUMERADO.test(line)) : linhas;

  return base
    .map(line =>
      line
        .replace(PREFIXO_NUMERADO, '')      // remove o número inicial
        .replace(/[^\p{L}\p{N}\s]/gu, '')   // remove emojis e símbolos
        .replace(/\s+/g, ' ')               // normaliza espaços
        .trim()
    )
    .filter(name => name.length > 0 && name.length <= 60);
}

function isComplete(p: PendingPlayer, modo: ModoClassificacao): boolean {
  if (p.genero === null) return false;
  return modo === 'detalhado' ? habilidadesCompletas(p.habilidades) : p.nivel !== null;
}

export function ImportPlayersSheet({ isOpen, onClose, onAddMany, modoLista, nomesExistentes, elenco }: ImportPlayersSheetProps) {
  const [step, setStep] = useState<Step>('paste');
  const [modo, setModo] = useState<ModoClassificacao>('simples');
  const [text, setText] = useState('');
  const [players, setPlayers] = useState<PendingPlayer[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pasteMessage, setPasteMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Cópia síncrona da lista: toques em sequência rápida não sobrescrevem um ao outro
  const playersRef = useRef<PendingPlayer[]>([]);
  const avancoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removidoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ignoradas, setIgnoradas] = useState(0);
  // Último ajuste que ainda pode ser desfeito (tirar um nome ou tirar os repetidos)
  const [desfazer, setDesfazer] = useState<{ mensagem: string; restaurar: () => void } | null>(null);

  const commitPlayers = (next: PendingPlayer[]) => {
    playersRef.current = next;
    setPlayers(next);
  };

  // Rola até o jogador aberto só depois que a animação de altura termina; antes disso
  // o cartão anterior ainda está recolhendo e a posição calculada ficaria errada.
  useEffect(() => {
    if (expanded === null || step !== 'configure') return;
    const id = setTimeout(() => {
      cardRefs.current[expanded]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, ANIMACAO_MS + 20);
    return () => clearTimeout(id);
  }, [expanded, step]);

  // Limpa os timers agendados ao desmontar
  useEffect(() => () => {
    if (avancoTimer.current) clearTimeout(avancoTimer.current);
    if (removidoTimer.current) clearTimeout(removidoTimer.current);
  }, []);

  // O navegador pode negar a leitura da área de transferência (permissão bloqueada ou API
  // indisponível). Nesse caso o campo recebe o foco e o usuário cola direto nele.
  const handlePasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.readText) throw new Error('clipboard-indisponivel');
      const content = await navigator.clipboard.readText();
      if (content.trim()) {
        setText(content);
        setPasteMessage(null);
      } else {
        setPasteMessage('Nada copiado ainda. Copie a lista no WhatsApp e toque em Colar.');
      }
    } catch {
      setPasteMessage('Não deu para colar sozinho. Toque e segure na caixa abaixo e escolha Colar.');
      textareaRef.current?.focus();
    }
  };

  // Preenche com o elenco quem já foi avaliado, sem sobrescrever o que o usuário já mexeu.
  // Modo detalhado só aproveita as 5 notas se existirem no elenco (senão, só o gênero).
  const startConfigure = (m: ModoClassificacao) => {
    const preenchidos = playersRef.current.map(p => {
      if (p.preenchidoModo === m) return p;
      const item = indice.get(normalizarNome(p.nome));
      if (!item) return { ...p, preenchidoModo: m };
      return {
        ...p,
        preenchidoModo: m,
        genero: p.genero ?? item.genero,
        nivel: m === 'simples' ? (p.nivel ?? item.nivel) : p.nivel,
        habilidades:
          m === 'detalhado' && Object.keys(p.habilidades).length === 0 && item.habilidades
            ? { ...item.habilidades }
            : p.habilidades,
      };
    });
    commitPlayers(preenchidos);
    setModo(m);
    const primeiroIncompleto = preenchidos.findIndex(p => !isComplete(p, m));
    setExpanded(m === 'detalhado' && primeiroIncompleto !== -1 ? primeiroIncompleto : null);
    setStep('configure');
  };

  const handleParse = () => {
    const names = parsePastedList(text);
    if (names.length === 0) return;
    commitPlayers(names.map(nome => ({ nome, genero: null, nivel: null, habilidades: {} })));
    // Informa quantas linhas do texto não viraram nome (cabeçalho, linhas vazias)
    const linhasComTexto = text.split('\n').filter(l => l.trim().length > 0).length;
    setIgnoradas(Math.max(0, linhasComTexto - names.length));
    setDesfazer(null);
    setStep('preview');
  };

  // Do preview segue para a classificação. Lista que já tem modo pula a escolha.
  const continuarDoPreview = () => {
    if (modoLista) startConfigure(modoLista);
    else setStep('modo');
  };

  const updateNome = (index: number, nome: string) => {
    commitPlayers(playersRef.current.map((p, i) => (i === index ? { ...p, nome } : p)));
  };

  const updatePlayer = (index: number, update: Partial<PendingPlayer>) => {
    const atual = playersRef.current[index];
    const novo = { ...atual, ...update };
    const next = playersRef.current.map((p, i) => (i === index ? novo : p));
    commitPlayers(next);

    // Modo detalhado: ao completar um jogador, abre o próximo incompleto. Há uma pausa curta
    // para a última nota ficar visível antes de recolher, e só avança se o cartão
    // ainda for o aberto (toque manual no meio do caminho tem prioridade).
    if (modo === 'detalhado' && !isComplete(atual, modo) && isComplete(novo, modo)) {
      let proximo: number | null = null;
      for (let k = 1; k < next.length; k++) {
        const i = (index + k) % next.length;
        if (!isComplete(next[i], modo)) { proximo = i; break; }
      }
      if (avancoTimer.current) clearTimeout(avancoTimer.current);
      avancoTimer.current = setTimeout(() => {
        setExpanded(prev => (prev === index ? proximo : prev));
      }, PAUSA_AVANCO_MS);
    }
  };

  const updateHabilidade = (index: number, key: keyof Habilidades, nota: number) => {
    updatePlayer(index, { habilidades: { ...playersRef.current[index].habilidades, [key]: nota } });
  };

  // Mostra o aviso com "Desfazer" por alguns segundos
  const mostrarDesfazer = (mensagem: string, restaurar: () => void) => {
    setDesfazer({ mensagem, restaurar });
    if (removidoTimer.current) clearTimeout(removidoTimer.current);
    removidoTimer.current = setTimeout(() => setDesfazer(null), DESFAZER_MS);
  };

  // Tira o jogador da fila e guarda por alguns segundos para permitir "Desfazer"
  const removeFromList = (index: number) => {
    const alvo = playersRef.current[index];
    const next = playersRef.current.filter((_, i) => i !== index);
    commitPlayers(next);
    mostrarDesfazer(`${alvo.nome.trim() || 'Nome em branco'} saiu da lista.`, () => {
      const lista = [...playersRef.current];
      lista.splice(Math.min(index, lista.length), 0, alvo);
      commitPlayers(lista);
      // O cartão aberto que estava depois do ponto de reinserção desloca uma posição
      setExpanded(prev => (prev !== null && prev >= index ? prev + 1 : prev));
    });
    // Removeu o cartão aberto: abre o próximo incompleto para manter o ritmo
    setExpanded(prev => {
      if (prev === null) return null;
      if (prev > index) return prev - 1;
      if (prev < index) return prev;
      if (modo !== 'detalhado') return null;
      const proximo = next.findIndex((p, i) => i >= index && !isComplete(p, modo));
      return proximo === -1 ? null : proximo;
    });
  };

  // Elenco: quem tem nota guardada para o modo atual (ou para o modo escolhido)
  const indice = indexarElenco(elenco);
  const temNotaNoElenco = (nome: string, m: ModoClassificacao): boolean => {
    const item = indice.get(normalizarNome(nome));
    return !!item && (m === 'simples' || !!item.habilidades);
  };

  const conhecidosNoPreview = players.filter(p => indice.has(normalizarNome(p.nome))).length;
  const preenchidosDoElenco = players.filter(p => temNotaNoElenco(p.nome, modo)).length;

  const aplicarDesfazer = () => {
    if (!desfazer) return;
    desfazer.restaurar();
    setDesfazer(null);
    if (removidoTimer.current) clearTimeout(removidoTimer.current);
  };

  // Duplicados: repetidos dentro da própria importação ou já presentes na lista do app
  const chaves = players.map(p => normalizarNome(p.nome));
  const existentes = new Set(nomesExistentes.map(normalizarNome));
  const aviso = (idx: number): string | null => {
    if (existentes.has(chaves[idx])) return 'já está na lista';
    if (chaves.indexOf(chaves[idx]) !== idx || chaves.lastIndexOf(chaves[idx]) !== idx) return 'nome repetido';
    return null;
  };
  const nomesVazios = players.some(p => p.nome.trim().length === 0);

  // O que ficaria duplicado: nomes que já estão na lista e, entre os repetidos da própria
  // importação, todas as ocorrências depois da primeira
  const indicesRepetidos = players.map((_, i) => i).filter(i => existentes.has(chaves[i]) || chaves.indexOf(chaves[i]) !== i);
  const removerRepetidos = () => {
    const antes = playersRef.current;
    const n = indicesRepetidos.length;
    commitPlayers(antes.filter((_, i) => !indicesRepetidos.includes(i)));
    setExpanded(null);
    mostrarDesfazer(`${n} ${plural(n, 'nome repetido saiu', 'nomes repetidos saíram')} da importação.`, () => commitPlayers(antes));
  };

  const allFilled = players.length > 0 && players.every(p => isComplete(p, modo));
  const incompleteCount = players.filter(p => !isComplete(p, modo)).length;
  const prontos = players.length - incompleteCount;

  const handleSubmit = async () => {
    if (submitting || !allFilled) return;
    try {
      setSubmitting(true);
      const payloads: NewPlayerPayload[] = players.map(player => {
        const base = { nome: player.nome, genero: player.genero as 'M' | 'F' | 'O' };
        return modo === 'detalhado' && habilidadesCompletas(player.habilidades)
          ? { ...base, nivel: calcularNivel(player.habilidades), habilidades: player.habilidades }
          : { ...base, nivel: player.nivel as number };
      });
      const salvos = await onAddMany(payloads);
      if (salvos === payloads.length) {
        handleClose();
      } else {
        // Falha parcial: tira da fila os já salvos para o reenvio não duplicar
        commitPlayers(playersRef.current.slice(salvos));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Há algo digitado ou preenchido que se perderia ao fechar?
  const temDados =
    text.trim() !== '' ||
    players.some(p => p.genero !== null || p.nivel !== null || Object.keys(p.habilidades).length > 0);

  const requestClose = () => {
    if (temDados && !submitting) setConfirmClose(true);
    else handleClose();
  };

  const handleClose = () => {
    setStep('paste');
    setText('');
    commitPlayers([]);
    setExpanded(null);
    setConfirmClose(false);
    setPasteMessage(null);
    setDesfazer(null);
    if (avancoTimer.current) clearTimeout(avancoTimer.current);
    if (removidoTimer.current) clearTimeout(removidoTimer.current);
    onClose();
  };

  const handleBack = () => {
    if (step === 'configure') setStep(modoLista ? 'preview' : 'modo');
    else if (step === 'modo') setStep('preview');
    else setStep('paste');
  };

  // Esc fecha, pedindo confirmação se houver algo preenchido
  useEffect(() => {
    if (!isOpen) return;
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose(); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  });

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={requestClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Importar lista do WhatsApp"
        className="fixed inset-x-0 bottom-0 z-50 bg-[#0D2847] rounded-t-3xl border-t border-[#1E8FD5]/30 shadow-2xl max-h-[96dvh] flex flex-col animate-in slide-in-from-bottom duration-300"
      >
        <div className="max-w-md mx-auto w-full flex flex-col flex-1 min-h-0">

          {/* Handle */}
          <div className="pt-3 pb-1 flex justify-center shrink-0">
            <div className="w-12 h-1 bg-[#4A90C4]/40 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-6 pb-2 flex items-center justify-between shrink-0">
            {step !== 'paste' ? (
              <button
                onClick={handleBack}
                className="text-[#7FB2DC] hover:text-[#1E8FD5] flex items-center gap-1 transition-colors min-h-11"
              >
                <ChevronLeft size={20} />
                Voltar
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <ClipboardList size={20} className="text-[#1BAF8A]" />
                <h2 className="text-[#F0F4FF]">Importar lista</h2>
              </div>
            )}
            <button
              onClick={requestClose}
              className="text-[#7FB2DC] hover:text-[#F0F4FF] transition-colors p-2.5 -m-2.5"
              aria-label="Fechar"
            >
              <X size={24} />
            </button>
          </div>

          {/* Confirmação ao fechar com dados preenchidos */}
          {confirmClose && (
            <div className="mx-6 mb-3 shrink-0 flex items-center justify-between gap-3 bg-[#d4183d]/10 border border-[#d4183d]/40 rounded-xl px-4 py-3">
              <span className="text-sm text-[#ff6b86]">Descartar o que você preencheu?</span>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setConfirmClose(false)} className="text-sm text-[#7FB2DC] hover:text-[#F0F4FF] min-h-11 px-2">
                  Continuar editando
                </button>
                <button onClick={handleClose} className="text-sm text-[#ff6b86] font-medium min-h-11 px-2">
                  Descartar
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 1: Colar lista ── */}
          {step === 'paste' && (
            <div className="px-6 pb-6 flex flex-col gap-4 flex-1 min-h-0">
              <div className="flex items-center justify-between shrink-0">
                <p className="text-[#7FB2DC] text-sm">
                  Cole a lista de nomes do grupo, um por linha.
                </p>
                <button
                  onClick={handlePasteFromClipboard}
                  className="flex items-center gap-1.5 px-3 min-h-11 bg-[#1E8FD5]/10 hover:bg-[#1E8FD5]/20 border border-[#1E8FD5]/30 text-[#1E8FD5] rounded-lg text-sm transition-all shrink-0"
                >
                  <Clipboard size={14} />
                  Colar
                </button>
              </div>
              {pasteMessage && (
                <p role="status" className="text-[#E0A526] text-xs -mt-2 shrink-0">
                  {pasteMessage}
                </p>
              )}
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => { setText(e.target.value); setPasteMessage(null); }}
                placeholder={"1. Fernanda\n2. Lucas\n3. Beatriz\n4. Rodrigo\n5. Camila\n..."}
                className="flex-1 min-h-[200px] bg-[#162844] border border-[#1E8FD5]/30 focus:border-[#1E8FD5] rounded-xl p-4 text-[#F0F4FF] text-sm outline-none resize-none placeholder:text-[#7FB2DC]/70 leading-relaxed"
              />
              <button
                onClick={handleParse}
                disabled={!text.trim()}
                className="w-full py-4 bg-[#1BAF8A] hover:bg-[#1BAF8A]/90 disabled:bg-[#162844] disabled:text-[#7FB2DC] text-[#0A1628] font-medium rounded-xl transition-all disabled:cursor-not-allowed shrink-0"
              >
                Continuar
              </button>
            </div>
          )}

          {/* Aviso com opção de desfazer */}
          {desfazer && step !== 'paste' && (
            <div role="status" className="mx-6 mb-2 shrink-0 flex items-center justify-between gap-3 bg-[#1BAF8A]/10 border border-[#1BAF8A]/30 rounded-xl px-4 py-1">
              <span className="text-sm text-[#1BAF8A] truncate">{desfazer.mensagem}</span>
              <button onClick={aplicarDesfazer} className="text-sm font-semibold text-[#1BAF8A] underline underline-offset-2 min-h-11 px-2 shrink-0">
                Desfazer
              </button>
            </div>
          )}

          {/* ── STEP 2: Preview dos nomes (corrigir ou tirar antes de avaliar) ── */}
          {step === 'preview' && (
            <>
              <div className="px-6 pb-3 shrink-0">
                <p className="text-[#7FB2DC] text-sm">
                  Encontramos <span className="text-[#1BAF8A] font-medium">{players.length}</span> {plural(players.length, 'nome', 'nomes')}.
                  Corrija ou tire os que estiverem errados.
                </p>
                {conhecidosNoPreview > 0 && (
                  <p className="text-xs text-[#1BAF8A] mt-1">
                    {conhecidosNoPreview} {plural(conhecidosNoPreview, 'já foi avaliado', 'já foram avaliados')} de outras vezes, {players.length - conhecidosNoPreview} {plural(players.length - conhecidosNoPreview, 'novo', 'novos')}.
                  </p>
                )}
                {ignoradas > 0 && (
                  <p className="text-xs text-[#7FB2DC] mt-1">
                    {ignoradas} {plural(ignoradas, 'linha ignorada', 'linhas ignoradas')} (título ou texto que não é nome).
                  </p>
                )}
                {indicesRepetidos.length > 0 && (
                  <div className="mt-2 flex items-center justify-between gap-3 bg-[#E0A526]/10 border border-[#E0A526]/30 rounded-xl pl-4 pr-2">
                    <p className="text-xs text-[#E0A526] py-2">
                      {indicesRepetidos.length} {plural(indicesRepetidos.length, 'nome já está na lista ou aparece repetido e vai ficar duplicado.', 'nomes já estão na lista ou aparecem repetidos e vão ficar duplicados.')}
                    </p>
                    <button onClick={removerRepetidos} className="text-sm font-medium text-[#E0A526] underline underline-offset-2 min-h-11 px-2 shrink-0">
                      Tirar repetidos
                    </button>
                  </div>
                )}
              </div>

              <div className="px-6 overflow-y-auto flex-1 space-y-2 pb-2">
                {players.map((player, idx) => {
                  const alerta = aviso(idx);
                  const vazio = player.nome.trim().length === 0;
                  return (
                    <div key={idx}>
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-right text-xs text-[#7FB2DC] shrink-0">{idx + 1}.</span>
                        <input
                          type="text"
                          value={player.nome}
                          maxLength={60}
                          autoCapitalize="words"
                          autoComplete="off"
                          onChange={e => updateNome(idx, e.target.value)}
                          aria-label={`Nome do jogador ${idx + 1}`}
                          className={`flex-1 min-w-0 h-11 bg-[#162844] border rounded-lg px-3 text-sm text-[#F0F4FF] outline-none transition-colors focus:border-[#1E8FD5] ${
                            vazio ? 'border-[#d4183d]/60' : alerta ? 'border-[#E0A526]/50' : 'border-[#1E8FD5]/20'
                          }`}
                        />
                        <button
                          onClick={() => removeFromList(idx)}
                          className="text-[#7FB2DC] hover:text-[#ff6b86] active:text-[#ff6b86] transition-colors min-w-11 min-h-11 flex items-center justify-center shrink-0"
                          aria-label={`Tirar ${player.nome.trim() || 'jogador ' + (idx + 1)} da lista`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      {/* O aviso fica embaixo do campo, para o campo não mudar de largura */}
                      {(alerta || indice.has(chaves[idx])) && (
                        <p className={`ml-8 mt-1 text-xs ${alerta ? 'text-[#E0A526]' : 'text-[#1BAF8A]'}`}>
                          {alerta ?? 'já avaliado'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] border-t border-[#1E8FD5]/20 shrink-0 space-y-2">
                {nomesVazios && (
                  <p className="text-center text-xs text-[#ff6b86]">Tem nome em branco. Preencha ou tire da lista.</p>
                )}
                <button
                  onClick={continuarDoPreview}
                  disabled={players.length === 0 || nomesVazios}
                  className="w-full min-h-14 bg-[#1BAF8A] hover:bg-[#1BAF8A]/90 disabled:bg-[#162844] disabled:text-[#7FB2DC] text-[#0A1628] font-semibold rounded-xl transition-all disabled:cursor-not-allowed"
                >
                  Continuar com {players.length} {plural(players.length, 'jogador', 'jogadores')}
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: Como avaliar ── */}
          {step === 'modo' && (
            <div className="px-6 pb-6 flex flex-col gap-4">
              <p className="text-[#7FB2DC] text-sm">
                Como você quer avaliar os <span className="text-[#1BAF8A] font-medium">{players.length}</span> {plural(players.length, 'jogador', 'jogadores')}?
                A escolha vale para toda a lista.
              </p>
              {conhecidosNoPreview > 0 && (
                <p className="text-xs text-[#1BAF8A] -mt-2">
                  {conhecidosNoPreview} {plural(conhecidosNoPreview, 'já foi avaliado antes e vem preenchido', 'já foram avaliados antes e vêm preenchidos')}.
                </p>
              )}

              <EscolhaModoClassificacao onEscolher={startConfigure} />
            </div>
          )}

          {/* ── STEP 4: Configurar jogadores ── */}
          {step === 'configure' && (
            <>
              <div className="px-6 pb-3 shrink-0">
                <p className="text-[#7FB2DC] text-sm">
                  Marque o gênero e {modo === 'detalhado' ? 'as notas' : 'o nível'} de cada um:
                </p>
                {preenchidosDoElenco > 0 && (
                  <p className="text-xs text-[#1BAF8A] mt-1">
                    {preenchidosDoElenco} {plural(preenchidosDoElenco, 'já vem preenchido (avaliado antes)', 'já vêm preenchidos (avaliados antes)')}. Confira se algo mudou.
                  </p>
                )}
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
                      className={`bg-[#162844] rounded-xl p-3 border transition-colors duration-300 ${
                        incomplete ? 'border-[#1E8FD5]/20' : 'border-[#1BAF8A]/40'
                      }`}
                    >
                      {/* Nome + remover */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[#7FB2DC] text-xs shrink-0">{idx + 1}.</span>
                          <span className="text-[#F0F4FF] font-medium truncate">{player.nome}</span>
                          {temNotaNoElenco(player.nome, modo) && (
                            <span className="text-xs text-[#1BAF8A] border border-[#1BAF8A]/40 rounded px-1.5 py-0.5 shrink-0">já avaliado</span>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromList(idx)}
                          className="text-[#7FB2DC] hover:text-[#ff6b86] active:text-[#ff6b86] transition-colors min-w-11 min-h-11 -my-2 -mr-3 flex items-center justify-center shrink-0"
                          aria-label={`Tirar ${player.nome} da lista`}
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Gênero */}
                      <SeletorGenero valor={player.genero} onChange={g => updatePlayer(idx, { genero: g })} sobre="cartao" compacto />

                      {/* Nível (avaliação rápida) */}
                      {modo === 'simples' && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-[#7FB2DC]">Nível</span>
                            <span className={`text-xs font-medium ${player.nivel !== null ? 'text-[#1BAF8A]' : 'text-[#7FB2DC]'}`}>
                              {player.nivel !== null ? NIVEL_LABELS[player.nivel - 1] : 'Sem nível'}
                            </span>
                          </div>
                          <SeletorNivel valor={player.nivel} onChange={lvl => updatePlayer(idx, { nivel: lvl })} sobre="cartao" />
                        </div>
                      )}

                      {/* Habilidades (modo detalhado) */}
                      {modo === 'detalhado' && (
                        <div className="mt-1">
                          <button
                            onClick={() => setExpanded(aberto ? null : idx)}
                            className="w-full flex items-center justify-between py-1"
                            aria-expanded={aberto}
                          >
                            <span className="text-xs text-[#7FB2DC]">
                              Habilidades
                            </span>
                            <span className="flex items-center gap-1.5 text-xs">
                              <span className={notasPreenchidas === HABILIDADES.length ? 'text-[#1BAF8A] font-medium' : 'text-[#7FB2DC]'}>
                                {notasPreenchidas}/{HABILIDADES.length}
                              </span>
                              <ChevronDown size={14} className={`text-[#7FB2DC] transition-transform ${aberto ? 'rotate-180' : ''}`} />
                            </span>
                          </button>
                          {/* Abre/fecha animando a altura (grid 0fr/1fr); fechado fica inerte */}
                          <div
                            aria-hidden={!aberto}
                            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                              aberto ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                            }`}
                          >
                            <div className="overflow-hidden min-h-0">
                              <div className="pt-2">
                                <HabilidadesInput
                                  value={player.habilidades}
                                  onChange={(key, nota) => updateHabilidade(idx, key, nota)}
                                  disabled={!aberto}
                                  showDica={false}
                                  onCard
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

              {/* Progresso e botão de adicionar */}
              <div className="px-6 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-[#1E8FD5]/20 shrink-0 space-y-1.5">
                {players.length > 0 && (
                  <div>
                    <p className="text-center text-xs text-[#7FB2DC] mb-1.5">{prontos} de {players.length} {plural(players.length, 'pronto', 'prontos')}</p>
                    <div className="h-1 rounded-full bg-[#7FB2DC]/20 overflow-hidden">
                      <div className="h-full bg-[#1BAF8A] transition-all duration-300" style={{ width: `${players.length > 0 ? (prontos / players.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !allFilled}
                  className="w-full min-h-14 bg-[#1BAF8A] hover:bg-[#1BAF8A]/90 disabled:bg-[#162844] disabled:text-[#7FB2DC] text-[#0A1628] font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Adicionando…
                    </>
                  ) : (
                    `Adicionar ${players.length} ${plural(players.length, 'jogador', 'jogadores')}`
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
