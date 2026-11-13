import { TipoAcesso } from "@/app/service/direitos.service";

export interface NavSubItem {
  icon: string;
  label: string;
  routerLink: string;
  direito?: NavDireito;
}

export interface NavDireito {
  modulo: string;
  tipo: TipoAcesso | "";
}

export interface NavItem {
  icon: string;
  label: string;
  routerLink?: string;
  menu: boolean;
  isActive?: boolean;
  badge?: string;
  subItems?: NavSubItem[];
  direito?: NavDireito;
}

export interface NavGroup {
  label: string;
  action?: boolean;
  items: NavItem[];
}

// Fonte única dos itens de navegação: usado tanto pelo menu lateral (app.menu.ts)
// quanto pelos botões de acesso rápido da dashboard.
//
// "menu: false" tira o item do acesso rápido da dashboard (mas não do menu lateral) — use
// para itens como "Home" que não fazem sentido como atalho na própria tela em que já estão.
// "direito" gate o item nos dois lugares (menu lateral e acesso rápido) por permissão, via
// DireitosService.acesso(modulo, tipo) — omita para itens sempre visíveis.
// "subItems" cria um submenu expansível (só no menu lateral — o acesso rápido ignora
// sub-itens e mostra só o topo). Cada sub-item tem seu próprio "direito" opcional; um item pai
// só aparece se ele mesmo tiver acesso E pelo menos um sub-item também tiver.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "",
    items: [
      { icon: "house", label: "Home", routerLink: "/", menu: false },
      {
        icon: "settings",
        label: "Configurações",
        menu: true,
        subItems: [
          { icon: "users", label: "Usuários", routerLink: "/config/usuarios" },
          { icon: "users", label: "Usuários 1", routerLink: "/config/usuarios1" },
          { icon: "users", label: "Usuários 2", routerLink: "/config/usuarios2" },
          {
            icon: "shield-check",
            label: "Permissões",
            routerLink: "/config/permissoes",
            direito: { modulo: "X", tipo: "consulta" },
          },
        ],
      },
    ],
  },
];
