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
} from '@angular/core';
import { GoldenLayout, LayoutConfig, LayoutManager } from 'golden-layout';
import { WidgetDef } from '../../shared/widget-catalog';
import { SovereignDeskComponent } from '../widgets/sovereign-desk/sovereign-desk.component';
import { CreditInventoryComponent } from '../widgets/credit-inventory/credit-inventory.component';
import { HighVolumeAlertsComponent } from '../widgets/high-volume-alerts/high-volume-alerts.component';
import { AssetClassGridComponent } from '../widgets/asset-class-grid/asset-class-grid.component';
import { HierarchyDrilldownComponent } from '../widgets/hierarchy-drilldown/hierarchy-drilldown.component';
import { CurrencyExposureComponent } from '../widgets/currency-exposure/currency-exposure.component';
import { MaturityLadderComponent } from '../widgets/maturity-ladder/maturity-ladder.component';
import { CouponLadderComponent } from '../widgets/coupon-ladder/coupon-ladder.component';

const LAYOUT_CONFIG: LayoutConfig = {
  root: {
    type: 'row',
    content: [
      {
        type: 'stack',
        width: 40,
        content: [
          { type: 'component', componentType: 'sovereign-desk',   title: 'Sovereign Desk' },
          { type: 'component', componentType: 'credit-inventory', title: 'Credit Inventory' },
          { type: 'component', componentType: 'high-volume-alerts', title: 'HV Alerts' },
        ],
      },
      {
        type: 'stack',
        width: 25,
        content: [
          { type: 'component', componentType: 'hierarchy-drilldown', title: 'Asset Hierarchy' },
          { type: 'component', componentType: 'currency-exposure',   title: 'CCY Exposure' },
        ],
      },
      {
        type: 'column',
        width: 35,
        content: [
          {
            type: 'stack',
            height: 55,
            content: [
              { type: 'component', componentType: 'asset-class-grid', title: 'Sovereign',  componentState: { assetClass: 'Sovereign' } },
              { type: 'component', componentType: 'asset-class-grid', title: 'Credit',     componentState: { assetClass: 'Credit' } },
              { type: 'component', componentType: 'asset-class-grid', title: 'High Yield', componentState: { assetClass: 'High Yield' } },
              { type: 'component', componentType: 'asset-class-grid', title: 'EM',         componentState: { assetClass: 'Emerging Markets' } },
            ],
          },
          {
            type: 'stack',
            height: 45,
            content: [
              { type: 'component', componentType: 'maturity-ladder', title: 'Maturity Ladder' },
              { type: 'component', componentType: 'coupon-ladder',   title: 'Coupon Ladder' },
            ],
          },
        ],
      },
    ],
  },
};

@Component({
  selector: 'app-gl-host',
  template: `<div #glRoot class="gl-root"></div>`,
  styles: [`:host { display: block; width: 100%; height: 100%; } .gl-root { width: 100%; height: 100%; }`],
})
export class GlHostComponent implements AfterViewInit, OnDestroy {
  @ViewChild('glRoot') private readonly glRoot!: ElementRef<HTMLElement>;
  private readonly vcr = inject(ViewContainerRef);

  private layout!: GoldenLayout;
  private readonly componentRefs: ComponentRef<unknown>[] = [];

  ngAfterViewInit(): void {
    this.layout = new GoldenLayout(this.glRoot.nativeElement);

    this.register('sovereign-desk',     SovereignDeskComponent);
    this.register('credit-inventory',   CreditInventoryComponent);
    this.register('high-volume-alerts', HighVolumeAlertsComponent);
    this.register('hierarchy-drilldown', HierarchyDrilldownComponent);
    this.register('currency-exposure',  CurrencyExposureComponent);
    this.register('maturity-ladder',    MaturityLadderComponent);
    this.register('coupon-ladder',      CouponLadderComponent);

    // Asset-class-grid is parameterised: pass componentState as input
    this.layout.registerComponentFactoryFunction('asset-class-grid', (container, state) => {
      const ref = this.vcr.createComponent(AssetClassGridComponent);
      const s = state as { assetClass?: string } | undefined;
      if (s?.assetClass) ref.setInput('assetClass', s.assetClass);
      container.element.appendChild(ref.location.nativeElement);
      this.componentRefs.push(ref);
    });

    this.layout.loadLayout(LAYOUT_CONFIG);
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
