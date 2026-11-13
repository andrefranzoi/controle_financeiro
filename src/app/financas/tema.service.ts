import { Injectable, signal } from "@angular/core";

const CHAVE = "tema_controle_financeiro";

/** Tema claro/escuro. Começa no escuro premium e lembra a escolha do usuário. */
@Injectable({ providedIn: "root" })
export class TemaService {
  escuro = signal(false);

  constructor() {
    let salvo: string | null = null;
    try {
      salvo = localStorage.getItem(CHAVE);
    } catch {
      /* armazenamento indisponível: usa o tema do aparelho */
    }
    // Padrão do app: tema escuro premium. Quem escolher o claro no botão do topo fica com o claro.
    this.aplicar(salvo ? salvo === "dark" : true);
  }

  alternar() {
    const escuro = !this.escuro();
    this.aplicar(escuro);
    try {
      localStorage.setItem(CHAVE, escuro ? "dark" : "light");
    } catch {
      /* sem persistência: vale só nesta sessão */
    }
  }

  private aplicar(escuro: boolean) {
    this.escuro.set(escuro);
    // Mesmo mecanismo do template: a classe "app-dark" liga o tema escuro do PrimeNG e do Tailwind.
    document.documentElement.classList.toggle("app-dark", escuro);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", escuro ? "#022c22" : "#059669");
  }
}
