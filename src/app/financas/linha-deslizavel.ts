import { Component, ElementRef, inject, input, output, signal } from "@angular/core";
import { vibrar } from "./feedback";

const LIMIAR = 84; // px para disparar a ação
const MAXIMO = 132; // px de curso máximo

/**
 * Linha que desliza: para a direita executa a ação principal (pagar), para a esquerda a destrutiva (excluir).
 * Só reage a movimentos mais horizontais que verticais (a rolagem da lista continua livre) e sempre existe um
 * botão alternativo na linha, então o gesto é um atalho, nunca o único caminho.
 */
@Component({
  selector: "app-linha-deslizavel",
  template: `
    <div class="relative overflow-hidden">
      <!-- Ações reveladas por trás -->
      <div class="absolute inset-0 flex items-center justify-between px-5 text-white" [class]="dx() > 0 ? 'bg-green-700' : dx() < 0 ? 'bg-red-600' : 'bg-transparent'" aria-hidden="true">
        <span class="flex items-center gap-2 font-medium" [class.opacity-0]="dx() <= 0" [style.opacity]="dx() > 0 ? opacidade() : 0">
          <i class="lucide-font icon-circle-check text-xl"></i> {{ rotuloPagar() }}
        </span>
        <span class="flex items-center gap-2 font-medium" [style.opacity]="dx() < 0 ? opacidade() : 0">
          Excluir <i class="lucide-font icon-trash-2 text-xl"></i>
        </span>
      </div>

      <div
        class="relative touch-pan-y bg-surface-0 dark:bg-[#0c1311]"
        [style.transform]="'translateX(' + dx() + 'px)'"
        [style.transition]="arrastando() ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)'"
        (pointerdown)="aoDescer($event)"
        (pointermove)="aoMover($event)"
        (pointerup)="aoSoltar()"
        (pointercancel)="aoSoltar()">
        <ng-content />
      </div>
    </div>
  `,
})
export class LinhaDeslizavel {
  rotuloPagar = input("Pagar");
  pagar = output<void>();
  excluir = output<void>();

  dx = signal(0);
  arrastando = signal(false);

  private x0 = 0;
  private y0 = 0;
  private rastreando = false;
  private ativo = false;
  private suprimirClique = false;

  constructor() {
    // Captura o clique ANTES de chegar ao botão da linha: o toque que termina um arrasto não pode abrir a edição.
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.addEventListener("click", (e) => this.bloquearClique(e), true);
  }

  opacidade = () => Math.min(1, Math.abs(this.dx()) / LIMIAR);

  aoDescer(e: PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    this.x0 = e.clientX;
    this.y0 = e.clientY;
    this.rastreando = true;
    this.ativo = false;
  }

  aoMover(e: PointerEvent) {
    if (!this.rastreando) return;
    const dx = e.clientX - this.x0;
    const dy = e.clientY - this.y0;
    if (!this.ativo) {
      if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) {
        this.rastreando = false; // era rolagem vertical
        return;
      }
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        this.ativo = true;
        this.arrastando.set(true);
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* ponteiro sintético: segue sem captura */
        }
      } else return;
    }
    // resistência depois do limiar: a linha "pesa" e não foge da tela
    const passou = Math.abs(dx) - LIMIAR;
    const efetivo = Math.abs(dx) <= LIMIAR ? Math.abs(dx) : LIMIAR + Math.min(MAXIMO - LIMIAR, passou * 0.35);
    this.dx.set(Math.sign(dx) * efetivo);
  }

  aoSoltar() {
    this.rastreando = false;
    if (!this.ativo) return;
    const x = this.dx();
    this.ativo = false;
    this.arrastando.set(false);
    this.dx.set(0);
    this.suprimirClique = true; // o toque que termina um arrasto não deve abrir a edição
    setTimeout(() => (this.suprimirClique = false), 80);
    if (x >= LIMIAR) {
      vibrar();
      this.pagar.emit();
    } else if (x <= -LIMIAR) {
      vibrar();
      this.excluir.emit();
    }
  }

  bloquearClique(e: Event) {
    if (this.suprimirClique) {
      e.stopPropagation();
      e.preventDefault();
    }
  }
}
