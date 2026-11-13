import { Injectable } from "@angular/core";
import { MessageService } from "primeng/api";
//import { MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import Swal, { SweetAlertIcon, SweetAlertOptions, SweetAlertResult } from "sweetalert2";

@Injectable({
  providedIn: "root",
})
export class AlertService {

  private currentSwalInstance: any = null;


  constructor(
    private messageService: MessageService,
  ) { }

  durationInSeconds = 4;

  public createAlert(titulo: string, corpo: string, icon: SweetAlertIcon) {
    const config: SweetAlertOptions = {
      title: titulo,
      html: corpo,
      icon,
      confirmButtonText: "Fechar",
      confirmButtonColor: "#5679af",
      heightAuto: false,
      allowOutsideClick: false,
      customClass: {
        container: "meu-swal",
      },
    };
    return Swal.fire(config);
  }

  public createAlertWithReturn(titulo: string, corpo: string, icon: SweetAlertIcon): Promise<SweetAlertResult> {
    Swal.hideLoading();
    const config: SweetAlertOptions = {
      title: titulo,
      html: corpo,
      icon,
      confirmButtonText: "Confirmar",
      confirmButtonColor: "#5679af",
      cancelButtonText: "Fechar",
      cancelButtonColor: "#9B9B9B",
      showCancelButton: true,
      heightAuto: false,
      allowOutsideClick: false,
      customClass: {
        container: "meu-swal",
      },
    };
    return Swal.fire(config);
  }

  public createAlertConfirm(titulo: string, corpo: string, confirmButtonText = "Confirmar", cancelButtonText = "Cancelar"): Promise<SweetAlertResult> {
    Swal.hideLoading();
    const config: SweetAlertOptions = {
      title: titulo,
      html: corpo,
      icon: "question",
      confirmButtonText: confirmButtonText,
      confirmButtonColor: "#5679af",
      cancelButtonText: cancelButtonText,
      cancelButtonColor: "#9B9B9B",
      showCancelButton: true,
      heightAuto: false,
      allowOutsideClick: false,
      customClass: {
        container: "meu-swal",
      },
    };
    return Swal.fire(config);
  }

  public showLoading(title: string = "Carregando...", message: string = "Aguarde"): void {
    this.currentSwalInstance = Swal.fire({
      title,
      html: message,
      timerProgressBar: true,
      allowOutsideClick: false,
      allowEscapeKey: false,
      //icon: "info",
      customClass: {
        container: "meu-swal",
      },
      didOpen: () => {
        Swal.showLoading();
      },
    });
  }

  async hideLoading(): Promise<void> {
    if (this.currentSwalInstance) {
      Swal.hideLoading();
      Swal.close();
    }
  }

  async delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, ms);
    });
  }

  async openSnackBar(titulo: string, corpo: string, icon: 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast', timer: number = 5000) {
    this.messageService.add({ severity: icon, summary: titulo, detail: corpo, life: timer, closable: true });
  }
}
