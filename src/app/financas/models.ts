export type Tipo = "pagar" | "receber";

/** Valores monetários sempre em centavos (inteiro); datas em "YYYY-MM-DD"; competência em "YYYY-MM". */
export interface Conta {
  id: number;
  descricao: string;
  valor: number;
  tipo: Tipo;
  vencimento: string;
  pago_em: string | null;
  categoria_id: number | null;
  categoria_nome: string | null;
  categoria_cor: string | null;
  categoria_icone: string | null;
  recorrencia_id: number | null;
  competencia: string | null;
  /** 1 = valor ainda é uma estimativa (conta de valor variável, como luz e água). Vira 0 quando o valor real é informado. */
  estimado: number;
  /** Se a conta vem de uma recorrência parcelada: total de parcelas e mês da 1ª (para mostrar "parcela 3/12"). */
  parcelas_total: number | null;
  rec_inicio: string | null;
}

export interface Recorrencia {
  id: number;
  descricao: string;
  valor: number;
  tipo: Tipo;
  dia: number;
  categoria_id: number | null;
  categoria_nome: string | null;
  inicio: string;
  fim: string | null;
  ativa: number;
  /** 1 = se o vencimento cair no fim de semana, vai para a sexta anterior. */
  antecipar_fds: number;
  /** 1 = o valor muda todo mês; o cadastrado é só uma estimativa. */
  valor_variavel: number;
  /** Competência (YYYY-MM) a partir da qual o valor cadastrado vale como estimativa; pagamentos anteriores não entram na média. */
  valor_desde: string | null;
  /** Número de parcelas (null = sem fim definido por parcelas). O mês final é calculado a partir daqui. */
  parcelas: number | null;
}

/** Onde a categoria pode ser usada: só em contas a pagar, só a receber, ou nas duas. */
export type TipoCategoria = Tipo | "ambas";

export interface Categoria {
  id: number;
  nome: string;
  cor: string;
  icone: string | null;
  tipo: TipoCategoria;
}
