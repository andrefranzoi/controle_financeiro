import { Injectable, inject } from "@angular/core";
import { DbService } from "./db.service";
import { Categoria, TipoCategoria } from "./models";

@Injectable({ providedIn: "root" })
export class CategoriasService {
  private db = inject(DbService);

  listar(): Promise<Categoria[]> {
    return this.db.query<Categoria>("SELECT id, nome, cor, icone, tipo FROM categorias ORDER BY nome");
  }

  async criar(nome: string, cor: string, icone: string, tipo: TipoCategoria = "ambas"): Promise<void> {
    await this.db.run("INSERT INTO categorias(nome,cor,icone,tipo) VALUES(?,?,?,?)", [nome, cor, icone, tipo]);
  }

  async atualizar(id: number, nome: string, cor: string, icone: string, tipo: TipoCategoria = "ambas"): Promise<void> {
    await this.db.run("UPDATE categorias SET nome=?, cor=?, icone=?, tipo=? WHERE id=?", [nome, cor, icone, tipo, id]);
  }

  /** Remove a categoria; as contas e recorrências que a usavam ficam "sem categoria". */
  async excluir(id: number): Promise<void> {
    await this.db.run("UPDATE contas SET categoria_id=NULL WHERE categoria_id=?", [id]);
    await this.db.run("UPDATE recorrencias SET categoria_id=NULL WHERE categoria_id=?", [id]);
    await this.db.run("DELETE FROM categorias WHERE id=?", [id]);
  }
}
