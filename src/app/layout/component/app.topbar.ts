import { Component, ElementRef, HostListener, ViewChild, inject, signal } from "@angular/core";
import { NavigationEnd, Router, RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";
import { StyleClassModule } from "primeng/styleclass";
import { PopoverModule } from "primeng/popover";
import { TooltipModule } from "primeng/tooltip";
import { filter } from "rxjs";
import { LayoutService } from "@/app/layout/service/layout.service";
import { PrimeModule } from "@/app/prime.module";
import { AppConfigurator } from "./app.configurator";
import { FilialService } from "@/app/service/filial.service";
import { NAV_GROUPS } from "@/app/layout/nav-items";

@Component({
  selector: "app-topbar",
  standalone: true,
  imports: [RouterModule, CommonModule, StyleClassModule, PopoverModule, PrimeModule, AppConfigurator, TooltipModule],
  template: `
    <app-configurator />
    <div class="layout-topbar">
      <button class="layout-menu-button layout-topbar-action" (click)="layoutService.onMenuToggle()">
        <i class="pi pi-bars"></i>
      </button>

      <div class="topbar-titulo">
        <h1 class="topbar-titulo-texto">{{ titulo() }}</h1>
        @if (subtitulo()) {
          <span class="topbar-subtitulo">{{ subtitulo() }}</span>
        }
      </div>

      <div class="topbar-acoes">
        <div class="topbar-busca" [class.aberta]="buscaAberta()">
          <button
            type="button"
            class="topbar-busca-icone"
            aria-label="Buscar"
            pTooltip="Buscar (Ctrl K)"
            tooltipPosition="bottom"
            (click)="buscaAberta() ? fecharBusca() : abrirBusca()">
            <i class="lucide-font icon-search"></i>
          </button>
          <input
            #busca
            type="text"
            placeholder="Buscar venda, cliente ou produto"
            [tabindex]="buscaAberta() ? 0 : -1"
            (blur)="aoSairDaBusca()"
            (keydown.escape)="fecharBusca()" />
          <kbd>Ctrl K</kbd>
        </div>

        @if (filialService.filiais().length > 0) {
          <div class="topbar-filial-wrap">
            <div class="topbar-filial" [class.aberta]="filialAberta()">
              <button
                type="button"
                class="topbar-filial-icone"
                aria-label="Trocar de filial"
                [pTooltip]="tooltipFilial()"
                tooltipPosition="bottom"
                tooltipStyleClass="tooltip-multilinha"
                aria-haspopup="listbox"
                [attr.aria-expanded]="filialAberta()"
                (click)="filialAberta.set(!filialAberta())">
                <i class="lucide-font icon-building-2"></i>
              </button>
              <span class="topbar-filial-texto">
                <span class="topbar-filial-label">Filial</span>
                <span class="topbar-filial-nome">
                  {{ filialService.filialAtiva()?.codemp }} - {{ filialService.filialAtiva()?.nomexibeemp }}
                </span>
              </span>
            </div>

            @if (filialAberta()) {
              <ul class="topbar-filial-lista" role="listbox">
                @for (filial of filialService.filiais(); track filial.codemp) {
                  <li>
                    <button
                      type="button"
                      role="option"
                      class="topbar-filial-opcao"
                      [class.ativa]="filial.codemp === filialService.filialAtiva()?.codemp"
                      [attr.aria-selected]="filial.codemp === filialService.filialAtiva()?.codemp"
                      (click)="trocarFilial(filial.codemp)">
                      <span class="topbar-filial-cod">{{ filial.codemp }}</span>
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

        <button
          type="button"
          class="topbar-icone"
          [attr.aria-label]="layoutService.isDarkTheme() ? 'Modo claro' : 'Modo noturno'"
          [pTooltip]="layoutService.isDarkTheme() ? 'Modo claro' : 'Modo noturno'"
          tooltipPosition="bottom"
          (click)="toggleDarkMode()">
          <i class="lucide-font" [class.icon-moon]="!layoutService.isDarkTheme()" [class.icon-sun]="layoutService.isDarkTheme()"></i>
        </button>
        <button
          type="button"
          class="topbar-icone"
          aria-label="Mensagens"
          pTooltip="Mensagens"
          tooltipPosition="bottom">
          <i class="lucide-font icon-message-square"></i>
        </button>
        <button
          type="button"
          class="topbar-icone"
          aria-label="Notificações"
          pTooltip="Notificações"
          tooltipPosition="bottom">
          <i class="lucide-font icon-bell"></i>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      /* O tooltip é renderizado no <body>, fora do componente — por isso o ::ng-deep sem :host. */
      ::ng-deep .tooltip-multilinha {
        max-width: none;
        white-space: pre;
      }

      .topbar-titulo {
        display: flex;
        flex-direction: column;
        min-width: 0;
        line-height: 1.2;
      }

      .topbar-titulo-texto {
        margin: 0;
        font-size: 1.6rem;
        font-weight: 700;
        color: #0b2a5b;
      }

      .topbar-subtitulo {
        font-size: 0.8rem;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .topbar-acoes {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-left: auto;
      }

      /* Recolhida é só um botão de ícone (igual aos outros); aberta, expande com transição
         e mostra o campo de busca já com o foco. */
      .topbar-busca {
        display: flex;
        align-items: center;
        overflow: hidden;
        width: 2.75rem;
        height: 2.75rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        background: #fff;
        color: #0b2a5b;
        transition:
          width 0.3s cubic-bezier(0.22, 1, 0.36, 1),
          border-color 0.2s;
      }

      .topbar-busca.aberta {
        width: 22rem;
        border-color: #0b2a5b;
      }

      .topbar-busca-icone {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 2.65rem;
        height: 100%;
        border: 0;
        background: transparent;
        color: inherit;
        font-size: 1.1rem;
        cursor: pointer;
      }

      .topbar-busca input {
        flex: 1;
        min-width: 0;
        border: 0;
        outline: 0;
        background: transparent;
        font-size: 0.875rem;
        color: #0f172a;
        opacity: 0;
        transition: opacity 0.2s;
      }

      .topbar-busca.aberta input {
        opacity: 1;
        transition-delay: 0.1s;
      }

      .topbar-busca kbd {
        flex-shrink: 0;
        margin-right: 0.6rem;
        padding: 0.1rem 0.4rem;
        border-radius: 0.4rem;
        background: #f1f5f9;
        font-family: inherit;
        font-size: 0.7rem;
        color: #64748b;
        opacity: 0;
        transition: opacity 0.2s;
      }

      .topbar-busca.aberta kbd {
        opacity: 1;
      }

      /* Mesmo efeito da busca: recolhida é só o ícone; aberta, expande mostrando a filial
         atual e a lista pra trocar. */
      .topbar-filial-wrap {
        position: relative;
      }

      .topbar-filial {
        display: flex;
        align-items: center;
        overflow: hidden;
        width: 2.75rem;
        height: 2.75rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        background: #fff;
        color: #0b2a5b;
        transition:
          width 0.3s cubic-bezier(0.22, 1, 0.36, 1),
          border-color 0.2s;
      }

      .topbar-filial.aberta {
        width: 18rem;
        border-color: #0b2a5b;
      }

      .topbar-filial-icone {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 2.65rem;
        height: 100%;
        border: 0;
        background: transparent;
        color: inherit;
        font-size: 1.1rem;
        cursor: pointer;
      }

      .topbar-filial-texto {
        display: flex;
        flex-direction: column;
        min-width: 0;
        padding-right: 0.75rem;
        line-height: 1.15;
        opacity: 0;
        transition: opacity 0.2s;
      }

      .topbar-filial.aberta .topbar-filial-texto {
        opacity: 1;
        transition-delay: 0.1s;
      }

      .topbar-filial-label {
        font-size: 0.68rem;
        color: #64748b;
      }

      .topbar-filial-nome {
        font-size: 0.85rem;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .topbar-filial-lista {
        position: absolute;
        right: 0;
        top: calc(100% + 0.5rem);
        z-index: 1000;
        width: 18rem;
        margin: 0;
        padding: 0.35rem;
        list-style: none;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        background: #fff;
        box-shadow: 0 12px 28px rgba(11, 42, 91, 0.16);
      }

      .topbar-filial-opcao {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        width: 100%;
        padding: 0.55rem 0.65rem;
        border: 0;
        border-radius: 0.6rem;
        background: transparent;
        color: #0f172a;
        font-size: 0.875rem;
        cursor: pointer;
      }

      .topbar-filial-opcao:hover,
      .topbar-filial-opcao.ativa {
        background: #f1f5f9;
      }

      .topbar-filial-opcao.ativa {
        font-weight: 600;
      }

      .topbar-filial-cod {
        min-width: 1.8rem;
        padding: 0.05rem 0.4rem;
        border-radius: 0.4rem;
        background: #e2e8f0;
        font-size: 0.75rem;
        font-weight: 600;
        text-align: center;
      }

      .topbar-icone {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.75rem;
        height: 2.75rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        background: #fff;
        color: #0b2a5b;
        font-size: 1.1rem;
        cursor: pointer;
      }

      .topbar-icone:hover {
        background: #f1f5f9;
      }

      :host-context(.app-dark) .topbar-titulo-texto {
        color: #f1f5f9;
      }

      :host-context(.app-dark) .topbar-subtitulo {
        color: #94a3b8;
      }

      :host-context(.app-dark) .topbar-busca.aberta,
      :host-context(.app-dark) .topbar-filial.aberta {
        border-color: #94a3b8;
      }

      :host-context(.app-dark) .topbar-filial {
        border-color: #334155;
        background: #0f172a;
        color: #cbd5e1;
      }

      :host-context(.app-dark) .topbar-filial-label {
        color: #94a3b8;
      }

      :host-context(.app-dark) .topbar-filial-lista {
        border-color: #334155;
        background: #0f172a;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5);
      }

      :host-context(.app-dark) .topbar-filial-opcao {
        color: #e2e8f0;
      }

      :host-context(.app-dark) .topbar-filial-opcao:hover,
      :host-context(.app-dark) .topbar-filial-opcao.ativa {
        background: #1e293b;
      }

      :host-context(.app-dark) .topbar-filial-cod {
        background: #1e293b;
      }

      :host-context(.app-dark) .topbar-busca,
      :host-context(.app-dark) .topbar-icone {
        border-color: #334155;
        background: #0f172a;
        color: #cbd5e1;
      }

      :host-context(.app-dark) .topbar-busca input {
        color: #f1f5f9;
      }

      :host-context(.app-dark) .topbar-busca kbd {
        background: #1e293b;
        color: #94a3b8;
      }

      :host-context(.app-dark) .topbar-icone:hover {
        background: #1e293b;
      }

      @media (max-width: 991px) {
        .topbar-titulo-texto {
          font-size: 1.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      @media (max-width: 575px) {
        .topbar-busca.aberta {
          width: min(22rem, calc(100vw - 9rem));
        }

        .topbar-filial.aberta,
        .topbar-filial-lista {
          width: min(18rem, calc(100vw - 9rem));
        }
      }
    `,
  ],
})
export class AppTopbar {
  layoutService = inject(LayoutService);
  filialService = inject(FilialService);
  private router = inject(Router);

