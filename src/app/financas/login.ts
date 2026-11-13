import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject, signal, viewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService, ResultadoEntrada, TipoCredencial } from "./auth.service";
import { BiometriaService } from "./biometria.service";
import { PinPad } from "./pin-pad";
import { PerfilService, emailValido, mascaraTelefone } from "./perfil.service";

@Component({
  selector: "app-login",
  imports: [FormsModule, PinPad],
  template: `
    <div class="flex min-h-dvh items-center justify-center bg-surface-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] dark:bg-surface-950">
      <form class="flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-surface-0 p-6 shadow-lg dark:bg-surface-900" (ngSubmit)="enviar()">
        <div class="flex flex-col items-center gap-3 text-center">
          <span class="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-md" style="background: linear-gradient(160deg, var(--p-primary-600), var(--p-primary-900))">
            <i class="lucide-font icon-wallet text-3xl" aria-hidden="true"></i>
          </span>
          <div role="heading" aria-level="1" class="text-xl font-semibold">Controle Financeiro</div>
        </div>

        @if (carregando) {
          <p class="py-4 text-center text-muted-color" role="status">Carregando...</p>
        } @else if (!primeiroAcesso) {
          <!-- Já cadastrado -->
          <p class="text-center text-sm text-muted-color">
            @if (perfil.primeiroNome()) { Olá, <strong class="font-semibold text-color">{{ perfil.primeiroNome() }}</strong>! }
            {{ tipo === "pin" ? "Digite seu PIN para entrar." : "Digite sua senha para entrar." }}
          </p>

          @if (tipo === "pin") {
            <app-pin-pad [tamanho]="tamanhoPin" [desabilitado]="bloqueado() > 0 || enviando" [digital]="biometriaPronta" (completo)="tentarPin($event)" (usarDigital)="tentarDigital()" />
          } @else {
            <label class="flex flex-col gap-1 text-sm">Senha
              <span class="relative">
                <input [type]="ver ? 'text' : 'password'" name="senha" autocomplete="current-password" class="w-full rounded-xl bg-surface-100 p-3 pr-12 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" [attr.aria-invalid]="!!erro" [(ngModel)]="senha" [disabled]="bloqueado() > 0" required />
                <button type="button" class="absolute right-0 top-0 flex h-full w-12 items-center justify-center text-muted-color" [attr.aria-label]="ver ? 'Ocultar senha' : 'Mostrar senha'" [attr.aria-pressed]="ver" (click)="ver = !ver">
                  <i class="lucide-font text-lg" [class]="ver ? 'icon-eye-off' : 'icon-eye'" aria-hidden="true"></i>
                </button>
              </span>
            </label>
          }

          @if (bloqueado() > 0) {
            <p role="alert" class="rounded-xl bg-amber-100 p-3 text-center text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <i class="lucide-font icon-lock mr-1" aria-hidden="true"></i>Muitas tentativas. Tente de novo em <strong>{{ bloqueado() }} s</strong>.
            </p>
          } @else if (erro) {
            <p role="alert" class="text-center text-sm text-red-600 dark:text-red-400">{{ erro }}</p>
          }

          <label class="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" class="h-5 w-5 accent-primary-700" name="manter" [(ngModel)]="manter" /> Manter conectado neste aparelho
          </label>

          @if (tipo === "senha") {
            <button type="submit" class="min-h-12 rounded-xl bg-primary-700 font-medium text-white transition-colors hover:bg-primary-800 disabled:opacity-60" [disabled]="enviando || bloqueado() > 0">
              {{ enviando ? "Entrando..." : "Entrar" }}
            </button>
          }
        } @else {
          <!-- Primeiro acesso: 1) dados, 2) criar PIN, 3) confirmar PIN, 4) digital (se o aparelho tiver) -->
          <div class="flex items-center gap-2" role="group" [attr.aria-label]="'Etapa ' + etapa + ' de 3'">
            <span class="h-1.5 flex-1 rounded-full bg-primary-700"></span>
            <span class="h-1.5 flex-1 rounded-full" [class]="etapa >= 2 ? 'bg-primary-700' : 'bg-surface-200 dark:bg-surface-700'"></span>
            <span class="h-1.5 flex-1 rounded-full" [class]="etapa >= 3 ? 'bg-primary-700' : 'bg-surface-200 dark:bg-surface-700'"></span>
          </div>

          @switch (etapa) {
            @case (1) {
              <p class="text-center text-sm text-muted-color">Bem-vindo! Conte um pouco sobre você para começarmos.</p>

              <label class="flex flex-col gap-1 text-sm">Seu nome
                <input class="w-full rounded-xl bg-surface-100 p-3 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" name="nome" autocomplete="name" placeholder="Ex.: Maria Silva" [attr.aria-invalid]="!!erro && nome.trim().length < 2" [(ngModel)]="nome" required />
              </label>
              <label class="flex flex-col gap-1 text-sm">
                <span>E-mail <span class="text-xs text-muted-color">(opcional)</span></span>
                <input class="w-full rounded-xl bg-surface-100 p-3 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" type="email" inputmode="email" name="email" autocomplete="email" placeholder="voce@email.com" [(ngModel)]="email" />
              </label>
              <label class="flex flex-col gap-1 text-sm">
                <span>Celular <span class="text-xs text-muted-color">(opcional)</span></span>
                <input class="w-full rounded-xl bg-surface-100 p-3 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" type="tel" inputmode="tel" name="telefone" autocomplete="tel" placeholder="(11) 91234-5678" [ngModel]="telefone" (ngModelChange)="telefone = mascara($event)" />
              </label>
              <p class="text-xs text-muted-color">Esses dados ficam só neste aparelho, no banco do app.</p>

              @if (erro) { <p role="alert" class="text-sm text-red-600 dark:text-red-400">{{ erro }}</p> }
              <button type="submit" class="min-h-12 rounded-xl bg-primary-700 font-medium text-white transition-colors hover:bg-primary-800">Continuar</button>
            }
            @case (2) {
              <p class="text-center text-sm text-muted-color">Olá, <strong class="font-semibold text-color">{{ primeiroNomeDigitado() }}</strong>! Crie um PIN para proteger o app.</p>
              <div class="flex justify-center gap-2" role="group" aria-label="Tamanho do PIN">
                @for (n of [4, 6]; track n) {
                  <button type="button" class="toque min-h-11 rounded-full border px-5 text-sm" [attr.aria-pressed]="tamanhoNovo === n" [class]="tamanhoNovo === n ? 'border-primary-700 bg-primary-100 font-medium text-primary-900 dark:border-emerald-200 dark:bg-emerald-200 dark:text-emerald-950' : 'border-surface-300 dark:border-surface-700'" (click)="tamanhoNovo = n">
                    {{ n }} dígitos
                  </button>
                }
              </div>
              <app-pin-pad [tamanho]="tamanhoNovo" (completo)="definirPin($event)" />
              <p class="text-center text-xs text-muted-color">Não há recuperação de PIN: se esquecer, será preciso limpar os dados do app.</p>
              @if (erro) { <p role="alert" class="text-center text-sm text-red-600 dark:text-red-400">{{ erro }}</p> }
              <button type="button" class="min-h-11 text-sm font-medium text-primary-700 dark:text-primary-400" (click)="voltarEtapa()">Voltar</button>
            }
            @case (3) {
              <p class="text-center text-sm text-muted-color">Digite o PIN de novo para confirmar.</p>
              <app-pin-pad [tamanho]="tamanhoNovo" [desabilitado]="enviando" (completo)="confirmarPin($event)" />
              <label class="flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" class="h-5 w-5 accent-primary-700" name="manter" [(ngModel)]="manter" /> Manter conectado neste aparelho
              </label>
              @if (erro) { <p role="alert" class="text-center text-sm text-red-600 dark:text-red-400">{{ erro }}</p> }
              <button type="button" class="min-h-11 text-sm font-medium text-primary-700 dark:text-primary-400" (click)="refazerPin()">Refazer PIN</button>
            }
            @case (4) {
              <div class="flex flex-col items-center gap-3 py-2 text-center">
                <span class="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-800 dark:bg-emerald-200 dark:text-emerald-950"><i class="lucide-font icon-fingerprint text-4xl" aria-hidden="true"></i></span>
                <div class="text-lg font-semibold">Entrar com a digital?</div>
                <p class="text-sm text-muted-color">Da próxima vez, basta encostar o dedo. O PIN continua valendo sempre.</p>
              </div>
              @if (erro) { <p role="alert" class="text-center text-sm text-red-600 dark:text-red-400">{{ erro }}</p> }
              <button type="button" class="min-h-12 rounded-xl bg-primary-700 font-medium text-white transition-colors hover:bg-primary-800 disabled:opacity-60" [disabled]="enviando" (click)="ativarDigital()">Ativar digital</button>
              <button type="button" class="min-h-11 text-sm font-medium text-primary-700 dark:text-primary-400" (click)="concluir()">Agora não</button>
            }
          }
        }
      </form>
    </div>
  `,
})
export class Login implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private bio = inject(BiometriaService);
  perfil = inject(PerfilService);

  private pad = viewChild(PinPad);

  carregando = true;
  primeiroAcesso = false;
  tipo: TipoCredencial = "pin";
  tamanhoPin = 6;
  biometriaPronta = false;

  etapa: 1 | 2 | 3 | 4 = 1;
  tamanhoNovo = 6;
  private pinNovo = "";

  nome = "";
  email = "";
  telefone = "";
  senha = "";
  manter = false; // com PIN/digital o desbloqueio já é rápido; "manter conectado" fica desligado por padrão
  ver = false;
  enviando = false;
  erro = "";
  bloqueado = signal(0);
  private temporizador: ReturnType<typeof setInterval> | undefined;

  mascara = mascaraTelefone;

  async ngOnInit() {
    if (await this.auth.restaurarSessao()) {
      this.router.navigate(["/"]);
      return;
    }
    this.primeiroAcesso = !(await this.auth.temSenha());
    if (!this.primeiroAcesso) {
      await this.perfil.carregar();
      const c = await this.auth.credencial();
      this.tipo = c.tipo;
      this.tamanhoPin = c.tamanho;
      this.iniciarBloqueio(await this.auth.bloqueioRestante());
      this.biometriaPronta = (await this.auth.biometriaAtiva()) && (await this.bio.verificar());
    }
    this.carregando = false;
    this.cdr.markForCheck();
    // Digital liberada: já pede ao abrir (o PIN continua disponível se o usuário cancelar).
    if (this.biometriaPronta && this.bloqueado() === 0) setTimeout(() => this.tentarDigital(), 300);
  }

  ngOnDestroy() {
    clearInterval(this.temporizador);
  }

  primeiroNomeDigitado() {
    return this.nome.trim().split(/\s+/)[0];
  }

  // ---------- Entrada (quem já tem cadastro) ----------

  async tentarDigital() {
    if (!this.biometriaPronta || this.enviando) return;
    if (await this.bio.autenticar()) {
      this.auth.entrarComBiometria();
      this.router.navigate(["/"]);
    }
  }

  async tentarPin(pin: string) {
    await this.processar(await this.auth.entrar(pin, this.manter), true);
  }

  private async processar(r: ResultadoEntrada, usandoPad: boolean) {
    if (r.ok) {
      this.router.navigate(["/"]);
      return;
    }
    if (usandoPad) this.pad()?.limpar(true);
    if (r.bloqueadoSeg) {
      this.erro = "";
      this.iniciarBloqueio(r.bloqueadoSeg);
    } else {
      const quando = r.tentativasRestantes === 1 ? "Resta 1 tentativa" : `Restam ${r.tentativasRestantes} tentativas`;
      this.erro = `${this.tipo === "pin" ? "PIN" : "Senha"} incorreto. ${quando}.`;
    }
    this.cdr.markForCheck();
  }

  private iniciarBloqueio(segundos: number) {
    clearInterval(this.temporizador);
    this.bloqueado.set(segundos);
    if (segundos <= 0) return;
    this.temporizador = setInterval(() => {
      this.bloqueado.update((v) => v - 1);
      if (this.bloqueado() <= 0) {
        clearInterval(this.temporizador);
        this.erro = "";
        this.cdr.markForCheck();
      }
    }, 1000);
  }

  // ---------- Primeiro acesso ----------

  voltarEtapa() {
    this.erro = "";
    this.etapa = 1;
  }

  refazerPin() {
    this.erro = "";
    this.pinNovo = "";
    this.etapa = 2;
  }

  definirPin(pin: string) {
    this.erro = "";
    this.pinNovo = pin;
    this.etapa = 3;
    this.cdr.markForCheck();
  }

  async confirmarPin(pin: string) {
    if (pin !== this.pinNovo) {
      this.erro = "Os PINs não conferem. Tente de novo ou refaça o PIN.";
      this.pad()?.limpar(true);
      this.cdr.markForCheck();
      return;
    }
    this.enviando = true;
    try {
      await this.perfil.salvar({ nome: this.nome, email: this.email, telefone: this.telefone });
      await this.auth.criarSenha(pin, this.manter, "pin");
    } finally {
      this.enviando = false;
    }
    // Se o aparelho tem digital, oferece ativar; senão, entra direto.
    if (await this.bio.verificar()) {
      this.etapa = 4;
      this.cdr.markForCheck();
    } else {
      this.concluir();
    }
  }

  async ativarDigital() {
    this.erro = "";
    this.enviando = true;
    try {
      if (await this.bio.autenticar("Confirme sua digital para ativar")) {
        await this.auth.definirBiometria(true);
        this.concluir();
      } else {
        this.erro = "Não foi possível confirmar sua digital. Você pode ativar depois em Minha conta.";
      }
    } finally {
      this.enviando = false;
      this.cdr.markForCheck();
    }
  }

  concluir() {
    this.router.navigate(["/"]);
  }

  /** Enter no formulário: etapa 1 do cadastro (dados) ou entrada com senha de texto. */
  async enviar() {
    if (this.enviando) return;
    this.erro = "";

    if (this.primeiroAcesso) {
      if (this.etapa !== 1) return;
      if (this.nome.trim().length < 2) {
        this.erro = "Informe seu nome.";
        return;
      }
      if (!emailValido(this.email.trim())) {
        this.erro = "Esse e-mail não parece válido.";
        return;
      }
      this.etapa = 2;
      return;
    }

    if (this.tipo === "senha") {
      this.enviando = true;
      try {
        await this.processar(await this.auth.entrar(this.senha, this.manter), false);
      } finally {
        this.enviando = false;
        this.cdr.markForCheck();
      }
    }
  }
}
