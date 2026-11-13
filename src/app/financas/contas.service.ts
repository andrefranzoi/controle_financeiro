import { Injectable, inject, signal } from "@angular/core";
import { DbService } from "./db.service";
import { Conta, Recorrencia, Tipo } from "./models";
import { antecipaParaSexta, dataDoMes, hoje, mesAtual, somaMes } from "./format";

export interface NovaConta {
  descricao: string;
  valor: number;
  tipo: Tipo;
  vencimento: string;
  pago_em?: string | null;
  categoria_id: number | null;
}

export interface NovaRecorrencia {
  descricao: string;
  valor: number;
  tipo: Tipo;
  dia: number;
  categoria_id: number | null;
  inicio: string;
  fim: string | null;
  /** Padrão: ligado. Se o vencimento cair no sábado/domingo, vai para a sexta anterior. */
  antecipar_fds?: boolean;
  /** O valor muda todo mês (luz, água...): o informado é uma estimativa e o app pergunta o valor real ao pagar. */
  valor_variavel?: boolean;
  /** Quantidade de parcelas; o mês final (fim) é calculado sozinho a partir do início. */
  parcelas?: number | null;
}

export interface LinhaHistorico {
  mes: string;
  tipo: Tipo;
  categoria_id: number | null;
  total: number;
}

const SELECT_CONTA =`SELECT c.id, c.descricao, c.valor, c.tipo, c.vencimento, c.pago_em, c.categoria_id,
  c.recorrencia_id, c.competencia, c.estimado, k.nome AS categoria_nome, k.cor AS categoria_cor, k.icone AS categoria_icone,
  rc.parcelas AS parcelas_total, rc.inicio AS rec_inicio
  FROM contas c LEFT JOIN categorias k ON k.id = c.categoria_id LEFT JOIN recorrencias rc ON rc.id = c.recorrencia_id`;

const SELECT_RECORRENCIA = `SELECT r.id, r.descricao, r.valor, r.tipo, r.dia, r.categoria_id, r.inicio, r.fim, r.ativa, r.antecipar_fds, r.valor_variavel, r.valor_desde, r.parcelas,
  k.nome AS categoria_nome FROM recorrencias r LEFT JOIN categorias k ON k.id = r.categoria_id`;

@Injectable({ providedIn: "root" })
export class ContasService {
  private db = inject(DbService);

  /** Sobe a cada alteração de contas/recorrências: as telas observam este número para recarregar sozinhas. */
  versao = signal(0);

  private mudou() {
    this.versao.update((v) => v + 1);
  }

  /** Contas do mês (gera antes as ocorrências das contas recorrentes que ainda não existem). */
  async listarMes(ym: string): Promise<Conta[]> {
    await this.gerarMes(ym);
    await this.gerarMes(somaMes(ym, 1)); // uma ocorrência do mês seguinte pode vencer na sexta do fim deste mês
    return this.db.query<Conta>(`${SELECT_CONTA} WHERE substr(c.vencimento,1,7)=? ORDER BY c.vencimento, c.id`, [ym]);
  }

  async obter(id: number): Promise<Conta | undefined> {
    return (await this.db.query<Conta>(`${SELECT_CONTA} WHERE c.id=?`, [id]))[0];
  }

  async criar(c: NovaConta): Promise<number> {
    const id = await this.db.run("INSERT INTO contas(descricao,valor,tipo,vencimento,categoria_id,pago_em) VALUES(?,?,?,?,?,?)", [
      c.descricao, c.valor, c.tipo, c.vencimento, c.categoria_id, c.pago_em ?? null,
    ]);
    this.mudou();
    return id;
  }

  async atualizar(id: number, c: NovaConta): Promise<void> {
    await this.db.run("UPDATE contas SET descricao=?,valor=?,tipo=?,vencimento=?,categoria_id=?,pago_em=? WHERE id=?", [
      c.descricao, c.valor, c.tipo, c.vencimento, c.categoria_id, c.pago_em ?? null, id,
    ]);
    if (c.pago_em) await this.confirmarValor(id);
    this.mudou();
  }

  /** Paga uma conta de valor variável informando o valor real: confirma o valor e recalcula a estimativa dos próximos meses. */
  async pagarComValor(id: number, valor: number): Promise<void> {
    await this.db.run("UPDATE contas SET valor=?, pago_em=? WHERE id=?", [valor, hoje(), id]);
    await this.confirmarValor(id);
    this.mudou();
  }

