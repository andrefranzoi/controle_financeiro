import { provideHttpClient, withFetch } from "@angular/common/http"
import { registerLocaleData } from "@angular/common"
import { ApplicationConfig, LOCALE_ID, provideZonelessChangeDetection } from "@angular/core"
import { provideRouter, withEnabledBlockingInitialNavigation, withHashLocation, withInMemoryScrolling } from "@angular/router"
import Aura from "@primeuix/themes/aura"
import { providePrimeNG } from "primeng/config"
import { appRoutes } from "./app.routes"
import { ConfirmationService, MessageService } from "primeng/api"
import { DialogService } from "primeng/dynamicdialog"
import ptBr from "@angular/common/locales/pt"

// Registra sob o id "pt-BR" explicitamente: os pipes (number/date/currency) sem locale
// explícito usam o LOCALE_ID abaixo, e sem isso o Angular cai no padrão "en-US"
// (vírgula/ponto trocados — ex.: "113,669.18" em vez de "113.669,18").
registerLocaleData(ptBr, "pt-BR")

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      appRoutes,
      withInMemoryScrolling({ anchorScrolling: "enabled", scrollPositionRestoration: "enabled" }),
      withEnabledBlockingInitialNavigation(),
      withHashLocation()
    ),
    provideHttpClient(withFetch()),
    provideZonelessChangeDetection(),
    providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: ".app-dark" } } }),
    ConfirmationService,
    MessageService,
    DialogService,
    { provide: LOCALE_ID, useValue: "pt-BR" },
  ],
}
