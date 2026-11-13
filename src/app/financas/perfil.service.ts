import { Injectable, computed, inject, signal } from "@angular/core";
import { DbService } from "./db.service";

export interface Perfil {
  nome: string;
  email: string;
  telefone: string;
}

const VAZIO: Perfil = { nome: "", email: "", telefone: "" };
const CHAVES: Record<keyof Perfil, string> = { nome: "perfil_nome", email: "perfil_email", telefone: "perfil_telefone" };

export const emailValido = (e: string) => !e || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

/** Máscara de celular brasileiro: (11) 91234-5678. */
export function mascaraTelefone(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Dados de quem usa o app (cadastro básico). Ficam na tabela `config` do SQLite, junto com a senha. */
@Injectable({ providedIn: "root" })
export class PerfilService {
  private db = inject(DbService);

  perfil = signal<Perfil>({ ...VAZIO });
  carregado = signal(false);

  primeiroNome = computed(() => this.perfil().nome.trim().split(/\s+/)[0] ?? "");
  iniciais = computed(() => {
    const partes = this.perfil().nome.trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return "";
    return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
  });
  completo = computed(() => this.perfil().nome.trim().length > 0);

  async carregar(): Promise<void> {
    const linhas = await this.db.query<{ chave: string; valor: string }>("SELECT chave, valor FROM config WHERE chave LIKE 'perfil_%'");
    const p = { ...VAZIO };
    for (const campo of Object.keys(CHAVES) as (keyof Perfil)[]) {
      p[campo] = linhas.find((l) => l.chave === CHAVES[campo])?.valor ?? "";
    }
    this.perfil.set(p);
    this.carregado.set(true);
  }

  async salvar(p: Perfil): Promise<void> {
    const limpo: Perfil = { nome: p.nome.trim(), email: p.email.trim(), telefone: p.telefone.trim() };
    for (const campo of Object.keys(CHAVES) as (keyof Perfil)[]) {
      if (limpo[campo]) await this.db.run("INSERT OR REPLACE INTO config(chave,valor) VALUES(?,?)", [CHAVES[campo], limpo[campo]]);
      else await this.db.run("DELETE FROM config WHERE chave=?", [CHAVES[campo]]);
    }
    this.perfil.set(limpo);
    this.carregado.set(true);
  }
}
