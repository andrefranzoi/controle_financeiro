import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CategoriasService } from "./categorias.service";
import { ContasService, LinhaHistorico } from "./contas.service";
import { Categoria, Conta } from "./models";
import { dataDoMes, diasNoMes, fmtMoney, hoje, mesAtual, nomeMes, somaMes } from "./format";
import { CategoriaIcone } from "./categoria-icone";
import { RouterLink } from "@angular/router";
import { PageHeader } from "./page-header";

const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const LARGURA = 320;
const ALTURA = 150;
const TOPO = 10;
const BASE = 22; // espaço para os rótulos dos meses
const AREA = ALTURA - TOPO - BASE;

const rotulo = (ym: string) => MESES_CURTOS[Number(ym.slice(5, 7)) - 1];
const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);

/** Dashboards: receitas x despesas por mês, tendência de despesas, resumo e ranking de categorias. */
@Component({
  selector: "app-analises",
  imports: [PageHeader, CategoriaIcone, RouterLink],
  template: `
    <div class="mx-auto max-w-xl pb-8">
      <app-page-header titulo="Análises" />

      <div class="mx-4 mt-2 flex flex-col gap-4">
        <!-- Período -->
        <div class="grid grid-cols-3 gap-1 rounded-2xl bg-surface-200 p-1 dark:bg-surface-800">
          @for (p of periodos; track p.meses) {
            <button type="button" class="min-h-11 rounded-xl text-sm font-medium transition-colors" [attr.aria-pressed]="periodo() === p.meses" [class]="periodo() === p.meses ? 'bg-primary-700 text-white shadow' : 'text-muted-color'" (click)="trocarPeriodo(p.meses)">
              {{ p.label }}
            </button>
          }
        </div>

        <!-- Resumo -->
        <section class="grid grid-cols-2 gap-3">
          <div class="rounded-2xl bg-surface-0 p-3 shadow-sm dark:bg-surface-900">
            <div class="text-xs text-muted-color">Média mensal de despesas</div>
            <div class="mt-1 font-semibold text-red-600 dark:text-red-400">{{ fmt(resumo().mediaDespesa) }}</div>
          </div>
          <div class="rounded-2xl bg-surface-0 p-3 shadow-sm dark:bg-surface-900">
            <div class="text-xs text-muted-color">Maior gasto em um mês</div>
            <div class="mt-1 font-semibold">{{ fmt(resumo().maiorValor) }}</div>
            <div class="text-xs text-muted-color">{{ resumo().maiorMes }}</div>
          </div>
          <div class="rounded-2xl bg-surface-0 p-3 shadow-sm dark:bg-surface-900">
            <div class="text-xs text-muted-color">Saldo do período</div>
            <div class="mt-1 font-semibold" [class]="resumo().saldo < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'">{{ fmt(resumo().saldo) }}</div>
          </div>
          <div class="rounded-2xl bg-surface-0 p-3 shadow-sm dark:bg-surface-900">
            <div class="text-xs text-muted-color">Taxa de poupança</div>
            <div class="mt-1 font-semibold" [class]="resumo().poupanca < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'">{{ resumo().poupanca }}%</div>
            <div class="text-xs text-muted-color">do que entrou</div>
          </div>
        </section>

        <!-- Receitas x Despesas -->
        <section class="rounded-2xl bg-surface-0 p-4 shadow-sm dark:bg-surface-900">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-widest text-muted-color">Receitas x Despesas</span>
            <span class="flex items-center gap-3 text-xs text-muted-color">
              <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-green-500"></span>Receitas</span>
              <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-red-500"></span>Despesas</span>
            </span>
          </div>
          <div class="mt-2 min-h-9 text-sm">
            <strong>{{ selecionado().nome }}</strong>
            <span class="text-green-700 dark:text-green-400"> · +{{ fmt(selecionado().receita) }}</span>
            <span class="text-red-600 dark:text-red-400"> · -{{ fmt(selecionado().despesa) }}</span>
          </div>
          <svg class="w-full" [attr.viewBox]="'0 0 ' + largura + ' ' + altura" role="img" aria-label="Receitas e despesas por mês">
            @for (m of barras(); track m.ym) {
              <rect [attr.x]="m.xr" [attr.y]="m.yr" [attr.width]="m.bw" [attr.height]="m.hr" rx="3" fill="#22c55e" [attr.opacity]="m.i === sel() ? 1 : 0.55" />
              <rect [attr.x]="m.xd" [attr.y]="m.yd" [attr.width]="m.bw" [attr.height]="m.hd" rx="3" fill="#ef4444" [attr.opacity]="m.i === sel() ? 1 : 0.55" />
              <text [attr.x]="m.cx" [attr.y]="altura - 6" text-anchor="middle" font-size="10" [attr.font-weight]="m.i === sel() ? 700 : 400" fill="currentColor" opacity="0.65">{{ m.label }}</text>
              <rect [attr.x]="m.cx - m.gw / 2" y="0" [attr.width]="m.gw" [attr.height]="altura" fill="transparent" style="cursor: pointer" (click)="sel.set(m.i)" />
            }
          </svg>
        </section>

        <!-- Tendência -->
        <section class="rounded-2xl bg-surface-0 p-4 shadow-sm dark:bg-surface-900">
          <span class="text-xs font-semibold uppercase tracking-widest text-muted-color">Tendência de despesas</span>
          <svg class="mt-3 w-full" [attr.viewBox]="'0 0 ' + largura + ' ' + altura" role="img" aria-label="Tendência de despesas">
            <defs>
              <linearGradient id="gradTendencia" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ef4444" stop-opacity="0.35" />
                <stop offset="100%" stop-color="#ef4444" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path [attr.d]="tendencia().area" fill="url(#gradTendencia)" />
            <polyline [attr.points]="tendencia().linha" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            @for (p of tendencia().pontos; track p.ym) {
              <circle [attr.cx]="p.x" [attr.cy]="p.y" [attr.r]="p.i === sel() ? 5 : 3" fill="#ef4444" stroke="white" stroke-width="1.5" />
              <text [attr.x]="p.x" [attr.y]="altura - 6" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.65">{{ p.label }}</text>
              <rect [attr.x]="p.x - p.gw / 2" y="0" [attr.width]="p.gw" [attr.height]="altura" fill="transparent" style="cursor: pointer" (click)="sel.set(p.i)" />
            }
          </svg>
        </section>

        <!-- Previsão do saldo do mês atual: realizado (contínuo) x previsto (tracejado) -->
        <section class="entrar rounded-2xl bg-surface-0 p-4 shadow-sm dark:bg-surface-900">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-widest text-muted-color">Previsão do saldo</span>
            <span class="text-xs text-muted-color">{{ mesAtualNome }}</span>
          </div>
          <p class="mt-1 text-xs text-muted-color">Receitas menos despesas, dia a dia, começando do zero no dia 1.</p>

          @if (previsao().diaNegativo; as dn) {
            <div class="mt-3 flex items-start gap-2 rounded-xl bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200" role="status">
              <i class="lucide-font icon-bell mt-0.5" aria-hidden="true"></i>
              <span>A partir do dia <strong>{{ dn }}</strong> o saldo do mês fica negativo (pior ponto: <strong>{{ fmt(previsao().menorSaldo) }}</strong>).</span>
            </div>
          } @else {
            <div class="mt-3 flex items-center gap-2 text-sm text-green-700 dark:text-green-400" role="status">
              <i class="lucide-font icon-circle-check" aria-hidden="true"></i>
              O saldo do mês termina em <strong>{{ fmt(previsao().saldoFinal) }}</strong>.
            </div>
          }

          @if (qtdEstimadas() > 0) {
            <p class="mt-2 text-xs text-muted-color">Inclui {{ qtdEstimadas() }} {{ qtdEstimadas() === 1 ? "conta estimada" : "contas estimadas" }} pela média dos últimos meses (≈).</p>
          }

          <div class="mt-3 min-h-9 text-sm">
            <strong>Dia {{ diaPrevisao() }}</strong>
            <span class="text-amber-700 dark:text-amber-300"> · previsto {{ fmt(previsao().prev[diaPrevisao() - 1]) }}</span>
            @if (previsao().real[diaPrevisao() - 1] !== null) {
              <span class="text-green-700 dark:text-green-400"> · realizado {{ fmt(previsao().real[diaPrevisao() - 1]!) }}</span>
            }
          </div>

          <svg class="w-full" [attr.viewBox]="'0 0 ' + largura + ' ' + altura" role="img" aria-label="Previsão do saldo do mês">
            <!-- linha do zero -->
            <line [attr.x1]="8" [attr.x2]="largura - 8" [attr.y1]="previsao().y0" [attr.y2]="previsao().y0" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="2 4" />
            <!-- marcador de hoje -->
            <line [attr.x1]="previsao().xHoje" [attr.x2]="previsao().xHoje" y1="6" [attr.y2]="altura - 22" stroke="currentColor" stroke-opacity="0.25" />
            <!-- previsto (tracejado) e realizado (contínuo) -->
            <polyline [attr.points]="previsao().linhaPrev" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="6 5" stroke-linecap="round" stroke-linejoin="round" />
            <polyline [attr.points]="previsao().linhaReal" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            <circle [attr.cx]="previsao().xHoje" [attr.cy]="previsao().yHoje" r="5" fill="#10b981" stroke="white" stroke-width="1.5" />
            @if (previsao().diaNegativo) {
              <circle [attr.cx]="previsao().xNegativo" [attr.cy]="previsao().yNegativo" r="5" fill="#ef4444" stroke="white" stroke-width="1.5" />
            }
            <!-- dia selecionado -->
            <circle [attr.cx]="previsao().xs[diaPrevisao() - 1]" [attr.cy]="previsao().ys[diaPrevisao() - 1]" r="4" fill="#f59e0b" stroke="white" stroke-width="1.5" />
            @for (r of previsao().rotulos; track r.dia) {
              <text [attr.x]="r.x" [attr.y]="altura - 6" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.65">{{ r.dia }}</text>
            }
            @for (r of previsao().faixas; track r.dia) {
              <rect [attr.x]="r.x" y="0" [attr.width]="r.w" [attr.height]="altura" fill="transparent" style="cursor: pointer" (click)="diaPrevisao.set(r.dia)" />
            }
          </svg>

          <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-color">
            <span class="flex items-center gap-1.5"><span class="inline-block h-0.5 w-5 rounded bg-emerald-500"></span>realizado (já pago)</span>
            <span class="flex items-center gap-1.5"><span class="inline-block w-5 border-t-2 border-dashed border-amber-500"></span>previsto (com o que falta)</span>
          </div>
        </section>

        <!-- Tabela equivalente aos gráficos, para leitores de tela -->

        <div class="sr-only"><table>

          <caption>Receitas e despesas por mês</caption>

          <thead><tr><th scope="col">Mês</th><th scope="col">Receitas</th><th scope="col">Despesas</th></tr></thead>

          <tbody>

            @for (t of totais(); track t.ym) {

              <tr><th scope="row">{{ t.ym }}</th><td>{{ fmt(t.receita) }}</td><td>{{ fmt(t.despesa) }}</td></tr>

            }

          </tbody>

        </table></div>
        <div class="sr-only"><table>
          <caption>Previsão do saldo por dia no mês atual</caption>
          <thead><tr><th scope="col">Dia</th><th scope="col">Previsto</th><th scope="col">Realizado</th></tr></thead>
          <tbody>
            @for (v of previsao().prev; track $index) {
              <tr><th scope="row">{{ $index + 1 }}</th><td>{{ fmt(v) }}</td><td>{{ previsao().real[$index] === null ? "-" : fmt(previsao().real[$index]!) }}</td></tr>
            }
          </tbody>
        </table></div>

        

        <!-- Categorias -->
        <section class="rounded-2xl bg-surface-0 p-4 shadow-sm dark:bg-surface-900">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-widest text-muted-color">Maiores despesas por categoria</span>
            <a routerLink="/categorias" class="-mr-2 inline-flex min-h-11 items-center px-2 text-xs font-medium text-primary-700 dark:text-primary-400">Categorias</a>
          </div>
          <ul class="mt-3 flex flex-col gap-3">
            @for (g of ranking(); track g.nome) {
              <li>
                <div class="flex items-center gap-2 text-sm">
                  <app-cat-icone [icone]="g.icone" [cor]="g.cor" [nome]="g.nome" tamanho="h-7 w-7" />
                  <span class="min-w-0 flex-1 truncate">{{ g.nome }}</span>
                  <span class="text-xs text-muted-color">{{ g.pct }}%</span>
                  <span class="w-24 text-right font-medium">{{ fmt(g.total) }}</span>
                </div>
                <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
                  <div class="h-full rounded-full" [style.width.%]="g.pct" [style.background]="g.cor"></div>
                </div>
              </li>
            } @empty {
              <li class="py-4 text-center text-sm text-muted-color">{{ carregando() ? "Carregando..." : "Sem despesas no período." }}</li>
            }
          </ul>
        </section>
      </div>
    </div>
  `,
})
export class Analises implements OnInit {
  private service = inject(ContasService);
  private categoriasService = inject(CategoriasService);

