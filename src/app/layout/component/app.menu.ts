import { Component, HostListener, WritableSignal, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { AvatarModule } from "primeng/avatar";
import { TooltipModule } from "primeng/tooltip";
import { LayoutService } from "@/app/layout/service/layout.service";
import { AlertService } from "@/app/pages/service/alert.service";
import { environment } from "@/environments/environment";
import { NAV_GROUPS, NavItem, NavSubItem } from "@/app/layout/nav-items";
import { DireitosService } from "@/app/service/direitos.service";
import { FilialService } from "@/app/service/filial.service";

@Component({
  selector: "app-menu",
  standalone: true,
  imports: [CommonModule, RouterModule, AvatarModule, TooltipModule],
  template: `
    <div class="flex h-full flex-col">
      <div class="app-sidebar-header">
        <span class="app-sidebar-brand">
          <span class="app-sidebar-title">{{ nomeProjeto }}</span>
        </span>
        <button
          type="button"
          class="app-sidebar-toggle"
          aria-label="Recolher/expandir menu"
          (click)="layoutService.onMenuToggle()">
          <svg
            class="app-sidebar-toggle-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M9 3v18" />
            @if (isCollapsed()) {
              <path d="m14 9 3 3-3 3" />
            } @else {
              <path d="m16 15-3-3 3-3" />
            }
          </svg>
        </button>
      </div>

      @if (filialService.filiais().length > 0) {
        <div class="app-filial-wrap">
          <button
            type="button"
            class="app-filial"
            [class.aberto]="filialAberta()"
            aria-haspopup="listbox"
            [attr.aria-expanded]="filialAberta()"
            [pTooltip]="tooltipFilial()"
            tooltipPosition="right"
            tooltipStyleClass="tooltip-multilinha"
            (click)="filialAberta.set(!filialAberta())">
            <span class="app-filial-dot"></span>
            <span class="app-filial-texto app-nav-text">
              <span class="app-filial-nome">{{ nomeEmpresa() }}</span>
              <span class="app-filial-sub">
                Filial {{ filialService.filialAtiva()?.codemp }} · {{ filialService.filialAtiva()?.nomexibeemp }}
              </span>
            </span>
            <span class="app-filial-mini">{{ filialService.filialAtiva()?.codemp }}</span>
            <i class="app-nav-chevron lucide-font icon-chevron-down app-filial-chevron"></i>
          </button>

          @if (filialAberta()) {
            <ul class="app-filial-lista" role="listbox">
              @for (filial of filialService.filiais(); track filial.codemp) {
                <li>
                  <button
                    type="button"
                    role="option"
                    class="app-filial-opcao"
                    [class.ativa]="filial.codemp === filialService.filialAtiva()?.codemp"
                    [attr.aria-selected]="filial.codemp === filialService.filialAtiva()?.codemp"
                    (click)="trocarFilial(filial.codemp)">
                    <span class="app-filial-cod">{{ filial.codemp }}</span>
                    <span class="flex-1 truncate text-left">{{ filial.nomexibeemp }}</span>
                    @if (filial.codemp === filialService.filialAtiva()?.codemp) {
                      <i class="lucide-font icon-check"></i>
                    }
                  </button>
                </li>
              }
            </ul>
          }
        </div>
      }

      <div class="app-sidebar-scroll flex-1 overflow-y-auto px-3 py-3">
        @for (group of navGroups; track group.label) {
          <div class="mb-4 last:mb-0">
            <div class="app-nav-group-label flex items-center justify-between px-2 mb-1">
              <span class="text-xs font-medium uppercase tracking-wider">{{ group.label }}</span>
              @if (group.action) {
                <button
                  type="button"
                  class="flex items-center justify-center w-5 h-5 rounded text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
                  <i class="lucide-font icon-plus" style="font-size: 0.8rem"></i>
                </button>
              }
            </div>

            <ul class="list-none m-0 p-0">
              @for (item of group.items; track item.label) {
                @if (itemVisivel(item)) {
                <li>
                  @if (item.routerLink) {
                    <a
                      [routerLink]="item.routerLink"
                      routerLinkActive="app-nav-active"
                      [routerLinkActiveOptions]="{ exact: true }"
                      (click)="onNavigate()"
                      class="app-nav-link">
                      <i class="lucide-font icon-{{ item.icon }}" style="font-size: 1rem"></i>
                      <span class="app-nav-text flex-1 truncate">{{ item.label }}</span>
                      @if (item.badge) {
                        <span class="app-nav-badge app-nav-text">{{ item.badge }}</span>
                      }
                    </a>
                  } @else if (item.subItems) {
                    <button type="button" class="app-nav-link w-full" (click)="onGroupClick(item.label)">
                      <i class="lucide-font icon-{{ item.icon }}" style="font-size: 1rem"></i>
                      <span class="app-nav-text flex-1 truncate text-left">{{ item.label }}</span>
                      <i
                        class="app-nav-chevron lucide-font icon-chevron-down transition-transform"
                        style="font-size: 0.8rem"
                        [class.rotate-180]="isExpanded(item.label)"></i>
                    </button>
                    @if (isExpanded(item.label)) {
                      <ul class="app-nav-sublist list-none m-0 p-0 mt-0.5">
                        @for (sub of item.subItems; track sub.label) {
                          @if (temAcesso(sub)) {
                            <li>
                              <a
                                [routerLink]="sub.routerLink"
                                routerLinkActive="app-nav-active"
                                [routerLinkActiveOptions]="{ exact: true }"
                                (click)="onNavigate()"
                                class="app-nav-sublink">
                                <i class="lucide-font icon-{{ sub.icon }}" style="font-size: 0.95rem"></i>
                                <span class="flex-1 truncate">{{ sub.label }}</span>
                              </a>
                            </li>
                          }
                        }
                      </ul>
                    }
                  } @else {
                    <button type="button" class="app-nav-link w-full" [class.app-nav-active]="item.isActive">
                      <i class="lucide-font icon-{{ item.icon }}" style="font-size: 1rem"></i>
                      <span class="app-nav-text flex-1 truncate text-left">{{ item.label }}</span>
                      @if (item.badge) {
                        <span class="app-nav-badge app-nav-text">{{ item.badge }}</span>
                      }
                    </button>
                  }
                </li>
                }
              }
            </ul>
          </div>
        }
      </div>

      <div class="app-sidebar-footer">
        <p-avatar [label]="usuarioIniciais()" shape="circle" styleClass="app-sidebar-avatar" />
        <span class="app-sidebar-user" [pTooltip]="tooltipUsuario()" tooltipPosition="top" tooltipStyleClass="tooltip-multilinha">
          <span class="app-sidebar-user-name">{{ nomeUsuario() }}</span>
          <span class="app-sidebar-user-sub">v{{ versaoApp }}{{ apelidoUsuario() ? " · " + apelidoUsuario() : "" }}</span>
        </span>
        <button type="button" class="app-sidebar-logout" aria-label="Sair" (click)="confirmarLogout()">
          <i class="lucide-font icon-log-out"></i>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        color: #fff;
      }

      .app-sidebar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        height: 4rem;
        margin: 0 1rem;
        padding: 0 0.25rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        flex-shrink: 0;
      }

      .app-sidebar-brand {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        min-width: 0;
      }

      .app-sidebar-title {
        font-size: 1.05rem;
        font-weight: 700;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .app-filial-wrap {
        position: relative;
        margin: 1rem 1rem 0;
        flex-shrink: 0;
      }

      .app-filial {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        width: 100%;
        padding: 0.6rem 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 0.8rem;
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
        text-align: left;
        cursor: pointer;
      }

      .app-filial:hover,
      .app-filial.aberto {
        background: rgba(255, 255, 255, 0.14);
      }

      .app-filial-dot {
        width: 0.5rem;
        height: 0.5rem;
        flex-shrink: 0;
        border-radius: 50%;
        background: #10b981;
        animation: app-filial-pulso 2s ease-out infinite;
      }

      /* Pulso suave: um anel verde que se expande e some. */
      @keyframes app-filial-pulso {
        0% {
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6);
        }
        70%,
        100% {
          box-shadow: 0 0 0 0.45rem rgba(16, 185, 129, 0);
        }
      }


      /* Só aparece com o menu recuado: o código da filial no lugar do nome. */
      .app-filial-mini {
        display: none;
        font-size: 0.8rem;
        font-weight: 700;
      }

      .app-filial-texto {
        display: flex;
        flex: 1;
        flex-direction: column;
        min-width: 0;
        line-height: 1.2;
      }

      .app-filial-nome,
      .app-filial-sub {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .app-filial-nome {
        font-size: 0.875rem;
        font-weight: 600;
      }

      .app-filial-sub {
        font-size: 0.72rem;
        color: rgba(210, 220, 245, 0.7);
      }

      .app-filial-chevron {
        font-size: 0.9rem;
        color: rgba(210, 220, 245, 0.75);
      }

      .app-filial-lista {
        position: absolute;
        left: 0;
        right: 0;
        top: calc(100% + 0.4rem);
        z-index: 1000;
        margin: 0;
        padding: 0.35rem;
        list-style: none;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 0.8rem;
        background: #0a2a7a;
        box-shadow: 0 12px 28px rgba(3, 12, 45, 0.45);
      }

      .app-filial-opcao {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        width: 100%;
        padding: 0.55rem 0.65rem;
        border: 0;
        border-radius: 0.6rem;
        background: transparent;
        color: rgba(230, 236, 252, 0.85);
        font-size: 0.875rem;
        cursor: pointer;
      }

      .app-filial-opcao:hover,
      .app-filial-opcao.ativa {
        background: rgba(255, 255, 255, 0.14);
        color: #fff;
      }

      .app-filial-cod {
        min-width: 1.8rem;
        padding: 0.05rem 0.4rem;
        border-radius: 0.4rem;
        background: rgba(255, 255, 255, 0.14);
        font-size: 0.75rem;
        font-weight: 600;
        text-align: center;
      }

      .app-sidebar-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.4rem;
        height: 2.4rem;
        flex-shrink: 0;
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 0.7rem;
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.9);
        font-size: 1.15rem;
        cursor: pointer;
        transition:
          background-color var(--element-transition-duration),
          border-color var(--element-transition-duration);
      }

      .app-sidebar-toggle-icon {
        width: 1.2rem;
        height: 1.2rem;
      }

      .app-sidebar-toggle:hover {
        background: rgba(255, 255, 255, 0.16);
        border-color: rgba(255, 255, 255, 0.3);
        color: #fff;
      }

      .app-nav-link {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        padding: 0.8rem 1rem;
        margin-bottom: 0.25rem;
        border: 0;
        position: relative;
        border-radius: 0.9rem;
        background: transparent;
        color: rgba(210, 220, 245, 0.72);
        font-size: 1.05rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color var(--element-transition-duration);
      }

      .app-nav-link:hover {
        background-color: rgba(255, 255, 255, 0.08);
      }

      .app-nav-active,
      .app-nav-active:hover {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.06) 100%);
        box-shadow:
          inset 0 0 0 1px rgba(255, 255, 255, 0.16),
          inset 0 1px 0 rgba(255, 255, 255, 0.12);
        color: #fff;
      }

      .app-nav-link.app-nav-active::before {
        content: "";
        position: absolute;
        left: 0;
        top: 24%;
        bottom: 24%;
        width: 3px;
        border-radius: 0 3px 3px 0;
        background: #fff;
      }

      .app-nav-group-label {
        color: rgba(210, 220, 245, 0.5);
      }

      .app-nav-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.25rem;
        height: 1.25rem;
        padding: 0 0.4rem;
        border-radius: 999px;
        background-color: #ff6600;
        color: #fff;
        font-size: 0.7rem;
        font-weight: 700;
      }

      .app-nav-sublink {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        width: 100%;
        text-align: left;
        padding: 0.55rem 0.75rem 0.55rem 2.6rem;
        margin-bottom: 0.15rem;
        border-radius: 0.75rem;
        color: rgba(210, 220, 245, 0.72);
        font-size: 0.9375rem;
        cursor: pointer;
      }

      .app-nav-sublink:hover {
        background-color: rgba(255, 255, 255, 0.08);
      }

      .app-sidebar-footer {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin: 0 1rem;
        padding: 1rem 0.25rem;
        border-top: 1px solid rgba(255, 255, 255, 0.12);
        flex-shrink: 0;
      }

      :host ::ng-deep .app-sidebar-avatar {
        width: 2.5rem;
        height: 2.5rem;
        background: #fff;
        color: #0b2a5b;
        font-weight: 800;
      }

      .app-sidebar-user {
        flex: 1;
        min-width: 0;
        line-height: 1.2;
      }

      .app-sidebar-user-name,
      .app-sidebar-user-sub {
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .app-sidebar-user-name {
        font-size: 0.907rem;
        font-weight: 700;
        color: #fff;
      }

      .app-sidebar-user-sub {
        font-size: 0.764rem;
        color: rgba(210, 220, 245, 0.72);
      }

      .app-sidebar-logout {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.2rem;
        height: 2.2rem;
        border: 0;
        border-radius: 0.6rem;
        background: transparent;
        color: rgba(210, 220, 245, 0.85);
        cursor: pointer;
      }

      .app-sidebar-logout:hover {
        background-color: rgba(255, 255, 255, 0.1);
        color: #fff;
      }

      /* Modo recolhido (só desktop): só ícones, avatar e botão de expandir. */
      @media (min-width: 992px) {
        :host-context(.layout-static.layout-static-inactive) .app-sidebar-header {
          justify-content: center;
          margin: 0 0.75rem;
          padding: 0;
        }

        :host-context(.layout-static.layout-static-inactive) .app-sidebar-brand,
        :host-context(.layout-static.layout-static-inactive) .app-filial-texto,
        :host-context(.layout-static.layout-static-inactive) .app-filial-chevron,
        :host-context(.layout-static.layout-static-inactive) .app-filial-lista,
        :host-context(.layout-static.layout-static-inactive) .app-nav-text,
        :host-context(.layout-static.layout-static-inactive) .app-nav-chevron,
        :host-context(.layout-static.layout-static-inactive) .app-nav-sublist,
        :host-context(.layout-static.layout-static-inactive) .app-nav-group-label,
        :host-context(.layout-static.layout-static-inactive) .app-sidebar-user,
        :host-context(.layout-static.layout-static-inactive) .app-sidebar-logout {
          display: none;
        }

        :host-context(.layout-static.layout-static-inactive) .app-filial-wrap {
          margin: 1rem 0.75rem 0;
        }

        :host-context(.layout-static.layout-static-inactive) .app-filial {
          justify-content: center;
          gap: 0.3rem;
          padding: 0.6rem 0.25rem;
        }

        :host-context(.layout-static.layout-static-inactive) .app-filial-mini {
          display: inline;
        }

        :host-context(.layout-static.layout-static-inactive) .app-sidebar-scroll {
          padding-left: 0.75rem;
          padding-right: 0.75rem;
        }

        :host-context(.layout-static.layout-static-inactive) .app-nav-link.app-nav-active::before {
          display: none;
        }

        :host-context(.layout-static.layout-static-inactive) .app-nav-link {
          justify-content: center;
          padding: 0.8rem 0;
        }

        :host-context(.layout-static.layout-static-inactive) .app-sidebar-footer {
          justify-content: center;
          margin: 0 0.75rem;
          padding: 1rem 0;
        }
      }
    `,
  ],
})
export class AppMenu {
  private router = inject(Router);
  private alertService = inject(AlertService);
  layoutService = inject(LayoutService);
  private direitosService = inject(DireitosService);
  filialService = inject(FilialService);

