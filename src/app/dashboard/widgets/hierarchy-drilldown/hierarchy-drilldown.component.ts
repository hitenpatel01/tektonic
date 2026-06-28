import { Component, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridReadyEvent, GetRowIdParams, RowClickedEvent } from 'ag-grid-community';
import { MarketDataService } from '../../../core/services/market-data.service';
import { Instrument } from '../../../core/models/instrument.model';
interface ClassRow {
  assetClass: string;
  count: number;
  avgYtm: number;
  totalVolM: number;
}

interface SectorRow {
  sector: string;
  count: number;
  avgPrice: number;
  avgYtm: number;
}

type DrillLevel = 'class' | 'sector' | 'instrument';

interface DrillState {
  level: DrillLevel;
  assetClass?: string;
  sector?: string;
}

@Component({
  selector: 'app-hierarchy-drilldown',
  imports: [AgGridAngular],
  templateUrl: './hierarchy-drilldown.component.html',
  styleUrl: './hierarchy-drilldown.component.css',
})
export class HierarchyDrilldownComponent {
  private readonly marketData = inject(MarketDataService);
  private readonly allInstruments = toSignal(this.marketData.stream$, { initialValue: [] as Instrument[] });
  protected readonly drillState = signal<DrillState>({ level: 'class' });

  protected readonly breadcrumb = computed(() => {
    const s = this.drillState();
    if (s.level === 'class') return ['All Classes'];
    if (s.level === 'sector') return ['All Classes', s.assetClass!];
    return ['All Classes', s.assetClass!, s.sector!];
  });

  protected readonly classRows = computed<ClassRow[]>(() => {
    const map = new Map<string, { count: number; totalVol: number; ytmSum: number }>();
    for (const inst of this.allInstruments()) {
      const g = map.get(inst.assetClass) ?? { count: 0, totalVol: 0, ytmSum: 0 };
      map.set(inst.assetClass, {
        count: g.count + 1,
        totalVol: g.totalVol + inst.volume24h,
        ytmSum: g.ytmSum + inst.yieldToMaturity,
      });
    }
    return Array.from(map.entries())
      .map(([assetClass, g]) => ({
        assetClass,
        count: g.count,
        avgYtm: g.ytmSum / g.count,
        totalVolM: g.totalVol / 1_000_000,
      }))
      .sort((a, b) => b.totalVolM - a.totalVolM);
  });

  protected readonly sectorRows = computed<SectorRow[]>(() => {
    const s = this.drillState();
    if (!s.assetClass) return [];
    const filtered = this.allInstruments().filter(i => i.assetClass === s.assetClass);
    const map = new Map<string, { count: number; priceSum: number; ytmSum: number }>();
    for (const inst of filtered) {
      const g = map.get(inst.sector) ?? { count: 0, priceSum: 0, ytmSum: 0 };
      map.set(inst.sector, {
        count: g.count + 1,
        priceSum: g.priceSum + inst.lastPrice,
        ytmSum: g.ytmSum + inst.yieldToMaturity,
      });
    }
    return Array.from(map.entries())
      .map(([sector, g]) => ({
        sector,
        count: g.count,
        avgPrice: g.priceSum / g.count,
        avgYtm: g.ytmSum / g.count,
      }))
      .sort((a, b) => b.count - a.count);
  });

  protected readonly instrumentRows = computed<Instrument[]>(() => {
    const s = this.drillState();
    if (s.level !== 'instrument' || !s.assetClass || !s.sector) return [];
    return this.allInstruments().filter(i => i.assetClass === s.assetClass && i.sector === s.sector);
  });

  // ── Column definitions ──────────────────────────────
  protected readonly classColDefs: ColDef<ClassRow>[] = [
    { field: 'assetClass', headerName: 'Asset Class', flex: 2 },
    { field: 'count', headerName: '#', flex: 1 },
    { field: 'avgYtm', headerName: 'Avg YTM%', flex: 1, valueFormatter: p => p.value?.toFixed(3), enableCellChangeFlash: true },
    { field: 'totalVolM', headerName: 'Vol ($M)', flex: 1, valueFormatter: p => p.value?.toFixed(0), enableCellChangeFlash: true },
  ];

  protected readonly sectorColDefs: ColDef<SectorRow>[] = [
    { field: 'sector', headerName: 'Sector', flex: 2 },
    { field: 'count', headerName: '#', flex: 1 },
    { field: 'avgPrice', headerName: 'Avg Price', flex: 1, valueFormatter: p => p.value?.toFixed(3), enableCellChangeFlash: true },
    { field: 'avgYtm', headerName: 'Avg YTM%', flex: 1, valueFormatter: p => p.value?.toFixed(3), enableCellChangeFlash: true },
  ];

  protected readonly instrColDefs: ColDef<Instrument>[] = [
    { field: 'ticker', flex: 2, pinned: 'left' },
    { field: 'issuer', flex: 2 },
    { field: 'coupon', headerName: 'Cpn%', flex: 1, valueFormatter: p => p.value?.toFixed(3) },
    { field: 'maturity', flex: 1 },
    { field: 'lastPrice', headerName: 'Last', flex: 1, valueFormatter: p => p.value?.toFixed(4), enableCellChangeFlash: true },
    { field: 'yieldToMaturity', headerName: 'YTM%', flex: 1, valueFormatter: p => p.value?.toFixed(3), enableCellChangeFlash: true },
  ];

  protected readonly defaultColDef: ColDef = {
    sortable: true, resizable: true, minWidth: 60,
  };

  protected readonly getClassRowId = (p: GetRowIdParams<ClassRow>) => p.data.assetClass;
  protected readonly getSectorRowId = (p: GetRowIdParams<SectorRow>) => p.data.sector;
  protected readonly getInstrRowId = (p: GetRowIdParams<Instrument>) => p.data.isin;

  // ── Navigation ──────────────────────────────────────
  protected drillToSector(e: RowClickedEvent<ClassRow>): void {
    if (!e.data) return;
    this.drillState.set({ level: 'sector', assetClass: e.data.assetClass });
  }

  protected drillToInstrument(e: RowClickedEvent<SectorRow>): void {
    if (!e.data) return;
    const ac = this.drillState().assetClass!;
    this.drillState.set({ level: 'instrument', assetClass: ac, sector: e.data.sector });
  }

  protected navigateTo(index: number): void {
    if (index === 0) {
      this.drillState.set({ level: 'class' });
    } else if (index === 1) {
      this.drillState.update(s => ({ level: 'sector', assetClass: s.assetClass }));
    }
  }

  protected onGridReady(e: GridReadyEvent): void {
    e.api.sizeColumnsToFit();
  }
}
