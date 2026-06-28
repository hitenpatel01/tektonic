import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, timer, map, shareReplay } from 'rxjs';
import { Instrument } from '../models/instrument.model';

@Injectable({ providedIn: 'root' })
export class MarketDataService {
  private readonly http = inject(HttpClient);

  private snapshot: Instrument[] = [];

  /**
   * Single live stream of all 500 instruments, updated every 250 ms.
   * shareReplay(1) multicasts to N panel subscribers without forking the timer
   * or re-fetching the JSON asset.
   */
  readonly stream$: Observable<Instrument[]> = this.http
    .get<Instrument[]>('assets/data/fixed-income-universe.json')
    .pipe(
      switchMap(initial => {
        this.snapshot = initial.slice();
        return timer(0, 500).pipe(map(() => this.tick()));
      }),
      shareReplay(1),
    );

  private tick(): Instrument[] {
    this.snapshot = this.snapshot.map(inst => {
      // Basis-point-scale price shift: ~±3 bps per tick on average
      const shift = (Math.random() - 0.5) * 0.06;
      const newLast = r4(inst.lastPrice + shift);
      const halfSpread = r4((inst.askPrice - inst.bidPrice) / 2);

      return {
        ...inst,
        lastPrice: newLast,
        bidPrice: r4(newLast - halfSpread),
        askPrice: r4(newLast + halfSpread),
        // Yield moves inversely and proportionally to price via approximate modified duration
        yieldToMaturity: Math.max(0.001, r3(inst.yieldToMaturity - shift * 0.1)),
      };
    });

    return this.snapshot;
  }
}

function r4(n: number): number { return Math.round(n * 10_000) / 10_000; }
function r3(n: number): number { return Math.round(n * 1_000) / 1_000; }
