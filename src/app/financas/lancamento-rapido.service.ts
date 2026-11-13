import { Injectable, signal } from "@angular/core";
import { Tipo } from "./models";

/** Abre/fecha a folha de lançamento rápido (valor + teclado numérico). Qualquer tela pode chamar `abrir()`. */
@Injectable({ providedIn: "root" })
export class LancamentoRapidoService {
  aberto = signal(false);
  tipoInicial = signal<Tipo>("pagar");

  abrir(tipo: Tipo = "pagar") {
    this.tipoInicial.set(tipo);
    this.aberto.set(true);
  }

  fechar() {
    this.aberto.set(false);
  }
}
