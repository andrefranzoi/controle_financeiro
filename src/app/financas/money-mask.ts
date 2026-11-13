import { Directive, ElementRef, forwardRef, inject } from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";

const fmt = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Máscara de valor em reais: o usuário digita só números e o campo vai se formatando (1 → 0,01 · 12345 → 123,45).
 * O ngModel recebe/entrega o valor em centavos (número inteiro).
 */
@Directive({
  selector: "input[moneyMask]",
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MoneyMask), multi: true }],
  host: { "(input)": "aoDigitar()", "(blur)": "aoSair()", inputmode: "numeric", placeholder: "0,00" },
})
export class MoneyMask implements ControlValueAccessor {
  private el = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private onChange: (v: number) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(centavos: number | null) {
    this.el.value = centavos ? fmt(centavos) : "";
  }

  registerOnChange(fn: (v: number) => void) {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  setDisabledState(desabilitado: boolean) {
    this.el.disabled = desabilitado;
  }

  aoDigitar() {
    const digitos = this.el.value.replace(/\D/g, "").slice(0, 12);
    const centavos = digitos ? Number(digitos) : 0;
    this.el.value = centavos ? fmt(centavos) : "";
    this.onChange(centavos);
  }

  aoSair() {
    this.onTouched();
  }
}
