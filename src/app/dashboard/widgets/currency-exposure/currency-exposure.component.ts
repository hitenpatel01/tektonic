import { Component, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridReadyEvent, GetRowIdParams, RowClickedEvent } from 'ag-grid-community';
import { MarketDataService } from '../../../core/services/market-data.service';
import { Instrument } from '../../../core/models/instrument.model';
interface CurrencyRow {
  currency: string;
  count: number;
  totalVolM: number;
  avgPrice: number;
  avgYtm: number;
}

@Component({
  selector: 'app-currency-exposure',
  imports: [AgGridAngular],
  templateUrl: './currency-exposure.component.html',
  styleUrl: './currency-exposure.component.css',
})
export class CurrencyExposureComponent {
  private readonly marketData = inject(MarketDataService);
  private readonly allInstruments = toSignal(this.marketData.stream$, { initialValue: [] as Instrument[] });
  protected readonly selectedCurrency = signal<string | null>(null);

  protected readonly currencyRows = computed<CurrencyRow[]>(() => {
    const map = new Map<string, { count: number; totalVol: number; priceSum: number; ytmSum: number }>();
    for (const inst of this.allInstruments()) {
      const g = map.get(inst.currency) ?? { count: 0, totalVol: 0, priceSum: 0, ytmSum: 0 };
      map.set(inst.currency, {
        count: g.count + 1,
        totalVol: g.totalVol + inst.volume24h,
        priceSum: g.priceSum + inst.lastPrice,
        ytmSum: g.ytmSum + inst.yieldToMaturity,
      });
    }
    return Array.from(map.entries())
      .map(([currency, g]) => ({
        currency,
        count: g.count,
        totalVolM: g.totalVol / 1_000_000,
        avgPrice: g.priceSum / g.count,
        avgYtm: g.ytmSum / g.count,
      }))
      .sort((a, b) => b.totalVolM - a.totalVolM);
  });

  protected readonly tickerRows = computed<Instrument[]>(() => {
    const ccy = this.selectedCurrency();
    if (!ccy) return [];
    return this.allInstruments().filter(i => i.currency === ccy);
  });

  protected readonly currencyColDefs: ColDef<CurrencyRow>[] = [
    { field: 'currency', headerName: 'CCY', flex: 1, maxWidth: 65 },
    { field: 'count', headerName: '#', flex: 1, maxWidth: 55 },
    { field: 'totalVolM', headerName: 'Vol ($M)', flex: 1, valueFormatter: p => p.value?.toFixed(0), enableCellChangeFlash: true },
    { field: 'avgPrice', headerName: 'Avg Price', flex: 1, valueFormatter: p => p.value?.toFixed(3), enableCellChangeFlash: true },
    { field: 'avgYtm', headerName: 'Avg YTM%', flex: 1, valueFormatter: p => p.value?.toFixed(3), enableCellChangeFlash: true },
  ];

  protected readonly tickerColDefs: ColDef<Instrument>[] = [
    { field: 'ticker', flex: 2, pinned: 'left' },
    { field: 'issuer', flex: 2 },
    { field: 'coupon', headerName: 'Cpn%', flex: 1, valueFormatter: p => p.value?.toFixed(3) },
    { field: 'maturity', flex: 1 },
    { field: 'lastPrice', headerName: 'Last', flex: 1, valueFormatter: p => p.value?.toFixed(4), enableCellChangeFlash: true },
    { field: 'yieldToMaturity', headerName: 'YTM%', flex: 1, valueFormatter: p => p.value?.toFixed(3), enableCellChangeFlash: true },
    { field: 'assetClass', headerName: 'Class', flex: 1 },
  ];

  protected readonly defaultColDef: ColDef = {
    sortable: true, resizable: true, minWidth: 55,
  };

  protected readonly getCcyRowId = (p: GetRowIdParams<CurrencyRow>) => p.data.currency;
  protected readonly getInstrRowId = (p: GetRowIdParams<Instrument>) => p.data.isin;

  protected onCurrencyClicked(e: RowClickedEvent<CurrencyRow>): void {
    if (!e.data) return;
    this.selectedCurrency.update(curr => curr === e.data!.currency ? null : e.data!.currency);
  }

  protected onGridReady(e: GridReadyEvent): void {
    e.api.sizeColumnsToFit();
  }
}
