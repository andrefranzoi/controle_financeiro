import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CategoriaIcone } from "./categoria-icone";
import { CategoriasService } from "./categorias.service";
import { ICONES_SUGERIDOS, SINONIMOS_PT } from "./category-icons";
import { LUCIDE_ICONES } from "./lucide-nomes";
import { Categoria, TipoCategoria } from "./models";
import { PageHeader } from "./page-header";

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** 6 colunas x 6 linhas: uma página inteira cabe na tela, sem rolagem interna. */
const POR_PAGINA = 36;
/** Cada item de LUCIDE_ICONES é "nome-principal apelido apelido": a busca olha todos, a lista mostra o principal. */
const ENTRADAS = LUCIDE_ICONES.map((e) => ({ principal: e.split(" ")[0], nomes: e.split(" ") }));
const TODOS = ENTRADAS.map((e) => e.principal);

const CORES =["#6366f1", "#0ea5e9", "#14b8a6", "#22c55e", "#f59e0b", "#f97316", "#ef4444", "#ec4899", "#a855f7", "#64748b"];

@Component({
  selector: "app-categorias",
  imports: [FormsModule, PageHeader, CategoriaIcone],
  template: `
    <div class="mx-auto max-w-xl pb-8">
      <app-page-header titulo="Categorias" />
      <div class="mx-4 mt-2 flex flex-col gap-4">
        <form class="flex flex-col gap-4 rounded-2xl bg-surface-0 p-4 shadow-sm dark:bg-surface-900" (ngSubmit)="salvar()">
          <span class="text-xs font-semibold uppercase tracking-widest text-muted-color">{{ editandoId ? "Editar categoria" : "Nova categoria" }}</span>

          <div class="flex items-center gap-3">
            <app-cat-icone [icone]="icone" [cor]="cor" [nome]="nome" tamanho="h-12 w-12" />
            <input class="min-w-0 flex-1 rounded-xl bg-surface-100 p-3 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" name="nome" placeholder="Ex.: Mercado" [(ngModel)]="nome" />
          </div>

          <div>
            <div class="mb-2 text-xs text-muted-color">Usar em</div>
            <div class="grid grid-cols-3 gap-1 rounded-2xl bg-surface-200 p-1 dark:bg-surface-800" role="group" aria-label="Usar categoria em">
              @for (o of opcoesTipo; track o.valor) {
                <button
                  type="button"
                  class="min-h-11 rounded-xl text-sm font-medium transition-colors"
                  [attr.aria-pressed]="tipo === o.valor"
                  [class]="tipo === o.valor ? o.ativo : 'text-muted-color'"
                  (click)="tipo = o.valor">
                  {{ o.rotulo }}
                </button>
              }
            </div>
          </div>

          <div>
            <div class="mb-2 flex items-center justify-between text-xs text-muted-color">
              <span>Ícone <span class="opacity-70">({{ icone }})</span></span>
              @if (!busca().trim()) {
                <button type="button" class="-mr-2 min-h-11 px-2 font-medium text-primary-700 dark:text-primary-400" (click)="alternarVerTodos()">{{ verTodos() ? "Ver sugestões" : "Ver todos os " + total + " ícones" }}</button>
              }
            </div>
            <label class="mb-2 flex min-h-11 items-center gap-2 rounded-xl bg-surface-100 px-3 py-2 focus-within:ring-2 focus-within:ring-primary dark:bg-surface-800">
              <i class="lucide-font icon-search text-muted-color" aria-hidden="true"></i>
              <input
                class="min-w-0 flex-1 bg-transparent outline-none"
                aria-label="Buscar ícone"
                type="search"
                placeholder="Buscar ícone (ex.: mercado, carro, pet, house)"
                [value]="busca()"
                (input)="buscar($any($event.target).value)"
                (keydown.enter)="$event.preventDefault()" />
            </label>
            <div class="grid grid-cols-6 gap-2">
              @for (nomeIcone of visiveis(); track nomeIcone) {
                <button
                  type="button"
                  class="flex aspect-square items-center justify-center rounded-xl"
                  [class]="icone === nomeIcone ? 'text-white shadow' : 'bg-surface-100 text-muted-color dark:bg-surface-800'"
                  [style.background]="icone === nomeIcone ? cor : null"
                  [attr.aria-label]="nomeIcone"
                  [attr.title]="nomeIcone"
                  [attr.aria-pressed]="icone === nomeIcone" (click)="icone = nomeIcone">
                  <i [class]="'lucide-font icon-' + nomeIcone + ' text-xl'" aria-hidden="true"></i>
                </button>
              } @empty {
                <div class="col-span-6 py-6 text-center text-sm text-muted-color">Nenhum ícone encontrado. Tente outra palavra.</div>
              }
            </div>
            @if (!busca().trim() && !verTodos()) {
              <button type="button" class="mt-3 min-h-11 w-full rounded-xl border border-primary py-2 text-sm font-medium text-primary-700 dark:text-primary-400" (click)="alternarVerTodos()">
                Ver todos os {{ total }} ícones ›
              </button>
            }
            @if (totalPaginas() > 1) {
              <div class="mt-3 flex items-center justify-between gap-2 text-sm">
                <button
                  type="button"
                  class="rounded-xl bg-surface-100 px-4 py-2 disabled:opacity-40 dark:bg-surface-800"
                  [disabled]="pagina() === 0"
                  (click)="irParaPagina(pagina() - 1)">
                  ‹ Anterior
                </button>
                <span class="text-xs text-muted-color">Página {{ pagina() + 1 }} de {{ totalPaginas() }}</span>
                <button
                  type="button"
                  class="rounded-xl bg-surface-100 px-4 py-2 disabled:opacity-40 dark:bg-surface-800"
                  [disabled]="pagina() >= totalPaginas() - 1"
                  (click)="irParaPagina(pagina() + 1)">
                  Próxima ›
                </button>
              </div>
            }
          </div>

          <div>
            <div class="mb-2 text-xs text-muted-color">Cor</div>
            <div class="flex flex-wrap gap-2">
              @for (c of cores; track c) {
                <button
                  type="button"
                  class="h-11 w-11 rounded-full"
                  [class]="cor === c ? 'ring-2 ring-offset-2 ring-surface-400 dark:ring-offset-surface-900' : ''"
                  [style.background]="c"
                  [attr.aria-label]="'Cor ' + c" [attr.aria-pressed]="cor === c"
                  (click)="cor = c"></button>
              }
            </div>
          </div>

          @if (erro()) { <p role="alert" class="text-sm text-red-600 dark:text-red-400">{{ erro() }}</p> }

          <div class="flex gap-2">
            @if (editandoId) {
              <button type="button" class="flex-1 rounded-2xl bg-surface-100 py-3 dark:bg-surface-800" (click)="cancelar()">Cancelar</button>
            }
            <button type="submit" class="flex-1 rounded-2xl bg-primary-700 py-3 font-medium text-white">{{ editandoId ? "Salvar" : "Adicionar" }}</button>
          </div>
        </form>

        <span class="text-xs font-semibold uppercase tracking-widest text-muted-color">Suas categorias</span>
        <ul class="-mt-2 divide-y divide-surface-100 overflow-hidden rounded-2xl bg-surface-0 shadow-sm dark:divide-surface-800 dark:bg-surface-900">
          @for (c of categorias(); track c.id) {
            <li class="flex items-center pr-1">
              <button
                type="button"
                class="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-l-2xl px-3 py-3 text-left transition-colors hover:bg-surface-50 active:bg-surface-100 dark:hover:bg-surface-800/60 dark:active:bg-surface-800"
                [attr.title]="'Editar ' + c.nome"
                (click)="editar(c)">
                <app-cat-icone [icone]="c.icone" [cor]="c.cor" [nome]="c.nome" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate">{{ c.nome }}</span>
                  <span class="block text-xs" [class]="c.tipo === 'pagar' ? 'text-red-600 dark:text-red-400' : c.tipo === 'receber' ? 'text-green-700 dark:text-green-400' : 'text-muted-color'">{{ rotuloTipo(c.tipo) }}</span>
                </span>
              </button>
              <button type="button" class="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950" [attr.aria-label]="'Excluir categoria ' + c.nome" (click)="excluir(c)"><i class="lucide-font icon-trash-2 text-lg" aria-hidden="true"></i></button>
            </li>
          } @empty {
            <li class="py-8 text-center text-muted-color">Nenhuma categoria cadastrada.</li>
          }
        </ul>
      </div>
    </div>
  `,
})
export class Categorias implements OnInit {
  private service = inject(CategoriasService);

