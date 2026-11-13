import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "formatDate",
})
export class FormatDatePipe implements PipeTransform {
  transform(value: any): string {
    if (value) {
      let date = new Date(value);
      date.setDate(date.getDate() + 1);
      const DATAARRUMADA = date;
      const formatter = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
      const formattedDate = formatter.format(DATAARRUMADA);
      return formattedDate;
    }
    return "";
  }
}
