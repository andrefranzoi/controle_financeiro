import { Component } from "@angular/core";
import { QuickAccess } from "./components/quick-access";

@Component({
  selector: "app-dashboard",
  imports: [QuickAccess],
  template: `
    <div class="flex flex-col gap-6 h-[calc(100vh-4.9rem)] overflow-y-auto p-4 bg-surface-0 dark:bg-surface-900">
      <app-quick-access />
    </div>
  `,
})
export class Dashboard {}
