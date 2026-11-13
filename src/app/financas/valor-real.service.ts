import { Injectable, signal } from "@angular/core";
import { Conta } from "./models";

/** Pergunta o valor real de uma conta de valor variável (luz, água...) na hora de pagar. Resolve com o valor em centavos, ou null se cancelar. */
@Injectable({ providedIn: "root" })
export class ValorRealService {
  conta = signal<Conta | null>(null);
  private resolver?: (valor: number | null) => void;

  pedir(c: Conta): Promise<number | null> {
    this.resolver?.(null); // se já havia um pedido aberto, cancela
    this.conta.set(c);
    return new Promise((ok) => (this.resolver = ok));
  }

  concluir(valor: number | null) {
    this.conta.set(null);
    this.resolver?.(valor);
    this.resolver = undefined;
  }
}
