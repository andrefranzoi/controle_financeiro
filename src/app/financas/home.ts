import { NgTemplateOutlet } from "@angular/common";
import { Component, OnInit, computed, effect, inject, signal, untracked } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { AvisoService } from "./aviso.service";
import { marcaDe } from "./brand-icons";
import { CalendarioMes } from "./calendario-mes";
import { CategoriaIcone } from "./categoria-icone";
import { ContasService, LinhaHistorico } from "./contas.service";
import { vibrar } from "./feedback";
import { LancamentoRapidoService } from "./lancamento-rapido.service";
import { LinhaDeslizavel } from "./linha-deslizavel";
import { Conta, Tipo } from "./models";
import { PerfilService } from "./perfil.service";
import { ValorAnimado } from "./valor-animado";
import { ValorRealService } from "./valor-real.service";
import { fmtData, fmtDataLonga, fmtMoney, hoje, mesAtual, mesesEntre, nomeMes, quandoVence, somaMes } from "./format";

type Filtro = "todas" | "pagar" | "receber";

const pct = (parte: number, total: number) => (total > 0 ? Math.min(100, Math.round((parte / total) * 100)) : 0);
const COR_PADRAO = "#94a3b8";

@Component({
  selector: "app-home",
  imports: [RouterLink, NgTemplateOutlet, CategoriaIcone, ValorAnimado, LinhaDeslizavel, CalendarioMes],
  template: `
    <div class="mx-auto max-w-xl pb-10">
      <!-- Topo: saudação, mês, saldo e atalhos -->
      <header class="hero-gradient rounded-b-[2rem] px-5 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))] text-white">
        <div class="text-sm font-medium text-white/90">{{ perfil.primeiroNome() ? "Olá, " + perfil.primeiroNome() + "!" : "Controle Financeiro" }}</div>
        <div class="mt-2 flex items-center justify-between">
          <button type="button" class="toque flex h-11 w-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/25" aria-label="Mês anterior" (click)="mudarMes(-1)">
            <i class="lucide-font icon-chevron-left text-xl" aria-hidden="true"></i>
          </button>
          <div role="heading" aria-level="1" aria-live="polite" class="text-lg font-semibold">{{ titulo() }}</div>
          <button type="button" class="toque flex h-11 w-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/25" aria-label="Próximo mês" (click)="mudarMes(1)">
            <i class="lucide-font icon-chevron-right text-xl" aria-hidden="true"></i>
          </button>
        </div>
        <div class="mt-4 text-sm text-white/90">Saldo previsto</div>
        <div class="mt-1 text-5xl font-bold tracking-tight" [valorAnimado]="saldoPrevisto()"></div>
        <div class="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs">
          No bolso agora <strong [valorAnimado]="resumo().recebido - resumo().pago"></strong>
        </div>

        <nav class="mt-6 grid grid-cols-4 gap-2" aria-label="Atalhos">
          @for (a of atalhos; track a.rotulo; let i = $index) {
            <ng-container [ngTemplateOutlet]="atalhoTpl" [ngTemplateOutletContext]="{ $implicit: a, primeiro: i === 0 }" />
          }
        </nav>
      </header>

      <ng-template #atalhoTpl let-a let-primeiro="primeiro">
        @if (a.rota) {
          <a [routerLink]="a.rota" class="toque group flex flex-col items-center gap-2 py-1 text-xs font-medium text-white/90">
            <span class="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition-colors group-hover:bg-white/20">
              <i class="lucide-font text-2xl" [class]="'icon-' + a.icone" aria-hidden="true"></i>
            </span>
            {{ a.rotulo }}
          </a>
        } @else {
          <button type="button" class="toque group flex flex-col items-center gap-2 py-1 text-xs font-medium text-white/90" (click)="rapido.abrir()">
            <span class="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-200 text-emerald-950 ring-1 ring-emerald-100/40 transition-colors group-hover:bg-emerald-100">
              <i class="lucide-font text-2xl" [class]="'icon-' + a.icone" aria-hidden="true"></i>
            </span>
            {{ a.rotulo }}
          </button>
        }
      </ng-template>

      @if (perfil.carregado() && !perfil.completo()) {
        <a routerLink="/minha-conta" class="relative z-10 mx-4 mt-4 flex min-h-12 items-center gap-3 rounded-2xl bg-amber-100 px-4 text-sm font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <i class="lucide-font icon-user-round text-xl" aria-hidden="true"></i>
          Complete seu cadastro
          <i class="lucide-font icon-chevron-right ml-auto" aria-hidden="true"></i>
        </a>
      }

      <!-- Bento: cartões de tamanhos diferentes -->
      <div class="relative -mt-10 mx-4 grid grid-cols-2 gap-3" [class.mt-4]="perfil.carregado() && !perfil.completo()">
        <!-- Visão geral (2 colunas) -->
        <section class="entrar col-span-2 rounded-2xl bg-surface-0 p-4 shadow-md dark:bg-surface-900" style="--i: 0">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-widest text-muted-color">Visão geral</span>
            <span class="text-xs text-muted-color">{{ resumo().receber + resumo().pagar > 0 ? "Receitas x Despesas" : "Sem lançamentos" }}</span>
          </div>
          <div class="mt-3 flex h-3 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
            <div class="barra-cresce h-full bg-green-500" [style.width.%]="barraReceita()"></div>
            <div class="barra-cresce h-full bg-red-500" [style.width.%]="barraDespesa()"></div>
          </div>
          <div class="mt-3 flex flex-col gap-2 text-sm">
            <div class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full bg-green-500"></span>
              <span class="flex-1 text-muted-color">Receitas</span>
              <span class="font-medium" [valorAnimado]="resumo().receber"></span>
            </div>
            <div class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full bg-red-500"></span>
              <span class="flex-1 text-muted-color">Despesas</span>
              <span class="font-medium">- <span [valorAnimado]="resumo().pagar"></span></span>
            </div>
          </div>
        </section>

        <!-- A pagar -->
        <button type="button" class="entrar toque rounded-2xl bg-surface-0 p-3 text-left shadow-sm dark:bg-surface-900" style="--i: 1" [class.ring-2]="filtro() === 'pagar'" [class.ring-red-500]="filtro() === 'pagar'" [attr.aria-pressed]="filtro() === 'pagar'" (click)="alternarFiltro('pagar')">
          <div class="flex items-start justify-between">
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10" /><path d="M7 17 17 7" /></svg>
            </span>
            <svg class="h-7 w-16" viewBox="0 0 60 24" preserveAspectRatio="none" aria-hidden="true">
              <polyline [attr.points]="pontos(seriePagar())" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <div class="mt-2 text-xs text-muted-color">A pagar</div>
          <div class="truncate text-base font-semibold text-red-600 dark:text-red-400" [valorAnimado]="pendentePagar()"></div>
          @if (atrasadasPagar().qtd) {
            <div class="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-100 px-2 py-1.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <i class="lucide-font icon-bell mt-px shrink-0" aria-hidden="true"></i>
              <span class="leading-tight">{{ atrasadasPagar().qtd }} {{ atrasadasPagar().qtd === 1 ? "atrasada" : "atrasadas" }}<br /><strong>{{ fmt(atrasadasPagar().total) }}</strong></span>
            </div>
          } @else {
            <div class="mt-2 text-xs text-muted-color">Nenhuma atrasada</div>
          }
        </button>

        <!-- A receber -->
        <button type="button" class="entrar toque rounded-2xl bg-surface-0 p-3 text-left shadow-sm dark:bg-surface-900" style="--i: 2" [class.ring-2]="filtro() === 'receber'" [class.ring-green-500]="filtro() === 'receber'" [attr.aria-pressed]="filtro() === 'receber'" (click)="alternarFiltro('receber')">
          <div class="flex items-start justify-between">
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-950">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 7 7 17" /><path d="M17 17H7V7" /></svg>
            </span>
            <svg class="h-7 w-16" viewBox="0 0 60 24" preserveAspectRatio="none" aria-hidden="true">
              <polyline [attr.points]="pontos(serieReceber())" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <div class="mt-2 text-xs text-muted-color">A receber</div>
          <div class="truncate text-base font-semibold text-green-700 dark:text-green-400" [valorAnimado]="pendenteReceber()"></div>
          @if (atrasadasReceber().qtd) {
            <div class="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-100 px-2 py-1.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <i class="lucide-font icon-bell mt-px shrink-0" aria-hidden="true"></i>
              <span class="leading-tight">{{ atrasadasReceber().qtd }} {{ atrasadasReceber().qtd === 1 ? "atrasada" : "atrasadas" }}<br /><strong>{{ fmt(atrasadasReceber().total) }}</strong></span>
            </div>
          } @else {
            <div class="mt-2 text-xs text-muted-color">Nenhuma atrasada</div>
          }
        </button>

        <!-- Próxima conta (2 colunas) -->
        @if (proxima(); as p) {
          <section class="entrar col-span-2 flex items-center gap-2 rounded-2xl bg-surface-0 p-3 shadow-sm dark:bg-surface-900" style="--i: 3">
            <button type="button" class="toque flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl text-left" [attr.title]="'Editar ' + p.descricao" (click)="editar(p)">
              @if (marca(p); as m) {
                <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-surface-200 dark:ring-surface-700">
                  <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="m.path" [attr.fill]="'#' + m.hex" /></svg>
                </span>
              } @else {
                <app-cat-icone [icone]="p.categoria_icone" [cor]="cor(p)" [nome]="p.categoria_nome ?? p.descricao" tamanho="h-11 w-11" />
              }
              <span class="min-w-0 flex-1">
                <span class="block text-xs font-semibold uppercase tracking-widest" [class]="atrasada(p) ? 'text-amber-700 dark:text-amber-300' : 'text-muted-color'">
                  {{ atrasada(p) ? "Atrasada" : p.tipo === "pagar" ? "Próxima a pagar" : "Próxima a receber" }}
                </span>
                <span class="block truncate font-medium">{{ p.descricao }}</span>
                <span class="block truncate text-xs text-muted-color">{{ quando(p) }} · {{ valorCurto(p) }}</span>
              </span>
            </button>
            <button type="button" class="toque min-h-11 shrink-0 rounded-xl bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-800" (click)="alternarPago(p)">
              {{ p.tipo === "pagar" ? "Pagar" : "Receber" }}
            </button>
          </section>
        }

        <!-- Calendário (2 colunas) -->
        <section class="entrar col-span-2 rounded-2xl bg-surface-0 p-4 shadow-sm dark:bg-surface-900" style="--i: 4">
          <div class="mb-3 flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-widest text-muted-color">Calendário</span>
            <span class="text-xs text-muted-color">{{ diaFiltro() ? "Toque de novo no dia para limpar" : "Toque num dia para filtrar" }}</span>
          </div>
          <app-calendario-mes [mes]="mes()" [contas]="contas()" [selecionado]="diaFiltro()" (escolhido)="diaFiltro.set($event)" />
        </section>
      </div>

      <!-- Categorias -->
      @if (porCategoria().length) {
        <div class="mx-4 mt-6 flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-widest text-muted-color">Despesas por categoria</span>
          <a routerLink="/categorias" class="-mr-2 inline-flex min-h-11 items-center px-2 text-xs font-medium text-primary-700 dark:text-primary-400">Ver todas</a>
        </div>
        <div class="mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
          @for (g of porCategoria(); track g.nome; let i = $index) {
            <div class="entrar min-w-40 snap-start rounded-2xl bg-surface-0 p-3 shadow-sm dark:bg-surface-900" [style.--i]="i">
              <div class="flex items-start justify-between">
                <app-cat-icone [icone]="g.icone" [cor]="g.cor" [nome]="g.nome" tamanho="h-10 w-10" />
                <svg class="h-7 w-16" viewBox="0 0 60 24" preserveAspectRatio="none" aria-hidden="true">
                  <polyline [attr.points]="pontos(g.serie)" fill="none" [attr.stroke]="g.cor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
              <div class="mt-2 truncate text-xs text-muted-color">{{ g.nome }}</div>
              <div class="text-sm font-semibold">{{ fmt(g.total) }}</div>
              <div class="mt-1 text-xs">
                @if (g.variacao === null) {
                  <span class="text-muted-color">{{ g.pct }}% das despesas</span>
                } @else {
                  <span class="inline-flex items-center gap-1" [class]="g.variacao > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'">
                    <i class="lucide-font" [class]="g.variacao > 0 ? 'icon-trending-up' : 'icon-trending-down'" aria-hidden="true"></i>{{ abs(g.variacao) }}%
                  </span>
                  <span class="text-muted-color"> vs mês anterior</span>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Lista -->
      <div class="mx-4 mt-6 flex items-center justify-between">
        <span class="text-xs font-semibold uppercase tracking-widest text-muted-color">Contas do mês</span>
        <div class="flex gap-1 text-xs">
          @for (f of filtros; track f.valor) {
            <button
              type="button"
              class="min-h-11 rounded-full border px-3 transition-colors"
              [class]="filtro() === f.valor ? f.ativo : 'border-surface-300 dark:border-surface-700'"
              (click)="filtro.set(f.valor)">
              {{ f.label }}
            </button>
          }
        </div>
      </div>

      @if (diaFiltro(); as dia) {
        <div class="surgir mx-4 mt-2 flex">
          <button type="button" class="toque inline-flex min-h-11 items-center gap-2 rounded-full bg-primary-100 px-4 text-sm font-medium text-primary-900 dark:bg-emerald-200 dark:text-emerald-950" (click)="diaFiltro.set(null)">
            <i class="lucide-font icon-calendar" aria-hidden="true"></i>
            {{ fmtDataLonga(dia) }}
            <i class="lucide-font icon-x" aria-hidden="true"></i>
            <span class="sr-only">Limpar filtro de dia</span>
          </button>
        </div>
      }

      <label class="mx-4 mt-3 flex min-h-11 items-center gap-2 rounded-2xl bg-surface-0 px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary dark:bg-surface-900">
        <svg class="h-5 w-5 shrink-0 text-muted-color" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input class="min-w-0 flex-1 bg-transparent outline-none" type="search" aria-label="Buscar conta" placeholder="Buscar conta..." [value]="busca()" (input)="busca.set($any($event.target).value)" />
      </label>

      @if (contas().length) {
        <div class="mx-4 mt-3 px-1 text-xs text-muted-color">Toque para editar · deslize para a direita para pagar e para a esquerda para excluir.</div>
      }

      <ul class="mx-4 mt-2 divide-y divide-surface-100 overflow-hidden rounded-2xl bg-surface-0 shadow-sm dark:divide-surface-800 dark:bg-surface-900">
        @if (carregando() && !contas().length) {
          @for (i of esqueleto; track i) {
            <li class="flex items-center gap-3 px-3 py-3" aria-hidden="true">
              <span class="h-10 w-10 animate-pulse rounded-full bg-surface-200 dark:bg-surface-700"></span>
              <div class="flex-1 space-y-2">
                <div class="h-3 w-2/3 animate-pulse rounded bg-surface-200 dark:bg-surface-700"></div>
                <div class="h-3 w-1/3 animate-pulse rounded bg-surface-200 dark:bg-surface-700"></div>
              </div>
              <div class="h-4 w-16 animate-pulse rounded bg-surface-200 dark:bg-surface-700"></div>
            </li>
          }
        } @else {
          @for (c of visiveis(); track c.id; let i = $index) {
            <li class="entrar" [style.--i]="i < 8 ? i : 8">
              <app-linha-deslizavel [rotuloPagar]="c.pago_em ? 'Desfazer' : c.tipo === 'pagar' ? 'Pagar' : 'Receber'" (pagar)="alternarPago(c)" (excluir)="excluirLinha(c)">
                <div class="flex items-center pr-1">
                  <!-- A linha inteira (ícone, nome e valor) abre a edição -->
                  <button
                    type="button"
                    class="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-50 active:bg-surface-100 dark:hover:bg-surface-800/60 dark:active:bg-surface-800"
                    [attr.title]="'Editar ' + c.descricao"
                    (click)="editar(c)">
                    @if (marca(c); as m) {
                      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-surface-200 dark:ring-surface-700" [attr.title]="m.nome">
                        <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="m.path" [attr.fill]="'#' + m.hex" /></svg>
                      </span>
                    } @else {
                      <app-cat-icone [icone]="c.categoria_icone" [cor]="cor(c)" [nome]="c.categoria_nome ?? c.descricao" />
                    }
                    <span class="min-w-0 flex-1">
                      <span class="block truncate" [class.line-through]="c.pago_em" [class.opacity-60]="c.pago_em">{{ c.descricao }}</span>
                      <span class="block truncate text-xs" [class]="atrasada(c) ? 'text-red-600 dark:text-red-400' : 'text-muted-color'">
                        {{ fmtData(c.vencimento) }}@if (c.categoria_nome) { · {{ c.categoria_nome }} }@if (c.recorrencia_id) { · mensal }@if (parcela(c); as p) { · parcela {{ p }} }@if (c.estimado && !c.pago_em) { · valor estimado }@if (atrasada(c)) { · atrasada }
                      </span>
                    </span>
                    <span class="shrink-0 font-semibold" [class]="c.tipo === 'receber' ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                      {{ textoValor(c) }}
                    </span>
                  </button>
                  <button
                    type="button"
                    class="flex h-11 w-11 shrink-0 items-center justify-center"
                    [attr.aria-label]="c.pago_em ? 'Desmarcar ' + c.descricao + ' como pago' : 'Marcar ' + c.descricao + ' como pago'"
                    [attr.aria-pressed]="!!c.pago_em"
                    (click)="alternarPago(c)">
                    <span
                      class="flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all duration-200"
                      [class]="c.pago_em ? 'scale-110 border-green-700 bg-green-700 text-white' : 'border-surface-400 dark:border-surface-500'">
                      @if (c.pago_em) { <i class="surgir lucide-font icon-check text-sm" aria-hidden="true"></i> }
                    </span>
                  </button>
                </div>
              </app-linha-deslizavel>
            </li>
          } @empty {
            <li class="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <span class="flex h-14 w-14 items-center justify-center rounded-full bg-surface-100 text-muted-color dark:bg-surface-800">
                <i class="lucide-font icon-receipt text-2xl" aria-hidden="true"></i>
              </span>
              @if (!contas().length) {
                <div class="font-medium">Nenhuma conta em {{ titulo() }}</div>
                <p class="text-sm text-muted-color">Cadastre uma conta a pagar ou a receber para acompanhar o mês.</p>
                <button type="button" class="toque mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary-700 px-5 font-medium text-white hover:bg-primary-800" (click)="rapido.abrir()">
                  <i class="lucide-font icon-plus" aria-hidden="true"></i> Adicionar conta
                </button>
              } @else {
                <div class="font-medium">Nenhuma conta encontrada</div>
                <p class="text-sm text-muted-color">Tente outro filtro, dia ou busca.</p>
                <button type="button" class="mt-2 min-h-11 rounded-xl bg-surface-100 px-5 font-medium dark:bg-surface-800" (click)="limparFiltros()">Limpar filtros</button>
              }
            </li>
          }
        }
      </ul>
    </div>
  `,
})
export class Home implements OnInit {
  private service = inject(ContasService);
  private router = inject(Router);
  private avisos = inject(AvisoService);
  private valorReal = inject(ValorRealService);
  perfil = inject(PerfilService);
  rapido = inject(LancamentoRapidoService);

