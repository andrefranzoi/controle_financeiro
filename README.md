# Projeto Inicial

Template base para iniciar novos projetos Angular. Stack: [Angular 21](https://angular.dev) + [PrimeNG](https://primeng.org) v21 (tema Aura/Sakai) + [Tailwind CSS](https://tailwindcss.com) + [Capacitor](https://capacitorjs.com) (Android/iOS/mobile web).

> **Sobre a versão do PrimeNG:** fica fixado na v21 de propósito. A v22 exige cadastro de licença (mesmo no plano gratuito) e mostra um selo de aviso na tela sem isso configurado. Antes de atualizar, veja o histórico de decisão no código/commits.

## O que já vem pronto

### Layout
- Sidebar em modo "static" (empurra o conteúdo, sem máscara escura), rente às bordas, com recolher/expandir pelo botão de hambúrguer da topbar — `src/app/layout/component/app.sidebar.ts` / `app.menu.ts`.
- Menu lateral e os botões de "Acesso Rápido" da dashboard usam a **mesma fonte de dados**: `src/app/layout/nav-items.ts` (`NAV_GROUPS`) — veja [Menu lateral / Acesso rápido](#menu-lateral--acesso-rápido-srcapplayoutnav-itemsts) abaixo.
- Item de menu selecionado usa a cor primária do tema (`var(--primary-color)`), que muda junto com o configurador de tema (canto superior direito).
- Rodapé do menu mostra usuário logado + versão do app (`package.json`).
- Configurador de tema (`app.configurator.ts`) para trocar cor primária, preset e modo claro/escuro.

### Menu lateral / Acesso rápido (`src/app/layout/nav-items.ts`)
`app.menu.ts` (menu lateral) e `quick-access.ts` (botões de "Acesso Rápido" da dashboard) leem do mesmo array, `NAV_GROUPS`. Adicionar um item ali já reflete nos dois lugares. Cada `NavItem` aceita:

- **`routerLink`** — sem isso, o item precisa ter `subItems` (vira um grupo expansível) ou é tratado como botão sem navegação.
- **`menu: boolean`** — `false` tira o item do Acesso Rápido da dashboard (mas não do menu lateral). Use para itens como o "Home", que não fazem sentido como atalho na própria tela onde já estão.
- **`direito?: { modulo, tipo }`** — gate o item nos dois lugares por permissão, via `DireitosService.acesso(modulo, tipo)` (`src/app/service/direitos.service.ts`). Omita para itens sempre visíveis; use `{ modulo: "", tipo: "" }` para liberar sem remover o campo.
- **`badge?: string`** — badge estático (número, "Novo" etc.) ao lado do label, só no menu lateral.
- **`subItems?: NavSubItem[]`** — cria um submenu expansível (só no menu lateral; o Acesso Rápido ignora sub-itens, mostra só o topo). Cada `NavSubItem` tem seu próprio `icon`, `label`, `routerLink` e `direito` opcional. Um item pai com `subItems` só aparece se ele mesmo tiver acesso **e** pelo menos um sub-item também tiver — senão o menu abriria um grupo vazio.

```ts
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "",
    items: [
      { icon: "house", label: "Home", routerLink: "/", menu: false },
      {
        icon: "check",
        label: "Aprovar",
        routerLink: "/aprovar",
        menu: true,
        direito: { modulo: "COMP070", tipo: "alteracao" },
      },
      {
        icon: "settings",
        label: "Configurações",
        menu: true,
        subItems: [
          { icon: "users", label: "Usuários", routerLink: "/config/usuarios" },
          {
            icon: "shield-check",
            label: "Permissões",
            routerLink: "/config/permissoes",
            direito: { modulo: "COMP080", tipo: "consulta" },
          },
        ],
      },
    ],
  },
];
```

`DireitosService.carregarDireitos()` é chamado automaticamente sempre que a filial ativa muda (`FilialService.selecionarFilial()`), porque o `appKey` enviado nos headers da API (`coddb-filial-usuario`) muda junto — então a permissão é sempre buscada de novo para a filial certa.

### Autenticação (`src/app/pages/auth`, `src/app/service/auth`)
- Tela de login com usuário + senha, envio pelo Enter (form nativo `(ngSubmit)` + `(keydown.enter)` como reforço), e um drawer de configuração de API (host, HTTPS, empresa/banco).
- `AuthService.login(usuario, senha)` faz a validação por **headers** (`appKey` = `coddb-filial-usuario`, `appToken` = senha criptografada com AES) que o `ApiService` já monta sozinho em toda chamada com `headersNeeded: true`.
- O endpoint chamado (`login_crypto/{codbd}/{codemp}/{SISTEMA_ID}/{COMPONENTE}/{ACAO}`) e as constantes `SISTEMA_ID`/`COMPONENTE`/`ACAO` no topo de `auth.service.ts` são **específicos de cada backend** — ajuste para o endpoint real do seu projeto.
- Mensagens de erro da API (`erro.error.error`) são exibidas de verdade no alerta de login, não só `[object Object]`.

### Filial / troca de contexto (`src/app/service/filial.service.ts`)
- `FilialService` busca a lista de filiais em `filiais/{codbanco}` e guarda a filial ativa em `localStorage` (`dataFilial`, `lsFilial`, `FILIAIS`).
- Usado tanto pelo seletor no menu lateral quanto pelo cartão de usuário/filial da dashboard (`src/app/pages/dashboard/components/user-filial-card.ts`) — os dois ficam sincronizados automaticamente (mesmo `signal`).
- Campos retornados pela API assumidos: `codemp` (código) e `nomexibeemp` (nome de exibição) — ajuste em `filial.service.ts`/`user-filial-card.ts` se o seu backend usar outros nomes.

### Dashboard (`src/app/pages/dashboard`)
- Cartão de usuário + filial no topo, cartões de "Acesso Rápido" (gerados a partir do `NAV_GROUPS`) logo abaixo.

### Outros
- `AlertService` (SweetAlert2) para alertas e confirmações.
- `ApiService` genérico (`src/app/service/api.service.ts`) — monta URL, headers `appKey`/`appToken` e trata GET/POST/PUT/DELETE.
- Pipes de CPF/CNPJ e data, utilitário `ReqParams`.
- Suporte a build mobile via Capacitor (Android configurado em `capacitor.config.ts`).
- Página 404, página em branco de exemplo, estrutura de rotas por módulo (`app.routes.ts`, `pages.routes.ts`).

## Checklist para começar um projeto novo a partir daqui

1. `package.json` → `name`; `capacitor.config.ts` → `appId`/`appName`.
2. `src/environments/environment.ts` → `ipprimario` padrão.
3. `src/app/service/auth/auth.service.ts` → constantes `SISTEMA_ID`/`COMPONENTE`/`ACAO` e o endpoint de login, para bater com o backend real.
4. `src/app/layout/nav-items.ts` → substituir o item `Home` de exemplo pelas telas reais do projeto (veja [Menu lateral / Acesso rápido](#menu-lateral--acesso-rápido-srcapplayoutnav-itemsts)).
5. Textos de marca na tela de login (`src/app/pages/auth/login.ts`) e no topbar (`app.topbar.ts`).
6. Se o backend não usar o conceito de "filial", pode remover `FilialService` e os dois lugares que o consomem (menu lateral e `user-filial-card.ts`).

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
