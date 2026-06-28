import { Component, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridReadyEvent, GetRowIdParams } from 'ag-grid-community';
import { MarketDataService } from '../../../core/services/market-data.service';
import { Instrument } from '../../../core/models/instrument.model';

@Component({
  selector: 'app-coupon-ladder',
  imports: [AgGridAngular],
  template: `
    <header class="panel-header">
      <div class="panel-title">Coupon Ladder</div>
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
        [suppressCellFocus]="true"
        [animateRows]="false"
        (gridReady)="onGridReady($event)"
        style="height: 100%; width: 100%;"
      />
    </div>
  `,
  styles: [`:host { display:flex; flex-direction:column; width:100%; height:100%; overflow:hidden; background:var(--color-bg-surface); } .grid-body { flex:1; min-height:0; overflow:hidden; }`],
})
export class CouponLadderComponent {
  private readonly marketData = inject(MarketDataService);
  private readonly allInstruments = toSignal(this.marketData.stream$, { initialValue: [] as Instrument[] });
  protected readonly rowData = computed(() =>
    [...this.allInstruments()].sort((a, b) => a.coupon - b.coupon || a.maturity.localeCompare(b.maturity)),
  );

  protected readonly getRowId = (p: GetRowIdParams<Instrument>) => p.data.isin;

  protected readonly defaultColDef: ColDef<Instrument> = {
    sortable: true, resizable: true, floatingFilter: true, minWidth: 70,
  };

  protected readonly colDefs: ColDef<Instrument>[] = [
    { field: 'coupon', headerName: 'Cpn%', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(3), pinned: 'left', sort: 'asc', maxWidth: 80 },
    { field: 'maturity', filter: 'agTextColumnFilter', minWidth: 90 },
    { field: 'ticker', filter: 'agTextColumnFilter', minWidth: 130 },
    { field: 'lastPrice', headerName: 'Last', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(4), enableCellChangeFlash: true },
    { field: 'yieldToMaturity', headerName: 'YTM%', filter: 'agNumberColumnFilter', valueFormatter: p => p.value?.toFixed(3), enableCellChangeFlash: true },
    { field: 'assetClass', headerName: 'Class', filter: 'agSetColumnFilter' },
    { field: 'ratingSP', headerName: 'S&P', filter: 'agSetColumnFilter', maxWidth: 70 },
    { field: 'currency', headerName: 'CCY', filter: 'agSetColumnFilter', maxWidth: 65 },
  ];

  protected onGridReady(e: GridReadyEvent<Instrument>): void {
    e.api.sizeColumnsToFit();
  }
}
