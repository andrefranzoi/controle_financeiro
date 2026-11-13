const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const fmtMoney = (centavos: number) => brl.format(centavos / 100);

/** Converte "1.234,56" / "1234,56" / "1234.56" em centavos. Retorna NaN se inválido. */
export function parseMoney(texto: string): number {
  let t = (texto ?? "").trim().replace(/[R$\s]/g, "");
  if (!t) return NaN;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

export const moneyToInput = (centavos: number) => (centavos / 100).toFixed(2).replace(".", ",");

const pad = (n: number) => String(n).padStart(2, "0");

export const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const mesAtual = () => hoje().slice(0, 7);

export function somaMes(ym: string, delta: number): string {
  const [a, m] = ym.split("-").map(Number);
  const d = new Date(a, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function diasNoMes(ym: string): number {
  const [a, m] = ym.split("-").map(Number);
  return new Date(a, m, 0).getDate();
}

/** Data do dia pedido no mês; se o mês for menor (ex.: dia 31 em fevereiro), usa o último dia. */
export const dataDoMes = (ym: string, dia: number) => `${ym}-${pad(Math.min(dia, diasNoMes(ym)))}`;

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function nomeMes(ym: string): string {
  const [a, m] = ym.split("-").map(Number);
  return `${MESES[m - 1]} ${a}`;
}

export const fmtData = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Soma (ou subtrai) dias a uma data "YYYY-MM-DD". */
export function somaDias(iso: string, n: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const dt = new Date(a, m - 1, d + n);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/** Dias de `de` até `ate` (positivo se `ate` for depois). */
export function diasEntre(de: string, ate: string): number {
  const [a1, m1, d1] = de.split("-").map(Number);
  const [a2, m2, d2] = ate.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
}

/** 0 = domingo ... 6 = sábado. */
export const diaDaSemana = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).getDay();
};

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** "qui, 12/11" */
export const fmtDataLonga = (iso: string) => `${DIAS_SEMANA[diaDaSemana(iso)]}, ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** "hoje", "amanhã", "em 3 dias", "há 2 dias" */
export function quandoVence(iso: string, base = hoje()): string {
  const n = diasEntre(base, iso);
  if (n === 0) return "hoje";
  if (n === 1) return "amanhã";
  if (n === -1) return "ontem";
  return n > 0 ? `em ${n} dias` : `há ${-n} dias`;
}

/** Se a data cair no sábado ou domingo, volta para a sexta anterior (15/11 domingo → 13/11 sexta). */
export function antecipaParaSexta(iso: string): string {
  const dia = diaDaSemana(iso);
  if (dia === 6) return somaDias(iso, -1);
  if (dia === 0) return somaDias(iso, -2);
  return iso;
}

/** Meses de `de` até `ate` (ambos "YYYY-MM"); positivo se `ate` for depois. */
export function mesesEntre(de: string, ate: string): number {
  const [a1, m1] = de.split("-").map(Number);
  const [a2, m2] = ate.split("-").map(Number);
  return (a2 - a1) * 12 + (m2 - m1);
}
