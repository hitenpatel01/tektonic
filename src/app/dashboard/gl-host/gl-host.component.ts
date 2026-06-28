import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ViewContainerRef,
  Type,
  ComponentRef,
  inject,
  signal,
} from '@angular/core';
import { GoldenLayout, LayoutConfig, LayoutManager, ResolvedLayoutConfig } from 'golden-layout';
import { WidgetDef } from '../../shared/widget-catalog';
import { SovereignDeskComponent } from '../widgets/sovereign-desk/sovereign-desk.component';
import { CreditInventoryComponent } from '../widgets/credit-inventory/credit-inventory.component';
import { HighVolumeAlertsComponent } from '../widgets/high-volume-alerts/high-volume-alerts.component';
import { AssetClassGridComponent } from '../widgets/asset-class-grid/asset-class-grid.component';
import { HierarchyDrilldownComponent } from '../widgets/hierarchy-drilldown/hierarchy-drilldown.component';
import { CurrencyExposureComponent } from '../widgets/currency-exposure/currency-exposure.component';
import { MaturityLadderComponent } from '../widgets/maturity-ladder/maturity-ladder.component';
import { CouponLadderComponent } from '../widgets/coupon-ladder/coupon-ladder.component';
import { InstrumentSandboxComponent } from '../widgets/instrument-sandbox/instrument-sandbox.component';

const STORAGE_KEY = 'tektonic-layout';

@Component({
  selector: 'app-gl-host',
  template: `
    <div #glRoot class="gl-root"></div>
    @if (isEmpty()) {
      <div class="empty-state" role="status" aria-label="Empty workspace">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
          <rect x="20" y="2" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
          <rect x="2" y="20" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
          <rect x="20" y="20" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5" opacity="0.25"/>
        </svg>
        <p class="empty-title">Your workspace is empty</p>
        <p class="empty-hint">Click <strong>Widgets</strong> in the toolbar to add panels</p>
      </div>
    }
  `,
  styles: [`
    :host { display: block; position: relative; width: 100%; height: 100%; }
    .gl-root { width: 100%; height: 100%; }
    .empty-state {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      pointer-events: none;
      color: var(--color-text-muted);
      user-select: none;
    }
    .empty-title {
      margin: 0;
      font-size: 12px;
      font-weight: 500;
      color: var(--color-text-secondary);
      letter-spacing: 0.02em;
    }
    .empty-hint {
      margin: 0;
      font-size: 10px;
      color: var(--color-text-muted);
    }
    .empty-hint strong {
      color: var(--color-text-secondary);
      font-weight: 600;
    }
  `],
})
export class GlHostComponent implements AfterViewInit, OnDestroy {
  @ViewChild('glRoot') private readonly glRoot!: ElementRef<HTMLElement>;
  private readonly vcr = inject(ViewContainerRef);

  private layout!: GoldenLayout;
  private readonly componentRefs: ComponentRef<unknown>[] = [];
  protected readonly isEmpty = signal(true);

  ngAfterViewInit(): void {
    this.layout = new GoldenLayout(this.glRoot.nativeElement);

    this.register('sovereign-desk',      SovereignDeskComponent);
    this.register('credit-inventory',    CreditInventoryComponent);
    this.register('high-volume-alerts',  HighVolumeAlertsComponent);
    this.register('hierarchy-drilldown', HierarchyDrilldownComponent);
    this.register('currency-exposure',   CurrencyExposureComponent);
    this.register('maturity-ladder',      MaturityLadderComponent);
    this.register('coupon-ladder',        CouponLadderComponent);
    this.register('instrument-sandbox',   InstrumentSandboxComponent);

    // Asset-class-grid is parameterised: pass componentState as input
    this.layout.registerComponentFactoryFunction('asset-class-grid', (container, state) => {
      const ref = this.vcr.createComponent(AssetClassGridComponent);
      const s = state as { assetClass?: string } | undefined;
      if (s?.assetClass) ref.setInput('assetClass', s.assetClass);
      container.element.appendChild(ref.location.nativeElement);
      this.componentRefs.push(ref);
    });

    const saved = localStorage.getItem(STORAGE_KEY);
    let loaded = false;
    if (saved) {
      try {
        const resolved = JSON.parse(saved) as ResolvedLayoutConfig;
        // saveLayout() returns ResolvedLayoutConfig; convert back to LayoutConfig before loading
        this.layout.loadLayout(LayoutConfig.fromResolved(resolved));
        loaded = true;
      } catch {
        // corrupted — fall through to empty layout
      }
    }
    if (!loaded) {
      this.layout.loadLayout({} as LayoutConfig);
    }

    this.syncIsEmpty();

    // stateChanged bubbles through ContentItems but stops at GroundItem (parent=null),
    // never reaching LayoutManager. Subscribe directly on _groundItem to catch all
    // structural changes (add, remove, drag, resize).
    const groundItem = (this.layout as unknown as { _groundItem?: { on(e: string, cb: () => void): void } })._groundItem;
    groundItem?.on('stateChanged', () => {
      this.syncIsEmpty();
      this.persistLayout();
    });

    // LayoutManager itself only emits stateChanged for maximise/minimise operations.
    this.layout.on('stateChanged', () => this.persistLayout());
  }

  private syncIsEmpty(): void {
    try {
      this.isEmpty.set(this.layout.rootItem === undefined);
    } catch {
      this.isEmpty.set(true);
    }
  }

  private persistLayout(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.layout.saveLayout()));
    } catch {
      // quota exceeded or private browsing — silently ignore
    }
  }

  private register<T>(typeName: string, ctor: Type<T>): void {
    this.layout.registerComponentFactoryFunction(typeName, container => {
      const ref = this.vcr.createComponent(ctor as Type<unknown>);
      container.element.appendChild(ref.location.nativeElement);
      this.componentRefs.push(ref);
    });
  }

  addWidget(def: WidgetDef): void {
    this.layout.addComponentAtLocation(
      def.type,
      def.state ?? null,
      def.title,
      LayoutManager.afterFocusedItemIfPossibleLocationSelectors,
    );
  }

  ngOnDestroy(): void {
    this.componentRefs.forEach(ref => ref.destroy());
    this.layout?.destroy();
  }
}
