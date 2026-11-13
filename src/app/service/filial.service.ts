import { Injectable, inject, signal } from "@angular/core";
import { ApiService } from "@/app/service/api.service";
import { DireitosService } from "@/app/service/direitos.service";

@Injectable({
  providedIn: "root",
})
export class FilialService {
  private direitosService = inject(DireitosService);

  filiais = signal<any[]>([]);
  filialAtiva = signal<any | null>(null);

  constructor(private api: ApiService) {
    // A lista de filiais também fica no localStorage: sem restaurá-la, depois de recarregar a
    // página (o que acontece ao trocar de filial) o seletor some até a API responder — ou pra
    // sempre, se ela falhar.
    const listaSalva = localStorage.getItem("FILIAIS");
    if (listaSalva && listaSalva !== "undefined" && listaSalva !== "null") {
      try {
        this.filiais.set(JSON.parse(listaSalva));
      } catch {
        localStorage.removeItem("FILIAIS");
      }
    }

    const salva = localStorage.getItem("dataFilial");
    if (salva && salva !== "undefined" && salva !== "null") {
      try {
        this.filialAtiva.set(JSON.parse(salva));
      } catch {
        localStorage.removeItem("dataFilial");
      }
    }
  }

  async carregarFiliais(): Promise<void> {
    await this.api.CarregaDados();
    const codbanco = this.api.lsCodBd;
    if (!codbanco) return;

    try {
      const retorno = await this.api.req(`filiais/${codbanco}`, [], "get", {}, true);
      const lista = Array.isArray(retorno) ? retorno : retorno?.Filiais || [];
      this.filiais.set(lista);
      localStorage.setItem("FILIAIS", JSON.stringify(lista));

      if (!this.filialAtiva() && lista.length > 0) {
        // "dataFilial" (objeto) pode estar ausente mesmo com "lsFilial" (código) já salvo —
        // nesse caso usa a filial salva em vez de cair sempre na primeira da lista.
        const codigoSalvo = localStorage.getItem("lsFilial");
        const filialSalva = codigoSalvo ? lista.find((f: any) => f?.codemp === codigoSalvo) : undefined;
        await this.selecionarFilial(filialSalva ?? lista[0]);
      } else if (this.filialAtiva()) {
        // Filial já vinha de uma sessão anterior (localStorage) — mesmo assim, os direitos só
        // podem ser pesquisados depois que as filiais terminarem de carregar.
        await this.sincronizarDadosFilial();
      }
    } catch (error) {
      console.error("Erro ao carregar filiais", error);
    }
  }

  // A permissão (DireitosService) depende do appKey (coddb-filial-usuario) enviado nos headers
  // da API — então, sempre que a filial ativa mudar, os direitos precisam ser buscados de novo.
  async selecionarFilial(filial: any): Promise<void> {
    this.filialAtiva.set(filial);
    localStorage.setItem("dataFilial", JSON.stringify(filial));
    localStorage.setItem("lsFilial", filial?.codemp ?? "");

    await this.sincronizarDadosFilial();
  }

  // Direitos dependem da filial (appKey = coddb-filial-usuario) — só podem ser pesquisados depois
  // que a filial ativa (e o "lsFilial" no localStorage) estiverem definidos. Se o projeto tiver
  // outros dados por filial (contadores etc.), recarregue-os aqui também.
  private async sincronizarDadosFilial(): Promise<void> {
    await this.direitosService.carregarDireitos();
  }

  // Chamado no logout: FilialService é singleton (providedIn: root) e sobrevive à navegação
  // para o login. Sem zerar, "filialAtiva" continuava preenchida em memória, o próximo login
  // achava que já havia filial, nunca regravava "lsFilial" nem recarregava os direitos — e a
  // tela ficava sem os botões.
  limparSessao(): void {
    this.filiais.set([]);
    this.filialAtiva.set(null);
  }
}
