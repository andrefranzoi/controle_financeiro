import { Component, HostListener, OnInit } from "@angular/core";
import { RouterModule } from "@angular/router";
import { PrimeModule } from "./app/prime.module";
import { Location, registerLocaleData } from "@angular/common"; // <-- Importante para o histórico do Angular
import { App } from "@capacitor/app"; // <-- Plugin do Capacitor
import ptBr from "@angular/common/locales/pt";
import { PrimeNG } from "primeng/config";
import { TemaService } from "./app/financas/tema.service";

registerLocaleData(ptBr);

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterModule, PrimeModule],
  template: `
    <p-toast />
    <p-confirmDialog />
    <router-outlet></router-outlet>
  `,
})
export class AppComponent implements OnInit {
  // Injeta o Location do Angular para controlar o histórico de navegação web
  constructor(
    private location: Location,
    private primengConfig: PrimeNG,
    // Só de ser injetado, já aplica o tema salvo (claro/escuro) antes de qualquer tela aparecer.
    private tema: TemaService,
  ) {}

  ngOnInit() {
    this.configurarBotaoVoltarNativo();
    registerLocaleData(ptBr, "pt-PT");
    this.primengConfig.ripple.set(true);

    this.primengConfig.setTranslation({
      startsWith: "Começa com",
      contains: "Contém",
      notContains: "Não contém",
      endsWith: "Termina com",
      equals: "É igual a",
      notEquals: "É diferente de",
      noFilter: "No Filter",
      lt: "É menor do que",
      lte: "É menor ou igual a",
      gt: "É maior do que",
      gte: "É maior ou igual a",
      is: "É",
      isNot: "Não é",
      before: "Antes de",
      after: "Depois de",
      dateIs: "É igual a",
      dateIsNot: "É diferente de",
      dateBefore: "Antes de",
      dateAfter: "Depois de",
      clear: "Limpar",
      apply: "Aplicar",
      matchAll: "Pesquisa Tudo",
      matchAny: "Pesquisa Parte",
      addRule: "Adicionar Regra",
      removeRule: "Remover Regra",
      accept: "Sim",
      reject: "Não",
      choose: "Escolher",
      upload: "Upload",
      cancel: "Cancelar",
      dayNames: [
        "Domingo",
        "Segunda-Feira",
        "Terça-Feira",
        "Quarta-Feira",
        "Quinta-Feira",
        "Sexta-Feira",
        "Sábado",
      ],
      dayNamesShort: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"],
      dayNamesMin: ["Do", "Se", "Te", "Qa", "Qi", "Se", "Sa"],
      monthNames: [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
      ],
      monthNamesShort: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
      dateFormat: "dd/mm/yy",
      firstDayOfWeek: 0,
      today: "Hoje",
      weekHeader: "Cabeçalho da semana",
      weak: "Fraca",
      medium: "Média",
      strong: "Forte",
      passwordPrompt: "Entre com a senha",
      emptyMessage: "Nenhum resultado encontrado",
      emptyFilterMessage: "Nenhum resultado encontrado",
      emptySearchMessage: "Nenhum resultado encontrado",
    });
  }

  private configurarBotaoVoltarNativo() {
    try {
      App.addListener("backButton", () => {
        const estadoNavegacao = this.location.getState() as any;

        // Se existir um histórico de páginas navegadas dentro do app, ele volta uma tela
        if (estadoNavegacao && estadoNavegacao.navigationId > 1) {
          this.location.back();
        } else {
          // Se estiver na primeira tela (sem histórico para voltar), ele fecha o aplicativo
          //   App.exitApp()
        }
      });
    } catch (error) {
      // Esse log evita que o código quebre quando você estiver testando no navegador (ng serve)
      console.warn("Botão de voltar nativo indisponível no ambiente web/navegador.");
    }
  }

  minhaFuncaoCustomizada() {}
}
