import { Injectable, signal } from "@angular/core";

export interface Aviso {
  texto: string;
  /** Ação opcional (ex.: "Desfazer"). */
  rotuloAcao?: string;
  acao?: () => void | Promise<void>;
  tipo: "ok" | "erro";
}

/** Aviso rápido embaixo da tela: some sozinho em 5 s (ui-ux-pro-max: toast com ação de desfazer). */
@Injectable({ providedIn: "root" })
export class AvisoService {
  aviso = signal<Aviso | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  mostrar(texto: string, opcoes: { rotuloAcao?: string; acao?: () => void | Promise<void>; tipo?: "ok" | "erro"; duracao?: number } = {}) {
    clearTimeout(this.timer);
    this.aviso.set({ texto, rotuloAcao: opcoes.rotuloAcao, acao: opcoes.acao, tipo: opcoes.tipo ?? "ok" });
    this.timer = setTimeout(() => this.fechar(), opcoes.duracao ?? 5000);
  }

  async executarAcao() {
    const a = this.aviso();
    this.fechar();
    await a?.acao?.();
  }

  fechar() {
    clearTimeout(this.timer);
    this.aviso.set(null);
  }
}
