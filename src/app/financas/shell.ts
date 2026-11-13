import { Component, inject } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { MenuService } from "./menu.service";
import { PerfilService } from "./perfil.service";
import { Avisos } from "./avisos";
import { LancamentoRapido } from "./lancamento-rapido";
import { LancamentoRapidoService } from "./lancamento-rapido.service";
import { SideMenu } from "./side-menu";
import { ValorReal } from "./valor-real";

interface ItemNav {
  rota: string;
  titulo: string;
  exato?: boolean;
  /** Caminhos SVG (24x24, traço) do ícone. */
  icone: string[];
}

const ICONES = {
  contas: [
    "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",
    "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",
  ],
  recorrentes: ["m17 2 4 4-4 4", "M3 11v-1a4 4 0 0 1 4-4h14", "m7 22-4-4 4-4", "M21 13v1a4 4 0 0 1-4 4H3"],
  analises: ["M3 3v16a2 2 0 0 0 2 2h16", "M18 17V9", "M13 17V5", "M8 17v-3"],
  menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
  nova: ["M5 12h14", "M12 5v14"],
};

/** Estrutura do app: conteúdo + barra inferior com botão central "nova conta" + menu lateral (conta, dados, tema, sair). */
@Component({
  selector: "app-shell",
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SideMenu, LancamentoRapido, ValorReal, Avisos],
  template: `
    <div class="flex h-dvh flex-col bg-surface-50 dark:bg-surface-950">
      <main class="relative flex-1 overflow-y-auto">
        <router-outlet />
      </main>

      <nav class="relative z-30 shrink-0" aria-label="Navegação principal">
        <div class="flex h-12 items-center rounded-t-3xl bg-surface-0 px-2 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:bg-surface-900">
          @for (item of esquerda; track item.rota) {
            <a
              [routerLink]="item.rota"
              [routerLinkActiveOptions]="{ exact: !!item.exato }"
              routerLinkActive="ativo"
              ariaCurrentWhenActive="page"
              #rla="routerLinkActive"
              class="flex flex-1 items-center justify-center self-stretch"
              [attr.aria-label]="item.titulo">
              <span
                class="flex h-9 w-14 items-center justify-center rounded-full transition-colors"
                [class]="rla.isActive ? 'bg-primary-100 text-primary-800 dark:bg-emerald-200 dark:text-emerald-950' : 'text-muted-color'">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  @for (d of item.icone; track d) { <path [attr.d]="d" /> }
                </svg>
              </span>
            </a>
          }

          <span class="w-14 shrink-0"></span>

          @for (item of direita; track item.rota) {
            <a
              [routerLink]="item.rota"
              routerLinkActive="ativo"
              ariaCurrentWhenActive="page"
              #rlb="routerLinkActive"
              class="flex flex-1 items-center justify-center self-stretch"
              [attr.aria-label]="item.titulo">
              <span
                class="flex h-9 w-14 items-center justify-center rounded-full transition-colors"
                [class]="rlb.isActive ? 'bg-primary-100 text-primary-800 dark:bg-emerald-200 dark:text-emerald-950' : 'text-muted-color'">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  @for (d of item.icone; track d) { <path [attr.d]="d" /> }
                </svg>
              </span>
            </a>
          }
          <button
            type="button"
            class="flex flex-1 items-center justify-center self-stretch"
            aria-label="Abrir menu"
            aria-haspopup="dialog"
            aria-controls="menu-lateral"
            [attr.aria-expanded]="menu.aberto()"
            (click)="menu.abrir()">
            <span
              class="flex h-9 w-14 items-center justify-center rounded-full transition-colors"
              [class]="menu.aberto() ? 'bg-primary-100 text-primary-800 dark:bg-emerald-200 dark:text-emerald-950' : 'text-muted-color'">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                @for (d of icones.menu; track d) { <path [attr.d]="d" /> }
              </svg>
            </span>
          </button>
        </div>
        <!-- Respiro para a barra de gestos/notch do Android -->
        <div class="bg-surface-0 dark:bg-surface-900" style="height: env(safe-area-inset-bottom)"></div>

        <button
          type="button"
          class="toque absolute -top-5 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border-[3px] border-surface-50 bg-primary-700 text-white shadow-lg dark:border-surface-950"
          aria-label="Nova conta"
          aria-haspopup="dialog"
          aria-controls="folha-rapida"
          (click)="rapido.abrir()">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            @for (d of icones.nova; track d) { <path [attr.d]="d" /> }
          </svg>
        </button>
      </nav>
    </div>

    <app-side-menu />
    <app-lancamento-rapido />
    <app-valor-real />
    <app-avisos />
  `,
})
export class Shell {
  menu = inject(MenuService);
  rapido = inject(LancamentoRapidoService);
  private perfil = inject(PerfilService);
  icones = ICONES;

  constructor() {
    this.perfil.carregar();
  }
  esquerda: ItemNav[] = [
    { rota: "/", titulo: "Contas", exato: true, icone: ICONES.contas },
    { rota: "/recorrentes", titulo: "Recorrentes", icone: ICONES.recorrentes },
  ];
  direita: ItemNav[] = [{ rota: "/analises", titulo: "Análises", icone: ICONES.analises }];
}
