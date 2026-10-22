import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Player, NewPlayerPayload, Habilidades } from '../types';
import { NIVEL_LABELS, NIVEL_PADRAO, habilidadesCompletas, habilidadesNeutras, calcularNivel } from '../habilidades';
import { HabilidadesInput } from './HabilidadesInput';
import { SeletorGenero } from './SeletorGenero';
import { SeletorNivel } from './SeletorNivel';
import { NaoConheco } from './NaoConheco';

interface EditPlayerSheetProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: number, payload: NewPlayerPayload) => Promise<void>;
}

export function EditPlayerSheet({ player, isOpen, onClose, onUpdate }: EditPlayerSheetProps) {
  const [nome, setNome] = useState('');
  const [genero, setGenero] = useState<'M' | 'F' | 'O'>('M');
  const [nivel, setNivel] = useState<number | null>(2);
  const [desconhecido, setDesconhecido] = useState(false);
  const [habilidades, setHabilidades] = useState<Partial<Habilidades>>({});
  const [submitting, setSubmitting] = useState(false);

  // O modo do jogador é o da lista: quem tem habilidades é editado no modo detalhado
  const detalhado = !!player?.habilidades;

  useEffect(() => {
    if (player) {
      setNome(player.nome);
      setGenero(player.genero);
      // Quem era "não conheço" abre sem nota: se a pessoa desligar a marca, precisa avaliar de verdade
      setDesconhecido(!!player.desconhecido);
      setNivel(player.desconhecido ? null : player.nivel);
      setHabilidades(player.desconhecido ? {} : (player.habilidades ?? {}));
    }
  }, [player]);

  // Esc fecha o sheet
  useEffect(() => {
    if (!isOpen) return;
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [isOpen, onClose]);

  const detalhadoPronto = !detalhado || desconhecido || habilidadesCompletas(habilidades);
  const nivelPronto = detalhado || desconhecido || nivel !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || submitting || !player || !detalhadoPronto || !nivelPronto) return;
    try {
      setSubmitting(true);
      if (desconhecido) {
        await onUpdate(player.id, {
          nome: nome.trim(), genero, nivel: NIVEL_PADRAO, desconhecido: true,
          ...(detalhado ? { habilidades: habilidadesNeutras() } : {}),
        });
      } else if (detalhado && habilidadesCompletas(habilidades)) {
        await onUpdate(player.id, { nome: nome.trim(), genero, nivel: calcularNivel(habilidades), habilidades, desconhecido: false });
      } else if (nivel !== null) {
        await onUpdate(player.id, { nome: nome.trim(), genero, nivel, desconhecido: false });
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !player) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-editar"
        className="fixed inset-x-0 bottom-0 z-50 bg-[#0D2847] rounded-t-3xl border-t border-[#1E8FD5]/30 shadow-2xl max-h-[92dvh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
      >
        <div className="max-w-md mx-auto p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="w-12 h-1 bg-[#7FB2DC]/40 rounded-full mx-auto mb-4" />

          <div className="flex items-center justify-between mb-4">
            <h2 id="titulo-editar" className="text-[#F0F4FF] text-lg">Editar jogador</h2>
            <button
              onClick={onClose}
              className="text-[#7FB2DC] hover:text-[#F0F4FF] transition-colors min-w-11 min-h-11 -mr-3 flex items-center justify-center"
              aria-label="Fechar"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="campo-nome-editar" className="block text-[#7FB2DC] text-sm mb-2">Nome</label>
              <input
                id="campo-nome-editar"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Fernanda"
                maxLength={60}
                autoCapitalize="words"
                autoComplete="off"
                enterKeyHint="done"
                className="w-full h-12 bg-[#162844] border border-[#1E8FD5]/30 focus:border-[#1E8FD5] rounded-lg px-3 text-[#F0F4FF] outline-none transition-colors placeholder:text-[#7FB2DC]/70"
                disabled={submitting}
              />
            </div>

            <div>
              <p className="text-[#7FB2DC] text-sm mb-3">Gênero</p>
              <SeletorGenero valor={genero} onChange={setGenero} disabled={submitting} />
            </div>

            <NaoConheco ativo={desconhecido} onChange={setDesconhecido} disabled={submitting} />

            {desconhecido ? null : detalhado ? (
              <div>
                <p className="text-[#7FB2DC] text-sm mb-3">Habilidades</p>
                <HabilidadesInput
                  value={habilidades}
                  onChange={(key, nota) => setHabilidades(prev => ({ ...prev, [key]: nota }))}
                  disabled={submitting}
                />
              </div>
            ) : (
              <div>
                <p className="text-[#7FB2DC] text-sm mb-3">
                  Nível: <span className="text-[#1BAF8A]">{nivel !== null ? NIVEL_LABELS[nivel - 1] : 'escolha de 1 a 5'}</span>
                </p>
                <SeletorNivel valor={nivel} onChange={setNivel} disabled={submitting} alto />
              </div>
            )}

            <button
              type="submit"
              disabled={!nome.trim() || submitting || !detalhadoPronto || !nivelPronto}
              className="w-full min-h-14 bg-[#1BAF8A] hover:bg-[#1BAF8A]/90 disabled:bg-[#162844] disabled:text-[#7FB2DC] text-[#0A1628] font-semibold rounded-xl transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Salvando…
                </>
              ) : (
                'Salvar alterações'
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
