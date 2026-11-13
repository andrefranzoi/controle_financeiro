import { Component } from "@angular/core";

@Component({
  standalone: true,
  selector: "app-footer",
  template: `
    <div class="layout-footer">
      Fábricado por
      <a
        href="https://www.agiw.com.br/blog"
        target="_blank"
        rel="noopener noreferrer"
        class="text-primary font-bold hover:underline">
        Agiw Sistemas
      </a>
    </div>
  `,
})
export class AppFooter {}
