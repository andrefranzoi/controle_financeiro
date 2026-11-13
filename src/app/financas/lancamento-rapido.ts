import { Component, HostListener, effect, inject, signal, untracked } from "@angular/core";
import { Router } from "@angular/router";
import { AvisoService } from "./aviso.service";
import { CategoriaIcone } from "./categoria-icone";
import { CategoriasService } from "./categorias.service";
import { ContasService } from "./contas.service";
import { vibrar } from "./feedback";
import { fmtDataLonga, fmtMoney, hoje, nomeMes, somaDias, somaMes } from "./format";
import { LancamentoRapidoService } from "./lancamento-rapido.service";
import { Categoria, Tipo } from "./models";

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "apagar"];

/**
 * Folha de lançamento rápido: 1) valor no teclado numérico, 2) categoria, 3) data em um toque, 4) salvar.
 * Para casos completos (já pago, observações) há o link "Mais opções", que abre o formulário inteiro.
 */
@Component({
  selector: "app-lancamento-rapido",
  imports: [CategoriaIcone],
  template: `
    <div
      class="fixed inset-0 z-40 bg-black/60 transition-opacity duration-200"
      [class]="rapido.aberto() ? 'opacity-100' : 'pointer-events-none opacity-0'"
      aria-hidden="true"
      (click)="fechar()"></div>

    <section
      id="folha-rapida"
      class="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[94dvh] w-full max-w-xl flex-col rounded-t-3xl bg-surface-0 shadow-2xl transition-transform duration-300 ease-out dark:bg-surface-900"
      [class]="rapido.aberto() ? 'translate-y-0' : 'translate-y-full'"
      role="dialog"
      aria-modal="true"
      aria-label="Novo lançamento"
      [attr.inert]="rapido.aberto() ? null : ''">
      <div class="mx-auto mt-2 h-1.5 w-10 rounded-full bg-surface-300 dark:bg-surface-600" aria-hidden="true"></div>

      <div class="flex items-center justify-between px-4 pt-1">
        <div role="heading" aria-level="2" class="text-base font-semibold">Novo lançamento</div>
        <button type="button" class="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-muted-color transition-colors hover:bg-surface-100 dark:hover:bg-surface-800" aria-label="Fechar" (click)="fechar()">
          <i class="lucide-font icon-x text-xl" aria-hidden="true"></i>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-4 pb-2">
        <!-- Tipo -->
        <div class="grid grid-cols-2 gap-1 rounded-2xl bg-surface-200 p-1 dark:bg-surface-800" role="group" aria-label="Tipo">
          <button type="button" class="min-h-11 rounded-xl font-medium transition-colors" [attr.aria-pressed]="tipo() === 'pagar'" [class]="tipo() === 'pagar' ? 'bg-red-600 text-white shadow' : 'text-muted-color'" (click)="trocarTipo('pagar')">A pagar</button>
          <button type="button" class="min-h-11 rounded-xl font-medium transition-colors" [attr.aria-pressed]="tipo() === 'receber'" [class]="tipo() === 'receber' ? 'bg-green-700 text-white shadow' : 'text-muted-color'" (click)="trocarTipo('receber')">A receber</button>
        </div>

        <!-- Valor -->
        <div class="py-4 text-center" aria-live="polite">
          <div class="text-xs text-muted-color">Valor</div>
          <div class="text-5xl font-bold tracking-tight transition-colors" [class]="tipo() === 'pagar' ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'">{{ valorFmt() }}</div>
          @if (centavos() === 0 && semValorOk()) { <div class="mt-1 text-xs text-muted-color">Pode ficar em branco: o valor é informado ao pagar.</div> }
        </div>

        <!-- Descrição -->
        <label class="flex min-h-12 items-center gap-2 rounded-2xl bg-surface-100 px-4 focus-within:ring-2 focus-within:ring-primary dark:bg-surface-800">
          <i class="lucide-font icon-pencil text-muted-color" aria-hidden="true"></i>
          <input class="min-w-0 flex-1 bg-transparent py-3 outline-none" aria-label="Descrição" placeholder="Descrição (ex.: Mercado)" [value]="descricao()" (input)="descricao.set($any($event.target).value)" />
        </label>

        <!-- Categorias -->
        <div class="mt-4 text-xs font-semibold uppercase tracking-widest text-muted-color">Categoria</div>
        <div class="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Categoria">
          @for (c of categoriasDoTipo(); track c.id) {
            <button
              type="button"
              class="toque flex min-h-11 shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-4 text-sm"
              [attr.aria-pressed]="categoriaId() === c.id"
              [class]="categoriaId() === c.id ? 'border-primary-700 bg-primary-100 font-medium text-primary-900 dark:border-emerald-200 dark:bg-emerald-200 dark:text-emerald-950' : 'border-surface-300 dark:border-surface-700'"
              (click)="categoriaId.set(categoriaId() === c.id ? null : c.id)">
              <app-cat-icone [icone]="c.icone" [cor]="c.cor" [nome]="c.nome" tamanho="h-9 w-9" />
              {{ c.nome }}
            </button>
          } @empty {
            <span class="py-2 text-sm text-muted-color">Nenhuma categoria para este tipo. Cadastre em Categorias.</span>
          }
        </div>

        <!-- Data -->
        <div class="mt-4 text-xs font-semibold uppercase tracking-widest text-muted-color">Vencimento</div>
        <div class="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label="Vencimento">
          @for (o of atalhosData(); track o.rotulo) {
            <button
              type="button"
              class="toque min-h-11 rounded-full border px-4 text-sm"
              [attr.aria-pressed]="data() === o.valor"
              [class]="data() === o.valor ? 'border-primary-700 bg-primary-100 font-medium text-primary-900 dark:border-emerald-200 dark:bg-emerald-200 dark:text-emerald-950' : 'border-surface-300 dark:border-surface-700'"
              (click)="data.set(o.valor)">
              {{ o.rotulo }}
            </button>
          }
          <label class="relative flex min-h-11 items-center gap-2 rounded-full border border-surface-300 px-4 text-sm dark:border-surface-700" [class.border-primary-700]="dataPersonalizada()">
            <i class="lucide-font icon-calendar" aria-hidden="true"></i>
            <span>{{ dataPersonalizada() ? fmtDataLonga(data()) : "Outra data" }}</span>
            <input type="date" class="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Escolher outra data" [value]="data()" (change)="data.set($any($event.target).value || data())" />
          </label>
        </div>

        <!-- Opções -->
        <div class="mt-4 flex flex-wrap gap-2">
          <button type="button" role="switch" [attr.aria-checked]="repetir()" class="toque flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm" [class]="repetir() ? 'border-primary-700 bg-primary-100 font-medium text-primary-900 dark:border-emerald-200 dark:bg-emerald-200 dark:text-emerald-950' : 'border-surface-300 dark:border-surface-700'" (click)="repetir.set(!repetir())">
            <i class="lucide-font icon-repeat" aria-hidden="true"></i> Repete todo mês
          </button>
          @if (repetir()) {
            <button type="button" role="switch" [attr.aria-checked]="variavel()" class="toque flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm" [class]="variavel() ? 'border-primary-700 bg-primary-100 font-medium text-primary-900 dark:border-emerald-200 dark:bg-emerald-200 dark:text-emerald-950' : 'border-surface-300 dark:border-surface-700'" (click)="variavel.set(!variavel())">
              <i class="lucide-font icon-trending-up-down" aria-hidden="true"></i> Valor varia
            </button>
          }
        </div>
        @if (repetir()) {
          <div class="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-surface-100 px-3 py-2 dark:bg-surface-800">
            <span class="min-w-0 text-sm">Parcelas<span class="block truncate text-xs text-muted-color">{{ parcelas() > 1 ? "Termina em " + fimParcelas() : "Sem fim" }}</span></span>
            <span class="flex shrink-0 items-center gap-1">
              <button type="button" class="toque flex h-11 w-11 items-center justify-center rounded-full bg-surface-0 shadow-sm dark:bg-surface-900" aria-label="Menos uma parcela" [disabled]="parcelas() === 0" (click)="mudarParcelas(-1)"><i class="lucide-font icon-minus" aria-hidden="true"></i></button>
              <span class="w-10 text-center font-semibold" aria-live="polite">{{ parcelas() || "—" }}</span>
              <button type="button" class="toque flex h-11 w-11 items-center justify-center rounded-full bg-surface-0 shadow-sm dark:bg-surface-900" aria-label="Mais uma parcela" (click)="mudarParcelas(1)"><i class="lucide-font icon-plus" aria-hidden="true"></i></button>
            </span>
          </div>
          <div class="mt-2 flex gap-2" role="group" aria-label="Atalhos de parcelas">
            @for (n of [6, 10, 12, 24]; track n) {
              <button type="button" class="toque min-h-11 rounded-full border px-4 text-sm" [attr.aria-pressed]="parcelas() === n" [class]="parcelas() === n ? 'border-primary-700 bg-primary-100 font-medium text-primary-900 dark:border-emerald-200 dark:bg-emerald-200 dark:text-emerald-950' : 'border-surface-300 dark:border-surface-700'" (click)="parcelas.set(parcelas() === n ? 0 : n)">{{ n }}x</button>
            }
          </div>
          <p class="mt-2 text-xs text-muted-color">Se o vencimento cair no sábado ou domingo, ele vai para a sexta anterior.@if (variavel()) { O valor digitado vira uma estimativa e o app pergunta o valor real ao pagar. }</p>
        }

        @if (erro()) { <p role="alert" class="mt-3 text-sm text-red-600 dark:text-red-400">{{ erro() }}</p> }
      </div>

      <!-- Teclado numérico -->
      <div class="grid grid-cols-3 gap-2 px-4 pb-2 pt-2" role="group" aria-label="Teclado numérico">
        @for (t of teclas; track t) {
          <button
            type="button"
            class="toque flex h-14 items-center justify-center rounded-2xl bg-surface-100 text-xl font-medium hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700"
            [attr.aria-label]="t === 'apagar' ? 'Apagar último dígito' : t"
            (click)="tecla(t)">
            @if (t === "apagar") { <i class="lucide-font icon-delete" aria-hidden="true"></i> } @else { {{ t }} }
          </button>
        }
      </div>

      <div class="flex items-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
        <button type="button" class="min-h-12 rounded-2xl px-4 text-sm font-medium text-primary-700 dark:text-primary-400" (click)="maisOpcoes()">Mais opções</button>
        <button type="button" class="min-h-12 flex-1 rounded-2xl bg-primary-700 text-base font-semibold text-white transition-colors hover:bg-primary-800 disabled:opacity-50" [disabled]="salvando() || (centavos() === 0 && !semValorOk())" (click)="salvar()">
          {{ salvando() ? "Salvando..." : "Salvar" }}
        </button>
      </div>
    </section>
  `,
})
export class LancamentoRapido {
  rapido = inject(LancamentoRapidoService);
  private contas = inject(ContasService);
  private categoriasService = inject(CategoriasService);
  private avisos = inject(AvisoService);
  private router = inject(Router);

