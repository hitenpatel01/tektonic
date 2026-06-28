import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridReadyEvent, GetRowIdParams, GridApi, RowClickedEvent } from 'ag-grid-community';
import { map } from 'rxjs';
import { MarketDataService } from '../../../core/services/market-data.service';
import { Instrument } from '../../../core/models/instrument.model';
const CORPORATE_SECTORS = new Set([
  'Financials', 'Technology', 'Healthcare', 'Energy',
  'Industrials', 'Utilities', 'Consumer Staples',
  'Retail', 'Telecommunications', 'Media', 'Automotive', 'Hospitality',
]);

@Component({
  selector: 'app-credit-inventory',
  imports: [AgGridAngular, DecimalPipe],
  templateUrl: './credit-inventory.component.html',
  styleUrl: './credit-inventory.component.css',
})
export class CreditInventoryComponent {
  private readonly marketData = inject(MarketDataService);
  private gridApi?: GridApi<Instrument>;

  protected readonly selected = signal<Instrument | null>(null);

  protected readonly rowData = toSignal(
    this.marketData.stream$.pipe(
      map(instruments => instruments.filter(i => CORPORATE_SECTORS.has(i.sector))),
    ),
    { initialValue: [] as Instrument[] },
  );

  protected readonly getRowId = (p: GetRowIdParams<Instrument>) => p.data.isin;

  protected readonly defaultColDef: ColDef<Instrument> = {
    sortable: true,
    resizable: true,
    floatingFilter: true,
    minWidth: 70,
  };

  protected readonly colDefs: ColDef<Instrument>[] = [
    { field: 'ticker', filter: 'agTextColumnFilter', minWidth: 140, pinned: 'left' },
    { field: 'sector', filter: 'agSetColumnFilter' },
    { field: 'bidPrice', headerName: 'Bid', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(4), cellStyle: { color: 'var(--color-loss)' } },
    { field: 'askPrice', headerName: 'Ask', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(4), cellStyle: { color: 'var(--color-profit)' } },
    { field: 'lastPrice', headerName: 'Last', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(4), enableCellChangeFlash: true },
    { field: 'yieldToMaturity', headerName: 'YTM%', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(3), enableCellChangeFlash: true },
    { field: 'ratingSP', headerName: 'S&P', filter: 'agSetColumnFilter', maxWidth: 70 },
    { field: 'assetClass', headerName: 'Class', filter: 'agSetColumnFilter' },
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
