import { Injectable } from "@angular/core"
import { HttpClient, HttpHeaders, HttpResponse } from "@angular/common/http"
import { Router } from "@angular/router"
import { lastValueFrom } from "rxjs"
import { ReqParams } from "@/helpers/reqparams.helper"
import { environment } from "@/environments/environment"

@Injectable({
  providedIn: "root",
})
export class ApiService {
  lsUsuario: string
  token: string
  lsCodBd: string
  lsFilial: string
  lsApi: string
  private prod = environment

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  async CarregaDados() {
    this.token = localStorage.getItem("token") || ""
    this.lsUsuario = localStorage.getItem("lsUsuario") || "";
    this.lsCodBd = localStorage.getItem("lsCodBd") || ""
    this.lsFilial = localStorage.getItem("lsFilial") || ""
    this.lsApi = localStorage.getItem("lsApi") || ""
  }

  // Se lsApi já vier com o protocolo (ex: "https://host:porta"), usa como está. Senão, segue
  // o mesmo protocolo da própria página — evita bloqueio de "mixed content" quando o PDV é
  // servido via https e a API só aceitaria http (ou vice-versa).
  private resolverBaseUrl(caminhoApi: string): string {
    if (/^https?:\/\//i.test(caminhoApi)) {
      return caminhoApi
    }
    const protocolo = typeof window !== "undefined" && window.location.protocol === "https:" ? "https" : "http"
    return `${protocolo}://${caminhoApi}`
  }

  private async config(res: string, params: ReqParams[], headersNeeded: boolean, token: string): Promise<{ url: string; headers: HttpHeaders }> {
    await this.CarregaDados()
    const CAMINHOAPI = this.lsApi

    let localUrl = `${this.resolverBaseUrl(CAMINHOAPI)}/${res}`
    let localHeaders = new HttpHeaders({})

    const appKey = `${this.lsCodBd}-${this.lsFilial}-${this.lsUsuario}`

    if (headersNeeded) {
      localHeaders = new HttpHeaders({
        "Content-Type": "application/json; charset=utf-8",
        appKey: appKey,
        appToken: token,
      })
    }

    params.forEach(p => {
      localUrl = localUrl + p.value + "/"
    })

    return { url: localUrl, headers: localHeaders }
  }

  public async req(res: string, params: ReqParams[], type: string, body: any, headersNeeded: boolean): Promise<any> {
    await this.CarregaDados()
    const TOKEN = this.token

    // 🔥 Captura a URL e os Headers isolados exclusivamente para esta chamada
    const { url, headers } = await this.config(res, params, headersNeeded, TOKEN)

    try {
      let serverData: HttpResponse<any>
      const lowerType = type.toLowerCase()

      if (lowerType === "get") {
        serverData = await lastValueFrom(this.http.get(url, { observe: "response", headers: headers }))
      } else if (lowerType === "post" || lowerType === "put" || lowerType === "patch") {
        serverData = await lastValueFrom(this.http[lowerType as "post" | "put" | "patch"](url, body, { observe: "response", headers: headers }))
      } else if (lowerType === "delete") {
        serverData = await lastValueFrom(this.http.delete(url, { observe: "response", headers: headers, body: body }))
      } else {
        throw new Error(`Método HTTP ${type} não suportado.`)
      }

      return serverData.body
    } catch (error) {
      throw error
    }
  }
}
