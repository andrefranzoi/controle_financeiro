import { Routes } from '@angular/router';
import { Shell } from './app/financas/shell';
import { authGuard } from './app/financas/auth.service';
import { Login } from './app/financas/login';
import { Analises } from './app/financas/analises';
import { Backup } from './app/financas/backup';
import { MinhaConta } from './app/financas/minha-conta';
import { Categorias } from './app/financas/categorias';
import { Home } from './app/financas/home';
import { ContaForm } from './app/financas/conta-form';
import { Recorrentes } from './app/financas/recorrentes';
import { RecorrenteForm } from './app/financas/recorrente-form';

export const appRoutes: Routes = [
    {
        path: '',
        component: Shell,
        canActivate: [authGuard],
        children: [
            { path: '', component: Home },
            { path: 'conta/nova', component: ContaForm },
            { path: 'conta/:id', component: ContaForm },
            { path: 'analises', component: Analises },
            { path: 'backup', component: Backup },
            { path: 'minha-conta', component: MinhaConta },
            { path: 'categorias', component: Categorias },
            { path: 'recorrentes', component: Recorrentes },
            { path: 'recorrente/:id', component: RecorrenteForm }
        ]
    },
    { path: 'login', component: Login },
    { path: '**', redirectTo: '' }
];
