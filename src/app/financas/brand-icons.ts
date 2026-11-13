import {
  siAppletv, siApple, siApplemusic, siAudible, siAliexpress, siCarrefour, siCrunchyroll, siDeezer, siDropbox, siFacebook,
  siGithub, siGoogle, siGoogledrive, siGoogleplay, siHbomax, siIcloud, siIfood, siInstagram, siMercadopago, siNetflix,
  siNotion, siNubank, siParamountplus, siPaypal, siPicpay, siPlaystation, siShell, siShopee, siSpotify, siSteam,
  siTiktok, siTwitch, siUber, siVivo, siWhatsapp, siYoutube, siZoom,
} from "simple-icons";

export interface Marca {
  nome: string;
  /** Caminho SVG (viewBox 24x24) do logo. */
  path: string;
  /** Cor oficial da marca, sem "#". */
  hex: string;
}

type Icone = { title: string; path: string; hex: string };

/** Palavras-chave (sem acento, minúsculas) → logo. Os mais específicos vêm antes ("apple music" antes de "apple"). */
const MARCAS: [string[], Icone][] = [
  [["netflix"], siNetflix],
  [["spotify"], siSpotify],
  [["youtube", "you tube"], siYoutube],
  [["uber"], siUber],
  [["nubank", "nu bank"], siNubank],
  [["ifood", "i food"], siIfood],
  [["mercado pago", "mercadopago"], siMercadopago],
  [["picpay", "pic pay"], siPicpay],
  [["apple music"], siApplemusic],
  [["apple tv", "appletv"], siAppletv],
  [["icloud"], siIcloud],
  [["apple"], siApple],
  [["google drive", "google one"], siGoogledrive],
  [["google play"], siGoogleplay],
  [["google"], siGoogle],
  [["hbo"], siHbomax],
  [["paramount"], siParamountplus],
  [["crunchyroll"], siCrunchyroll],
  [["deezer"], siDeezer],
  [["audible"], siAudible],
  [["paypal"], siPaypal],
  [["whatsapp"], siWhatsapp],
  [["instagram"], siInstagram],
  [["facebook"], siFacebook],
  [["tiktok"], siTiktok],
  [["twitch"], siTwitch],
  [["github"], siGithub],
  [["dropbox"], siDropbox],
  [["notion"], siNotion],
  [["zoom"], siZoom],
  [["steam"], siSteam],
  [["playstation", "psn"], siPlaystation],
  [["shopee"], siShopee],
  [["aliexpress"], siAliexpress],
  [["carrefour"], siCarrefour],
  [["shell"], siShell],
  [["vivo"], siVivo],
];

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const cache = new Map<string, Marca | null>();

/** Reconhece a marca pelo texto da descrição ("Netflix", "assinatura Spotify"...). Retorna null se não houver logo. */
export function marcaDe(descricao: string): Marca | null {
  const chave = normalizar(descricao ?? "");
  if (cache.has(chave)) return cache.get(chave)!;
  const achada = MARCAS.find(([palavras]) => palavras.some((p) => chave.includes(p)));
  const marca = achada ? { nome: achada[1].title, path: achada[1].path, hex: achada[1].hex } : null;
  cache.set(chave, marca);
  return marca;
}
