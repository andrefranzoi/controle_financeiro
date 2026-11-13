import { Component, HostListener, effect, inject, signal, untracked } from "@angular/core";
import { ContasService } from "./contas.service";
import { fmtMoney } from "./format";
import { ValorRealService } from "./valor-real.service";

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "apagar"];

/** Folha "Quanto foi?": mostra a estimativa (média dos últimos meses) e deixa digitar o valor real antes de marcar como paga. */
@Component({
  selector: "app-valor-real",
  template: `
    <div class="fixed inset-0 z-40 bg-black/60 transition-opacity duration-200" [class]="aberta() ? 'opacity-100' : 'pointer-events-none opacity-0'" aria-hidden="true" (click)="cancelar()"></div>

    <section
      class="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[94dvh] w-full max-w-xl flex-col rounded-t-3xl bg-surface-0 shadow-2xl transition-transform duration-300 ease-out dark:bg-surface-900"
      [class]="aberta() ? 'translate-y-0' : 'translate-y-full'"
      role="dialog"
      aria-modal="true"
      aria-label="Valor real da conta"
      [attr.inert]="aberta() ? null : ''">
      <div class="mx-auto mt-2 h-1.5 w-10 rounded-full bg-surface-300 dark:bg-surface-600" aria-hidden="true"></div>

      <div class="flex items-start justify-between gap-3 px-4 pt-1">
        <div class="min-w-0">
          <div role="heading" aria-level="2" class="text-base font-semibold">Quanto foi?</div>
          <div class="truncate text-sm text-muted-color">{{ valorReal.conta()?.descricao }}</div>
        </div>
        <button type="button" class="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-color transition-colors hover:bg-surface-100 dark:hover:bg-surface-800" aria-label="Cancelar" (click)="cancelar()">
          <i class="lucide-font icon-x text-xl" aria-hidden="true"></i>
        </button>
      </div>

      <div class="px-4 py-4 text-center" aria-live="polite">
        <div class="text-5xl font-bold tracking-tight" [class]="valorReal.conta()?.tipo === 'receber' ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'">{{ fmt(centavos()) }}</div>
        <div class="mt-2 text-xs text-muted-color">
          {{ (valorReal.conta()?.valor ?? 0) > 0 ? "Estimado: " + fmt(valorReal.conta()?.valor ?? 0) : "Sem estimativa ainda: digite o valor desta conta" }}
          @if (meses() > 0) { · média dos últimos {{ meses() === 1 ? "pagamento" : meses() + " pagamentos" }} }
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2 px-4 pb-2" role="group" aria-label="Teclado numérico">
        @for (t of teclas; track t) {
          <button
            type="button"
            class="toque flex h-14 items-center justify-center rounded-2xl bg-surface-100 text-xl font-medium hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700"
            [attr.aria-label]="t === 'apagar' ? 'Apagar último dígito' : t"
            (click)="tecla(t)">
            @if (t === "apagar") { <i class="lucide-font icon-delete" aria-hidden="true"></i> } @else { {{ t }} }
          </button>
        }
      </div>

      <div class="flex items-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
        @if ((valorReal.conta()?.valor ?? 0) > 0) {
          <button type="button" class="min-h-12 rounded-2xl px-3 text-sm font-medium text-primary-700 dark:text-primary-400" (click)="usarEstimado()">Usar o estimado</button>
        }
        <button type="button" class="min-h-12 flex-1 rounded-2xl bg-primary-700 text-base font-semibold text-white transition-colors hover:bg-primary-800 disabled:opacity-50" [disabled]="centavos() === 0" (click)="confirmar()">
          Marcar como paga
        </button>
      </div>
    </section>
  `,
})
export class ValorReal {
  valorReal = inject(ValorRealService);
  private contas = inject(ContasService);

  teclas = TECLAS;
  fmt = fmtMoney;
  centavos = signal(0);
  meses = signal(0);
  aberta = () => this.valorReal.conta() !== null;

  constructor() {
    // Ao abrir, começa com o valor estimado preenchido (dá para só ajustar).
    effect(() => {
      const c = this.valorReal.conta();
      if (!c) return;
      untracked(() => {
        this.centavos.set(c.valor);
        this.meses.set(0);
        if (c.recorrencia_id) this.contas.mesesNaMedia(c.recorrencia_id).then((n) => this.meses.set(n));
      });
    });
  }

  tecla(t: string) {
    if (t === "apagar") this.centavos.set(Math.floor(this.centavos() / 10));
    else {
      const novo = Number(String(this.centavos()) + t);
      if (String(novo).length <= 11) this.centavos.set(novo);
    }
  }

  confirmar() {
    if (this.centavos() > 0) this.valorReal.concluir(this.centavos());
  }

  usarEstimado() {
    const c = this.valorReal.conta();
    if (c) this.valorReal.concluir(c.valor);
  }

  cancelar() {
    this.valorReal.concluir(null);
  }

  @HostListener("document:keydown", ["$event"])
  aoTeclar(e: KeyboardEvent) {
    if (!this.aberta() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape") return this.cancelar();
    if (/^[0-9]$/.test(e.key)) this.tecla(e.key);
    else if (e.key === "Backspace") this.tecla("apagar");
    else if (e.key === "Enter") this.confirmar();
  }
}
