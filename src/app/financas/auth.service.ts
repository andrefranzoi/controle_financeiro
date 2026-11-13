import { Injectable, inject, signal } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import * as CryptoJS from "crypto-js";
import { DbService } from "./db.service";

const ITERACOES = 10000;
const MAX_TENTATIVAS = 5; // erros seguidos antes de bloquear
const BLOQUEIO_BASE_S = 30; // 1º bloqueio; dobra a cada novo bloqueio
const BLOQUEIO_MAX_S = 300;

const hashSenha = (senha: string, salt: string) =>
  CryptoJS.PBKDF2(senha, salt, { keySize: 256 / 32, iterations: ITERACOES }).toString();

export type TipoCredencial = "pin" | "senha";

export interface ResultadoEntrada {
  ok: boolean;
  /** Segundos de espera, se o app estiver bloqueado por muitos erros. */
  bloqueadoSeg?: number;
  /** Quantos erros ainda são permitidos antes do bloqueio. */
  tentativasRestantes?: number;
}

/**
 * Trava do app: PIN numérico (4 ou 6 dígitos) ou senha de texto, guardados como salt + hash PBKDF2 na tabela `config`.
 * Só bloqueia a tela; os dados do banco não são criptografados. Muitos erros seguidos bloqueiam por um tempo crescente.
 */
@Injectable({ providedIn: "root" })
export class AuthService {
  private db = inject(DbService);
  logado = signal(false);

  private async ler(chaves: string[]): Promise<Record<string, string>> {
    const linhas = await this.db.query<{ chave: string; valor: string }>(
      `SELECT chave, valor FROM config WHERE chave IN (${chaves.map(() => "?").join(",")})`,
      chaves,
    );
    return Object.fromEntries(linhas.map((l) => [l.chave, l.valor]));
  }

  private gravar(chave: string, valor: string) {
    return this.db.run("INSERT OR REPLACE INTO config(chave,valor) VALUES(?,?)", [chave, valor]);
  }

  private apagar(...chaves: string[]) {
    return Promise.all(chaves.map((c) => this.db.run("DELETE FROM config WHERE chave=?", [c])));
  }

  async temSenha(): Promise<boolean> {
    return !!(await this.ler(["senha_hash"]))["senha_hash"];
  }

  /** Tipo de credencial em uso e, para PIN, quantos dígitos ele tem. Quem já tinha senha de texto continua como "senha". */
  async credencial(): Promise<{ tipo: TipoCredencial; tamanho: number }> {
    const c = await this.ler(["senha_tipo", "pin_tamanho"]);
    return { tipo: c["senha_tipo"] === "pin" ? "pin" : "senha", tamanho: Number(c["pin_tamanho"]) || 6 };
  }

  private async gravarCredencial(valor: string, tipo: TipoCredencial) {
    const salt = CryptoJS.lib.WordArray.random(16).toString();
    await this.gravar("senha_salt", salt);
    await this.gravar("senha_hash", hashSenha(valor, salt));
    await this.gravar("senha_tipo", tipo);
    if (tipo === "pin") await this.gravar("pin_tamanho", String(valor.length));
    else await this.apagar("pin_tamanho");
  }

  async criarSenha(valor: string, manterConectado = false, tipo: TipoCredencial = "senha"): Promise<void> {
    await this.gravarCredencial(valor, tipo);
    await this.lembrar(manterConectado);
    this.logado.set(true);
  }

  /** Grava (ou apaga) a opção "manter conectado": com ela, o app não pede a senha ao ser aberto de novo. */
  private async lembrar(manter: boolean): Promise<void> {
    if (manter) await this.gravar("manter_conectado", "1");
    else await this.apagar("manter_conectado");
  }

  /** Reabre a sessão se o usuário escolheu "manter conectado" no último login. */
  async restaurarSessao(): Promise<boolean> {
    if (this.logado()) return true;
    if ((await this.ler(["manter_conectado"]))["manter_conectado"]) this.logado.set(true);
    return this.logado();
  }

  private async senhaConfere(valor: string): Promise<boolean> {
    const c = await this.ler(["senha_salt", "senha_hash"]);
    return !!c["senha_salt"] && !!c["senha_hash"] && hashSenha(valor, c["senha_salt"]) === c["senha_hash"];
  }

  /** Segundos que faltam para o bloqueio por excesso de erros acabar (0 = liberado). */
  async bloqueioRestante(): Promise<number> {
    const ate = Number((await this.ler(["bloqueio_ate"]))["bloqueio_ate"]) || 0;
    const restante = Math.ceil((ate - Date.now()) / 1000);
    return restante > 0 ? restante : 0;
  }

  async entrar(valor: string, manterConectado = false): Promise<ResultadoEntrada> {
    const espera = await this.bloqueioRestante();
    if (espera > 0) return { ok: false, bloqueadoSeg: espera };

    if (await this.senhaConfere(valor)) {
      await this.apagar("tentativas", "bloqueios", "bloqueio_ate");
      await this.lembrar(manterConectado);
      this.logado.set(true);
      return { ok: true };
    }

    this.logado.set(false);
    const c = await this.ler(["tentativas", "bloqueios"]);
    const tentativas = (Number(c["tentativas"]) || 0) + 1;
    if (tentativas >= MAX_TENTATIVAS) {
      const bloqueios = (Number(c["bloqueios"]) || 0) + 1;
      const segundos = Math.min(BLOQUEIO_BASE_S * 2 ** (bloqueios - 1), BLOQUEIO_MAX_S);
      await this.gravar("bloqueio_ate", String(Date.now() + segundos * 1000));
      await this.gravar("bloqueios", String(bloqueios));
      await this.gravar("tentativas", "0");
      return { ok: false, bloqueadoSeg: segundos };
    }
    await this.gravar("tentativas", String(tentativas));
    return { ok: false, tentativasRestantes: MAX_TENTATIVAS - tentativas };
  }

  /** Troca a senha/PIN se o atual estiver correto. Com `tipo`, também muda entre senha de texto e PIN. Não encerra a sessão. */
  async alterarSenha(atual: string, nova: string, tipo?: TipoCredencial): Promise<boolean> {
    if (!(await this.senhaConfere(atual))) return false;
    await this.gravarCredencial(nova, tipo ?? (await this.credencial()).tipo);
    return true;
  }

  // ---- Digital ----

  async biometriaAtiva(): Promise<boolean> {
    return (await this.ler(["biometria"]))["biometria"] === "1";
  }

  async definirBiometria(ativa: boolean): Promise<void> {
    if (ativa) await this.gravar("biometria", "1");
    else await this.apagar("biometria");
  }

  /** Entrada liberada pela digital (o chamador já confirmou a biometria). */
  entrarComBiometria() {
    this.logado.set(true);
  }

  /** Encerra a sessão e desfaz o "manter conectado": na próxima abertura a senha volta a ser pedida. */
  async sair(): Promise<void> {
    this.logado.set(false);
    await this.lembrar(false);
  }
}

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return (await auth.restaurarSessao()) ? true : router.createUrlTree(["/login"]);
};
