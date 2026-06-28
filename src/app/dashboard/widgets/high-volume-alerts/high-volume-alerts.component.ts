import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridReadyEvent, GetRowIdParams, GridApi, RowClickedEvent, ValueFormatterParams } from 'ag-grid-community';
import { map } from 'rxjs';
import { MarketDataService } from '../../../core/services/market-data.service';
import { Instrument } from '../../../core/models/instrument.model';
@Component({
  selector: 'app-high-volume-alerts',
  imports: [AgGridAngular, DecimalPipe],
  templateUrl: './high-volume-alerts.component.html',
  styleUrl: './high-volume-alerts.component.css',
})
export class HighVolumeAlertsComponent {
  private readonly marketData = inject(MarketDataService);
  private gridApi?: GridApi<Instrument>;

  protected readonly selected = signal<Instrument | null>(null);

  protected readonly rowData = toSignal(
    this.marketData.stream$.pipe(
      map(instruments =>
        [...instruments].sort((a, b) => b.volume24h - a.volume24h).slice(0, 10),
      ),
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
    { field: 'assetClass', headerName: 'Class', filter: 'agSetColumnFilter' },
    { field: 'lastPrice', headerName: 'Last', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(4), enableCellChangeFlash: true },
    {
      field: 'volume24h',
      headerName: 'Volume 24h',
      filter: 'agNumberColumnFilter',
      sort: 'desc',
      valueFormatter: (p: ValueFormatterParams<Instrument>) => this.fmtVol(p.value),
      cellStyle: { color: 'var(--color-warning)', fontWeight: '600' },
    },
    { field: 'yieldToMaturity', headerName: 'YTM%', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(3) },
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

  protected fmtVol(vol: number): string {
    if (vol >= 1_000_000_000) return (vol / 1_000_000_000).toFixed(2) + 'B';
    if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(0) + 'M';
    return vol.toLocaleString();
  }
}
