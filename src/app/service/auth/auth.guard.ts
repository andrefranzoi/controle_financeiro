import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router'
import { Observable } from 'rxjs'
// import { Storage } from '@ionic/storage-angular'

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  AcessoH
  token

  constructor(
    private router: Router,
  ) {
    // this.criaStorage()
  }

  // async criaStorage() {
  //   await localStorage.create()
  // }

  async CarregaDados() {
    this.AcessoH = await localStorage.getItem('acessoH')
    this.token = await localStorage.getItem('token')
  }

  async VerificaSeEstaLogado() {
    await this.CarregaDados()
    if (this.AcessoH && this.AcessoH === 'H' ) {
      return true;
    }

    localStorage.setItem('token', '')
    this.router.navigate(['auth/login']);
    return false;
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.VerificaSeEstaLogado()
  }
}
