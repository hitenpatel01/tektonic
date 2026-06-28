export interface WidgetDef {
  type: string;
  title: string;
  group: string;
  state?: Record<string, string>;
}

export const WIDGET_CATALOG: WidgetDef[] = [
  { type: 'sovereign-desk',     title: 'Sovereign Desk',     group: 'Live Grids' },
  { type: 'credit-inventory',   title: 'Credit Inventory',   group: 'Live Grids' },
  { type: 'high-volume-alerts', title: 'HV Alerts',          group: 'Live Grids' },
  { type: 'hierarchy-drilldown', title: 'Asset Hierarchy',   group: 'Analytics' },
  { type: 'currency-exposure',  title: 'CCY Exposure',       group: 'Analytics' },
  { type: 'asset-class-grid',   title: 'Sovereign',          group: 'By Class', state: { assetClass: 'Sovereign' } },
  { type: 'asset-class-grid',   title: 'Credit',             group: 'By Class', state: { assetClass: 'Credit' } },
  { type: 'asset-class-grid',   title: 'High Yield',         group: 'By Class', state: { assetClass: 'High Yield' } },
  { type: 'asset-class-grid',   title: 'Emerging Markets',   group: 'By Class', state: { assetClass: 'Emerging Markets' } },
  { type: 'maturity-ladder',    title: 'Maturity Ladder',    group: 'Ladders' },
  { type: 'coupon-ladder',      title: 'Coupon Ladder',      group: 'Ladders' },
];

export const WIDGET_GROUPS = [...new Set(WIDGET_CATALOG.map(w => w.group))];
