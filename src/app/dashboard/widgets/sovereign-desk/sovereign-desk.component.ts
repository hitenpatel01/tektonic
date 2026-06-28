import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridReadyEvent, GetRowIdParams, GridApi, RowClickedEvent } from 'ag-grid-community';
import { map } from 'rxjs';
import { MarketDataService } from '../../../core/services/market-data.service';
import { Instrument } from '../../../core/models/instrument.model';
@Component({
  selector: 'app-sovereign-desk',
  imports: [AgGridAngular, DecimalPipe],
  templateUrl: './sovereign-desk.component.html',
  styleUrl: './sovereign-desk.component.css',
})
export class SovereignDeskComponent {
  private readonly marketData = inject(MarketDataService);
  private gridApi?: GridApi<Instrument>;

  protected readonly selected = signal<Instrument | null>(null);

  protected readonly rowData = toSignal(
    this.marketData.stream$.pipe(
      map(instruments => instruments.filter(i => i.assetClass === 'Sovereign')),
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
    { field: 'ticker', filter: 'agTextColumnFilter', minWidth: 165, pinned: 'left' },
    { field: 'coupon', headerName: 'Cpn%', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(3) },
    { field: 'maturity', filter: 'agTextColumnFilter', minWidth: 90 },
    { field: 'bidPrice', headerName: 'Bid', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(4), cellStyle: { color: 'var(--color-loss)' } },
    { field: 'askPrice', headerName: 'Ask', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(4), cellStyle: { color: 'var(--color-profit)' } },
    { field: 'lastPrice', headerName: 'Last', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(4), enableCellChangeFlash: true },
    { field: 'yieldToMaturity', headerName: 'YTM%', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(3), enableCellChangeFlash: true },
    { field: 'dv01', headerName: 'DV01', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(4) },
    { field: 'currency', headerName: 'CCY', filter: 'agSetColumnFilter', maxWidth: 65 },
    { field: 'ratingSP', headerName: 'S&P', filter: 'agSetColumnFilter', maxWidth: 70 },
    { field: 'ratingMoodys', headerName: "Moody's", filter: 'agSetColumnFilter', maxWidth: 85 },
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
