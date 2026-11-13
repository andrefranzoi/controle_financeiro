import { Component, inject } from "@angular/core";
import { AvisoService } from "./aviso.service";

/** Mostra o aviso atual (com ação opcional) acima da barra de navegação. */
@Component({
  selector: "app-avisos",
  template: `
    @if (avisos.aviso(); as a) {
      <div
        class="surgir pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
        style="bottom: calc(env(safe-area-inset-bottom) + 4.75rem)"
        role="status"
        aria-live="polite">
        <div class="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-surface-900 py-2 pl-4 pr-2 text-sm text-white shadow-xl ring-1 ring-white/10 dark:bg-surface-800">
          <i class="lucide-font text-lg" [class]="a.tipo === 'erro' ? 'icon-circle-alert text-red-400' : 'icon-circle-check text-emerald-300'" aria-hidden="true"></i>
          <span class="min-w-0 flex-1">{{ a.texto }}</span>
          @if (a.rotuloAcao) {
            <button type="button" class="min-h-11 rounded-xl px-3 font-semibold text-emerald-300 transition-colors hover:bg-white/10" (click)="avisos.executarAcao()">
              {{ a.rotuloAcao }}
            </button>
          } @else {
            <button type="button" class="flex h-11 w-11 items-center justify-center rounded-xl text-white/70 hover:bg-white/10" aria-label="Fechar aviso" (click)="avisos.fechar()">
              <i class="lucide-font icon-x" aria-hidden="true"></i>
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class Avisos {
  avisos = inject(AvisoService);
}
