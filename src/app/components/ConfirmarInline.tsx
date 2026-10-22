interface ConfirmarInlineProps {
  texto: string;
  confirmar: string;          // ex: "Tirar todos"
  ocupado?: boolean;
  ocupadoTexto?: string;      // ex: "Limpando…"
  onConfirmar: () => void;
  onCancelar: () => void;
}

// Caixa de confirmação para ações que apagam algo. Mesmo visual e alvos de toque de 44 px
// nas três confirmações da lista (limpar lista, mudar avaliação, apagar notas salvas).
export function ConfirmarInline({ texto, confirmar, ocupado, ocupadoTexto, onConfirmar, onCancelar }: ConfirmarInlineProps) {
  return (
    <div role="alertdialog" aria-label={texto} className="mt-2 bg-[#d4183d]/10 border border-[#d4183d]/40 rounded-xl px-4 py-3">
      <p className="text-sm text-[#ff6b86] mb-1">{texto}</p>
      <div className="flex items-center justify-end gap-4">
        <button
          onClick={onCancelar}
          className="text-sm text-[#7FB2DC] hover:text-[#F0F4FF] min-h-11 px-2"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirmar}
          disabled={ocupado}
          className="text-sm text-[#ff6b86] font-medium min-h-11 px-2"
        >
          {ocupado ? (ocupadoTexto ?? confirmar) : confirmar}
        </button>
      </div>
    </div>
  );
}
