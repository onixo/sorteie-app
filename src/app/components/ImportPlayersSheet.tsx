import { useState, useRef, useEffect } from 'react';
import { X, Loader2, ClipboardList, ChevronLeft, ChevronDown, Clipboard } from 'lucide-react';
import { NewPlayerPayload, Habilidades, ModoClassificacao, ElencoItem } from '../types';
import { HABILIDADES, habilidadesCompletas, calcularNivel } from '../habilidades';
import { normalizarNome, indexarElenco } from '../elenco';
import { HabilidadesInput } from './HabilidadesInput';
import { GeneroIcon } from './GeneroIcon';
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

const SKILL_LABELS = ['Iniciante', 'Praticante', 'Intermediário', 'Avançado', 'Expert'];

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
  const [removido, setRemovido] = useState<{ player: PendingPlayer; index: number } | null>(null);

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
        setPasteMessage('A área de transferência está vazia. Copie a lista do grupo primeiro.');
      }
    } catch {
      setPasteMessage('O navegador bloqueou o botão Colar. Toque e segure na caixa abaixo e escolha Colar (ou use Ctrl+V).');
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
    setRemovido(null);
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

  // Remove e guarda o jogador por alguns segundos para permitir "Desfazer"
  const removeFromList = (index: number) => {
    const alvo = playersRef.current[index];
    const next = playersRef.current.filter((_, i) => i !== index);
    commitPlayers(next);
    setRemovido({ player: alvo, index });
    if (removidoTimer.current) clearTimeout(removidoTimer.current);
    removidoTimer.current = setTimeout(() => setRemovido(null), DESFAZER_MS);
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

  const desfazerRemocao = () => {
    if (!removido) return;
    const lista = [...playersRef.current];
    lista.splice(Math.min(removido.index, lista.length), 0, removido.player);
    commitPlayers(lista);
    // O cartão aberto que estava depois do ponto de reinserção desloca uma posição
    setExpanded(prev => (prev !== null && prev >= removido.index ? prev + 1 : prev));
    setRemovido(null);
    if (removidoTimer.current) clearTimeout(removidoTimer.current);
  };

  // Duplicados: repetidos dentro da própria importação ou já presentes na lista do app
  const chaves = players.map(p => normalizarNome(p.nome));
  const existentes = new Set(nomesExistentes.map(normalizarNome));
  const aviso = (idx: number): string | null => {
    if (existentes.has(chaves[idx])) return 'já na lista';
    if (chaves.indexOf(chaves[idx]) !== idx || chaves.lastIndexOf(chaves[idx]) !== idx) return 'repetido';
    return null;
  };
  const nomesVazios = players.some(p => p.nome.trim().length === 0);

  const allFilled = players.length > 0 && players.every(p => isComplete(p, modo));
  const incompleteCount = players.filter(p => !isComplete(p, modo)).length;

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
    setRemovido(null);
    if (avancoTimer.current) clearTimeout(avancoTimer.current);
    if (removidoTimer.current) clearTimeout(removidoTimer.current);
    onClose();
  };

  const handleBack = () => {
    if (step === 'configure') setStep(modoLista ? 'preview' : 'modo');
    else if (step === 'modo') setStep('preview');
    else setStep('paste');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={requestClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-[#0D2847] rounded-t-3xl border-t border-[#1E8FD5]/30 shadow-2xl max-h-[96dvh] flex flex-col animate-in slide-in-from-bottom duration-300">
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
                className="text-[#4A90C4] hover:text-[#1E8FD5] flex items-center gap-1 transition-colors min-h-11"
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
            <button
              onClick={requestClose}
              className="text-[#4A90C4] hover:text-[#F0F4FF] transition-colors p-2.5 -m-2.5"
              aria-label="Fechar"
            >
              <X size={24} />
            </button>
          </div>

          {/* Confirmação ao fechar com dados preenchidos */}
          {confirmClose && (
            <div className="mx-6 mb-3 shrink-0 flex items-center justify-between gap-3 bg-[#d4183d]/10 border border-[#d4183d]/40 rounded-xl px-4 py-3">
              <span className="text-sm text-[#ff6b86]">Descartar a importação?</span>
              <div className="flex items-center gap-4 shrink-0">
                <button onClick={() => setConfirmClose(false)} className="text-sm text-[#4A90C4] hover:text-[#F0F4FF] py-2">
                  Continuar
                </button>
                <button onClick={handleClose} className="text-sm text-[#ff6b86] font-medium py-2">
                  Descartar
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 1: Colar lista ── */}
          {step === 'paste' && (
            <div className="px-6 pb-6 flex flex-col gap-4 flex-1 min-h-0">
              <div className="flex items-center justify-between shrink-0">
                <p className="text-[#4A90C4] text-sm">
                  Cole a lista numerada do grupo (ex: do WhatsApp):
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

          {/* Aviso de remoção com opção de desfazer */}
          {removido && step !== 'paste' && (
            <div className="mx-6 mb-2 shrink-0 flex items-center justify-between gap-3 bg-[#1BAF8A]/10 border border-[#1BAF8A]/30 rounded-xl px-4 py-1">
              <span className="text-sm text-[#1BAF8A] truncate">{removido.player.nome} removido.</span>
              <button onClick={desfazerRemocao} className="text-sm font-semibold text-[#1BAF8A] underline underline-offset-2 min-h-11 px-2 shrink-0">
                Desfazer
              </button>
            </div>
          )}

          {/* ── STEP 2: Preview dos nomes (corrigir ou remover antes de classificar) ── */}
          {step === 'preview' && (
            <>
              <div className="px-6 pb-3 shrink-0">
                <p className="text-[#4A90C4] text-sm">
                  <span className="text-[#1BAF8A] font-medium">{players.length}</span> nome{players.length !== 1 ? 's' : ''} detectado{players.length !== 1 ? 's' : ''}.
                  Corrija ou remova o que estiver errado:
                </p>
                {conhecidosNoPreview > 0 && (
                  <p className="text-xs text-[#1BAF8A] mt-1">
                    {conhecidosNoPreview} já {conhecidosNoPreview !== 1 ? 'conhecidos' : 'conhecido'}, {players.length - conhecidosNoPreview} {players.length - conhecidosNoPreview !== 1 ? 'novos' : 'novo'}.
                  </p>
                )}
                {ignoradas > 0 && (
                  <p className="text-xs text-[#4A90C4]/90 mt-1">
                    {ignoradas} linha{ignoradas !== 1 ? 's' : ''} do texto ignorada{ignoradas !== 1 ? 's' : ''} (cabeçalho ou linha vazia).
                  </p>
                )}
              </div>

              <div className="px-6 overflow-y-auto flex-1 space-y-2 pb-2">
                {players.map((player, idx) => {
                  const alerta = aviso(idx);
                  const vazio = player.nome.trim().length === 0;
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 text-right text-xs text-[#4A90C4]/80 shrink-0">{idx + 1}.</span>
                      <input
                        type="text"
                        value={player.nome}
                        maxLength={60}
                        onChange={e => updateNome(idx, e.target.value)}
                        aria-label={`Nome do jogador ${idx + 1}`}
                        className={`flex-1 min-w-0 h-11 bg-[#162844] border rounded-lg px-3 text-sm text-[#F0F4FF] outline-none transition-colors focus:border-[#1E8FD5] ${
                          vazio ? 'border-[#d4183d]/60' : alerta ? 'border-[#E0A526]/50' : 'border-[#1E8FD5]/20'
                        }`}
                      />
                      {alerta ? (
                        <span className="text-[11px] text-[#E0A526] shrink-0">{alerta}</span>
                      ) : indice.has(chaves[idx]) ? (
                        <span className="text-[11px] text-[#1BAF8A] shrink-0">conhecido</span>
                      ) : null}
                      <button
                        onClick={() => removeFromList(idx)}
                        className="text-[#4A90C4]/70 hover:text-[#d4183d] active:text-[#d4183d] transition-colors min-w-11 min-h-11 flex items-center justify-center shrink-0"
                        aria-label={`Remover ${player.nome || 'jogador ' + (idx + 1)}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="px-6 pt-3 pb-6 border-t border-[#1E8FD5]/20 shrink-0 space-y-2">
                {nomesVazios && (
                  <p className="text-center text-xs text-[#ff6b86]">Há nomes vazios. Preencha ou remova.</p>
                )}
                <button
                  onClick={continuarDoPreview}
                  disabled={players.length === 0 || nomesVazios}
                  className="w-full py-4 bg-[#1BAF8A] hover:bg-[#1BAF8A]/90 disabled:bg-[#162844] disabled:text-[#4A90C4] text-[#0A1628] font-medium rounded-xl transition-all disabled:cursor-not-allowed"
                >
                  Continuar com {players.length} jogador{players.length !== 1 ? 'es' : ''}
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: Escolher classificação ── */}
          {step === 'modo' && (
            <div className="px-6 pb-6 flex flex-col gap-4">
              <p className="text-[#4A90C4] text-sm">
                <span className="text-[#1BAF8A] font-medium">{players.length}</span> jogadores
                detectados. Como quer classificar?
              </p>
              {conhecidosNoPreview > 0 && (
                <p className="text-xs text-[#1BAF8A] -mt-2">
                  {conhecidosNoPreview} já {conhecidosNoPreview !== 1 ? 'estão' : 'está'} no elenco e {conhecidosNoPreview !== 1 ? 'vêm preenchidos' : 'vem preenchido'}.
                </p>
              )}

              <EscolhaModoClassificacao onEscolher={startConfigure} />
            </div>
          )}

          {/* ── STEP 4: Configurar jogadores ── */}
          {step === 'configure' && (
            <>
              <div className="px-6 pb-3 shrink-0">
                <p className="text-[#4A90C4] text-sm">
                  <span className="text-[#1BAF8A] font-medium">{players.length}</span> jogadores. Defina o gênero e {modo === 'detalhado' ? 'as habilidades' : 'o nível'}:
                </p>
                {preenchidosDoElenco > 0 && (
                  <p className="text-xs text-[#1BAF8A] mt-1">
                    {preenchidosDoElenco} já {preenchidosDoElenco !== 1 ? 'vêm preenchidos' : 'vem preenchido'} do elenco. Revise se algo mudou.
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
                        incomplete ? 'border-[#d4183d]/40' : 'border-[#1BAF8A]/40'
                      }`}
                    >
                      {/* Nome + remover */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[#4A90C4]/50 text-xs shrink-0">{idx + 1}.</span>
                          <span className="text-[#F0F4FF] font-medium truncate">{player.nome}</span>
                          {temNotaNoElenco(player.nome, modo) && (
                            <span className="text-[10px] text-[#1BAF8A] border border-[#1BAF8A]/40 rounded px-1 shrink-0">conhecido</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          {incomplete && (
                            <span className="text-[#d4183d] text-xs">Preencha</span>
                          )}
                          <button
                            onClick={() => removeFromList(idx)}
                            className="text-[#4A90C4]/60 hover:text-[#d4183d] active:text-[#d4183d] transition-colors p-3 -m-2"
                            aria-label={`Remover ${player.nome}`}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Gênero */}
                      <div role="group" aria-label="Gênero">
                        <div className="flex gap-2">
                          {(['M', 'F', 'O'] as const).map(g => {
                            const labels = { M: 'Masc', F: 'Fem', O: 'Outro' };
                            return (
                              <button
                                key={g}
                                onClick={() => updatePlayer(idx, { genero: g })}
                                className={`flex-1 h-11 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                                  player.genero === g
                                    ? 'bg-gradient-to-r from-[#1BAF8A] to-[#1E8FD5] text-[#0A1628] font-semibold'
                                    : 'bg-[#0D2847] text-[#4A90C4]'
                                }`}
                              >
                                <GeneroIcon genero={g} size={14} decorativo />
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
                                className={`flex-1 h-11 rounded-lg text-sm font-medium transition-all ${
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
                        <div className="mt-1">
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
                                  showMissing
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

              {/* Botão confirmar */}
              <div className="px-6 pt-2 pb-4 border-t border-[#1E8FD5]/20 shrink-0 space-y-1.5">
                {incompleteCount > 0 && (
                  <p className="text-center text-xs text-[#ff6b86]">
                    {incompleteCount} jogador{incompleteCount !== 1 ? 'es' : ''} sem gênero ou {modo === 'detalhado' ? 'habilidades' : 'nível'} definido{incompleteCount !== 1 ? 's' : ''}
                  </p>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !allFilled}
                  className="w-full py-3.5 bg-[#1BAF8A] hover:bg-[#1BAF8A]/90 disabled:bg-[#162844] disabled:text-[#4A90C4] text-[#0A1628] font-medium rounded-xl transition-all flex items-center justify-center gap-2"
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