  esqueleto = [1, 2, 3, 4];
  atalhos = [
    { rota: "", icone: "plus", rotulo: "Nova conta" },
    { rota: "/recorrentes", icone: "repeat", rotulo: "Recorrentes" },
    { rota: "/analises", icone: "chart-column", rotulo: "Análises" },
    { rota: "/categorias", icone: "tag", rotulo: "Categorias" },
  ];

  fmt = fmtMoney;
  fmtData = fmtData;
  fmtDataLonga = fmtDataLonga;
  filtros: { valor: Filtro; label: string; ativo: string }[] = [
    { valor: "todas", label: "Todas", ativo: "border-primary-700 bg-primary-700 text-white" },
    { valor: "pagar", label: "A pagar", ativo: "border-red-600 bg-red-600 text-white" },
    { valor: "receber", label: "A receber", ativo: "border-green-600 bg-green-600 text-white" },
  ];

  mes = signal(mesAtual());
  contas = signal<Conta[]>([]);
  historico = signal<LinhaHistorico[]>([]);
  filtro = signal<Filtro>("todas");
  diaFiltro = signal<string | null>(null);
  busca = signal("");
  carregando = signal(true);
  private iniciou = false;

  constructor() {
    // Qualquer alteração de contas (lançamento rápido, edição, gesto, desfazer) recarrega a tela sozinha.
    effect(() => {
      this.service.versao();
      untracked(() => {
        if (this.iniciou) this.carregar();
      });
    });
  }

