import { useState, useEffect } from 'react';
import { Download, Share, X } from 'lucide-react';
import { BeforeInstallPromptEvent, ehIOS, emModoApp } from '../instalacao';

const CHAVE_DISPENSADO = 'sorteie_instalacao_dispensada';

function lerDispensado(): boolean {
  try {
    return localStorage.getItem(CHAVE_DISPENSADO) === '1';
  } catch {
    return false;
  }
}

function lembrarDispensado(): void {
  try {
    localStorage.setItem(CHAVE_DISPENSADO, '1');
  } catch {
    // sem armazenamento: o aviso volta na próxima visita, sem prejuízo
  }
}

// Aviso no topo da lista para instalar o app no celular.
// Android (Chrome, Edge, Samsung): abre a janela de instalação do navegador, o usuário só confirma.
// iPhone (Safari): a Apple não permite abrir a janela por código, então mostra o passo a passo.
// Some quando o app já está instalado (aberto como app, evento 'appinstalled', ou o navegador
// simplesmente deixa de oferecer a instalação) ou quando o usuário dispensa (e não volta a aparecer).
export function InstallBanner() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalado, setInstalado] = useState(emModoApp);
  const [dispensado, setDispensado] = useState(lerDispensado);
  const [mostrarPassos, setMostrarPassos] = useState(false);
  const [ios] = useState(() => ehIOS(navigator.userAgent, navigator.platform, navigator.maxTouchPoints));

  useEffect(() => {
    const aoOferecer = (e: Event) => {
      e.preventDefault(); // guarda o evento e esconde o mini aviso do navegador, usamos o nosso
      setEvento(e as BeforeInstallPromptEvent);
    };
    const aoInstalar = () => {
      setInstalado(true);
      setEvento(null);
    };
    window.addEventListener('beforeinstallprompt', aoOferecer);
    window.addEventListener('appinstalled', aoInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', aoOferecer);
      window.removeEventListener('appinstalled', aoInstalar);
    };
  }, []);

  if (instalado || dispensado) return null;
  if (!evento && !ios) return null;

  const instalar = async () => {
    if (!evento) return;
    try {
      await evento.prompt();
      const { outcome } = await evento.userChoice;
      if (outcome === 'accepted') setInstalado(true);
    } finally {
      setEvento(null); // o evento só vale para um uso
    }
  };

  const dispensar = () => {
    lembrarDispensado();
    setDispensado(true);
  };

  // iPhone: o Safari não informa se o app já foi instalado. Depois que o usuário viu o passo a
  // passo, o aviso não volta nas próximas visitas (o painel segue aberto nesta).
  const alternarPassos = () => {
    setMostrarPassos(v => !v);
    lembrarDispensado();
  };

  return (
    <div className="relative z-10 mx-4 mt-3 bg-[#0F2035] border border-[#1E8FD5]/30 rounded-xl">
      <div className="flex items-center gap-3 pl-3 pr-1 py-2">
        <div className="w-10 h-10 rounded-lg bg-[#1E8FD5]/15 border border-[#1E8FD5]/30 flex items-center justify-center shrink-0">
          <Download size={18} className="text-[#1E8FD5]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[#F0F4FF] text-sm leading-tight">Instalar o app</p>
          <p className="text-[#4A90C4] text-xs mt-0.5 leading-tight">Abre em tela cheia.</p>
        </div>
        {evento ? (
          <button
            onClick={instalar}
            className="px-4 min-h-11 rounded-lg bg-[#1BAF8A] hover:bg-[#1BAF8A]/90 text-[#0A1628] text-sm font-medium shrink-0 transition-colors"
          >
            Instalar
          </button>
        ) : (
          <button
            onClick={alternarPassos}
            aria-expanded={mostrarPassos}
            className="px-3 min-h-11 rounded-lg border border-[#1E8FD5]/40 text-[#1E8FD5] text-sm font-medium shrink-0 transition-colors"
          >
            Como instalar
          </button>
        )}
        <button
          onClick={dispensar}
          aria-label="Dispensar aviso de instalação"
          className="min-w-11 min-h-11 flex items-center justify-center text-[#4A90C4]/70 hover:text-[#F0F4FF] shrink-0 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Passo a passo para iPhone */}
      {!evento && mostrarPassos && (
        <ol className="px-4 pb-3 pt-1 space-y-1.5 text-xs text-[#4A90C4] list-decimal list-inside border-t border-[#1E8FD5]/15">
          <li className="pt-2">
            Toque em <Share size={12} className="inline -mt-0.5 text-[#1E8FD5]" /> <span className="text-[#F0F4FF]">Compartilhar</span>, na barra do Safari.
          </li>
          <li>
            Escolha <span className="text-[#F0F4FF]">Adicionar à Tela de Início</span>.
          </li>
          <li>
            Toque em <span className="text-[#F0F4FF]">Adicionar</span>.
          </li>
        </ol>
      )}
    </div>
  );
}