  fmt = fmtMoney;
  largura = LARGURA;
  altura = ALTURA;
  periodos = [
    { meses: 3, label: "3 meses" },
    { meses: 6, label: "6 meses" },
    { meses: 12, label: "12 meses" },
  ];

  periodo = signal(6);
  sel = signal(5);
  carregando = signal(true);
  linhas = signal<LinhaHistorico[]>([]);
  categorias = signal<Categoria[]>([]);
  contasMes = signal<Conta[]>([]);
  /** Contas do mês ainda estimadas (valor variável não pago). */
  qtdEstimadas = computed(() => this.contasMes().filter((c) => c.estimado && !c.pago_em).length);
  diaPrevisao = signal(Number(hoje().slice(8, 10)));
  mesAtualNome = nomeMes(mesAtual());

  /** Saldo acumulado dia a dia no mês atual: previsto (todas as contas pelo vencimento) e realizado (só o que já foi pago, pela data do pagamento). */
  previsao = computed(() => {
    const ym = mesAtual();
    const n = diasNoMes(ym);
    const hojeDia = Number(hoje().slice(8, 10));
    const contas = this.contasMes();
    const mov = (c: Conta) => (c.tipo === "receber" ? c.valor : -c.valor);

    const prev: number[] = [];
    const real: (number | null)[] = [];
    let acPrev = 0;
    let acReal = 0;
    for (let d = 1; d <= n; d++) {
      const iso = dataDoMes(ym, d);
      acPrev += contas.filter((c) => c.vencimento === iso).reduce((s, c) => s + mov(c), 0);
      acReal += contas.filter((c) => c.pago_em === iso).reduce((s, c) => s + mov(c), 0);
      prev.push(acPrev);
      real.push(d <= hojeDia ? acReal : null);
    }

    const valores = [0, ...prev, ...(real.filter((v) => v !== null) as number[])];
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const faixa = max - min || 1;
    const PAD = 8;
    const x = (d: number) => PAD + ((d - 1) / Math.max(1, n - 1)) * (LARGURA - 2 * PAD);
    const y = (v: number) => TOPO + ((max - v) / faixa) * AREA;
    const pt = (d: number, v: number) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`;

    const iNeg = prev.findIndex((v) => v < 0);
    const larg = (LARGURA - 2 * PAD) / Math.max(1, n - 1);
    return {
      n,
      prev,
      real,
      xs: prev.map((_, i) => x(i + 1)),
      ys: prev.map((v) => y(v)),
      linhaPrev: prev.map((v, i) => pt(i + 1, v)).join(" "),
      linhaReal: real
        .slice(0, hojeDia)
        .map((v, i) => pt(i + 1, v ?? 0))
        .join(" "),
      y0: y(0),
      xHoje: x(hojeDia),
      yHoje: y(real[hojeDia - 1] ?? 0),
      diaNegativo: iNeg >= 0 ? iNeg + 1 : null,
      xNegativo: iNeg >= 0 ? x(iNeg + 1) : 0,
      yNegativo: iNeg >= 0 ? y(prev[iNeg]) : 0,
      menorSaldo: Math.min(...prev),
      saldoFinal: prev[n - 1] ?? 0,
      rotulos: [1, 5, 10, 15, 20, 25, n].filter((d, i, a) => d <= n && a.indexOf(d) === i).map((d) => ({ dia: d, x: x(d) })),
      faixas: prev.map((_, i) => ({ dia: i + 1, x: x(i + 1) - larg / 2, w: larg })),
    };
  });

  /** Meses do período, do mais antigo até o mês atual. */
  meses = computed(() => Array.from({ length: this.periodo() }, (_, i) => somaMes(mesAtual(), i - this.periodo() + 1)));

  totais = computed(() =>
    this.meses().map((ym) => {
      const dele = this.linhas().filter((l) => l.mes === ym);
      return {
        ym,
        receita: dele.filter((l) => l.tipo === "receber").reduce((s, l) => s + l.total, 0),
        despesa: dele.filter((l) => l.tipo === "pagar").reduce((s, l) => s + l.total, 0),
      };
    }),
  );

  selecionado = computed(() => {
    const t = this.totais()[Math.min(this.sel(), this.totais().length - 1)];
    return { nome: rotulo(t.ym) + "/" + t.ym.slice(2, 4), receita: t.receita, despesa: t.despesa };
  });

  private maximo = computed(() => Math.max(1, ...this.totais().flatMap((t) => [t.receita, t.despesa])));

  barras = computed(() => {
    const n = this.totais().length;
    const gw = LARGURA / n;
    const bw = Math.min(16, gw / 3);
    const altura = (v: number) => (v / this.maximo()) * AREA;
    return this.totais().map((t, i) => {
      const cx = gw * (i + 0.5);
      const hr = altura(t.receita);
      const hd = altura(t.despesa);
      return {
        i, ym: t.ym, label: rotulo(t.ym), cx, gw, bw, hr, hd,
        xr: cx - bw - 1, xd: cx + 1,
        yr: TOPO + AREA - hr, yd: TOPO + AREA - hd,
      };
    });
  });

  tendencia = computed(() => {
    const n = this.totais().length;
    const gw = LARGURA / n;
    const max = Math.max(1, ...this.totais().map((t) => t.despesa));
    const pontos = this.totais().map((t, i) => ({
      i, ym: t.ym, label: rotulo(t.ym), gw,
      x: gw * (i + 0.5),
      y: TOPO + AREA - (t.despesa / max) * AREA,
    }));
    const linha = pontos.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const base = TOPO + AREA;
    const area = `M${pontos[0].x.toFixed(1)},${base} ` + pontos.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + ` L${pontos[n - 1].x.toFixed(1)},${base} Z`;
    return { pontos, linha, area };
  });

  resumo = computed(() => {
    const t = this.totais();
    const receitas = t.reduce((s, x) => s + x.receita, 0);
    const despesas = t.reduce((s, x) => s + x.despesa, 0);
    const maior = t.reduce((a, b) => (b.despesa > a.despesa ? b : a), t[0]);
    return {
      mediaDespesa: Math.round(despesas / t.length),
      maiorValor: maior.despesa,
      maiorMes: maior.despesa > 0 ? rotulo(maior.ym) + "/" + maior.ym.slice(2, 4) : "—",
      saldo: receitas - despesas,
      poupanca: receitas > 0 ? Math.round(((receitas - despesas) / receitas) * 100) : 0,
    };
  });

  ranking = computed(() => {
    const porId = new Map(this.categorias().map((c) => [c.id, c]));
    const soma = new Map<number, number>();
    for (const l of this.linhas()) {
      if (l.tipo !== "pagar") continue;
      soma.set(l.categoria_id ?? 0, (soma.get(l.categoria_id ?? 0) ?? 0) + l.total);
    }
    const total = [...soma.values()].reduce((s, v) => s + v, 0);
    return [...soma.entries()]
      .map(([id, valor]) => ({
        nome: porId.get(id)?.nome ?? "Sem categoria",
        cor: porId.get(id)?.cor ?? "#94a3b8",
        icone: porId.get(id)?.icone ?? null,
        total: valor,
        pct: pct(valor, total),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  });

  async ngOnInit() {
    this.categorias.set(await this.categoriasService.listar());
    await this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    const meses = this.meses();
    this.linhas.set(await this.service.historicoMensal(meses[0], meses[meses.length - 1]));
    this.contasMes.set(await this.service.listarMes(mesAtual()));
    this.sel.set(meses.length - 1);
    this.carregando.set(false);
  }

  trocarPeriodo(meses: number) {
    this.periodo.set(meses);
    this.carregar();
  }
}
