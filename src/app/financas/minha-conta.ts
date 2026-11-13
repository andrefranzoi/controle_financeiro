import { ChangeDetectorRef, Component, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Capacitor } from "@capacitor/core";
import { AuthService, TipoCredencial } from "./auth.service";
import { BiometriaService } from "./biometria.service";
import { PageHeader } from "./page-header";
import { PerfilService, emailValido, mascaraTelefone } from "./perfil.service";

/** Dados de quem usa o app + troca de senha. */
@Component({
  selector: "app-minha-conta",
  imports: [FormsModule, PageHeader],
  template: `
    <div class="mx-auto max-w-xl pb-8">
      <app-page-header titulo="Minha conta" />
      <div class="mx-4 mt-2 flex flex-col gap-4">
        <div class="flex flex-col items-center gap-2 py-2">
          <span class="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-semibold text-white shadow-md" style="background: linear-gradient(160deg, var(--p-primary-600), var(--p-primary-900))" aria-hidden="true">
            @if (perfil.iniciais()) { {{ perfil.iniciais() }} } @else { <i class="lucide-font icon-user-round text-3xl"></i> }
          </span>
          <div class="text-lg font-semibold">{{ perfil.perfil().nome || "Complete seu cadastro" }}</div>
        </div>

        <!-- Dados -->
        <form class="flex flex-col gap-4 rounded-2xl bg-surface-0 p-4 shadow-sm dark:bg-surface-900" (ngSubmit)="salvarDados()">
          <span class="text-xs font-semibold uppercase tracking-widest text-muted-color">Seus dados</span>
          <label class="flex flex-col gap-1 text-sm">Nome
            <input class="rounded-xl bg-surface-100 p-3 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" name="nome" autocomplete="name" [(ngModel)]="nome" required [attr.aria-invalid]="!!erroDados && nome.trim().length < 2" />
          </label>
          <label class="flex flex-col gap-1 text-sm">
            <span>E-mail <span class="text-xs text-muted-color">(opcional)</span></span>
            <input class="rounded-xl bg-surface-100 p-3 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" type="email" inputmode="email" name="email" autocomplete="email" [(ngModel)]="email" />
          </label>
          <label class="flex flex-col gap-1 text-sm">
            <span>Celular <span class="text-xs text-muted-color">(opcional)</span></span>
            <input class="rounded-xl bg-surface-100 p-3 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" type="tel" inputmode="tel" name="telefone" autocomplete="tel" [ngModel]="telefone" (ngModelChange)="telefone = mascara($event)" />
          </label>
          @if (erroDados) { <p role="alert" class="text-sm text-red-600 dark:text-red-400">{{ erroDados }}</p> }
          @if (okDados) { <p role="status" class="text-sm text-green-700 dark:text-green-400">{{ okDados }}</p> }
          <button type="submit" class="min-h-12 rounded-xl bg-primary-700 font-medium text-white transition-colors hover:bg-primary-800 disabled:opacity-60" [disabled]="salvando">
            {{ salvando ? "Salvando..." : "Salvar dados" }}
          </button>
        </form>

        <!-- Segurança: PIN ou senha -->
        <form class="flex flex-col gap-4 rounded-2xl bg-surface-0 p-4 shadow-sm dark:bg-surface-900" (ngSubmit)="trocarSenha()">
          <span class="text-xs font-semibold uppercase tracking-widest text-muted-color">Segurança</span>
          @if (tipo === "pin") {
            <p class="text-sm text-muted-color">Você entra com um PIN de {{ tamanhoPin }} dígitos. Aqui dá para trocá-lo.</p>
          } @else {
            <p class="text-sm text-muted-color">Você entra com uma senha de texto. Um PIN numérico é mais rápido de digitar no celular.</p>
            <label class="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" class="h-5 w-5 accent-primary-700" name="virarPin" [(ngModel)]="virarPin" /> Trocar por um PIN numérico (4 a 6 dígitos)
            </label>
          }
          <label class="flex flex-col gap-1 text-sm">{{ tipo === "pin" ? "PIN atual" : "Senha atual" }}
            <input class="rounded-xl bg-surface-100 p-3 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" type="password" name="atual" autocomplete="current-password" [attr.inputmode]="tipo === 'pin' ? 'numeric' : null" [(ngModel)]="atual" />
          </label>
          <label class="flex flex-col gap-1 text-sm">{{ queroPin() ? "Novo PIN (4 a 6 dígitos)" : "Nova senha" }}
            <input class="rounded-xl bg-surface-100 p-3 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" type="password" name="nova" autocomplete="new-password" [attr.inputmode]="queroPin() ? 'numeric' : null" [attr.maxlength]="queroPin() ? 6 : null" [(ngModel)]="nova" />
          </label>
          <label class="flex flex-col gap-1 text-sm">{{ queroPin() ? "Confirmar novo PIN" : "Confirmar nova senha" }}
            <input class="rounded-xl bg-surface-100 p-3 outline-none focus:ring-2 focus:ring-primary dark:bg-surface-800" type="password" name="confirma" autocomplete="new-password" [attr.inputmode]="queroPin() ? 'numeric' : null" [attr.maxlength]="queroPin() ? 6 : null" [(ngModel)]="confirma" />
          </label>
          @if (erroSenha) { <p role="alert" class="text-sm text-red-600 dark:text-red-400">{{ erroSenha }}</p> }
          @if (okSenha) { <p role="status" class="text-sm text-green-700 dark:text-green-400">{{ okSenha }}</p> }
          <button type="submit" class="min-h-12 rounded-xl bg-surface-100 font-medium transition-colors hover:bg-surface-200 disabled:opacity-60 dark:bg-surface-800 dark:hover:bg-surface-700" [disabled]="trocando">
            {{ trocando ? "Alterando..." : queroPin() ? (tipo === "pin" ? "Alterar PIN" : "Trocar por PIN") : "Alterar senha" }}
          </button>
        </form>

        <!-- Digital -->
        @if (bio.disponivel()) {
          <section class="rounded-2xl bg-surface-0 p-4 shadow-sm dark:bg-surface-900">
            <button type="button" role="switch" [attr.aria-checked]="biometriaOn" class="flex min-h-12 w-full items-center gap-3 text-left" (click)="alternarBiometria()">
              <i class="lucide-font icon-fingerprint text-2xl text-primary-700 dark:text-primary-400" aria-hidden="true"></i>
              <span class="flex-1">
                <span class="block font-medium">Entrar com a digital</span>
                <span class="block text-xs text-muted-color">{{ biometriaOn ? "Ativada. O PIN continua valendo." : "Desativada" }}</span>
              </span>
              <span class="relative h-6 w-11 shrink-0 rounded-full transition-colors" [class]="biometriaOn ? 'bg-primary-700' : 'bg-surface-300 dark:bg-surface-600'" aria-hidden="true">
                <span class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" [class]="biometriaOn ? 'left-[1.375rem]' : 'left-0.5'"></span>
              </span>
            </button>
            @if (erroBio) { <p role="alert" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ erroBio }}</p> }
          </section>
        } @else if (nativo) {
          <p class="rounded-2xl bg-surface-0 p-4 text-sm text-muted-color shadow-sm dark:bg-surface-900">
            <i class="lucide-font icon-fingerprint mr-1" aria-hidden="true"></i>Para entrar com a digital, cadastre uma nas configurações de segurança do Android.
          </p>
        }
      </div>
    </div>
  `,
})
export class MinhaConta implements OnInit {
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  perfil = inject(PerfilService);
  bio = inject(BiometriaService);
  nativo = Capacitor.isNativePlatform();

