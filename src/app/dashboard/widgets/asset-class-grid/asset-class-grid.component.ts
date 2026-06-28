import { Component, inject, signal, computed, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridReadyEvent, GetRowIdParams, GridApi, RowClickedEvent } from 'ag-grid-community';
import { MarketDataService } from '../../../core/services/market-data.service';
import { Instrument } from '../../../core/models/instrument.model';

@Component({
  selector: 'app-asset-class-grid',
  imports: [AgGridAngular, DecimalPipe],
  template: `
    <header class="panel-header">
      <div class="panel-title">{{ assetClass() }}</div>
      <div class="panel-meta">
        <span class="meta-count">{{ rowData().length }}</span>
        <span class="meta-label">bonds</span>
      </div>
    </header>
    <div class="grid-body">
      <ag-grid-angular
        [rowData]="rowData()"
        [columnDefs]="colDefs"
        [defaultColDef]="defaultColDef"
        [getRowId]="getRowId"
        [rowSelection]="'single'"
        [suppressCellFocus]="true"
        [animateRows]="false"
        (gridReady)="onGridReady($event)"
        (rowClicked)="onRowClicked($event)"
        style="height: 100%; width: 100%;"
      />
    </div>
    @if (selected(); as row) {
      <aside class="detail-panel" [attr.aria-label]="'Bond details for ' + row.ticker">
        <div class="detail-header">
          <div class="detail-id">
            <span class="detail-ticker">{{ row.ticker }}</span>
            <span class="detail-issuer">{{ row.issuer }}</span>
          </div>
          <button class="detail-close" (click)="selected.set(null)" aria-label="Close">✕</button>
        </div>
        <div class="detail-fields">
          <div class="field"><dt>ISIN</dt><dd>{{ row.isin }}</dd></div>
          <div class="field"><dt>Coupon</dt><dd>{{ row.coupon | number:'1.3-3' }}%</dd></div>
          <div class="field"><dt>Maturity</dt><dd>{{ row.maturity }}</dd></div>
          <div class="field"><dt>Bid</dt><dd>{{ row.bidPrice | number:'1.4-4' }}</dd></div>
          <div class="field"><dt>Ask</dt><dd>{{ row.askPrice | number:'1.4-4' }}</dd></div>
          <div class="field"><dt>DV01</dt><dd>{{ row.dv01 | number:'1.4-4' }}</dd></div>
        </div>
      </aside>
    }
  `,
  styleUrl: './asset-class-grid.component.css',
})
export class AssetClassGridComponent {
  protected readonly assetClass = input.required<string>();

  private readonly marketData = inject(MarketDataService);
  private gridApi?: GridApi<Instrument>;

  protected readonly selected = signal<Instrument | null>(null);

  private readonly allInstruments = toSignal(this.marketData.stream$, { initialValue: [] as Instrument[] });
  protected readonly rowData = computed(() =>
    this.allInstruments().filter(i => i.assetClass === this.assetClass()),
  );

  protected readonly getRowId = (p: GetRowIdParams<Instrument>) => p.data.isin;

  protected readonly defaultColDef: ColDef<Instrument> = {
    sortable: true, resizable: true, floatingFilter: true, minWidth: 70,
  };

  protected readonly colDefs: ColDef<Instrument>[] = [
    { field: 'ticker', filter: 'agTextColumnFilter', minWidth: 145, pinned: 'left' },
    { field: 'coupon', headerName: 'Cpn%', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(3) },
    { field: 'maturity', filter: 'agTextColumnFilter', minWidth: 90 },
    { field: 'bidPrice', headerName: 'Bid', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(4), cellStyle: { color: 'var(--color-loss)' } },
    { field: 'askPrice', headerName: 'Ask', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(4), cellStyle: { color: 'var(--color-profit)' } },
    { field: 'lastPrice', headerName: 'Last', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(4), enableCellChangeFlash: true },
    { field: 'yieldToMaturity', headerName: 'YTM%', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(3), enableCellChangeFlash: true },
    { field: 'dv01', headerName: 'DV01', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(4) },
    { field: 'ratingSP', headerName: 'S&P', filter: 'agSetColumnFilter', maxWidth: 70 },
    { field: 'currency', headerName: 'CCY', filter: 'agSetColumnFilter', maxWidth: 65 },
    { field: 'sector', filter: 'agSetColumnFilter' },
  ];

  protected onGridReady(e: GridReadyEvent<Instrument>): void {
    this.gridApi = e.api;
    e.api.sizeColumnsToFit();
  }

  protected onRowClicked(e: RowClickedEvent<Instrument>): void {
    if (!e.data) return;
    this.selected.update(curr => (curr?.isin === e.data!.isin ? null : e.data!));
    requestAnimationFrame(() => this.gridApi?.sizeColumnsToFit());
  }
}