  cores = CORES;
  total = TODOS.length.toLocaleString("pt-BR");

  categorias = signal<Categoria[]>([]);
  erro = signal("");
  nome = "";
  cor = CORES[0];
  icone = "tag";
  tipo: TipoCategoria = "ambas";
  opcoesTipo: { valor: TipoCategoria; rotulo: string; ativo: string }[] = [
    { valor: "ambas", rotulo: "Ambas", ativo: "bg-primary-700 text-white shadow" },
    { valor: "pagar", rotulo: "A pagar", ativo: "bg-red-600 text-white shadow" },
    { valor: "receber", rotulo: "A receber", ativo: "bg-green-700 text-white shadow" },
  ];

  rotuloTipo(t: TipoCategoria | null | undefined) {
    return t === "pagar" ? "Só a pagar" : t === "receber" ? "Só a receber" : "A pagar e a receber";
  }
  editandoId: number | null = null;

  busca = signal("");
  verTodos = signal(false);
  pagina = signal(0);

  /** Sem busca: as sugestões (ou todos, se pedido). Com busca: sinônimos em português primeiro, depois nomes que contêm o texto. */
  resultados = computed<string[]>(() => {
    const q = normalizar(this.busca().trim());
    if (!q) return this.verTodos() ? TODOS : ICONES_SUGERIDOS;

    const sinonimos = new Set<string>();
    for (const [palavra, nomes] of Object.entries(SINONIMOS_PT)) {
      if (palavra.startsWith(q) || (q.length >= 3 && q.startsWith(palavra))) nomes.forEach((n) => sinonimos.add(n));
    }
    const porSinonimo = ENTRADAS.filter((e) => e.nomes.some((n) => sinonimos.has(n))).map((e) => e.principal);
    const porNome = ENTRADAS.filter((e) => e.nomes.some((n) => n.includes(q))).map((e) => e.principal);
    return [...new Set([...porSinonimo, ...porNome])];
  });