  tipo: TipoCredencial = "senha";
  tamanhoPin = 6;
  virarPin = false;
  biometriaOn = false;
  erroBio = "";

  nome = "";
  email = "";
  telefone = "";
  erroDados = "";
  okDados = "";
  salvando = false;

  atual = "";
  nova = "";
  confirma = "";
  erroSenha = "";
  okSenha = "";
  trocando = false;

  mascara = mascaraTelefone;

  async ngOnInit() {
    await this.perfil.carregar();
    const p = this.perfil.perfil();
    this.nome = p.nome;
    this.email = p.email;
    this.telefone = p.telefone;
    const c = await this.auth.credencial();
    this.tipo = c.tipo;
    this.tamanhoPin = c.tamanho;
    await this.bio.verificar();
    this.biometriaOn = await this.auth.biometriaAtiva();
    this.cdr.markForCheck();
  }

  queroPin = () => this.tipo === "pin" || this.virarPin;

  async salvarDados() {
    this.erroDados = "";
    this.okDados = "";
    if (this.nome.trim().length < 2) {
      this.erroDados = "Informe seu nome.";
      return;
    }
    if (!emailValido(this.email.trim())) {
      this.erroDados = "Esse e-mail não parece válido.";
      return;
    }
    this.salvando = true;
    try {
      await this.perfil.salvar({ nome: this.nome, email: this.email, telefone: this.telefone });
      this.okDados = "Dados salvos.";
    } catch {
      this.erroDados = "Não foi possível salvar. Tente de novo.";
    } finally {
      this.salvando = false;
      this.cdr.markForCheck();
    }
  }

  async trocarSenha() {
    this.erroSenha = "";
    this.okSenha = "";
    const pin = this.queroPin();
    if (!this.atual) {
      this.erroSenha = this.tipo === "pin" ? "Informe o PIN atual." : "Informe a senha atual.";
      return;
    }
    if (pin ? !/^\d{4,6}$/.test(this.nova) : this.nova.length < 4) {
      this.erroSenha = pin ? "O PIN precisa ter de 4 a 6 números." : "A nova senha precisa ter pelo menos 4 caracteres.";
      return;
    }
    if (this.nova !== this.confirma) {
      this.erroSenha = pin ? "Os PINs novos não conferem." : "As senhas novas não conferem.";
      return;
    }
    this.trocando = true;
    try {
      if (await this.auth.alterarSenha(this.atual, this.nova, pin ? "pin" : "senha")) {
        this.okSenha = pin ? "PIN alterado." : "Senha alterada.";
        const c = await this.auth.credencial();
        this.tipo = c.tipo;
        this.tamanhoPin = c.tamanho;
        this.virarPin = false;
        this.atual = this.nova = this.confirma = "";
      } else {
        this.erroSenha = this.tipo === "pin" ? "O PIN atual está incorreto." : "A senha atual está incorreta.";
      }
    } finally {
      this.trocando = false;
      this.cdr.markForCheck();
    }
  }

  /** Liga/desliga a digital. Para ligar, o usuário precisa confirmar a digital agora. */
  async alternarBiometria() {
    this.erroBio = "";
    if (this.biometriaOn) {
      await this.auth.definirBiometria(false);
      this.biometriaOn = false;
    } else if (await this.bio.autenticar("Confirme sua digital para ativar")) {
      await this.auth.definirBiometria(true);
      this.biometriaOn = true;
    } else {
      this.erroBio = "Não foi possível confirmar sua digital.";
    }
    this.cdr.markForCheck();
  }
}
