import { Component, computed, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { NAV_GROUPS, NavItem } from "@/app/layout/nav-items";
import { DireitosService } from "@/app/service/direitos.service";

// Cada atalho ganha um "azulejo" em degradê com ícone branco e um brilho colorido embaixo.
const CORES = [
  { badge: "bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30", icon: "text-white" },
  { badge: "bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/30", icon: "text-white" },
  { badge: "bg-gradient-to-br from-orange-500 to-orange-700 shadow-lg shadow-orange-500/30", icon: "text-white" },
  { badge: "bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/30", icon: "text-white" },
  { badge: "bg-gradient-to-br from-pink-500 to-pink-700 shadow-lg shadow-pink-500/30", icon: "text-white" },
];

@Component({
  selector: "app-quick-access",
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="block w-full">
      <span class="block text-sm text-surface-400 dark:text-surface-500 mb-3">Acesso Rápido</span>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        @for (item of atalhos(); track item.routerLink) {
          <a
            [routerLink]="item.routerLink"
            class="group relative flex flex-col items-center justify-center gap-3 h-[150px] rounded-2xl border border-surface-200 dark:border-surface-700 bg-gradient-to-b from-surface-0 to-surface-50 dark:from-surface-900 dark:to-surface-950 p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-surface-300 dark:hover:border-surface-600 active:scale-[0.97]">
            @if (item.badge) {
              <span class="absolute top-3 right-3 min-w-6 h-6 px-2 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow-md shadow-red-500/40">{{ item.badge }}</span>
            }
            <div
              class="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
              [ngClass]="item.corBadge">
              <i class="lucide-font icon-{{ item.icon }}" [ngClass]="item.corIcone" style="font-size: 2rem"></i>
            </div>
            <span class="text-sm font-semibold text-center text-surface-700 dark:text-surface-100">{{ item.label }}</span>
          </a>
        }
      </div>
    </div>
  `,
})
export class QuickAccess {
  private direitosService = inject(DireitosService);

  // Reaproveita o mesmo array de itens do menu lateral (@/app/layout/nav-items.ts) — só os
  // itens com rota direta e "menu: true" viram botão aqui (sub-menus não fazem sentido como
  // atalho, e "menu: false" tira itens como o próprio Home), filtrados também por permissão
  // (DireitosService.acesso), igual ao menu lateral (app.menu.ts).
  atalhos = computed(() => {
    return NAV_GROUPS.flatMap((group) => group.items)
      .filter((item): item is NavItem & { routerLink: string } => !!item.routerLink && item.menu)
      .filter((item) => !item.direito || this.direitosService.acesso(item.direito.modulo, item.direito.tipo))
      .map((item, index) => ({
        ...item,
        corBadge: CORES[index % CORES.length].badge,
        corIcone: CORES[index % CORES.length].icon,
      }));
  });
}
