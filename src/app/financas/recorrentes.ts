import { Component, OnInit, inject, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { marcaDe } from "./brand-icons";
import { ContasService } from "./contas.service";
import { Recorrencia } from "./models";
import { PageHeader } from "./page-header";
import { fmtMoney, nomeMes } from "./format";

@Component({
  selector: "app-recorrentes",
  imports: [PageHeader, RouterLink],
  template: `
    <div class="mx-auto max-w-xl pb-8">
    <app-page-header titulo="Recorrentes" />
    <div class="mx-4 mt-2 flex flex-col gap-3">
      <p class="text-xs text-muted-color">Contas que se repetem todo mês. Para criar uma, use “+” e marque “Repete todo mês”.</p>
      <ul class="divide-y divide-surface-100 overflow-hidden rounded-2xl bg-surface-0 shadow-sm dark:divide-surface-800 dark:bg-surface-900">
        @for (r of regras(); track r.id) {
          <li class="flex items-center pr-1">
            <button
              type="button"
              class="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-l-2xl px-3 py-3 text-left transition-colors hover:bg-surface-50 active:bg-surface-100 dark:hover:bg-surface-800/60 dark:active:bg-surface-800"
              [attr.title]="'Editar ' + r.descricao"
              (click)="editar(r)">
              @if (marca(r.descricao); as m) {
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-surface-200 dark:ring-surface-700" [attr.title]="m.nome">
                <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="m.path" [attr.fill]="'#' + m.hex" /></svg>
              </span>
            } @else {
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-100 text-sm font-semibold text-muted-color dark:bg-surface-800">
                {{ r.descricao.charAt(0).toUpperCase() }}
              </span>
            }
              <span class="min-w-0 flex-1">
                <span class="block truncate">{{ r.descricao }}</span>
                <span class="block truncate text-xs text-muted-color">
                  Todo dia {{ r.dia }}@if (r.antecipar_fds) { (fim de semana → sexta) }@if (r.valor_variavel) { · valor varia }@if (r.parcelas) { · {{ r.parcelas }} parcelas } · desde {{ nome(r.inicio) }}@if (r.fim) { · até {{ nome(r.fim) }} }
                </span>
              </span>
              <span class="shrink-0 font-semibold" [class]="r.tipo === 'receber' ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                {{ textoValor(r) }}
              </span>
            </button>
            <button type="button" class="flex h-11 w-11 items-center justify-center rounded-full text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950" [attr.aria-label]="'Encerrar recorrência ' + r.descricao" (click)="encerrar(r)"><i class="lucide-font icon-trash-2 text-lg" aria-hidden="true"></i></button>
          </li>
        } @empty {
          <li class="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span class="flex h-14 w-14 items-center justify-center rounded-full bg-surface-100 text-muted-color dark:bg-surface-800"><i class="lucide-font icon-repeat text-2xl" aria-hidden="true"></i></span>
            <div class="font-medium">Nenhuma conta recorrente</div>
            <p class="text-sm text-muted-color">Aluguel, internet, assinaturas... cadastre uma vez e ela aparece todo mês.</p>
            <a routerLink="/conta/nova" class="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary-700 px-5 font-medium text-white transition-colors hover:bg-primary-800"><i class="lucide-font icon-plus" aria-hidden="true"></i> Nova conta recorrente</a>
          </li>
        }
      </ul>
    </div>
    </div>
  `,
})
export class Recorrentes implements OnInit {
  private service = inject(ContasService);
  private router = inject(Router);

  marca = marcaDe;

  textoValor(r: Recorrencia) {
    if (r.valor_variavel && !r.valor) return "a definir";
    return (r.tipo === "receber" ? "+" : "-") + (r.valor_variavel ? "≈" : "") + fmtMoney(r.valor);
  }
  fmt = fmtMoney;
  nome = nomeMes;
  regras = signal<Recorrencia[]>([]);

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    this.regras.set(await this.service.listarRecorrencias());
  }

  editar(r: Recorrencia) {
    this.router.navigate(["/recorrente", r.id]);
  }

  async encerrar(r: Recorrencia) {
    if (!confirm(`Encerrar "${r.descricao}"? As parcelas futuras não pagas serão removidas; o histórico é mantido.`)) return;
    await this.service.encerrarRecorrencia(r.id);
    await this.carregar();
  }
}