  filialAberta = signal(false);

  private expandedLabels: WritableSignal<Set<string>>;

  navGroups = NAV_GROUPS;

  versaoApp = environment.version;

  nomeProjeto = "Projeto Inicial";

  constructor() {
    // Expande de cara o grupo cujo sub-item bate com a rota atual — senão, ao recarregar a
    // página numa rota de submenu, o menu abriria fechado e sem indicar onde o usuário está.
    const url = this.router.url;
    const itemAtivo = NAV_GROUPS.flatMap((g) => g.items).find((item) =>
      item.subItems?.some((sub) => url.startsWith(sub.routerLink)),
    );
    this.expandedLabels = signal<Set<string>>(new Set(itemAtivo ? [itemAtivo.label] : []));
  }

  // Mesmo texto do tooltip do botão de trocar filial da topbar: empresa (banco) e filial ativa.
  tooltipFilial(): string {
    const filial = this.filialService.filialAtiva();
    if (!filial) return "Trocar de filial";
    const codbd = localStorage.getItem("lsCodBd");
    const nomedb = localStorage.getItem("lsNomeDb");
    const empresa = [codbd, nomedb].filter(Boolean).join(" - ");
    const linhas = [empresa ? `Empresa: ${empresa}` : "", `Filial: ${filial.codemp} - ${filial.nomexibeemp}`];
    return linhas.filter(Boolean).join("\n");
  }

