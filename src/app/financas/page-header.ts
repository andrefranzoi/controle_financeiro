import { Component, inject, input } from "@angular/core";
import { Router } from "@angular/router";

/** Cabeçalho das telas internas: botão voltar redondo, título centralizado. */
@Component({
  selector: "app-page-header",
  template: `
    <div class="flex items-center justify-between px-4 pb-2 pt-4">
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center rounded-full bg-surface-0 shadow-sm transition-colors hover:bg-surface-100 dark:bg-surface-900"
        aria-label="Voltar"
        (click)="voltar()">
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <div role="heading" aria-level="1" class="text-base font-semibold">{{ titulo() }}</div>
      <div class="h-11 w-11" aria-hidden="true"></div>
    </div>
  `,
})
export class PageHeader {
  private router = inject(Router);

  titulo = input.required<string>();
  rotaVoltar = input("/");

  voltar() {
    this.router.navigate([this.rotaVoltar()]);
  }
}
