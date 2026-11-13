import { ChangeDetectorRef, Component, inject } from "@angular/core";
import { DbService } from "./db.service";
import { PageHeader } from "./page-header";
import { hoje } from "./format";

/** Exporta/importa o banco como arquivo .sqlite, para não perder dados ao trocar de navegador, porta ou aparelho. */
@Component({
  selector: "app-backup",
  imports: [PageHeader],
  template: `
    <div class="mx-auto max-w-xl pb-8">
      <app-page-header titulo="Backup" />
      <div class="mx-4 mt-2 flex flex-col gap-4">
        <section class="flex flex-col gap-3 rounded-2xl bg-surface-0 p-4 shadow-sm dark:bg-surface-900">
          <div class="flex items-center gap-3">
            <span class="flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
              <i class="lucide-font icon-database text-xl" aria-hidden="true"></i>
            </span>
            <div>
              <div class="font-medium">Seus dados ficam em SQLite</div>
              <div class="text-xs text-muted-color">{{ nativo ? "Arquivo SQLite dentro do app, sem internet." : "Banco SQLite salvo neste navegador." }}</div>
            </div>
          </div>
          @if (!nativo) {
            <p class="text-sm text-muted-color">
              O navegador guarda os dados por <strong>endereço</strong> (inclusive a porta). Se o endereço mudar ou os dados do navegador forem limpos, o banco parece vazio.
              Exporte um backup de vez em quando e importe onde precisar.
            </p>
          } @else {
            <p class="text-sm text-muted-color">No celular os dados ficam no arquivo do próprio app e continuam aqui ao fechar e abrir. Só se perdem ao desinstalar ou limpar os dados do app.</p>
          }
        </section>

        @if (suporta) {
          <section class="flex flex-col gap-3 rounded-2xl bg-surface-0 p-4 shadow-sm dark:bg-surface-900">
            <button
              type="button"
              class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary-700 font-medium text-white transition-colors hover:bg-primary-800 disabled:opacity-60"
              [disabled]="ocupado"
              (click)="exportar()">
              <i class="lucide-font icon-download" aria-hidden="true"></i> Exportar backup (.sqlite)
            </button>

            <label
              class="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-surface-100 font-medium transition-colors hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700"
              [class.opacity-60]="ocupado">
              <i class="lucide-font icon-upload" aria-hidden="true"></i> Importar backup
              <input type="file" class="sr-only" accept=".sqlite,.db,application/vnd.sqlite3,application/octet-stream" [disabled]="ocupado" (change)="importar($event)" />
            </label>
            <p class="text-xs text-muted-color">Importar <strong>substitui</strong> todos os dados atuais pelos do arquivo.</p>
          </section>
        }

        @if (mensagem) {
          <p role="status" class="rounded-xl p-3 text-sm" [class]="erro ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300'">{{ mensagem }}</p>
        }
      </div>
    </div>
  `,
})
export class Backup {
  private db = inject(DbService);
  private cdr = inject(ChangeDetectorRef);

  suporta = this.db.suportaBackup;
  nativo = !this.db.suportaBackup;
  ocupado = false;
  mensagem = "";
  erro = false;

  async exportar() {
    this.ocupado = true;
    this.mensagem = "";
    try {
      const bytes = await this.db.exportarBackup();
      const blob = new Blob([bytes as BlobPart], { type: "application/vnd.sqlite3" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `controle-financeiro-${hoje()}.sqlite`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.avisar("Backup exportado. Guarde o arquivo em um lugar seguro.", false);
    } catch (e) {
      this.avisar((e as Error).message, true);
    } finally {
      this.ocupado = false;
      this.cdr.markForCheck();
    }
  }

  async importar(evento: Event) {
    const entrada = evento.target as HTMLInputElement;
    const arquivo = entrada.files?.[0];
    if (!arquivo) return;
    if (!confirm("Importar substitui TODOS os dados atuais pelos do arquivo. Continuar?")) {
      entrada.value = "";
      return;
    }
    this.ocupado = true;
    this.mensagem = "";
    try {
      await this.db.importarBackup(new Uint8Array(await arquivo.arrayBuffer()));
      this.avisar("Backup importado. Recarregando...", false);
      this.cdr.markForCheck();
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      this.avisar((e as Error).message, true);
      this.ocupado = false;
    } finally {
      entrada.value = "";
      this.cdr.markForCheck();
    }
  }

  private avisar(texto: string, comErro: boolean) {
    this.mensagem = texto;
    this.erro = comErro;
  }
}
