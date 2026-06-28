import { Component, signal, ViewChild, HostListener } from '@angular/core';
import { GlHostComponent } from './gl-host/gl-host.component';
import { WIDGET_CATALOG, WIDGET_GROUPS, WidgetDef } from '../shared/widget-catalog';

@Component({
  selector: 'app-dashboard',
  imports: [GlHostComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  @ViewChild(GlHostComponent) private glHost!: GlHostComponent;

  protected readonly menuOpen = signal(false);
  protected readonly catalog = WIDGET_CATALOG;
  protected readonly groups = WIDGET_GROUPS;

  protected widgetsByGroup(group: string): WidgetDef[] {
    return this.catalog.filter(w => w.group === group);
  }

  protected addWidget(def: WidgetDef): void {
    this.glHost.addWidget(def);
    this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
