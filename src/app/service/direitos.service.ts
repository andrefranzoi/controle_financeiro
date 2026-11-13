import { Injectable, signal } from "@angular/core";
import { ApiService } from "@/app/service/api.service";

// Mesmo identificador de sistema usado no login (login_crypto) — ver AuthService.
// TODO: ajustar para o valor real do seu backend.
const SISTEMA_ID = "W_APC";

export type TipoAcesso = "alteracao" | "consulta" | "exclusao" | "impressao" | "inclusao";

export interface DireitoItem {
  modulo_id: string;
  alteracao?: string;
  consulta?: string;
  exclusao?: string;
  impressao?: string;
  inclusao?: string;
}

@Injectable({
  providedIn: "root",
})
export class DireitosService {
  private itens = signal<DireitoItem[]>([]);

  constructor(private api: ApiService) {
    const salvo = localStorage.getItem("DIREITOS");
    if (salvo && salvo !== "undefined" && salvo !== "null") {
      try {
        this.itens.set(JSON.parse(salvo));
      } catch {
        localStorage.removeItem("DIREITOS");
      }
    }
  }

  async carregarDireitos(): Promise<void> {
    await this.api.CarregaDados();
    const usuario = this.api.lsUsuario;
    if (!usuario) return;

    try {
      const retorno = await this.api.req(`direitos/?sistema=${SISTEMA_ID}&usuario=${usuario}`, [], "GET", null, true);
      const lista = Array.isArray(retorno) ? retorno : retorno?.Direitos || [];
      this.itens.set(lista);
      localStorage.setItem("DIREITOS", JSON.stringify(lista));
    } catch (error) {
      console.error("Erro ao carregar direitos", error);
    }
  }

  // Chamado no logout — ver FilialService.limparSessao() para o porquê (singleton sobrevive
  // à navegação para o login, então o estado em memória precisa ser zerado manualmente).
  limparSessao(): void {
    this.itens.set([]);
    localStorage.removeItem("DIREITOS");
  }

  // Uso: this.direitosService.acesso('COMP070', 'alteracao')
  // moduloId/tipo vazios ("") sinalizam "sem restrição" — ex.: direito: { modulo: "", tipo: "" }
  // no NavItem — e sempre liberam o acesso, sem precisar remover o campo "direito" inteiro.
  acesso(moduloId: string, tipo: TipoAcesso | ""): boolean {
    if (!moduloId || !tipo) return true;

    return this.itens().reduce((permitido, item) => {
      return (
        permitido ||
        (item.modulo_id === moduloId &&
          ((tipo === "alteracao" && item.alteracao === "S") ||
            (tipo === "consulta" && item.consulta === "S") ||
            (tipo === "exclusao" && item.exclusao === "S") ||
            (tipo === "impressao" && item.impressao === "S") ||
            (tipo === "inclusao" && item.inclusao === "S")))
      );
    }, false);
  }
}
