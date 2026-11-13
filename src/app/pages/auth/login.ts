import { CommonModule, isPlatformBrowser } from "@angular/common";
import { AppConfigurator } from "@/app/layout/component/app.configurator";
import { PrimeModule } from "@/app/prime.module";
import { ChangeDetectorRef, Component } from "@angular/core";
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { InputTextModule } from "primeng/inputtext";
import { PasswordModule } from "primeng/password";
import { RippleModule } from "primeng/ripple";
import { environment } from "@/environments/environment";
import { HttpClient, HttpHeaders, HttpResponse } from "@angular/common/http";
import { lastValueFrom } from "rxjs";
import { AuthService } from "@/app/service/auth/auth.service";
import { ApiService } from "@/app/service/api.service";
import { ConfirmationService, MessageService } from "primeng/api";
import { AlertService } from "../service/alert.service";

@Component({
  selector: "app-login-industrial",
  standalone: true,
  imports: [
    ButtonModule,
    InputTextModule,
    PasswordModule,
    FormsModule,
    RippleModule,
    PrimeModule,
    ReactiveFormsModule,
    AppConfigurator,
  ],
  // providers: [ConfirmationService, MessageService],
  template: `
    <div class="login-page">
      <app-configurator />

      <div class="login-brand">
        <span class="login-brand-name">{{ nomeProjeto }}</span>
      </div>

      <div class="login-card">
        <div class="login-card-icon">
          <i class="lucide-font icon-log-in"></i>
        </div>

        <div class="login-eyebrow">Acesso ao sistema</div>
        <h1 class="login-title">Bem-vindo de volta</h1>
        <p class="login-subtitle">Entre com seu usuário e senha para continuar.</p>

        <form [formGroup]="loginForm" (ngSubmit)="loginSub()" class="flex flex-col gap-5">
          <div class="flex flex-col gap-2">
            <label for="login_usuario" class="login-label">Usuário</label>
            <div class="login-input-wrap">
              <i class="lucide-font icon-user login-input-icon"></i>
              <input
                id="login_usuario"
                pInputText
                formControlName="usuario"
                placeholder="Digite seu usuário"
                autocomplete="username"
                class="login-input w-full"
                (keydown.enter)="loginSub()" />
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <label for="login_senha" class="login-label">Senha</label>
            <p-password
              formControlName="senha"
              inputId="login_senha"
              placeholder="Digite sua senha"
              autocomplete="off"
              styleClass="w-full"
              inputStyleClass="login-input w-full"
              [feedback]="false"
              [fluid]="true"
              [toggleMask]="true"
              (keydown.enter)="loginSub()"></p-password>
          </div>

          <button pButton pRipple type="submit" class="login-submit w-full mt-3">
            <span>Entrar</span>
            <i class="lucide-font icon-arrow-right"></i>
          </button>
        </form>

        <div class="login-footer">
          <div class="min-w-0">
            <div class="flex items-center gap-2 text-xs text-slate-500">
              <span class="relative flex w-2 h-2">
                <span
                  class="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping"
                  [class.bg-emerald-500]="bConectado"
                  [class.bg-red-500]="!bConectado"></span>
                <span
                  class="relative inline-flex w-2 h-2 rounded-full"
                  [class.bg-emerald-500]="bConectado"
                  [class.bg-red-500]="!bConectado"></span>
              </span>
              <span>{{ bConectado ? "Servidor online" : "Servidor offline" }}</span>
            </div>
            @if (bancoAtivo()) {
              <div class="mt-1 text-[11px] text-slate-400 truncate">Banco: {{ bancoAtivo() }}</div>
            }
            <div class="mt-1 text-xs text-slate-400">{{ nomeProjeto }} v{{ versaoApp }}</div>
          </div>
          <button
            pButton
            pRipple
            type="button"
            class="login-config-btn"
            aria-label="Configuração da API"
            (click)="visible = true">
            <i class="lucide-font icon-settings"></i>
          </button>
        </div>
      </div>

      <p-drawer [(visible)]="visible" header="Configuração Api" position="right">
        <div class="grid grid-cols-12 gap-4 mt-4">
          <div class="col-span-12 flex items-center justify-between gap-3">
            <span class="text-sm font-medium text-slate-600">HTTPS</span>
            <p-toggleswitch [(ngModel)]="configApi.https" (onChange)="SaidaInput()" />
          </div>
          <div class="col-span-12">
            <p-inputgroup class="md:!w-70">
              <p-inputgroup-addon><i class="pi pi-server"></i></p-inputgroup-addon>
              <p-iftalabel>
                <input
                  class="w-full md:w-56"
                  pInputText
                  [(ngModel)]="configApi.api"
                  inputId="caminhoapi"
                  (blur)="SaidaInput()" />
                <label for="caminhoapi">Caminho Api</label>
              </p-iftalabel>
            </p-inputgroup>
          </div>
          <div class="col-span-12">
            <p-inputgroup class="md:!w-70">
              <p-inputgroup-addon><i class="pi pi-building"></i></p-inputgroup-addon>
              <p-iftalabel>
                <p-select
                  [options]="aAliases"
                  optionLabel="nomedb"
                  optionValue="coddb"
                  [(ngModel)]="configApi.codemp"
                  placeholder="Selecione a Empresa"
                  class="w-full md:w-56" />
                <label for="empresa">Empresa</label>
              </p-iftalabel>
            </p-inputgroup>
          </div>
          <div class="col-span-12 flex gap-2">
            <button pButton class="flex-1" (click)="postConfig()">
              <i class="pi pi-check" pButtonIcon></i>
              <span pButtonLabel>Salvar</span>
            </button>
            <button
              pButton
              type="button"
              severity="secondary"
              [outlined]="true"
              [loading]="recarregando"
              pTooltip="Buscar configuração novamente"
              tooltipPosition="top"
              (click)="recarregarConfig()">
              <i class="pi pi-refresh" pButtonIcon></i>
            </button>
          </div>
        </div>
      </p-drawer>
    </div>
  `,
  styles: [
    `
      .login-page {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        min-height: 100vh;
        width: 100%;
        padding: 2rem 6vw;
        overflow: hidden;
        background-color: #f4f7fb;
        background-image:
          linear-gradient(to right, rgba(244, 247, 251, 0.2), rgba(244, 247, 251, 0.85)),
          url("/images/back_login.png");
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
      }

      .login-brand {
        position: absolute;
        top: 2rem;
        left: 3rem;
        z-index: 10;
      }

      .login-brand-name {
        font-size: 1.5rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #0b2a5b;
      }

      .login-card {
        position: relative;
        z-index: 20;
        width: 100%;
        max-width: 36rem;
        padding: 2.75rem;
        background: #fff;
        border-top: 4px solid var(--primary-color);
        border-radius: 1.75rem;
        box-shadow: 0 20px 60px rgba(11, 42, 91, 0.16);
      }

      .login-card-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 3.5rem;
        height: 3.5rem;
        margin-bottom: 1.5rem;
        border-radius: 1rem;
        background: color-mix(in srgb, var(--primary-color), white 88%);
        color: var(--primary-color);
        font-size: 1.25rem;
      }

      .login-eyebrow {
        font-size: 0.8rem;
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #64748b;
      }

      .login-title {
        margin: 0.5rem 0 0.75rem;
        font-size: 2.25rem;
        font-weight: 800;
        line-height: 1.1;
        color: #0b2a5b;
      }

      .login-subtitle {
        margin: 0 0 2rem;
        color: #64748b;
      }

      .login-label {
        font-weight: 600;
        color: #1e293b;
      }

      .login-input-wrap {
        position: relative;
      }

      .login-input-icon {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: #64748b;
        pointer-events: none;
      }

      :host ::ng-deep .login-input {
        height: 3.5rem;
        border-radius: 0.75rem;
        border: 1px solid #cbd5e1;
        background: #fff;
        color: #0f172a;
      }

      .login-input-wrap .login-input {
        padding-left: 2.75rem;
      }

      :host ::ng-deep .login-input:focus {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color), transparent 82%);
      }

      .login-submit {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        height: 3.5rem;
        border-radius: 0.75rem;
        font-weight: 600;
        font-size: 1rem;
      }

      .login-footer {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1rem;
        margin-top: 2rem;
        padding-top: 1.25rem;
        border-top: 1px solid #e2e8f0;
      }

      .login-config-btn {
        width: 2.5rem;
        height: 2.5rem;
        flex-shrink: 0;
        border-radius: 0.75rem;
        border: 1px solid #cbd5e1;
        background: transparent;
        color: #475569;
      }

      .login-config-btn:hover {
        background: #f1f5f9;
      }

      @media (max-width: 991px) {
        .login-page {
          justify-content: center;
          padding: 1.5rem;
        }

        .login-brand {
          display: none;
        }

        .login-card {
          padding: 2rem 1.5rem;
        }
      }
    `,
  ],
})
// export class LoginIndustrial { username = ''; password = ''; entrar() {} }
// export class Login { username = ''; password = ''; entrar() {} }
export class Login {
  loginForm!: FormGroup;
  visible: boolean = false;
  submitted = false;
  configApi = {
    api: "",
    https: false,
    codemp: "",
    balanca1: "",
    balanca2: "",
    equipamento: "",
  };

