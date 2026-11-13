import { Injectable, signal } from "@angular/core";

/** Estado do menu lateral: qualquer tela abre pelo botão de menu; o próprio menu fecha ao navegar. */
@Injectable({ providedIn: "root" })
export class MenuService {
  aberto = signal(false);

  abrir() {
    this.aberto.set(true);
  }

  fechar() {
    this.aberto.set(false);
  }
}