  @ViewChild("busca") busca?: ElementRef<HTMLInputElement>;

  titulo = signal("");
  subtitulo = signal("");

  buscaAberta = signal(false);
  filialAberta = signal(false);

  // Dados da filial selecionada (e da empresa/banco da API) no tooltip do botão de troca.
  tooltipFilial(): string {
    const filial = this.filialService.filialAtiva();
    if (!filial) return "Trocar de filial";
    const codbd = localStorage.getItem("lsCodBd");
    const nomedb = localStorage.getItem("lsNomeDb");
    const empresa = [codbd, nomedb].filter(Boolean).join(" - ");
    const linhas = [empresa ? `Empresa: ${empresa}` : "", `Filial: ${filial.codemp} - ${filial.nomexibeemp}`];
    return linhas.filter(Boolean).join("\n");
  }

  // Fecha a lista de filiais ao clicar fora dela ou com Esc.
  @HostListener("document:click", ["$event"])
  onDocumentClick(evento: MouseEvent) {
    if (this.filialAberta() && !(evento.target as HTMLElement).closest(".topbar-filial-wrap")) {
      this.filialAberta.set(false);
    }
  }

  @HostListener("document:keydown.escape")
  onEscape() {
    this.filialAberta.set(false);
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

  // Ctrl K abre a busca (com o campo já focado).
  @HostListener("document:keydown.control.k", ["$event"])
  focarBusca(evento: Event) {
    evento.preventDefault();
    this.abrirBusca();
  }

  abrirBusca() {
    this.buscaAberta.set(true);
    // Foca no próximo frame, pra o campo já estar visível quando a transição começa.
    requestAnimationFrame(() => this.busca?.nativeElement.focus());
  }

  fecharBusca() {
    this.buscaAberta.set(false);
    this.busca?.nativeElement.blur();
  }

  // Ao perder o foco, recolhe — a não ser que ainda tenha texto digitado.
  aoSairDaBusca() {
    if (!this.busca?.nativeElement.value) {
      this.buscaAberta.set(false);
    }
  }

  constructor() {
    // A topbar existe em todas as telas, então é ela que carrega a lista de filiais (e seleciona
    // a primeira no primeiro acesso, o que também carrega os direitos). A troca de filial fica no menu lateral.
    this.filialService.carregarFiliais();

    this.atualizarTitulo(this.router.url);
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => this.atualizarTitulo((e as NavigationEnd).urlAfterRedirects));
  }