  /** Marca o valor como real (não é mais estimativa) e atualiza a média usada nas ocorrências futuras ainda estimadas. */
  private async confirmarValor(id: number): Promise<void> {
    await this.db.run("UPDATE contas SET estimado=0 WHERE id=?", [id]);
    const c = await this.obter(id);
    if (!c?.recorrencia_id || !c.competencia) return;
    const r = await this.obterRecorrencia(c.recorrencia_id);
    if (!r?.valor_variavel) return;
    const media = await this.estimativa(r);
    await this.db.run("UPDATE contas SET valor=? WHERE recorrencia_id=? AND estimado=1 AND pago_em IS NULL AND competencia>?", [media, r.id, c.competencia]);
  }

  /** Média dos últimos pagamentos reais (até 3) de uma conta de valor variável; sem histórico, usa o valor cadastrado. */
  async estimativa(r: Recorrencia): Promise<number> {
    const linhas = await this.db.query<{ valor: number }>(
      "SELECT valor FROM contas WHERE recorrencia_id=? AND estimado=0 AND pago_em IS NOT NULL AND competencia>=? ORDER BY competencia DESC LIMIT 3",
      [r.id, r.valor_desde ?? "0000-00"],
    );
    if (!linhas.length) return r.valor;
    return Math.round(linhas.reduce((s, l) => s + l.valor, 0) / linhas.length);
  }

  /** Quantos pagamentos reais entram na média (0 a 3), para mostrar "média dos últimos N meses". */
  async mesesNaMedia(recorrenciaId: number): Promise<number> {
    const rec = await this.obterRecorrencia(recorrenciaId);
    const [r] = await this.db.query<{ n: number }>(
      "SELECT count(*) AS n FROM (SELECT 1 FROM contas WHERE recorrencia_id=? AND estimado=0 AND pago_em IS NOT NULL AND competencia>=? ORDER BY competencia DESC LIMIT 3)",
      [recorrenciaId, rec?.valor_desde ?? "0000-00"],
    );
    return r?.n ?? 0;
  }

  async marcarPago(id: number, pago: boolean): Promise<void> {
    await this.db.run("UPDATE contas SET pago_em=? WHERE id=?", [pago ? hoje() : null, id]);
    this.mudou();
  }

  async excluir(id: number): Promise<void> {
    // Se for uma ocorrência de conta recorrente, lembra que este mês foi excluído (senão ela seria gerada de novo).
    const c = await this.obter(id);
    if (c?.recorrencia_id && c.competencia) {
      await this.db.run("INSERT OR IGNORE INTO recorrencia_excecoes(recorrencia_id,competencia) VALUES(?,?)", [c.recorrencia_id, c.competencia]);
    }
    await this.db.run("DELETE FROM contas WHERE id=?", [id]);
    this.mudou();
  }

  /** Desfaz uma exclusão: grava a conta de novo com o mesmo id (usado pelo "Desfazer"). */
  async restaurar(c: Conta): Promise<void> {
    if (c.recorrencia_id && c.competencia) {
      await this.db.run("DELETE FROM recorrencia_excecoes WHERE recorrencia_id=? AND competencia=?", [c.recorrencia_id, c.competencia]);
    }
    await this.db.run(
      "INSERT OR REPLACE INTO contas(id,descricao,valor,tipo,vencimento,pago_em,categoria_id,recorrencia_id,competencia,estimado) VALUES(?,?,?,?,?,?,?,?,?,?)",
      [c.id, c.descricao, c.valor, c.tipo, c.vencimento, c.pago_em, c.categoria_id, c.recorrencia_id, c.competencia, c.estimado ?? 0],
    );
    this.mudou();
  }

  // ---- Recorrências ----

  async listarRecorrencias(): Promise<Recorrencia[]> {
    return this.db.query<Recorrencia>(`${SELECT_RECORRENCIA} WHERE r.ativa=1 ORDER BY r.dia, r.descricao`);
  }

  async obterRecorrencia(id: number): Promise<Recorrencia | undefined> {
    return (await this.db.query<Recorrencia>(`${SELECT_RECORRENCIA} WHERE r.id=?`, [id]))[0];
  }