  totalPaginas = computed(() => Math.max(1, Math.ceil(this.resultados().length / POR_PAGINA)));
  visiveis = computed(() => this.resultados().slice(this.pagina() * POR_PAGINA, (this.pagina() + 1) * POR_PAGINA));

  irParaPagina(n: number) {
    this.pagina.set(Math.min(Math.max(0, n), this.totalPaginas() - 1));
  }

  buscar(texto: string) {
    this.busca.set(texto);
    this.pagina.set(0);
  }

  alternarVerTodos() {
    this.verTodos.set(!this.verTodos());
    this.pagina.set(0);
  }

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    this.categorias.set(await this.service.listar());
  }

  editar(c: Categoria) {
    this.editandoId = c.id;
    this.nome = c.nome;
    this.cor = c.cor;
    this.icone = c.icone ?? "tag";
    this.tipo = c.tipo ?? "ambas";
    this.erro.set("");
  }

  cancelar() {
    this.editandoId = null;
    this.nome = "";
    this.cor = CORES[0];
    this.icone = "tag";
    this.tipo = "ambas";
    this.erro.set("");
  }

  async salvar() {
    const nome = this.nome.trim();
    if (!nome) {
      this.erro.set("Informe o nome da categoria.");
      return;
    }
    const repetida = this.categorias().some((c) => c.id !== this.editandoId && c.nome.toLowerCase() === nome.toLowerCase());
    if (repetida) {
      this.erro.set("Já existe uma categoria com esse nome.");
      return;
    }
    if (this.editandoId) await this.service.atualizar(this.editandoId, nome, this.cor, this.icone, this.tipo);
    else await this.service.criar(nome, this.cor, this.icone, this.tipo);
    this.cancelar();
    await this.carregar();
  }

  async excluir(c: Categoria) {
    if (!confirm(`Excluir a categoria "${c.nome}"? As contas que a usam ficarão sem categoria.`)) return;
    await this.service.excluir(c.id);
    if (this.editandoId === c.id) this.cancelar();
    await this.carregar();
  }
}
