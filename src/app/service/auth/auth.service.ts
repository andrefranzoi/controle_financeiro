import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { lastValueFrom } from "rxjs";
import { environment } from "@/environments/environment";
import { ApiService } from "../api.service";
import Swal from "sweetalert2";

import * as CryptoJS from "crypto-js";

// Identificação do sistema/módulo de acesso junto à API de login (login_crypto/{SISTEMA}/{COMPONENTE}/{ACAO}).
// TODO: ajustar para os valores reais do seu backend.
const CODEMP = "01";
const SISTEMA_ID = "W_APC";
const COMPONENTE = "COMP070";
const ACAO = "ALTERACAO";

// Igual ao antigo (ServiceProvider.register) — tabela de log de acesso e prefixo de versão
// que aparecem no log legado de user_id. TODO: ajustar para os valores reais do seu projeto
// (ex.: "TBAPC_USER_ID"/"APC" no APC, "TBPDV_USER_ID"/"PDV" no PDV, etc.).
const APP_LOG_TABLE = "TB_USER_ID";
const APP_PREFIXO = "APP";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  lsCodBd: string;
  lsFilial: string;

  constructor(
    private api: ApiService,
    private http: HttpClient,
  ) {}

  async Carregadados() {
    this.lsCodBd = await localStorage.getItem("lsCodBd");
    this.lsFilial = await localStorage.getItem("lsFilial");
  }

  async login(usuario: string, senha: string) {
    try {
      Swal.fire({
        title: "Acessando o Sistema",
        html: "Aguarde, as credenciais estão sendo validadas",
        allowEscapeKey: false,
        allowOutsideClick: false,
        heightAuto: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });
      await this.Carregadados();

      const senhaHash = await CryptoJS.AES.encrypt(senha, "secret key 123").toString();
      await localStorage.setItem("token", senhaHash);
      await localStorage.setItem("lsUsuario", usuario);

      // A validação acontece pelos headers appKey/appToken que o ApiService já monta
      // sozinho (coddb-filial-usuario / senha criptografada) — não precisa de parâmetro
      // nenhum na URL.
      let sCodbd = localStorage.getItem('lsCodBd')

      const RETORNO = await this.api.req(`login_crypto/${sCodbd}/${CODEMP}/${SISTEMA_ID}/${COMPONENTE}/${ACAO}`, [], "get", {}, true);

      Swal.close();

      if (RETORNO) {
        await localStorage.setItem("acessoH", "H");
        // Fire-and-forget — não pode atrasar/travar o login por causa de um log de acesso.
        this.registrarAcesso(usuario);
        // "usuario" da resposta (nome, email, fone, tipo) vem do login_crypto da API; APIs
        // antigas, que só devolvem { res }, caem em null.
        return { usuario, dados: RETORNO?.usuario ?? null, err: null };
      } else {
        return { usuario: "", dados: null, err: "Usuário sem acesso, ou credenciais inválidas." };
      }
    } catch (error) {
      Swal.close();
      return { usuario: "", dados: null, err: error };
    }
  }

  // Igual ao antigo (ServiceProvider.register, apc_padrao_v4) — registra o login em dois
  // lugares: volumetria (Agiw, só em produção) e o log legado de user_id (mysql_update_user_id).
  private async registrarAcesso(usuario: string): Promise<void> {
    try {
      const coddb = localStorage.getItem("lsCodBd") || "";
      const codemp = localStorage.getItem("lsFilial") || "";
      const lsApi = localStorage.getItem("lsApi") || "";
      const appTip = lsApi.toLowerCase().startsWith("https") ? "0" : "1"; // 0 = HTTPS | 1 = HTTP
      const versao = environment.version;

      const data = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const dataFormatada =
        `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}` +
        `T${pad(data.getHours())}:${pad(data.getMinutes())}:${pad(data.getSeconds())}`;
      const userIdLog = `${coddb}-${codemp}-${usuario}|${APP_PREFIXO}-${versao}|${appTip}`;

      if (environment.production) {
        try {
          const config: any = await lastValueFrom(this.http.get(`/config.json?t=${Date.now()}`));
          const vol = {
            CODCLI: config?.["EMPRESA"],
            DATAACESSO: new Date(),
            CODEMPRESA: coddb,
            USER_ID: usuario,
            SISTEMA_ID: SISTEMA_ID,
            CODEMP: "",
            APPVER: versao,
            APPTIP: appTip,
            ACAO: "login",
          };
          const auth = "Basic " + btoa(`${config?.["01"]}:${config?.["02"]}`);
          const cabec = new HttpHeaders()
            .set("Content-Type", "application/json; charset=utf-8")
            .set("Accept", "*/*")
            .set("Access-Control-Allow-Origin", "*")
            .set("Authorization", auth);
          await lastValueFrom(this.http.post("https://apps.agiw.com.br:8399/volumetria", vol, { headers: cabec }));
        } catch (error) {
          console.error("Erro ao registrar volumetria de login", error);
        }
      }

      if (navigator.onLine) {
        const url =
          `https://api.agiw.com.br/mysql_update_user_id_padrao.php?table=${APP_LOG_TABLE}` +
          `&data=${dataFormatada}&user_id=${userIdLog}&empresa=${localStorage.getItem("nomeEmpFil") || ""}`;
        lastValueFrom(this.http.get(url)).catch(error => {
          console.error("Erro ao registrar log de acesso", error);
        });
      }
    } catch (error) {
      console.error("Erro ao registrar acesso", error);
    }
  }
}
