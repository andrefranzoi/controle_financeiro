import { ChangeDetectorRef, Component, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { CategoriasService } from "./categorias.service";
import { ContasService } from "./contas.service";
import { MoneyMask } from "./money-mask";
import { PageHeader } from "./page-header";
import { Categoria, Tipo } from "./models";
import { hoje, nomeMes, somaMes } from "./format";

/** Cria/edita uma conta avulsa; ao criar, pode marcar "repete todo mês" para gerar uma recorrência. */
@Component({
  selector: "app-conta-form",
  imports: [FormsModule, MoneyMask, RouterLink, PageHeader],
  template: `
    <div class="mx-auto max-w-xl pb-8">
    <app-page-header [titulo]="id ? 'Editar conta' : 'Nova conta'" />
    <form class="mx-4 mt-2 flex flex-col gap-4" (ngSubmit)="salvar()">
      <div class="grid grid-cols-2 gap-1 rounded-2xl bg-surface-200 p-1 dark:bg-surface-800">
        <button type="button" class="min-h-11 rounded-xl font-medium transition-colors" [class]="tipo === 'pagar' ? 'bg-red-600 text-white shadow' : 'text-muted-color'" (click)="trocarTipo('pagar')">A pagar</button>
        <button type="button" class="min-h-11 rounded-xl font-medium transition-colors" [class]="tipo === 'receber' ? 'bg-green-600 text-white shadow' : 'text-muted-color'" (click)="trocarTipo('receber')">A receber</button>
      </div>

      <div class="flex flex-col gap-4 rounded-2xl bg-surface-0 p-4 shadow-sm dark:bg-surface-900">

      <label class="flex flex-col gap-1 text-sm">Descrição
        <input class="rounded-xl bg-surface-100 p-3 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" name="descricao" [(ngModel)]="descricao" required [attr.aria-invalid]="tentou && !descricao.trim()" />
        @if (tentou && !descricao.trim()) { <span role="alert" class="text-xs text-red-600 dark:text-red-400">Informe uma descrição.</span> }
      </label>
      <label class="flex flex-col gap-1 text-sm">Valor (R$)
        <input moneyMask class="rounded-xl bg-surface-100 p-3 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" name="valor" [(ngModel)]="valor" required [attr.aria-invalid]="tentou && !valorOk()" />
        @if (tentou && !valorOk()) { <span role="alert" class="text-xs text-red-600 dark:text-red-400">Informe um valor maior que zero.</span> }
        @if (repetir && valorVariavel && !(valor > 0)) { <span class="text-xs text-muted-color">Pode deixar em branco: o app pergunta o valor quando você for pagar.</span> }
      </label>
      <label class="flex flex-col gap-1 text-sm">Vencimento
        <input type="date" class="rounded-xl bg-surface-100 p-3 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" name="vencimento" [(ngModel)]="vencimento" required />
      </label>
      <label class="flex flex-col gap-1 text-sm">Categoria
        <select class="rounded-xl bg-surface-100 p-3 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" name="categoria" [(ngModel)]="categoriaId">
          <option [ngValue]="null">Sem categoria</option>
          @for (c of categoriasVisiveis; track c.id) {
            <option [ngValue]="c.id">{{ c.nome }}</option>
          }
        </select>
        <a routerLink="/categorias" class="inline-flex min-h-11 items-center text-xs font-medium text-primary-700 dark:text-primary-400">Gerenciar categorias</a>
      </label>

      @if (id || !repetir) {
        <label class="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" class="h-5 w-5 accent-primary-700" name="pago" [ngModel]="pago" (ngModelChange)="alternarPago($event)" />
          {{ tipo === "pagar" ? "Já foi pago" : "Já foi recebido" }}
        </label>
        @if (pago) {
          <label class="flex flex-col gap-1 text-sm">{{ tipo === "pagar" ? "Pago em" : "Recebido em" }}
            <input type="date" class="rounded-xl bg-surface-100 p-3 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" name="pagoEm" [(ngModel)]="pagoEm" />
          </label>
        }
      }

      @if (!id) {
        <label class="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" class="h-5 w-5 accent-primary-700" name="repetir" [(ngModel)]="repetir" /> Repete todo mês
        </label>
        @if (repetir) {
          <label class="flex flex-col gap-1 text-sm">Número de parcelas (opcional)
            <input class="rounded-xl bg-surface-100 p-3 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" type="number" min="2" max="360" inputmode="numeric" name="parcelas" placeholder="Ex.: 12" [(ngModel)]="parcelas" />
            @if (parcelas && parcelas > 1) { <span class="text-xs text-muted-color">Termina em {{ fimParcelas() }}. O app conta sozinho.</span> } @else { <span class="text-xs text-muted-color">Deixe vazio se a conta não tem fim.</span> }
          </label>
          @if (!parcelas || parcelas < 2) {
            <label class="flex flex-col gap-1 text-sm">Repetir até (opcional)
              <input type="month" class="rounded-xl bg-surface-100 p-3 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" name="fim" [(ngModel)]="fim" />
            </label>
          }
          <label class="flex min-h-11 items-start gap-3 text-sm">
            <input type="checkbox" class="mt-0.5 h-5 w-5 shrink-0 accent-primary-700" name="anteciparFds" [(ngModel)]="anteciparFds" />
            <span>Se o vencimento cair no sábado ou domingo, antecipar para a sexta<span class="block text-xs text-muted-color">Ex.: dia 15 caiu num domingo → vence na sexta, dia 13.</span></span>
          </label>
          <label class="flex min-h-11 items-start gap-3 text-sm">
            <input type="checkbox" class="mt-0.5 h-5 w-5 shrink-0 accent-primary-700" name="valorVariavel" [(ngModel)]="valorVariavel" />
            <span>O valor muda todo mês (luz, água...)<span class="block text-xs text-muted-color">O valor informado vira uma estimativa. Ao pagar, o app pergunta o valor real e passa a usar a média dos últimos meses.</span></span>
          </label>
        }
      } @else if (recorrente) {
        <div class="flex flex-col gap-2 rounded-xl bg-surface-100 p-3 text-sm dark:bg-surface-800">
          <span><i class="lucide-font icon-repeat mr-1" aria-hidden="true"></i>Esta conta vem de uma recorrência. Salvar aqui muda <strong>só este mês</strong>.</span>
          @if (recorrenciaId) {
            <a [routerLink]="['/recorrente', recorrenciaId]" class="inline-flex min-h-11 items-center gap-1 font-medium text-primary-700 dark:text-primary-400">
              Mudar valor ou data de todos os meses seguintes <i class="lucide-font icon-chevron-right" aria-hidden="true"></i>
            </a>
          }
        </div>
      }

      </div>

      @if (erro) { <p role="alert" class="text-sm text-red-600 dark:text-red-400">{{ erro }}</p> }

      <div class="flex gap-2">
        <button type="button" class="flex-1 rounded-2xl bg-surface-0 py-3 shadow-sm dark:bg-surface-900" (click)="voltar()">Cancelar</button>
        <button type="submit" class="flex-1 rounded-2xl bg-primary-700 py-3 font-medium text-white shadow-sm disabled:opacity-60" [disabled]="salvando">{{ salvando ? "Salvando..." : "Salvar" }}</button>
      </div>
      @if (id) {
        <button type="button" class="py-2 text-sm text-red-600 dark:text-red-400" (click)="excluir()">Excluir esta conta</button>
      }
    </form>
    </div>
  `,
})
export class ContaForm implements OnInit {
  private service = inject(ContasService);
  private categoriasService = inject(CategoriasService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  id: number | null = null;
  tipo: Tipo = "pagar";
  descricao = "";
  valor = 0;
  vencimento = hoje();
  categoriaId: number | null = null;
  categorias: Categoria[] = [];
  pago = false;
  pagoEm = hoje();
  repetir = false;
  fim = "";
  anteciparFds = true;
  parcelas: number | null = null;

  /** Valor obrigatório, exceto em conta recorrente de valor variável (o valor é informado ao pagar). */
  valorOk() {
    return this.valor > 0 || (this.repetir && this.valorVariavel);
  }

  fimParcelas() {
    return nomeMes(somaMes(this.vencimento.slice(0, 7), (this.parcelas ?? 2) - 1));
  }
  valorVariavel = false;
  recorrente = false;
  recorrenciaId: number | null = null;
  erro = "";
  tentou = false;
  salvando = false;

  /** Só aparecem categorias que servem para o tipo da conta (ou para os dois); a já escolhida nunca some da lista. */
  get categoriasVisiveis() {
    return this.categorias.filter((c) => c.tipo === "ambas" || c.tipo === this.tipo || c.id === this.categoriaId);
  }

  trocarTipo(tipo: Tipo) {
    this.tipo = tipo;
    const atual = this.categorias.find((c) => c.id === this.categoriaId);
    if (atual && atual.tipo !== "ambas" && atual.tipo !== tipo) this.categoriaId = null;
  }

  async ngOnInit() {
    this.categorias = await this.categoriasService.listar();
    const param = this.route.snapshot.paramMap.get("id");
    if (param) {
      const conta = await this.service.obter(Number(param));
      if (!conta) return this.voltar();
      this.id = conta.id;
      this.tipo = conta.tipo;
      this.descricao = conta.descricao;
      this.valor = conta.valor;
      this.vencimento = conta.vencimento;
      this.categoriaId = conta.categoria_id;
      this.pago = !!conta.pago_em;
      this.pagoEm = conta.pago_em ?? hoje();
      this.recorrente = conta.recorrencia_id !== null;
      this.recorrenciaId = conta.recorrencia_id;
    }
    this.cdr.markForCheck();
  }

  async salvar() {
    this.tentou = true;
    if (this.salvando) return;
    this.erro = "";
    if (!this.descricao.trim() || !this.valorOk()) return; // os avisos aparecem junto de cada campo
    if (!this.vencimento) {
      this.erro = "Informe o vencimento.";
      return;
    }
    if (this.pago && !this.pagoEm) {
      this.erro = "Informe a data do pagamento.";
      return;
    }
    const base = { descricao: this.descricao.trim(), valor: this.valor, tipo: this.tipo, categoria_id: this.categoriaId };
    const pagoEm = this.pago ? this.pagoEm : null;
    this.salvando = true;
    try {
      if (this.id) {
        await this.service.atualizar(this.id, { ...base, vencimento: this.vencimento, pago_em: pagoEm });
      } else if (this.repetir) {
        await this.service.criarRecorrencia({
          ...base,
          dia: Number(this.vencimento.slice(8, 10)),
          inicio: this.vencimento.slice(0, 7),
          fim: this.fim || null,
          antecipar_fds: this.anteciparFds,
          valor_variavel: this.valorVariavel,
          parcelas: this.parcelas && this.parcelas > 1 ? this.parcelas : null,
        });
      } else {
        await this.service.criar({ ...base, vencimento: this.vencimento, pago_em: pagoEm });
      }
    } catch {
      this.erro = "Não foi possível salvar. Tente de novo.";
      this.salvando = false;
      this.cdr.markForCheck();
      return;
    }
    this.voltar();
  }

  alternarPago(marcado: boolean) {
    this.pago = marcado;
    if (marcado && !this.pagoEm) this.pagoEm = hoje();
  }

  async excluir() {
    if (!this.id || !confirm("Excluir esta conta?")) return;
    await this.service.excluir(this.id);
    this.voltar();
  }

  voltar() {
    this.router.navigate(["/"]);
  }
}
