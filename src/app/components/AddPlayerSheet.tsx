import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { NewPlayerPayload, Habilidades, ModoClassificacao } from '../types';
import { HABILIDADES, NIVEL_LABELS, NIVEL_PADRAO, habilidadesCompletas, habilidadesNeutras, calcularNivel } from '../habilidades';
import { HabilidadesInput } from './HabilidadesInput';
import { EscolhaModoClassificacao } from './EscolhaModoClassificacao';
import { SeletorGenero } from './SeletorGenero';
import { SeletorNivel } from './SeletorNivel';
import { NaoConheco } from './NaoConheco';

interface AddPlayerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (payload: NewPlayerPayload) => Promise<void>;
  modoLista: ModoClassificacao | null; // modo já definido pela lista; null = lista vazia (usuário escolhe)
}

export function AddPlayerSheet({ isOpen, onClose, onAdd, modoLista }: AddPlayerSheetProps) {
  const [nome, setNome] = useState('');
  // Começam sem escolha: um valor pré-marcado gravaria dado errado se a pessoa só digitasse o nome
  const [genero, setGenero] = useState<'M' | 'F' | 'O' | null>(null);
  const [nivel, setNivel] = useState<number | null>(null);
  const [desconhecido, setDesconhecido] = useState(false); // não conheço: só o gênero é pedido
  // Lista com jogadores: o modo é o da lista. Lista vazia: pergunta antes do formulário.
  const [modoEscolhido, setModoEscolhido] = useState<ModoClassificacao | null>(null);
  const modo = modoLista ?? modoEscolhido;
  const [habilidades, setHabilidades] = useState<Partial<Habilidades>>({});
  const [submitting, setSubmitting] = useState(false);

  // Cada vez que abre com a lista vazia, pergunta o modo de novo
  useEffect(() => {
    if (isOpen) setModoEscolhido(null);
  }, [isOpen]);

  // Esc fecha o sheet
  useEffect(() => {
    if (!isOpen) return;
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [isOpen, onClose]);

  const detalhadoPronto = modo !== 'detalhado' || desconhecido || habilidadesCompletas(habilidades);

  // O que ainda falta para liberar o botão
  const faltas: string[] = [];
  if (!nome.trim()) faltas.push('nome');
  if (genero === null) faltas.push('gênero');
  if (modo === 'simples' && !desconhecido && nivel === null) faltas.push('nível');
  if (modo === 'detalhado' && !detalhadoPronto) {
    faltas.push(`nota em ${HABILIDADES.filter(h => habilidades[h.key] === undefined).map(h => h.label).join(', ')}`);
  }
  const pronto = faltas.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pronto || submitting || genero === null) return;

    try {
      setSubmitting(true);
      if (desconhecido) {
        // Sem nota de verdade: guarda o valor neutro e a marca; o sorteio usa o nível médio da lista
        await onAdd({
          nome: nome.trim(), genero, nivel: NIVEL_PADRAO, desconhecido: true,
          ...(modo === 'detalhado' ? { habilidades: habilidadesNeutras() } : {}),
        });
      } else if (modo === 'detalhado' && habilidadesCompletas(habilidades)) {
        await onAdd({ nome: nome.trim(), genero, nivel: calcularNivel(habilidades), habilidades });
      } else if (nivel !== null) {
        await onAdd({ nome: nome.trim(), genero, nivel });
      }
      // Limpa o formulário depois de salvar
      setNome('');
      setGenero(null);
      setNivel(null);
      setHabilidades({});
      setDesconhecido(false);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Fundo */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-adicionar"
        className="fixed inset-x-0 bottom-0 z-50 bg-[#0D2847] rounded-t-3xl border-t border-[#1E8FD5]/30 shadow-2xl max-h-[92dvh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
      >
        <div className="max-w-md mx-auto p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="w-12 h-1 bg-[#7FB2DC]/40 rounded-full mx-auto mb-4" />

          {/* Cabeçalho */}
          <div className="flex items-center justify-between mb-4">
            <h2 id="titulo-adicionar" className="text-[#F0F4FF] text-lg">Adicionar jogador</h2>
            <button
              onClick={onClose}
              className="text-[#7FB2DC] hover:text-[#F0F4FF] transition-colors min-w-11 min-h-11 -mr-3 flex items-center justify-center"
              aria-label="Fechar"
            >
              <X size={24} />
            </button>
          </div>

          {modo === null ? (
            <div className="space-y-4">
              <p className="text-[#7FB2DC] text-sm">
                Como você quer avaliar os jogadores? A escolha vale para toda a lista.
              </p>
              <EscolhaModoClassificacao onEscolher={setModoEscolhido} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Lista vazia: mostra o tipo escolhido, com atalho para mudar */}
              {modoLista === null && (
                <div className="flex items-center justify-between text-xs text-[#7FB2DC] -mt-2">
                  <span>Avaliação {modo === 'detalhado' ? 'detalhada (5 habilidades)' : 'rápida (nível de 1 a 5)'}</span>
                  <button
                    type="button"
                    onClick={() => setModoEscolhido(null)}
                    className="text-[#1E8FD5] underline underline-offset-2 min-h-11 px-2 -my-2"
                  >
                    Mudar
                  </button>
                </div>
              )}

              {/* Nome */}
              <div>
                <label htmlFor="campo-nome" className="block text-[#7FB2DC] text-sm mb-2">Nome</label>
                <input
                  id="campo-nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Fernanda"
                  maxLength={60}
                  autoCapitalize="words"
                  autoComplete="off"
                  enterKeyHint="done"
                  className="w-full h-12 bg-[#162844] border border-[#1E8FD5]/30 focus:border-[#1E8FD5] rounded-lg px-3 text-[#F0F4FF] outline-none transition-colors placeholder:text-[#7FB2DC]/70"
                  autoFocus
                  disabled={submitting}
                />
              </div>

              {/* Gênero */}
              <div>
                <p className="text-[#7FB2DC] text-sm mb-3">Gênero</p>
                <SeletorGenero valor={genero} onChange={setGenero} disabled={submitting} />
              </div>

              {/* Quem o organizador não conhece */}
              <NaoConheco ativo={desconhecido} onChange={setDesconhecido} disabled={submitting} />

              {/* Nível (rápida) ou habilidades (detalhada) */}
              {desconhecido ? null : modo === 'simples' ? (
                <div>
                  <p className="text-[#7FB2DC] text-sm mb-3">
                    Nível: <span className="text-[#1BAF8A]">{nivel !== null ? NIVEL_LABELS[nivel - 1] : 'escolha de 1 a 5'}</span>
                  </p>
                  <SeletorNivel valor={nivel} onChange={setNivel} disabled={submitting} alto />
                </div>
              ) : (
                <div>
                  <p className="text-[#7FB2DC] text-sm mb-3">Habilidades</p>
                  <HabilidadesInput
                    value={habilidades}
                    onChange={(key, nota) => setHabilidades(prev => ({ ...prev, [key]: nota }))}
                    disabled={submitting}
                  />
                </div>
              )}

              {/* O que falta para liberar o botão */}
              {!pronto && (
                <p className="text-xs text-[#7FB2DC] -mt-3">Falta: {faltas.join(', ')}</p>
              )}

              <button
                type="submit"
                disabled={!pronto || submitting}
                id="btn-confirm-add-player"
                className="w-full min-h-14 bg-[#1BAF8A] hover:bg-[#1BAF8A]/90 disabled:bg-[#162844] disabled:text-[#7FB2DC] text-[#0A1628] font-semibold rounded-xl transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Salvando…
                  </>
                ) : (
                  'Adicionar jogador'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