  teclas = TECLAS;
  fmtDataLonga = fmtDataLonga;

  tipo = signal<Tipo>("pagar");
  centavos = signal(0);
  descricao = signal("");
  categoriaId = signal<number | null>(null);
  data = signal(hoje());
  repetir = signal(false);
  variavel = signal(false);
  parcelas = signal(0);
  semValorOk = () => this.repetir() && this.variavel();

  fimParcelas = () => nomeMes(somaMes(this.data().slice(0, 7), this.parcelas() - 1));

  mudarParcelas(delta: number) {
    let n = this.parcelas() + delta;
    if (n === 1) n = delta > 0 ? 2 : 0; // 1 parcela não faz sentido
    this.parcelas.set(Math.min(360, Math.max(0, n)));
  }
  salvando = signal(false);
  erro = signal("");
  categorias = signal<Categoria[]>([]);

  valorFmt = () => fmtMoney(this.centavos());
  categoriasDoTipo = () => this.categorias().filter((c) => c.tipo === "ambas" || c.tipo === this.tipo());
  atalhosData = () => [
    { rotulo: "Hoje", valor: hoje() },
    { rotulo: "Amanhã", valor: somaDias(hoje(), 1) },
  ];
  dataPersonalizada = () => this.data() !== hoje() && this.data() !== somaDias(hoje(), 1);

