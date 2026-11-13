import { Component, computed, input } from "@angular/core";

/** Tamanho da fonte do ícone conforme o tamanho do círculo (classes h-* do Tailwind). */
const TAMANHO_FONTE: Record<string, string> = { "h-7": "text-sm", "h-8": "text-base", "h-9": "text-lg", "h-10": "text-xl", "h-12": "text-2xl" };

/** Círculo colorido com o ícone Lucide da categoria (ou a inicial do nome, se a categoria ainda não tiver ícone). */
@Component({
  selector: "app-cat-icone",
  template: `
    <span class="flex shrink-0 items-center justify-center rounded-full" [class]="tamanho()" [style.background]="cor() + '26'" [style.color]="cor()">
      @if (icone()) {
        <i [class]="'lucide-font icon-' + icone() + ' ' + fonte()" aria-hidden="true"></i>
      } @else {
        <span class="text-sm font-semibold">{{ nome().charAt(0).toUpperCase() }}</span>
      }
    </span>
  `,
})
export class CategoriaIcone {
  icone = input<string | null | undefined>(null);
  cor = input("#94a3b8");
  nome = input("");
  tamanho = input("h-10 w-10");

  fonte = computed(() => TAMANHO_FONTE[this.tamanho().split(" ")[0]] ?? "text-xl");
}
