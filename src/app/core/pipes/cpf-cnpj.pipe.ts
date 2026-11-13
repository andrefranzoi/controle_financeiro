import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cpfCnpj',
  standalone: true // 🟢 Se sua aplicação for Angular v14+ / Standalone
})
export class CpfCnpjPipe implements PipeTransform {

  transform(value: string | number | null | undefined): string {
    if (!value) return '';

    // Remove qualquer caractere que não seja número
    let digits = value.toString().replace(/\D/g, '');

    // Se for CPF e veio sem zeros à esquerda (ex: 9 dígitos), ajusta para 11
    if (digits.length > 0 && digits.length <= 11) {
      digits = digits.padStart(11, '0');
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    // Se for CNPJ e veio sem zeros à esquerda (ex: 12 ou 13 dígitos), ajusta para 14
    if (digits.length > 11 && digits.length <= 14) {
      digits = digits.padStart(14, '0');
      return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }

    // Retorna o valor original caso o tamanho seja inválido
    return value.toString();
  }

}