  private prod = environment;

  aAliases: any[] = [];

  bConectado = false;
  recarregando = false;

  private headers: HttpHeaders = new HttpHeaders({});

  lsFilial;
  lsUsuario;

  public versaoApp: string = "1.0.0";

  nomeProjeto = "Projeto Inicial";

  selectedCategories: any[] = [];
  categories: any[] = [
    { name: "Pesagem", key: "P" },
    { name: "Separação", key: "S" },
    { name: "Preparação Sala", key: "R" },
    { name: "Mistura", key: "M" },
    { name: "Envase", key: "E" },
  ];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private auth: AuthService,
    private api: ApiService,
    private router: Router,
    private alert: AlertService,
  ) {
    // this.criaStorage()
  }

  async ngOnInit() {
    this.loginForm = this.fb.group({
      usuario: ["", [Validators.required]],
      senha: ["", [Validators.required]],
    });
    this.selectedCategories = JSON.parse((await localStorage.getItem("lsOperacaoSelec")) || "[]");
    this.versaoApp = environment.version;

    try {
      let sLsAPi = await localStorage.getItem("lsApi");
      let sCodBd = await localStorage.getItem("lsCodBd");
      this.lsFilial = await localStorage.getItem("lsFilial");
      this.lsUsuario = await localStorage.getItem("lsUsuario");

      // Se lsApi já foi salvo com protocolo (ex: "https://host:porta"), separa pra preencher
      // o toggle HTTPS; senão assume http (comportamento de antes).
      const protocoloSalvo = /^(https?):\/\/(.+)$/i.exec(sLsAPi || "");
      if (protocoloSalvo) {
        this.configApi.https = protocoloSalvo[1].toLowerCase() === "https";
        this.configApi.api = protocoloSalvo[2];
      } else {
        this.configApi.api = sLsAPi || "";
      }
      this.configApi.codemp = sCodBd || "";

      // Igual ao antigo (ParamsProvider.loadConfig): busca o config.json e a API de
      // configuração remota da Agiw pra preencher IPPRIMARIO/APPTIP automaticamente, pra o
      // usuário não precisar digitar o Caminho Api manualmente. Só quando ainda não tem nada
      // salvo — se já tem lsApi/lsCodBd no localStorage, não pesquisa de novo a cada F5 (pra
      // isso existe o botão de recarregar no painel de Configuração Api).
      if (!sLsAPi || !sCodBd) {
        await this.carregarConfigAutomatica();
      }

      if ((sLsAPi != undefined && sCodBd != undefined) || this.configApi.api) {
        this.SaidaInput();
      }
    } catch (error) {
      alert(`Erro_Init: ${error.messagem}`);
    }
  }

  // Igual ao antigo (ParamsProvider.loadConfig): busca /config.json (EMPRESA/DESCAPI/
  // credenciais Basic Auth) e chama a API de configuração remota da Agiw, que devolve
  // IPPRIMARIO/IPSECUNDARIO/APPTIP (0 = HTTPS, 1 = HTTP). Roda em qualquer ambiente — quem
  // decide se aplica é o próprio config.json, via PROD:true.
  private async carregarConfigAutomatica(): Promise<void> {
    try {
      const config: any = await lastValueFrom(this.http.get(`/config.json?t=${Date.now()}`));
      if (config?.["PROD"] !== true) {
        return;
      }

      const auth = "Basic " + btoa(`${config["01"]}:${config["02"]}`);
      const cabec = new HttpHeaders()
        .set("Content-Type", "application/json; charset=utf-8")
        .set("Accept", "*/*")
        .set("Authorization", auth);

      const url = `https://apps.agiw.com.br:8399/apiconfig/${config["EMPRESA"]}/${config["DESCAPI"]}`;
      const newParams: any = await lastValueFrom(this.http.get(url, { headers: cabec }));

      this.configApi.api = newParams["IPPRIMARIO"];
      this.configApi.codemp = newParams["CODEMPRESA"];

      // HTTPS: o config.json manda quando informado (é uma decisão do próprio deploy) — o
      // APPTIP da API remota (0 = HTTPS, 1 = HTTP; vem como string, por isso o Number())
      // só decide quando o config.json não tem o campo.
      this.configApi.https =
        typeof config["HTTPS"] === "boolean" ? config["HTTPS"] : Number(newParams["APPTIP"]) === 0;

      // Persiste automaticamente (mesmo efeito do botão "Salvar") — assim a config resolvida
      // aqui já fica disponível pro "não pesquisar de novo" acima, sem precisar de um clique.
      this.postConfig();
    } catch (error) {
      console.error("Erro ao carregar config.json", error);
    }
  }

  // Botão de recarregar do painel de Configuração Api — mesma busca do ngOnInit, só que
  // forçada (ignora o "já tem lsApi/lsCodBd salvo, não pesquisa de novo").
  async recarregarConfig(): Promise<void> {
    this.recarregando = true;
    try {
      await this.carregarConfigAutomatica();
      await this.SaidaInput();
    } finally {
      this.recarregando = false;
      this.cdr.markForCheck();
    }
  }

  entrar() {}

  bancoAtivo(): string {
    if (!this.configApi.codemp) return "";
    const empresa = this.aAliases.find((item) => item.coddb === this.configApi.codemp);
    if (empresa) return `${empresa.coddb} - ${empresa.nomedb}`;
    const nomeSalvo = localStorage.getItem("lsNomeDb");
    return nomeSalvo ? `${this.configApi.codemp} - ${nomeSalvo}` : this.configApi.codemp;
  }

  async SaidaInput() {
    this.prod.ipprimario = this.configApi.api;

    if (this.prod?.ipprimario != "" && this.prod?.ipprimario != null && this.prod?.ipprimario != undefined) {
      localStorage.setItem("api", this.prod.ipprimario);
    } else {
      stop;
    }

    this.headers = new HttpHeaders({
      "Content-Type": "application/json; charset=utf-8",
    });

    let serverData: HttpResponse<any> | undefined;
    try {
      try {
        serverData = await lastValueFrom(
          this.http.get(`${this.configApi.https ? "https" : "http"}://${this.prod.ipprimario}/aliases`, {
            observe: "response",
            headers: this.headers,
          }),
        );
      } catch (error) {
        this.alert.createAlert(
          "Carregar empresa",
          `Não foi possível carregar as Empresas pela API: ${this.prod.ipprimario} erro: ${error.message}`,
          "error",
        );
        this.bConectado = false;
        return;
      }

      if (serverData.body.length > 0) {
        this.aAliases = await serverData.body.sort(function (a, b) {
          return a.coddb - b.coddb;
        });
        this.bConectado = true;
      } else this.bConectado = false;
    } finally {
      // configApi/bConectado/aAliases são propriedades comuns mutadas depois de um await —
      // no zoneless isso não dispara re-render sozinho, então avisa o Angular pra conferir
      // de novo (markForCheck, não detectChanges — esse último causa NG0100 nesse app).
      this.cdr.markForCheck();
    }
  }

  async postConfig() {
    try {
      this.submitted = true;

      if (this.configApi.api) {
        this.prod.ipprimario = this.configApi.api;

        // 🔍 RECUPERANDO O OBJETO SELECIONADO:
        // Procura na lista o item cujo 'coddb' seja igual ao selecionado pelo p-select
        const empresaSelecionada = this.aAliases.find((item) => item.coddb === this.configApi.codemp);

        // Agora você pode salvar as informações que precisar no localStorage
        await localStorage.setItem(
          "lsApi",
          `${this.configApi.https ? "https" : "http"}://${this.configApi.api}`,
        );
        await localStorage.setItem("lsCodBd", this.configApi.codemp);


        // Exemplo: Se quiser guardar o nome do banco/empresa também
        if (empresaSelecionada) {
          await localStorage.setItem("lsNomeDb", empresaSelecionada.nomedb);
        }

        this.visible = false;
      }
    } catch (error: any) {
      alert(`error: ${error.message}`);
    }
  }

  async appKeyCreate() {
    //this.api.key = this.configApi.codemp + "-" + (await this.lsFilial) + "-" + this.lsUsuario
  }

  async loginSub() {
    try {
      if (this.loginForm.valid) {
        if (this.configApi.api) {
          this.auth
            .login(this.loginForm.value.usuario, this.loginForm.value.senha)
            .then(async (success) => {
              if (success.usuario && !success.err) {
                // Dados do usuário (nome, email, fone, tipo) pro menu e a saudação da topbar.
                await localStorage.setItem("Sessao", JSON.stringify(success.dados ?? {}));
                await this.router.navigate([""]);
              } else {
                localStorage.setItem("acessoH", "L");
                const err: any = success.err;
                const MSGERRO =
                  (typeof err === "string" ? err : null) ||
                  err?.error?.error ||
                  err?.message ||
                  "Não foi possível validar o acesso.";
                await this.alert.createAlert(
                  "Login",
                  `Sincronização não realizada pois ocorreu um erro. Erro identificado:<br><br><b>${MSGERRO}</b>`,
                  "warning",
                );
              }
            })
            .catch((err) => {
              localStorage.setItem("acessoH", "L");
              const MSGERRO = err?.error?.error || err.message || "Não possível validar o Acesso";
              console.log("⚡ ~ Login ~ loginSub ~ MSGERRO:", MSGERRO);
              // Se a senha estiver errada ou o servidor cair, o AuthService joga para o catch
              localStorage.setItem("acessoH", "L");
              this.alert.createAlert(
                "Acesso ao Sistema",
                "Usuário sem acesso, entrar em contato com o Administrador.<br><br><b>Detalhe:</b><br>" +
                  MSGERRO,
                "error",
              );
            });
        } else {
          this.alert.createAlert(
            "Acesso ao Sistema",
            "Para Acessar o Sistema é Preciso configurar a conexão com a Api!",
            "warning",
          );
        }
      }
    } catch (error) {}
  }
}
