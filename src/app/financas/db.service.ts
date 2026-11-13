import { Injectable } from "@angular/core";
import { Capacitor } from "@capacitor/core";
import { antecipaParaSexta } from "./format";
import { ICONE_PADRAO_POR_NOME, ICONES_LEGADOS, TIPO_PADRAO_POR_NOME } from "./category-icons";
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from "@capacitor-community/sqlite";

const DB_NAME = "controle_financeiro";
const WEB_KEY = "controle_financeiro.sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS recorrencias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  descricao TEXT NOT NULL,
  valor INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  dia INTEGER NOT NULL,
  categoria_id INTEGER,
  inicio TEXT NOT NULL,
  fim TEXT,
  ativa INTEGER NOT NULL DEFAULT 1,
  antecipar_fds INTEGER NOT NULL DEFAULT 1,
  valor_variavel INTEGER NOT NULL DEFAULT 0,
  valor_desde TEXT,
  parcelas INTEGER
);
CREATE TABLE IF NOT EXISTS contas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  descricao TEXT NOT NULL,
  valor INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  vencimento TEXT NOT NULL,
  pago_em TEXT,
  categoria_id INTEGER,
  recorrencia_id INTEGER,
  competencia TEXT,
  estimado INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE COLLATE NOCASE,
  cor TEXT NOT NULL DEFAULT '#6366f1',
  icone TEXT,
  tipo TEXT NOT NULL DEFAULT 'ambas'
);
CREATE TABLE IF NOT EXISTS config (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS recorrencia_excecoes (
  recorrencia_id INTEGER NOT NULL,
  competencia TEXT NOT NULL,
  PRIMARY KEY (recorrencia_id, competencia)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_conta_rec ON contas(recorrencia_id, competencia) WHERE recorrencia_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_conta_venc ON contas(vencimento);
`;

interface Driver {
  run(sql: string, params: unknown[]): Promise<number>;
  query<T>(sql: string, params: unknown[]): Promise<T[]>;
  /** Backup do banco como arquivo SQLite (só no navegador por enquanto). */
  exportar?(): Promise<Uint8Array>;
  importar?(bytes: Uint8Array): Promise<void>;
}

/** Celular: plugin SQLite nativo (arquivo dentro do app). */
class NativeDriver implements Driver {
  private ready?: Promise<SQLiteDBConnection>;

  private open() {
    return (this.ready ??= (async () => {
      const sqlite = new SQLiteConnection(CapacitorSQLite);
      const consistente = (await sqlite.checkConnectionsConsistency()).result;
      const existe = (await sqlite.isConnection(DB_NAME, false)).result;
      const db =
        consistente && existe
          ? await sqlite.retrieveConnection(DB_NAME, false)
          : await sqlite.createConnection(DB_NAME, false, "no-encryption", 1, false);
      await db.open();
      await db.execute(SCHEMA);
      return db;
    })());
  }

  async run(sql: string, params: unknown[]) {
    const r = await (await this.open()).run(sql, params as any[]);
    return r.changes?.lastId ?? 0;
  }

  async query<T>(sql: string, params: unknown[]) {
    const r = await (await this.open()).query(sql, params as any[]);
    return (r.values ?? []) as T[];
  }
}

// ---- Armazenamento do navegador: o arquivo SQLite inteiro fica no IndexedDB (mais durável e maior que o localStorage) ----
const IDB_NOME = "controle_financeiro_web";
const IDB_LOJA = "arquivos";
const IDB_CHAVE = "sqlite";

function abrirIdb(): Promise<IDBDatabase> {
  return new Promise((ok, erro) => {
    const r = indexedDB.open(IDB_NOME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(IDB_LOJA);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  });
}

async function lerIdb(): Promise<Uint8Array | undefined> {
  const idb = await abrirIdb();
  return new Promise((ok, erro) => {
    const t = idb.transaction(IDB_LOJA).objectStore(IDB_LOJA).get(IDB_CHAVE);
    t.onsuccess = () => ok(t.result ?? undefined);
    t.onerror = () => erro(t.error);
  });
}

async function gravarIdb(bytes: Uint8Array): Promise<void> {
  const idb = await abrirIdb();
  return new Promise((ok, erro) => {
    const tx = idb.transaction(IDB_LOJA, "readwrite");
    tx.objectStore(IDB_LOJA).put(bytes, IDB_CHAVE);
    tx.oncomplete = () => ok();
    tx.onerror = () => erro(tx.error);
  });
}

const CABECALHO_SQLITE = "SQLite format 3\0";

/**
 * Navegador (desenvolvimento): sql.js (SQLite em WASM) salvo no IndexedDB.
 * Atenção: o navegador separa os dados por endereço (inclusive a PORTA), então o `ng serve` precisa usar sempre a mesma porta
 * (fixada em angular.json). Para levar os dados de um endereço a outro, use Backup > Exportar / Importar.
 */
class WebDriver implements Driver {
  private ready?: Promise<any>;
  private SQL: any;
  private fila: Promise<void> = Promise.resolve();

  private open() {
    return (this.ready ??= (async () => {
      this.SQL = await (window as any).initSqlJs({ locateFile: (f: string) => `assets/${f}` });
      let bytes: Uint8Array | undefined;
      try {
        bytes = await lerIdb();
      } catch {
        /* IndexedDB indisponível: cai para o localStorage */
      }
      if (!bytes) {
        // Banco das versões anteriores (localStorage): migra para o IndexedDB na primeira abertura.
        const antigo = localStorage.getItem(WEB_KEY);
        if (antigo) {
          bytes = Uint8Array.from(atob(antigo), (c) => c.charCodeAt(0));
          try {
            await gravarIdb(bytes);
          } catch {
            /* mantém no localStorage */
          }
        }
      }
      // Pede ao navegador para não apagar estes dados sozinho quando faltar espaço.
      navigator.storage?.persist?.().catch(() => undefined);
      const db = new this.SQL.Database(bytes);
      db.exec(SCHEMA);
      return db;
    })());
  }

  /** Grava o arquivo inteiro; as gravações entram numa fila para nunca se atropelarem. */
  private persistir(db: any): Promise<void> {
    const dados: Uint8Array = db.export();
    this.fila = this.fila.then(async () => {
      try {
        await gravarIdb(dados);
      } catch {
        let bin = "";
        for (let i = 0; i < dados.length; i += 0x8000) bin += String.fromCharCode(...dados.subarray(i, i + 0x8000));
        localStorage.setItem(WEB_KEY, btoa(bin));
      }
    });
    return this.fila;
  }

  async exportar(): Promise<Uint8Array> {
    return (await this.open()).export();
  }

  /** Troca o banco atual pelo conteúdo de um arquivo SQLite exportado antes. Valida o arquivo antes de substituir. */
  async importar(bytes: Uint8Array): Promise<void> {
    await this.open();
    if (new TextDecoder().decode(bytes.subarray(0, 16)) !== CABECALHO_SQLITE) throw new Error("O arquivo não é um banco SQLite.");
    const novo = new this.SQL.Database(bytes);
    const tabelas = novo.exec("SELECT name FROM sqlite_master WHERE type='table'")[0]?.values.flat() ?? [];
    if (!tabelas.includes("contas") || !tabelas.includes("categorias")) {
      novo.close();
      throw new Error("Este arquivo não parece ser um backup do Controle Financeiro.");
    }
    novo.exec(SCHEMA);
    this.ready = Promise.resolve(novo);
    await this.persistir(novo);
  }

  async run(sql: string, params: unknown[]) {
    const db = await this.open();
    db.run(sql, params);
    const id = db.exec("SELECT last_insert_rowid()")[0].values[0][0] as number;
    await this.persistir(db);
    return id;
  }

  async query<T>(sql: string, params: unknown[]) {
    const db = await this.open();
    const stmt = db.prepare(sql);
    try {
      stmt.bind(params);
      const linhas: T[] = [];
      while (stmt.step()) linhas.push(stmt.getAsObject() as T);
      return linhas;
    } finally {
      stmt.free();
    }
  }
}

const CATEGORIAS_PADRAO: [string, string][] = [
  ["Moradia", "#6366f1"],
  ["Alimentação", "#f59e0b"],
  ["Transporte", "#0ea5e9"],
  ["Saúde", "#ef4444"],
  ["Lazer", "#a855f7"],
  ["Salário", "#22c55e"],
  ["Outros", "#64748b"],
];

@Injectable({ providedIn: "root" })
export class DbService {
  private driver: Driver = Capacitor.getPlatform() === "web" ? new WebDriver() : new NativeDriver();
  private pronto = this.migrar();

  async run(sql: string, params: unknown[] = []): Promise<number> {
    await this.pronto;
    return this.driver.run(sql, params);
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    await this.pronto;
    return this.driver.query<T>(sql, params);
  }

  /** Backup como arquivo .sqlite — disponível no navegador. No celular o banco já é um arquivo SQLite nativo do app. */
  get suportaBackup(): boolean {
    return !!this.driver.exportar;
  }

  async exportarBackup(): Promise<Uint8Array> {
    await this.pronto;
    if (!this.driver.exportar) throw new Error("Backup indisponível neste ambiente.");
    return this.driver.exportar();
  }

  async importarBackup(bytes: Uint8Array): Promise<void> {
    await this.pronto;
    if (!this.driver.importar) throw new Error("Backup indisponível neste ambiente.");
    await this.driver.importar(bytes);
    this.pronto = this.migrar(); // arquivos de versões antigas recebem as colunas/categorias novas
    await this.pronto;
  }

  /** Ajusta bancos criados antes das categorias (coluna de texto `categoria`) e cadastra as categorias padrão. */
  private async migrar() {
    for (const tabela of ["contas", "recorrencias"]) {
      const colunas = await this.driver.query<{ name: string }>(`PRAGMA table_info(${tabela})`, []);
      if (!colunas.some((c) => c.name === "categoria_id")) {
        await this.driver.run(`ALTER TABLE ${tabela} ADD COLUMN categoria_id INTEGER`, []);
      }
      if (tabela === "contas" && !colunas.some((c) => c.name === "estimado")) {
        await this.driver.run("ALTER TABLE contas ADD COLUMN estimado INTEGER NOT NULL DEFAULT 0", []);
      }
      if (tabela === "recorrencias" && !colunas.some((c) => c.name === "parcelas")) {
        await this.driver.run("ALTER TABLE recorrencias ADD COLUMN parcelas INTEGER", []);
      }
      if (tabela === "recorrencias" && !colunas.some((c) => c.name === "valor_desde")) {
        await this.driver.run("ALTER TABLE recorrencias ADD COLUMN valor_desde TEXT", []);
      }
      if (tabela === "recorrencias" && !colunas.some((c) => c.name === "valor_variavel")) {
        await this.driver.run("ALTER TABLE recorrencias ADD COLUMN valor_variavel INTEGER NOT NULL DEFAULT 0", []);
      }
      if (colunas.some((c) => c.name === "categoria")) {
        await this.driver.run(
          `INSERT OR IGNORE INTO categorias(nome) SELECT DISTINCT trim(categoria) FROM ${tabela} WHERE trim(coalesce(categoria,''))<>''`,
          [],
        );
        await this.driver.run(
          `UPDATE ${tabela} SET categoria_id=(SELECT id FROM categorias WHERE nome=trim(${tabela}.categoria)) WHERE categoria_id IS NULL AND trim(coalesce(categoria,''))<>''`,
          [],
        );
      }
    }
    // Recorrências criadas antes da regra do fim de semana: ligam a antecipação (padrão) e ajustam, uma única vez,
    // as contas ainda não pagas que já tinham sido geradas (sábado/domingo → sexta).
    const colunasRec = await this.driver.query<{ name: string }>("PRAGMA table_info(recorrencias)", []);
    if (!colunasRec.some((c) => c.name === "antecipar_fds")) {
      await this.driver.run("ALTER TABLE recorrencias ADD COLUMN antecipar_fds INTEGER NOT NULL DEFAULT 1", []);
    }
    const jaAjustou = await this.driver.query("SELECT 1 AS x FROM config WHERE chave='migr_antecipar_fds'", []);
    if (!jaAjustou.length) {
      const abertas = await this.driver.query<{ id: number; vencimento: string }>(
        "SELECT c.id, c.vencimento FROM contas c JOIN recorrencias r ON r.id=c.recorrencia_id WHERE c.pago_em IS NULL AND r.antecipar_fds=1",
        [],
      );
      for (const c of abertas) {
        const novo = antecipaParaSexta(c.vencimento);
        if (novo !== c.vencimento) await this.driver.run("UPDATE contas SET vencimento=? WHERE id=?", [novo, c.id]);
      }
      await this.driver.run("INSERT OR REPLACE INTO config(chave,valor) VALUES('migr_antecipar_fds','1')", []);
    }
    const colunasCategorias = await this.driver.query<{ name: string }>("PRAGMA table_info(categorias)", []);
    if (!colunasCategorias.some((c) => c.name === "icone")) {
      await this.driver.run("ALTER TABLE categorias ADD COLUMN icone TEXT", []);
    }
    if (!colunasCategorias.some((c) => c.name === "tipo")) {
      await this.driver.run("ALTER TABLE categorias ADD COLUMN tipo TEXT NOT NULL DEFAULT 'ambas'", []);
      // Banco anterior ao tipo: as categorias padrão ganham o tipo delas; as criadas pelo usuário continuam valendo para as duas.
      for (const [nome, tipo] of Object.entries(TIPO_PADRAO_POR_NOME)) {
        await this.driver.run("UPDATE categorias SET tipo=? WHERE nome=?", [tipo, nome]);
      }
    }
    const [{ n }] = await this.driver.query<{ n: number }>("SELECT count(*) AS n FROM categorias", []);
    if (n === 0) {
      for (const [nome, cor] of CATEGORIAS_PADRAO) {
        await this.driver.run("INSERT INTO categorias(nome,cor,icone,tipo) VALUES(?,?,?,?)", [nome, cor, ICONE_PADRAO_POR_NOME[nome], TIPO_PADRAO_POR_NOME[nome] ?? "ambas"]);
      }
    }
    // Chaves antigas ("casa", "comida"...) viram nomes de ícone Lucide ("house", "utensils"...).
    for (const [antigo, novo] of Object.entries(ICONES_LEGADOS)) {
      await this.driver.run("UPDATE categorias SET icone=? WHERE icone=?", [novo, antigo]);
    }
    // Categorias que já existiam sem ícone: as padrão ganham o ícone delas; as demais ficam com a etiqueta.
    for (const [nome, icone] of Object.entries(ICONE_PADRAO_POR_NOME)) {
      await this.driver.run("UPDATE categorias SET icone=? WHERE icone IS NULL AND nome=?", [icone, nome]);
    }
    await this.driver.run("UPDATE categorias SET icone='tag' WHERE icone IS NULL", []);
  }
}
