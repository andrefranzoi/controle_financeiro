import { Component, computed, input, output } from "@angular/core";
import { Conta } from "./models";
import { dataDoMes, diaDaSemana, diasNoMes, fmtMoney, hoje, nomeMes } from "./format";

interface Dia {
  dia: number;
  iso: string;
  aPagar: number;
  aReceber: number;
  pagas: number;
  atrasada: boolean;
  total: number;
}

const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

/**
 * Calendário do mês: cada dia mostra pontos (vermelho = a pagar, verde = a receber, cinza = tudo em dia).
 * Tocar em um dia filtra a lista; tocar de novo limpa o filtro. Os números ficam também no texto do botão (leitor de tela).
 */
@Component({
  selector: "app-calendario-mes",
  template: `
    <div class="grid grid-cols-7 gap-y-1 text-center" role="grid" [attr.aria-label]="'Calendário de ' + nomeDoMes()">
      @for (s of semana; track $index) {
        <div class="pb-1 text-xs font-medium text-muted-color" aria-hidden="true">{{ s }}</div>
      }
      @for (v of vazios(); track $index) {
        <div aria-hidden="true"></div>
      }
      @for (d of dias(); track d.iso) {
        <button
          type="button"
          class="toque relative mx-auto flex h-11 w-full max-w-11 flex-col items-center justify-center rounded-xl text-sm transition-colors"
          [class]="classeDia(d)"
          [attr.aria-pressed]="selecionado() === d.iso"
          [attr.aria-label]="rotulo(d)"
          (click)="escolher(d)">
          <span [class.font-semibold]="d.iso === hojeIso">{{ d.dia }}</span>
          <span class="mt-0.5 flex h-1.5 items-center gap-0.5" aria-hidden="true">
            @if (d.aPagar) { <span class="h-1.5 w-1.5 rounded-full bg-red-500"></span> }
            @if (d.aReceber) { <span class="h-1.5 w-1.5 rounded-full bg-green-500"></span> }
            @if (!d.aPagar && !d.aReceber && d.pagas) { <span class="h-1.5 w-1.5 rounded-full bg-surface-400"></span> }
          </span>
        </button>
      }
    </div>
    <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-color">
      <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-red-500"></span>a pagar</span>
      <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-green-500"></span>a receber</span>
      <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-surface-400"></span>em dia</span>
    </div>
  `,
})
export class CalendarioMes {
  mes = input.required<string>();
  contas = input.required<Conta[]>();
  selecionado = input<string | null>(null);
  escolhido = output<string | null>();

  semana = SEMANA;
  hojeIso = hoje();

  nomeDoMes = computed(() => nomeMes(this.mes()));
  vazios = computed(() => Array.from({ length: diaDaSemana(dataDoMes(this.mes(), 1)) }));

  dias = computed<Dia[]>(() => {
    const ym = this.mes();
    const hojeIso = hoje();
    return Array.from({ length: diasNoMes(ym) }, (_, i) => {
      const dia = i + 1;
      const iso = dataDoMes(ym, dia);
      const doDia = this.contas().filter((c) => c.vencimento === iso);
      const pendentes = doDia.filter((c) => !c.pago_em);
      return {
        dia,
        iso,
        aPagar: pendentes.filter((c) => c.tipo === "pagar").length,
        aReceber: pendentes.filter((c) => c.tipo === "receber").length,
        pagas: doDia.length - pendentes.length,
        atrasada: pendentes.some((c) => c.tipo === "pagar") && iso < hojeIso,
        total: doDia.length,
      };
    });
  });

  classeDia(d: Dia): string {
    if (this.selecionado() === d.iso) return "bg-primary-700 text-white shadow";
    const base = d.iso === this.hojeIso ? "ring-1 ring-primary-700 dark:ring-emerald-300 " : "";
    return base + (d.atrasada ? "text-red-600 dark:text-red-400" : "hover:bg-surface-100 dark:hover:bg-surface-800");
  }

  rotulo(d: Dia): string {
    const partes = [`${d.dia} de ${nomeMes(this.mes()).split(" ")[0].toLowerCase()}`];
    if (!d.total) partes.push("sem contas");
    else {
      const soma = (tipo: string) => this.contas().filter((c) => c.vencimento === d.iso && c.tipo === tipo && !c.pago_em).reduce((s, c) => s + c.valor, 0);
      if (d.aPagar) partes.push(`${d.aPagar} a pagar, ${fmtMoney(soma("pagar"))}`);
      if (d.aReceber) partes.push(`${d.aReceber} a receber, ${fmtMoney(soma("receber"))}`);
      if (!d.aPagar && !d.aReceber) partes.push("tudo em dia");
    }
    if (d.atrasada) partes.push("atrasada");
    return partes.join(", ");
  }

  escolher(d: Dia) {
    this.escolhido.emit(this.selecionado() === d.iso ? null : d.iso);
  }
}