  titulo = computed(() => nomeMes(this.mes()));
  visiveis = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const dia = this.diaFiltro();
    return this.contas().filter(
      (c) =>
        (this.filtro() === "todas" || c.tipo === this.filtro()) &&
        (!dia || c.vencimento === dia) &&
        (!termo || c.descricao.toLowerCase().includes(termo) || (c.categoria_nome ?? "").toLowerCase().includes(termo)),
    );
  });

  resumo = computed(() => {
    const r = { receber: 0, pagar: 0, recebido: 0, pago: 0 };
    for (const c of this.contas()) {
      if (c.tipo === "receber") {
        r.receber += c.valor;
        if (c.pago_em) r.recebido += c.valor;
      } else {
        r.pagar += c.valor;
        if (c.pago_em) r.pago += c.valor;
      }
    }
    return r;
  });

  saldoPrevisto = computed(() => this.resumo().receber - this.resumo().pagar);
  pendentePagar = computed(() => this.resumo().pagar - this.resumo().pago);
  pendenteReceber = computed(() => this.resumo().receber - this.resumo().recebido);
  barraReceita = computed(() => pct(this.resumo().receber, this.resumo().receber + this.resumo().pagar));
  barraDespesa = computed(() => (this.resumo().receber + this.resumo().pagar > 0 ? 100 - this.barraReceita() : 0));

  /** A conta não paga mais urgente do mês (as atrasadas vêm primeiro). */
  proxima = computed(() => {
    const abertas = this.contas().filter((c) => !c.pago_em);
    abertas.sort((a, b) => a.vencimento.localeCompare(b.vencimento) || a.id - b.id);
    return abertas[0] ?? null;
  });

  atrasadasPagar = computed(() => this.resumoAtraso("pagar"));
  atrasadasReceber = computed(() => this.resumoAtraso("receber"));

  /** Totais mensais (últimos 6 meses) usados no mini-gráfico dos cartões. */
  seriePagar = computed(() => this.serieDoTipo("pagar"));
  serieReceber = computed(() => this.serieDoTipo("receber"));

  private resumoAtraso(tipo: Tipo) {
    const lista = this.contas().filter((c) => c.tipo === tipo && this.atrasada(c));
    return { qtd: lista.length, total: lista.reduce((soma, c) => soma + c.valor, 0) };
  }

  private serieDoTipo(tipo: Tipo) {
    return this.ultimosMeses().map((m) =>
      this.historico()
        .filter((h) => h.mes === m && h.tipo === tipo)
        .reduce((soma, h) => soma + h.total, 0),
    );
  }

  /** Os 6 meses terminando no mês exibido (do mais antigo ao atual). */
  ultimosMeses = computed(() => Array.from({ length: 6 }, (_, i) => somaMes(this.mes(), i - 5)));

  porCategoria = computed(() => {
    const mapa = new Map<string, { id: number | null; nome: string; cor: string; icone: string | null; total: number }>();
    for (const c of this.contas()) {
      if (c.tipo !== "pagar") continue;
      const nome = c.categoria_nome ?? "Sem categoria";
      const g = mapa.get(nome) ?? { id: c.categoria_id, nome, cor: c.categoria_cor ?? COR_PADRAO, icone: c.categoria_icone, total: 0 };
      g.total += c.valor;
      mapa.set(nome, g);
    }
    const total = this.resumo().pagar;
    return [...mapa.values()]
      .sort((a, b) => b.total - a.total)
      .map((g) => {
        const serie = this.ultimosMeses().map((m) =>
          this.historico()
            .filter((h) => h.mes === m && h.tipo === "pagar" && (h.categoria_id ?? 0) === (g.id ?? 0))
            .reduce((s, h) => s + h.total, 0),
        );
        const atual = serie[5];
        const anterior = serie[4];
        const variacao = anterior > 0 ? Math.round(((atual - anterior) / anterior) * 1000) / 10 : null;
        return { ...g, pct: pct(g.total, total), serie, variacao };
      });
  });

  ngOnInit() {
    this.iniciou = true;
    this.carregar();
  }

  async carregar() {
    if (!this.contas().length) this.carregando.set(true);
    this.contas.set(await this.service.listarMes(this.mes()));
    this.historico.set(await this.service.historicoMensal(this.ultimosMeses()[0], this.mes()));
    this.carregando.set(false);
  }

  /** Pontos de um mini-gráfico de linha (área 60x24). */
  pontos(serie: number[]): string {
    const max = Math.max(...serie, 1);
    const passo = 60 / (serie.length - 1);
    return serie.map((v, i) => `${(i * passo).toFixed(1)},${(22 - (v / max) * 20).toFixed(1)}`).join(" ");
  }

  abs(n: number) {
    return Math.abs(n);
  }

  marca(c: Conta) {
    return marcaDe(c.descricao);
  }

  /** "-R$ 150,00", "-≈R$ 150,00" (estimado) ou "a definir" (valor variável ainda sem estimativa). */
  textoValor(c: Conta) {
    const aberta = c.estimado && !c.pago_em;
    if (aberta && !c.valor) return "a definir";
    return (c.tipo === "receber" ? "+" : "-") + (aberta ? "≈" : "") + fmtMoney(c.valor);
  }

  valorCurto(c: Conta) {
    if (c.estimado && !c.pago_em) return c.valor ? "≈ " + fmtMoney(c.valor) : "valor a definir";
    return fmtMoney(c.valor);
  }

  /** "3/12" para contas de uma recorrência parcelada. */
  parcela(c: Conta): string | null {
    if (!c.parcelas_total || !c.rec_inicio || !c.competencia) return null;
    return `${mesesEntre(c.rec_inicio, c.competencia) + 1}/${c.parcelas_total}`;
  }

  quando(c: Conta) {
    return "vence " + quandoVence(c.vencimento);
  }

  mudarMes(delta: number) {
    this.diaFiltro.set(null);
    this.mes.set(somaMes(this.mes(), delta));
    this.carregar();
  }

  limparFiltros() {
    this.filtro.set("todas");
    this.busca.set("");
    this.diaFiltro.set(null);
  }

  alternarFiltro(f: Filtro) {
    this.filtro.set(this.filtro() === f ? "todas" : f);
  }

  /** Marca/desmarca como paga, com aviso e "Desfazer". */
  async alternarPago(c: Conta) {
    const eraPago = !!c.pago_em;
    // Conta de valor variável (luz, água...): pergunta o valor real antes de marcar como paga.
    if (!eraPago && c.estimado) {
      const valor = await this.valorReal.pedir(c);
      if (valor === null) return;
      const antes = { ...c };
      await this.service.pagarComValor(c.id, valor);
      vibrar();
      this.avisos.mostrar((c.tipo === "pagar" ? "Paga: " : "Recebida: ") + fmtMoney(valor), {
        rotuloAcao: "Desfazer",
        acao: () => this.service.restaurar(antes),
      });
      return;
    }
    await this.service.marcarPago(c.id, !eraPago);
    vibrar();
    this.avisos.mostrar(eraPago ? "Pagamento desfeito" : c.tipo === "pagar" ? "Marcada como paga" : "Marcada como recebida", {
      rotuloAcao: "Desfazer",
      acao: () => this.service.marcarPago(c.id, eraPago),
    });
  }

  async excluirLinha(c: Conta) {
    await this.service.excluir(c.id);
    this.avisos.mostrar("Conta excluída", { rotuloAcao: "Desfazer", acao: () => this.service.restaurar(c) });
  }

  atrasada(c: Conta) {
    return !c.pago_em && c.vencimento < hoje();
  }

  cor(c: Conta) {
    return c.categoria_cor ?? COR_PADRAO;
  }

  editar(c: Conta) {
    this.router.navigate(["/conta", c.id]);
  }
}
