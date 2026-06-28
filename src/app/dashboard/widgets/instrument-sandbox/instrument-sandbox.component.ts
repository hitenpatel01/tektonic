import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  ColGroupDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  StatusPanelDef,
} from 'ag-grid-community';
import { MarketDataService } from '../../../core/services/market-data.service';
import { Instrument } from '../../../core/models/instrument.model';

/**
 * Sandbox widget for experimenting with AG Grid Community features.
 * Shows every instrument field with no asset-class filter.
 *
 * AG Grid Community features enabled here:
 *
 * SORTING
 *   multiSortKey: 'ctrl'       — Ctrl+click column headers to sort by multiple columns simultaneously.
 *   sortable: true (default)   — Click any header to toggle asc/desc; click a sorted header again to clear.
 *
 * FILTERING
 *   floatingFilter: true       — Inline filter input beneath each header; no need to open a filter panel.
 *   agTextColumnFilter         — Text columns: contains / starts with / ends with / regex matching.
 *   agNumberColumnFilter       — Number columns: equals / greater than / less than / in range.
 *   quickFilterText            — The search box filters across ALL columns at once (OR across every cell value).
 *
 * COLUMN FEATURES
 *   Column groups              — Columns organised under Identity / Classification / Instrument / Pricing / Analytics.
 *   resizable: true            — Drag column borders to resize; double-click a border to auto-fit that single column.
 *   pinned: 'left'             — Ticker stays fixed while scrolling the wide column set horizontally.
 *   type: 'rightAligned'       — Right-aligns both header and cell for numeric columns (Pricing / Analytics).
 *   Column moving              — Drag any header to reorder columns (on by default).
 *
 * SELECTION
 *   rowSelection: 'multiple'   — Multiple rows can be selected.
 *   rowMultiSelectWithClick    — Each row click adds to the selection; no Ctrl/Shift needed.
 *   checkboxSelection          — Checkbox on the Ticker column for explicit per-row selection.
 *   headerCheckboxSelection    — Header checkbox selects/deselects all currently filtered rows.
 *
 * PAGINATION
 *   pagination: true           — Data is split into pages instead of a single scrollable list.
 *   paginationPageSize: 50     — Default 50 rows per page.
 *   paginationPageSizeSelector — Bottom picker lets users switch between 25 / 50 / 100 / 500 rows.
 *
 * STATUS BAR
 *   agTotalAndFilteredRowCount — Bottom-left: shows "Rows: X of Y" reflecting active filters.
 *   agSelectedRowCount         — Bottom-left: shows "Selected: N" when rows are selected.
 *
 * LIVE DATA
 *   enableCellChangeFlash      — Bid / Ask / Last / YTM% cells flash briefly on every tick (1 s feed).
 *   animateRows: true          — Rows animate into position when sort/filter changes.
 *
 * DATA FORMATTING
 *   valueFormatter             — Prices 4 d.p., YTM 3 d.p., Volume as $X.XM, Coupon 3 d.p.
 *   tooltipValueGetter         — Hover any cell for 400 ms to see its full untruncated value.
 *
 * EXPORT & UTILITIES
 *   exportDataAsCsv()          — CSV ↓ button exports the current filtered/sorted page to instruments.csv.
 *   autoSizeAllColumns()       — Auto-fit button sizes every column width to its longest visible value.
 *   enableCellTextSelection    — Click into a cell and select/copy its text like normal browser text.
 */
@Component({
  selector: 'app-instrument-sandbox',
  imports: [AgGridAngular],
  template: `
    <header class="sb-header">
      <span class="sb-title">All Instruments</span>
      <span class="sb-count">{{ rowData().length }}</span>
      <input
        class="sb-search"
        type="search"
        placeholder="Quick filter…"
        aria-label="Quick filter"
        (input)="quickFilter.set($any($event.target).value)"
      />
      <button class="sb-btn" (click)="autoSizeCols()" title="Fit columns to content">Auto-fit</button>
      <button class="sb-btn" (click)="exportCsv()" title="Export visible rows to CSV">CSV ↓</button>
    </header>

    <div class="sb-grid">
      <ag-grid-angular
        style="height:100%;width:100%"
        [rowData]="rowData()"
        [columnDefs]="colDefs"
        [defaultColDef]="defaultColDef"
        [getRowId]="getRowId"
        [rowSelection]="'multiple'"
        [rowMultiSelectWithClick]="true"
        [quickFilterText]="quickFilter()"
        [pagination]="true"
        [paginationPageSize]="50"
        [paginationPageSizeSelector]="[25, 50, 100, 500]"
        [multiSortKey]="'ctrl'"
        [enableCellTextSelection]="true"
        [animateRows]="true"
        [statusBar]="statusBar"
        [tooltipShowDelay]="400"
        (gridReady)="onGridReady($event)"
      />
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--color-bg-surface);
    }
    .sb-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      border-bottom: 1px solid var(--color-border);
      flex-shrink: 0;
      background: var(--color-bg-elevated);
    }
    .sb-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-text-primary);
      white-space: nowrap;
    }
    .sb-count {
      font-size: 9px;
      color: var(--color-text-muted);
      font-family: var(--font-family-mono);
      white-space: nowrap;
    }
    .sb-search {
      flex: 1;
      min-width: 0;
      background: var(--color-bg-base);
      border: 1px solid var(--color-border);
      border-radius: 3px;
      color: var(--color-text-primary);
      font-family: var(--font-family-sans);
      font-size: 10px;
      padding: 2px 6px;
      outline: none;
    }
    .sb-search:focus { border-color: var(--color-neutral); }
    .sb-btn {
      background: none;
      border: 1px solid var(--color-border);
      border-radius: 3px;
      color: var(--color-text-secondary);
      cursor: pointer;
      font-family: var(--font-family-sans);
      font-size: 9px;
      padding: 2px 6px;
      white-space: nowrap;
      transition: color 0.1s, border-color 0.1s;
    }
    .sb-btn:hover {
      color: var(--color-text-primary);
      border-color: var(--color-neutral);
    }
    .sb-grid {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
  `],
})
export class InstrumentSandboxComponent {
  private readonly marketData = inject(MarketDataService);
  private gridApi?: GridApi<Instrument>;

