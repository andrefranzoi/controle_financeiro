import { Injectable, signal } from "@angular/core";
import { Capacitor } from "@capacitor/core";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";

/** Digital (ou outra biometria cadastrada no aparelho) para desbloquear o app. Só existe no celular, não no navegador. */
@Injectable({ providedIn: "root" })
export class BiometriaService {
  /** O aparelho tem biometria cadastrada e o app pode usá-la. */
  disponivel = signal(false);

  async verificar(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return this.definir(false);
    try {
      const r = await NativeBiometric.isAvailable({ useFallback: false });
      return this.definir(r.isAvailable);
    } catch {
      return this.definir(false);
    }
  }

  /** Abre o pedido de digital do Android. Retorna true se o usuário foi reconhecido. */
  async autenticar(motivo = "Desbloqueie o Controle Financeiro"): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      await NativeBiometric.verifyIdentity({
        reason: motivo,
        title: "Controle Financeiro",
        subtitle: "Use sua digital para entrar",
        negativeButtonText: "Usar PIN",
        useFallback: false,
        maxAttempts: 3,
      });
      return true;
    } catch {
      return false; // cancelou, digital não reconhecida ou muitas tentativas
    }
  }

  private definir(v: boolean) {
    this.disponivel.set(v);
    return v;
  }
}
