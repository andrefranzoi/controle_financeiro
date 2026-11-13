import { Component, HostListener, effect, input, output, signal, untracked } from "@angular/core";
import { vibrar } from "./feedback";

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Teclado de PIN: bolinhas que se preenchem + teclado numérico grande.
 * Avisa `completo` quando o último dígito é digitado; quem usa chama `limpar(true)` se o PIN estiver errado (tremor + vibração).
 */
@Component({
  selector: "app-pin-pad",
  template: `
    <div class="flex flex-col items-center gap-6">
      <div class="flex h-6 items-center gap-3.5" [class.tremer]="tremendo()" role="img" [attr.aria-label]="digitos().length + ' de ' + tamanho() + ' dígitos'">
        @for (p of posicoes(); track $index) {
          <span
            class="h-3.5 w-3.5 rounded-full border-2 transition-all duration-150"
            [class]="$index < digitos().length ? 'scale-110 border-primary-700 bg-primary-700 dark:border-emerald-200 dark:bg-emerald-200' : 'border-surface-400 dark:border-surface-500'"></span>
        }
      </div>

      <div class="grid w-full max-w-72 grid-cols-3 gap-x-4 gap-y-3" role="group" aria-label="Teclado numérico">
        @for (t of teclas; track t) {
          <button type="button" class="toque mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-100 text-2xl font-medium hover:bg-surface-200 disabled:opacity-50 dark:bg-surface-800 dark:hover:bg-surface-700" [disabled]="desabilitado()" (click)="adicionar(t)">{{ t }}</button>
        }
        @if (digital()) {
          <button type="button" class="toque mx-auto flex h-16 w-16 items-center justify-center rounded-full text-primary-700 hover:bg-surface-100 dark:text-primary-400 dark:hover:bg-surface-800" aria-label="Entrar com a digital" [disabled]="desabilitado()" (click)="usarDigital.emit()">
            <i class="lucide-font icon-fingerprint text-3xl" aria-hidden="true"></i>
          </button>
        } @else {
          <span aria-hidden="true"></span>
        }
        <button type="button" class="toque mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-100 text-2xl font-medium hover:bg-surface-200 disabled:opacity-50 dark:bg-surface-800 dark:hover:bg-surface-700" [disabled]="desabilitado()" (click)="adicionar('0')">0</button>
        <button type="button" class="toque mx-auto flex h-16 w-16 items-center justify-center rounded-full text-muted-color hover:bg-surface-100 disabled:opacity-50 dark:hover:bg-surface-800" aria-label="Apagar último dígito" [disabled]="desabilitado()" (click)="apagar()">
          <i class="lucide-font icon-delete text-2xl" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `,
})
export class PinPad {
  tamanho = input(6);
  desabilitado = input(false);
  /** Mostra a tecla da digital no canto inferior esquerdo. */
  digital = input(false);

  completo = output<string>();
  usarDigital = output<void>();

  teclas = TECLAS;
  digitos = signal("");
  tremendo = signal(false);

  posicoes = () => Array.from({ length: this.tamanho() });

  constructor() {
    // Trocar de 4 para 6 dígitos (ou o contrário) recomeça a digitação.
    effect(() => {
      this.tamanho();
      untracked(() => this.digitos.set(""));
    });
  }

  adicionar(d: string) {
    if (this.desabilitado() || this.digitos().length >= this.tamanho()) return;
    this.digitos.set(this.digitos() + d);
    if (this.digitos().length === this.tamanho()) {
      const pin = this.digitos();
      setTimeout(() => this.completo.emit(pin), 120); // deixa a última bolinha aparecer
    }
  }

  apagar() {
    if (this.desabilitado()) return;
    this.digitos.set(this.digitos().slice(0, -1));
  }

  /** Zera as bolinhas. Com `erro`, treme e vibra (PIN errado). */
  limpar(erro = false) {
    this.digitos.set("");
    if (erro) {
      vibrar(45);
      this.tremendo.set(true);
      setTimeout(() => this.tremendo.set(false), 450);
    }
  }

  /** Teclado físico (útil no computador): dígitos e Backspace, fora de campos de texto. */
  @HostListener("document:keydown", ["$event"])
  aoTeclar(e: KeyboardEvent) {
    const alvo = e.target as HTMLElement | null;
    if (e.ctrlKey || e.metaKey || e.altKey || (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName))) return;
    if (/^[0-9]$/.test(e.key)) this.adicionar(e.key);
    else if (e.key === "Backspace") this.apagar();
  }
}
