import { ChangeDetectorRef, Component, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { CategoriasService } from "./categorias.service";
import { ContasService } from "./contas.service";
import { MoneyMask } from "./money-mask";
import { PageHeader } from "./page-header";
import { Categoria, Tipo } from "./models";
import { nomeMes, somaMes } from "./format";

/** Edita a regra de uma conta recorrente (vale do mês atual em diante, nas parcelas ainda não pagas). */
@Component({
  selector: "app-recorrente-form",
  imports: [FormsModule, MoneyMask, PageHeader],
  template: `
    <div class="mx-auto max-w-xl pb-8">
    <app-page-header titulo="Editar recorrência" rotaVoltar="/recorrentes" />
    <form class="mx-4 mt-2 flex flex-col gap-4" (ngSubmit)="salvar()">
      <p class="rounded-xl bg-surface-100 p-3 text-xs text-muted-color dark:bg-surface-800">Vale <strong>do mês atual em diante</strong>, nas contas ainda não pagas. Os meses que você já pagou continuam com o valor que foi pago.</p>

      <div class="grid grid-cols-2 gap-1 rounded-2xl bg-surface-200 p-1 dark:bg-surface-800">
        <button type="button" class="min-h-11 rounded-xl font-medium transition-colors" [class]="tipo === 'pagar' ? 'bg-red-600 text-white shadow' : 'text-muted-color'" (click)="trocarTipo('pagar')">A pagar</button>
        <button type="button" class="min-h-11 rounded-xl font-medium transition-colors" [class]="tipo === 'receber' ? 'bg-green-600 text-white shadow' : 'text-muted-color'" (click)="trocarTipo('receber')">A receber</button>
      </div>

      <div class="flex flex-col gap-4 rounded-2xl bg-surface-0 p-4 shadow-sm dark:bg-surface-900">

      <label class="flex flex-col gap-1 text-sm">Descrição
        <input class="rounded-xl bg-surface-100 p-3 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" name="descricao" [(ngModel)]="descricao" required />
      </label>
      <label class="flex flex-col gap-1 text-sm">Valor (R$)
        <input moneyMask class="rounded-xl bg-surface-100 p-3 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" name="valor" [(ngModel)]="valor" required />
      </label>
      <label class="flex flex-col gap-1 text-sm">Dia do mês (1 a 31)
        <input type="number" min="1" max="31" class="rounded-xl bg-surface-100 p-3 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" name="dia" [(ngModel)]="dia" required />
      </label>
      <label class="flex flex-col gap-1 text-sm">Categoria
        <select class="rounded-xl bg-surface-100 p-3 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" name="categoria" [(ngModel)]="categoriaId">
          <option [ngValue]="null">Sem categoria</option>
          @for (c of categoriasVisiveis; track c.id) {
            <option [ngValue]="c.id">{{ c.nome }}</option>
          }
        </select>
      </label>
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

      </div>

      @if (erro) { <p role="alert" class="text-sm text-red-600 dark:text-red-400">{{ erro }}</p> }

      <div class="flex gap-2">
        <button type="button" class="flex-1 rounded-2xl bg-surface-0 py-3 shadow-sm dark:bg-surface-900" (click)="voltar()">Cancelar</button>
        <button type="submit" class="flex-1 rounded-2xl bg-primary-700 py-3 font-medium text-white shadow-sm disabled:opacity-60" [disabled]="salvando">{{ salvando ? "Salvando..." : "Salvar" }}</button>
      </div>
    </form>
    </div>
  `,
})
export class RecorrenteForm implements OnInit {
  private service = inject(ContasService);
  private categoriasService = inject(CategoriasService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  id = 0;
  inicio = "";
  tipo: Tipo = "pagar";
  descricao = "";
  valor = 0;
  dia = 1;
  categoriaId: number | null = null;
  categorias: Categoria[] = [];
  fim = "";
  anteciparFds = true;
  valorVariavel = false;
  parcelas: number | null = null;

  fimParcelas() {
    return nomeMes(somaMes(this.inicio, (this.parcelas ?? 2) - 1));
  }
  erro = "";
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
    const r = await this.service.obterRecorrencia(Number(this.route.snapshot.paramMap.get("id")));
    if (!r) return this.voltar();
    this.id = r.id;
    this.inicio = r.inicio;
    this.tipo = r.tipo;
    this.descricao = r.descricao;
    this.valor = r.valor;
    this.dia = r.dia;
    this.categoriaId = r.categoria_id;
    this.fim = r.fim ?? "";
    this.anteciparFds = r.antecipar_fds !== 0;
    this.valorVariavel = r.valor_variavel === 1;
    this.parcelas = r.parcelas ?? null;
    this.cdr.markForCheck();
  }

  async salvar() {
    const dia = Number(this.dia);
    if (!this.descricao.trim() || !(this.valor > 0 || this.valorVariavel) || !Number.isInteger(dia) || dia < 1 || dia > 31) {
      this.erro = "Preencha descrição, um valor maior que zero (conta de valor variável pode ficar sem valor) e um dia entre 1 e 31.";
      return;
    }
    if (this.fim && this.fim < this.inicio) {
      this.erro = "A data final não pode ser antes do início.";
      return;
    }
    this.erro = "";
    this.salvando = true;
    try {
      await this.service.atualizarRecorrencia(this.id, {
        descricao: this.descricao.trim(),
        valor: this.valor,
        tipo: this.tipo,
        dia,
        categoria_id: this.categoriaId,
        inicio: this.inicio,
        fim: this.fim || null,
        antecipar_fds: this.anteciparFds,
        valor_variavel: this.valorVariavel,
        parcelas: this.parcelas && this.parcelas > 1 ? this.parcelas : null,
      });
    } catch {
      this.erro = "Não foi possível salvar. Tente de novo.";
      this.salvando = false;
      this.cdr.markForCheck();
      return;
    }
    this.voltar();
  }

  voltar() {
    this.router.navigate(["/recorrentes"]);
  }
}