  // Nome da empresa (banco) escolhida na configuração da API; sem ele, usa o nome da filial.
  nomeEmpresa(): string {
    return localStorage.getItem("lsNomeDb") || this.filialService.filialAtiva()?.nomexibeemp || "";
  }

  // A filial vai no appKey de toda chamada à API e muda os direitos; por isso, depois de trocar
  // (e recarregar os direitos), a página inteira é recarregada pra nada ficar com dados da
  // filial anterior.
  async trocarFilial(codemp: string): Promise<void> {
    this.filialAberta.set(false);
    if (codemp === this.filialService.filialAtiva()?.codemp) return;
    const filial = this.filialService.filiais().find((f) => f.codemp === codemp);
    if (!filial) return;
    await this.filialService.selecionarFilial(filial);
    window.location.reload();
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(evento: MouseEvent) {
    if (this.filialAberta() && !(evento.target as HTMLElement).closest(".app-filial-wrap")) {
      this.filialAberta.set(false);
    }
  }

  @HostListener("document:keydown.escape")
  onEscape() {
    this.filialAberta.set(false);
  }

  private sessao(): any {
    try {
      return JSON.parse(localStorage.getItem("Sessao") || "{}");
    } catch {
      return {};
    }
  }

  // Dados do usuário gravados no login (Sessao); sem eles, cai no código de usuário.
  nomeUsuario() {
    const sessao = this.sessao();
    return sessao.nome || sessao.nomvend || sessao.apelido || localStorage.getItem("lsUsuario") || "Usuário";
  }

  // Tooltip do rodapé: versão + e-mail e telefone do usuário, quando houver.
  tooltipUsuario(): string {
    const sessao = this.sessao();
    return [`v${this.versaoApp}`, sessao.email, sessao.fone].filter(Boolean).join("\n");
  }

  apelidoUsuario(): string {
    return this.sessao().apelido || "";
  }

  usuarioIniciais() {
    const nome = this.nomeUsuario().trim();
    const partes = nome.split(/\s+/).filter(Boolean);
    if (partes.length >= 2) {
      return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    }
    return nome.slice(0, 2).toUpperCase();
  }

  isCollapsed(): boolean {
    const state = this.layoutService.layoutState();
    return this.layoutService.isDesktop() && !this.layoutService.isOverlay() && state.staticMenuDesktopInactive;
  }

  // No modo recolhido não há onde mostrar o submenu: expande o menu e abre o grupo clicado.
  onGroupClick(label: string): void {
    if (this.isCollapsed()) {
      this.layoutService.onMenuToggle();
      this.expandedLabels.update((prev) => new Set(prev).add(label));
      return;
    }
    this.toggleExpanded(label);
  }

  temAcesso(item: NavItem | NavSubItem): boolean {
    return !item.direito || this.direitosService.acesso(item.direito.modulo, item.direito.tipo);
  }

  // Um item com sub-itens só aparece se ele mesmo tiver acesso E pelo menos um sub-item também
  // tiver — senão o menu abriria um grupo vazio (todos os filhos escondidos por permissão).
  itemVisivel(item: NavItem): boolean {
    if (!this.temAcesso(item)) return false;
    return !item.subItems || item.subItems.some((sub) => this.temAcesso(sub));
  }

  isExpanded(label: string): boolean {
    return this.expandedLabels().has(label);
  }

  toggleExpanded(label: string): void {
    this.expandedLabels.update((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  onNavigate(): void {
    this.layoutService.layoutState.update((val) => ({
      ...val,
      overlayMenuActive: false,
      staticMenuMobileActive: false,
      mobileMenuActive: false,
      menuHoverActive: false,
    }));
  }

  async confirmarLogout() {
    const confirmacao = await this.alertService.createAlertConfirm(
      "Aviso!",
      "Deseja realmente fazer log-out?",
      "Sim",
      "Não",
    );
    if (!confirmacao.isConfirmed) {
      return;
    }

    localStorage.removeItem("Sessao");
    localStorage.removeItem("lsFilial");
    localStorage.removeItem("lsUsuario");
    localStorage.removeItem("FILIAIS");
    localStorage.removeItem("dataFilial");
    localStorage.removeItem("parexigenumpedite");
    localStorage.removeItem("token");
    localStorage.removeItem("acessoH");

    // DireitosService é singleton (providedIn: root) e sobrevive à navegação até a tela de
    // login — sem zerar o estado em memória aqui, o próximo login reaproveitava os direitos
    // do usuário anterior.
    this.direitosService.limparSessao();
    this.filialService.limparSessao();

    this.onNavigate();
    this.router.navigate(["/auth/login"]);
  }
}
