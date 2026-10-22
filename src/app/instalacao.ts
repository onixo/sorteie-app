// Detecção de ambiente para o aviso "Instalar o app".

// iPhone, iPad e iPod. Nos iPads recentes o Safari se identifica como Mac: por isso o teste
// extra de tela de toque.
export function ehIOS(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  if (/iphone|ipad|ipod/i.test(userAgent)) return true;
  return platform === 'MacIntel' && maxTouchPoints > 1;
}

// Já está rodando como app instalado (janela própria, sem a barra do navegador), no
// Android/desktop ou no iOS.
export function emModoApp(): boolean {
  if (typeof window === 'undefined') return false;
  const standaloneIOS = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const modosDeApp = ['standalone', 'minimal-ui', 'fullscreen'];
  return standaloneIOS || modosDeApp.some(m => window.matchMedia(`(display-mode: ${m})`).matches);
}

// Evento do Chrome/Edge/Samsung Internet que permite abrir a janela de instalação por código.
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}
