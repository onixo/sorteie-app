import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { NewPlayerPayload } from '../types';

interface AddPlayerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (payload: NewPlayerPayload) => Promise<void>;
}

export function AddPlayerSheet({ isOpen, onClose, onAdd }: AddPlayerSheetProps) {
  const [nome, setNome] = useState('');
  const [genero, setGenero] = useState<'M' | 'F' | 'O'>('M');
  const [nivel, setNivel] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  const skillLabels = ['Iniciante', 'Praticante', 'Intermediário', 'Avançado', 'Expert'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || submitting) return;

    try {
      setSubmitting(true);
      await onAdd({ nome: nome.trim(), genero, nivel });
      // Reset form on success
      setNome('');
      setGenero('M');
      setNivel(2);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-[#0D2847] rounded-t-3xl border-t border-[#1E8FD5]/30 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="max-w-md mx-auto p-6">
          {/* Handle Bar */}
          <div className="w-12 h-1 bg-[#4A90C4]/40 rounded-full mx-auto mb-6" />

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[#F0F4FF] text-lg">Adicionar Jogador</h2>
            <button
              onClick={onClose}
              className="text-[#4A90C4] hover:text-[#F0F4FF] transition-colors"
              aria-label="Fechar"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Input */}
            <div>
              <label className="block text-[#4A90C4] text-sm mb-2">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite o nome"
                className="w-full bg-transparent border-b-2 border-[#1E8FD5]/30 focus:border-[#1E8FD5] text-[#F0F4FF] px-2 py-3 outline-none transition-colors placeholder:text-[#4A90C4]/50"
                autoFocus
                disabled={submitting}
              />
            </div>

            {/* Gender Selector */}
            <div>
              <label className="block text-[#4A90C4] text-sm mb-3">Gênero</label>
              <div className="flex gap-2">
                {(['M', 'F', 'O'] as const).map((g) => {
                  const labels = { M: ['♂', 'Masculino'], F: ['♀', 'Feminino'], O: ['⚥', 'Outro'] };
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGenero(g)}
                      disabled={submitting}
                      className={`flex-1 py-3 rounded-lg transition-all text-sm flex items-center justify-center gap-1 ${
                        genero === g
                          ? 'bg-gradient-to-r from-[#1BAF8A] to-[#1E8FD5] text-[#0A1628] font-medium'
                          : 'bg-[#162844] text-[#4A90C4] hover:bg-[#1E8FD5]/10'
                      }`}
                    >
                      <span className="leading-none">{labels[g][0]}</span>
                      <span>{labels[g][1]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Skill Level */}
            <div>
              <label className="block text-[#4A90C4] text-sm mb-3">
                Nível: <span className="text-[#1BAF8A]">{skillLabels[nivel - 1]}</span>
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setNivel(lvl)}
                    disabled={submitting}
                    className={`flex-1 h-16 rounded-lg transition-all relative overflow-hidden ${
                      lvl <= nivel
                        ? 'bg-gradient-to-t from-[#1BAF8A] to-[#1E8FD5]'
                        : 'bg-[#162844]'
                    }`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                      {lvl <= nivel ? (
                        <span className="text-[#0A1628]">{lvl}</span>
                      ) : (
                        <span className="text-[#4A90C4]/50">{lvl}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!nome.trim() || submitting}
              id="btn-confirm-add-player"
              className="w-full py-4 bg-[#1BAF8A] hover:bg-[#1BAF8A]/90 disabled:bg-[#162844] disabled:text-[#4A90C4] text-[#0A1628] font-medium rounded-xl transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                'Adicionar'
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