  // O título é o rótulo do item de menu da rota atual; no início, o subtítulo traz a data.
  private atualizarTitulo(url: string) {
    const path = url.split("?")[0];
    const itens = NAV_GROUPS.flatMap((g) => g.items.flatMap((i) => [i, ...(i.subItems ?? [])]));
    const item = itens.find((i) => i.routerLink === path);
    this.titulo.set(path === "/" ? this.saudacao() : (item?.label ?? ""));
    this.subtitulo.set(path === "/" ? this.dataHoje() : "");
  }

  // No início o título é "Olá, <nome>": apelido/nome da Sessao gravada no login (se o projeto
  // gravar uma) ou, senão, o usuário de login.
  private saudacao(): string {
    let sessao: any = {};
    try {
      sessao = JSON.parse(localStorage.getItem("Sessao") || "{}");
    } catch {}
    const nome = (sessao.nome || sessao.apelido || sessao.nomvend || localStorage.getItem("lsUsuario") || "")
      .replace(/[\s-]+$/, "")
      .trim();
    return nome ? `Olá, ${nome}` : "Olá";
  }

  private dataHoje(): string {
    const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    const texto = hoje.replace("-feira", "");
    return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}`;
  }

  toggleDarkMode() {
    this.layoutService.layoutConfig.update((state) => ({
      ...state,
      darkTheme: !state.darkTheme,
    }));
  }
}