  async criarRecorrencia(r: NovaRecorrencia): Promise<void> {
    await this.db.run(
      "INSERT INTO recorrencias(descricao,valor,tipo,dia,categoria_id,inicio,fim,antecipar_fds,valor_variavel,parcelas) VALUES(?,?,?,?,?,?,?,?,?,?)",
      [r.descricao, r.valor, r.tipo, r.dia, r.categoria_id, r.inicio, this.fimDe(r), r.antecipar_fds === false ? 0 : 1, r.valor_variavel ? 1 : 0, this.parcelasDe(r)],
    );
    this.mudou();
  }

  /** Atualiza a regra; as ocorrências não pagas do mês atual em diante são apagadas e regeradas ao abrir o mês. */
  async atualizarRecorrencia(id: number, r: NovaRecorrencia): Promise<void> {
    // Conta de valor variável: se o valor foi mudado na edição, ele passa a valer como estimativa a partir de agora
    // (pagamentos anteriores deixam de entrar na média); se não mudou, mantém o marco atual.
    const antes = await this.obterRecorrencia(id);
    const valorDesde = !r.valor_variavel ? null : antes && antes.valor !== r.valor ? mesAtual() : (antes?.valor_desde ?? null);
    await this.db.run("UPDATE recorrencias SET descricao=?,valor=?,tipo=?,dia=?,categoria_id=?,inicio=?,fim=?,antecipar_fds=?,valor_variavel=?,valor_desde=?,parcelas=? WHERE id=?", [
      r.descricao, r.valor, r.tipo, r.dia, r.categoria_id, r.inicio, this.fimDe(r), r.antecipar_fds === false ? 0 : 1, r.valor_variavel ? 1 : 0, valorDesde, this.parcelasDe(r), id,
    ]);
    await this.limparFuturas(id);
    this.mudou();
  }

  private parcelasDe(r: NovaRecorrencia): number | null {
    return r.parcelas && r.parcelas > 1 ? Math.floor(r.parcelas) : null;
  }

  /** Mês final: com parcelas, é calculado (início + parcelas - 1 meses); sem parcelas, vale o "repetir até" informado. */
  private fimDe(r: NovaRecorrencia): string | null {
    const n = this.parcelasDe(r);
    return n ? somaMes(r.inicio, n - 1) : r.fim;
  }

  /** Encerra a recorrência: some da lista e apaga as ocorrências futuras não pagas. O histórico é mantido. */
  async encerrarRecorrencia(id: number): Promise<void> {
    await this.db.run("UPDATE recorrencias SET ativa=0 WHERE id=?", [id]);
    await this.limparFuturas(id);
    this.mudou();
  }

  private limparFuturas(recorrenciaId: number) {
    return this.db.run("DELETE FROM contas WHERE recorrencia_id=? AND pago_em IS NULL AND competencia>=?", [
      recorrenciaId,
      mesAtual(),
    ]);
  }

  /** Totais por mês, tipo e categoria entre dois meses (inclusive). Alimenta os gráficos. */
  async historicoMensal(mesInicio: string, mesFim: string): Promise<LinhaHistorico[]> {
    return this.db.query<LinhaHistorico>(
      `SELECT substr(vencimento,1,7) AS mes, tipo, categoria_id, SUM(valor) AS total
         FROM contas WHERE substr(vencimento,1,7) BETWEEN ? AND ?
        GROUP BY mes, tipo, categoria_id`,
      [mesInicio, mesFim],
    );
  }

  /** Vencimento da ocorrência de `ym`: o dia da recorrência (ajustado ao tamanho do mês) e, se ligado, antecipado para a sexta no fim de semana. */
  private vencimentoDe(r: Recorrencia, ym: string): string {
    const data = dataDoMes(ym, r.dia);
    return r.antecipar_fds ? antecipaParaSexta(data) : data;
  }

  private async gerarMes(ym: string): Promise<void> {
    const regras = await this.db.query<Recorrencia>(
      "SELECT * FROM recorrencias WHERE ativa=1 AND inicio<=? AND (fim IS NULL OR fim>=?)",
      [ym, ym],
    );
    for (const r of regras) {
      const valor = r.valor_variavel ? await this.estimativa(r) : r.valor;
      await this.db.run(
        "INSERT OR IGNORE INTO contas(descricao,valor,tipo,vencimento,categoria_id,recorrencia_id,competencia,estimado) SELECT ?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM recorrencia_excecoes WHERE recorrencia_id=? AND competencia=?)",
        [r.descricao, valor, r.tipo, this.vencimentoDe(r, ym), r.categoria_id, r.id, ym, r.valor_variavel ? 1 : 0, r.id, ym],
      );
    }
  }
}
