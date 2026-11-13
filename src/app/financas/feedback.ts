/** Vibração curta de confirmação (só em ações importantes). Não faz nada onde não houver suporte. */
export function vibrar(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* sem suporte: ignora */
  }
}
