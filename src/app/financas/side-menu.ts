import { Component, ElementRef, HostListener, effect, inject, viewChild } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from "@angular/router";
import { filter } from "rxjs";
import { AuthService } from "./auth.service";
import { MenuService } from "./menu.service";
import { PerfilService } from "./perfil.service";
import { TemaService } from "./tema.service";

interface ItemMenu {
  rota: string;
  icone: string;
  rotulo: string;
  exato?: boolean;
}

/** Menu lateral (gaveta): atalhos, dados/backup, aparência e sair. Os itens ficam em listas simples para crescer fácil. */
@Component({
  selector: "app-side-menu",
  imports: [RouterLink, RouterLinkActive],
  template: `
    <!-- Fundo escurecido: toque fora para fechar -->
    <div
      class="fixed inset-0 z-40 bg-black/60 transition-opacity duration-200"
      [class]="menu.aberto() ? 'opacity-100' : 'pointer-events-none opacity-0'"
      aria-hidden="true"
      (click)="menu.fechar()"></div>

    <aside
      id="menu-lateral"
      class="fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] flex-col bg-surface-0 shadow-2xl transition-transform duration-200 ease-out dark:bg-surface-900"
      [class]="menu.aberto() ? 'translate-x-0' : '-translate-x-full'"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      [attr.inert]="menu.aberto() ? null : ''">
      <!-- Conta -->
      <div class="flex items-center gap-3 px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <a
          routerLink="/minha-conta"
          class="-my-1 flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 transition-colors hover:bg-surface-100 dark:hover:bg-surface-800">
          <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white shadow-md" style="background: linear-gradient(160deg, var(--p-primary-600), var(--p-primary-900))" aria-hidden="true">
            @if (perfil.iniciais()) { {{ perfil.iniciais() }} } @else { <i class="lucide-font icon-user-round text-2xl"></i> }
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate font-semibold">{{ perfil.perfil().nome || "Complete seu cadastro" }}</span>
            <span class="block truncate text-xs text-muted-color">{{ perfil.perfil().email || "Toque para editar seus dados" }}</span>
          </span>
          <i class="lucide-font icon-chevron-right text-muted-color" aria-hidden="true"></i>
        </a>
        <button
          #fechar
          type="button"
          class="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-color transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
          aria-label="Fechar menu"
          (click)="menu.fechar()">
          <i class="lucide-font icon-x text-xl" aria-hidden="true"></i>
        </button>
      </div>

      <nav class="flex-1 overflow-y-auto px-3 pb-4" aria-label="Menu">
        <div class="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-widest text-muted-color">Navegar</div>
        @for (item of navegacao; track item.rota) {
          <a
            [routerLink]="item.rota"
            [routerLinkActiveOptions]="{ exact: !!item.exato }"
            routerLinkActive="ativo"
            ariaCurrentWhenActive="page"
            #rla="routerLinkActive"
            class="flex min-h-12 items-center gap-3 rounded-xl px-3 transition-colors"
            [class]="rla.isActive ? 'bg-primary-100 font-medium text-primary-800 dark:bg-emerald-200 dark:text-emerald-950' : 'hover:bg-surface-100 dark:hover:bg-surface-800'">
            <i class="lucide-font text-xl" [class]="'icon-' + item.icone" aria-hidden="true"></i>
            {{ item.rotulo }}
          </a>
        }

        <div class="px-2 pb-1 pt-5 text-xs font-semibold uppercase tracking-widest text-muted-color">Dados</div>
        @for (item of dados; track item.rota) {
          <a
            [routerLink]="item.rota"
            routerLinkActive="ativo"
            ariaCurrentWhenActive="page"
            #rlb="routerLinkActive"
            class="flex min-h-12 items-center gap-3 rounded-xl px-3 transition-colors"
            [class]="rlb.isActive ? 'bg-primary-100 font-medium text-primary-800 dark:bg-emerald-200 dark:text-emerald-950' : 'hover:bg-surface-100 dark:hover:bg-surface-800'">
            <i class="lucide-font text-xl" [class]="'icon-' + item.icone" aria-hidden="true"></i>
            {{ item.rotulo }}
          </a>
        }

        <div class="px-2 pb-1 pt-5 text-xs font-semibold uppercase tracking-widest text-muted-color">Aparência</div>
        <button
          type="button"
          role="switch"
          [attr.aria-checked]="tema.escuro()"
          class="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
          (click)="tema.alternar()">
          <i class="lucide-font text-xl" [class]="tema.escuro() ? 'icon-moon' : 'icon-sun'" aria-hidden="true"></i>
          <span class="flex-1">Tema escuro</span>
          <span class="relative h-6 w-11 shrink-0 rounded-full transition-colors" [class]="tema.escuro() ? 'bg-primary-700' : 'bg-surface-300 dark:bg-surface-600'" aria-hidden="true">
            <span class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" [class]="tema.escuro() ? 'left-[1.375rem]' : 'left-0.5'"></span>
          </span>
        </button>
      </nav>

      <!-- Rodapé: sair e versão -->
      <div class="border-t border-surface-200 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 dark:border-surface-800">
        <button
          type="button"
          class="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          (click)="sair()">
          <i class="lucide-font icon-log-out text-xl" aria-hidden="true"></i>
          Sair
        </button>
        <div class="px-3 pt-2 text-xs text-muted-color">Versão 1.0.0</div>
      </div>
    </aside>
  `,
})
export class SideMenu {
  menu = inject(MenuService);
  tema = inject(TemaService);
  perfil = inject(PerfilService);
  private auth = inject(AuthService);
  private router = inject(Router);

  private botaoFechar = viewChild<ElementRef<HTMLButtonElement>>("fechar");
  private quemAbriu: HTMLElement | null = null;

  /** Itens do menu. Para acrescentar telas novas no futuro, basta incluir aqui. */
  navegacao: ItemMenu[] = [
    { rota: "/", icone: "wallet", rotulo: "Contas", exato: true },
    { rota: "/analises", icone: "chart-column", rotulo: "Análises" },
    { rota: "/recorrentes", icone: "repeat", rotulo: "Contas recorrentes" },
    { rota: "/categorias", icone: "tag", rotulo: "Categorias" },
  ];
  dados: ItemMenu[] = [{ rota: "/backup", icone: "database", rotulo: "Backup dos dados" }];

  constructor() {
    // Ao navegar por qualquer link, a gaveta fecha.
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menu.fechar());

    // Foco: ao abrir vai para o botão de fechar; ao fechar volta para quem abriu.
    effect(() => {
      if (this.menu.aberto()) {
        this.quemAbriu = document.activeElement as HTMLElement | null;
        queueMicrotask(() => this.botaoFechar()?.nativeElement.focus());
      } else if (this.quemAbriu) {
        this.quemAbriu.focus?.();
        this.quemAbriu = null;
      }
    });
  }

  @HostListener("document:keydown.escape")
  aoApertarEsc() {
    if (this.menu.aberto()) this.menu.fechar();
  }

  async sair() {
    this.menu.fechar();
    await this.auth.sair();
    this.router.navigate(["/login"]);
  }
}