  constructor() {
    // Ao abrir: zera o formulário e carrega as categorias.
    effect(() => {
      if (!this.rapido.aberto()) return;
      const tipo = this.rapido.tipoInicial();
      untracked(() => {
        this.tipo.set(tipo);
        this.centavos.set(0);
        this.descricao.set("");
        this.categoriaId.set(null);
        this.data.set(hoje());
        this.repetir.set(false);
        this.variavel.set(false);
        this.parcelas.set(0);
        this.erro.set("");
        this.salvando.set(false);
        this.categoriasService.listar().then((c) => this.categorias.set(c));
      });
    });
  }

  fechar() {
    this.rapido.fechar();
  }

  trocarTipo(t: Tipo) {
    this.tipo.set(t);
    const atual = this.categorias().find((c) => c.id === this.categoriaId());
    if (atual && atual.tipo !== "ambas" && atual.tipo !== t) this.categoriaId.set(null);
  }

  tecla(t: string) {
    this.erro.set("");
    if (t === "apagar") this.centavos.set(Math.floor(this.centavos() / 10));
    else {
      const novo = Number(String(this.centavos()) + t);
      if (String(novo).length <= 11) this.centavos.set(novo);
    }
  }

  /** Teclado físico: dígitos, Backspace, Enter (salvar) e Esc (fechar), só com a folha aberta e fora de campos de texto. */
  @HostListener("document:keydown", ["$event"])
  aoTeclar(e: KeyboardEvent) {
    if (!this.rapido.aberto() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape") return this.fechar();
    const alvo = e.target as HTMLElement | null;
    if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;
    if (/^[0-9]$/.test(e.key)) this.tecla(e.key);
    else if (e.key === "Backspace") this.tecla("apagar");
    else if (e.key === "Enter") this.salvar();
  }

  maisOpcoes() {
    this.fechar();
    this.router.navigate(["/conta/nova"]);
  }

  async salvar() {
    if (this.salvando()) return;
    if (this.centavos() <= 0 && !this.semValorOk()) return this.erro.set("Digite o valor.");
    const cat = this.categorias().find((c) => c.id === this.categoriaId());
    const descricao = this.descricao().trim() || cat?.nome || "";
    if (!descricao) return this.erro.set("Escreva uma descrição ou escolha uma categoria.");

    this.salvando.set(true);
    const base = { descricao, valor: this.centavos(), tipo: this.tipo(), categoria_id: this.categoriaId() };
    try {
      if (this.repetir()) {
        await this.contas.criarRecorrencia({ ...base, dia: Number(this.data().slice(8, 10)), inicio: this.data().slice(0, 7), fim: null, valor_variavel: this.variavel(), parcelas: this.parcelas() > 1 ? this.parcelas() : null });
        this.avisos.mostrar("Conta recorrente criada");
      } else {
        const id = await this.contas.criar({ ...base, vencimento: this.data() });
        this.avisos.mostrar("Conta salva", { rotuloAcao: "Desfazer", acao: () => this.contas.excluir(id) });
      }
      vibrar();
      this.fechar();
    } catch {
      this.erro.set("Não foi possível salvar. Tente de novo.");
    } finally {
      this.salvando.set(false);
    }
  }
}