  protected readonly quickFilter = signal('');

  protected readonly rowData = toSignal(this.marketData.stream$, {
    initialValue: [] as Instrument[],
  });

  protected readonly getRowId = (p: GetRowIdParams<Instrument>) => p.data.isin;

  protected readonly defaultColDef: ColDef<Instrument> = {
    sortable: true,
    resizable: true,
    floatingFilter: true,
    minWidth: 80,
    tooltipValueGetter: p => (p.value != null ? String(p.value) : ''),
  };

  protected readonly colDefs: (ColDef<Instrument> | ColGroupDef<Instrument>)[] = [
    {
      headerName: 'Identity',
      children: [
        {
          field: 'ticker',
          filter: 'agTextColumnFilter',
          pinned: 'left',
          minWidth: 150,
          checkboxSelection: true,
          headerCheckboxSelection: true,
        },
        { field: 'isin',   filter: 'agTextColumnFilter', minWidth: 130 },
        { field: 'cusip',  filter: 'agTextColumnFilter', minWidth: 110 },
        { field: 'issuer', filter: 'agTextColumnFilter', minWidth: 200 },
      ],
    },
    {
      headerName: 'Classification',
      children: [
        { field: 'assetClass', headerName: 'Asset Class', filter: 'agTextColumnFilter' },
        { field: 'sector',     filter: 'agTextColumnFilter', minWidth: 140 },
        { field: 'currency',   headerName: 'CCY',       filter: 'agTextColumnFilter', maxWidth: 75 },
        { field: 'ratingSP',   headerName: 'S&P',       filter: 'agTextColumnFilter', maxWidth: 75 },
        { field: 'ratingMoodys', headerName: "Moody's", filter: 'agTextColumnFilter', maxWidth: 90 },
      ],
    },
    {
      headerName: 'Instrument',
      children: [
        { field: 'coupon',   headerName: 'Cpn%', type: 'rightAligned', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(3) ?? '' },
        { field: 'maturity', filter: 'agTextColumnFilter' },
      ],
    },
    {
      headerName: 'Pricing',
      children: [
        // cellStyle overrides type's cellStyle so textAlign must be explicit alongside color
        { field: 'bidPrice',  headerName: 'Bid',  type: 'rightAligned', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(4) ?? '', cellStyle: { color: 'var(--color-loss)',   textAlign: 'right' }, enableCellChangeFlash: true },
        { field: 'askPrice',  headerName: 'Ask',  type: 'rightAligned', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(4) ?? '', cellStyle: { color: 'var(--color-profit)', textAlign: 'right' }, enableCellChangeFlash: true },
        { field: 'lastPrice', headerName: 'Last', type: 'rightAligned', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(4) ?? '', enableCellChangeFlash: true },
      ],
    },
    {
      headerName: 'Analytics',
      children: [
        { field: 'yieldToMaturity', headerName: 'YTM%',   type: 'rightAligned', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(3) ?? '', enableCellChangeFlash: true },
        { field: 'dv01',            headerName: 'DV01',    type: 'rightAligned', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(4) ?? '' },
        { field: 'volume24h',       headerName: 'Vol 24h', type: 'rightAligned', filter: 'agNumberColumnFilter', valueFormatter: p => p.value != null ? `$${(p.value / 1e6).toFixed(1)}M` : '' },
      ],
    },
  ];

  protected readonly statusBar: { statusPanels: StatusPanelDef[] } = {
    statusPanels: [
      { statusPanel: 'agTotalAndFilteredRowCountComponent', align: 'left' },
      { statusPanel: 'agSelectedRowCountComponent',         align: 'left' },
    ],
  };

  protected onGridReady(e: GridReadyEvent<Instrument>): void {
    this.gridApi = e.api;
    e.api.sizeColumnsToFit();
  }

  protected exportCsv(): void {
    this.gridApi?.exportDataAsCsv({ fileName: 'instruments.csv' });
  }

  protected autoSizeCols(): void {
    this.gridApi?.autoSizeAllColumns();
  }
}
