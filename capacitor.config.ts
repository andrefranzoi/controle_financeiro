import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.agiw.controlefinanceiro',
  appName: 'Controle Financeiro',
  webDir: 'dist/browser',
  // Cor do WebView enquanto o app carrega (evita um clarão branco entre a abertura e a primeira tela)
  backgroundColor: '#050908'
};

export default config;
