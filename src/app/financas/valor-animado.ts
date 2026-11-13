import { DestroyRef, Directive, ElementRef, effect, inject, input } from "@angular/core";
import { fmtMoney } from "./format";

/**
 * Mostra um valor em reais e, quando ele muda, "conta" até o novo número (450 ms, ease-out).
 * Respeita movimento reduzido. Só mexe no texto, então não pesa no layout.
 */
@Directive({ selector: "[valorAnimado]" })
export class ValorAnimado {
  valorAnimado = input.required<number>();
  formato = input<(n: number) => string>(fmtMoney);

  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private atual = 0;
  private raf = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => this.animar(this.valorAnimado()));
    inject(DestroyRef).onDestroy(() => {
      cancelAnimationFrame(this.raf);
      clearTimeout(this.timer);
    });
  }

  private animar(alvo: number) {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.timer);
    const inicio = this.atual;
    this.el.setAttribute("aria-label", this.formato()(alvo)); // leitor de tela recebe só o valor final
    const reduzir = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduzir || inicio === alvo) {
      this.mostrar(alvo);
      return;
    }
    const duracao = 450;
    const t0 = performance.now();
    const passo = (t: number) => {
      const p = Math.min(1, (t - t0) / duracao);
      const suave = 1 - Math.pow(1 - p, 3);
      this.mostrar(Math.round(inicio + (alvo - inicio) * suave));
      if (p < 1) this.raf = requestAnimationFrame(passo);
    };
    this.raf = requestAnimationFrame(passo);
    // Garante o valor final mesmo se o navegador pausar os quadros (aba em segundo plano).
    this.timer = setTimeout(() => {
      cancelAnimationFrame(this.raf);
      this.mostrar(alvo);
    }, duracao + 150);
  }

  private mostrar(n: number) {
    this.atual = n;
    this.el.textContent = this.formato()(n);
  }
}
