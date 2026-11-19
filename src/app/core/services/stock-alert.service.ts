import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, of, take } from 'rxjs';
import { Product } from '../../features/products/models/product.model';
import { ProductService } from '../../features/products/services/product.service';

export interface StockAlertItem {
  id: number;
  name: string;
  currentStock: number;
  referenceCapacity: number;
  percentage: number;
}

const PEAK_STORAGE_KEY = 'gdp_product_peak_stock';
const DEFAULT_REFERENCE_CAPACITY = 100;
const LOW_STOCK_RATIO_THRESHOLD = 0.2;

@Injectable({ providedIn: 'root' })
export class StockAlertService {
  private readonly productService = inject(ProductService);

  private readonly alertsSignal = signal<StockAlertItem[]>([]);
  private readonly dismissedSignatureSignal = signal<string | null>(null);

  readonly alerts = this.alertsSignal.asReadonly();

  readonly alertSignature = computed(() =>
    this.alertsSignal()
      .map((item) => `${item.id}:${item.currentStock}`)
      .join('|'),
  );

  readonly visibleAlerts = computed(() => {
    const list = this.alertsSignal();
    if (list.length === 0) {
      return [];
    }
    if (this.dismissedSignatureSignal() === this.alertSignature()) {
      return [];
    }
    return list;
  });

  readonly isVisible = computed(() => this.visibleAlerts().length > 0);

  checkCatalogStock(): void {
    this.productService
      .getAll()
      .pipe(
        take(1),
        catchError(() => of(null)),
      )
      .subscribe((res) => {
        if (res) {
          this.evaluateProducts(res.items);
        }
      });
  }

  evaluateProducts(products: Product[]): void {
    const peaks = this.loadPeaks();
    let peaksChanged = false;

    const lowStockItems: StockAlertItem[] = [];

    for (const product of products) {
      const key = String(product.id);
      const previousPeak = peaks[key] ?? 0;
      if (product.estoque > previousPeak) {
        peaks[key] = product.estoque;
        peaksChanged = true;
      }

      const trackedPeak = peaks[key] ?? product.estoque;
      const referenceCapacity = Math.max(trackedPeak, DEFAULT_REFERENCE_CAPACITY);
      const ratio = product.estoque / referenceCapacity;

      if (ratio <= LOW_STOCK_RATIO_THRESHOLD) {
        lowStockItems.push({
          id: product.id,
          name: product.nome,
          currentStock: product.estoque,
          referenceCapacity,
          percentage: Math.max(0, Math.min(100, Math.round(ratio * 100))),
        });
      }
    }

    if (peaksChanged) {
      this.savePeaks(peaks);
    }

    this.alertsSignal.set(lowStockItems);
  }

  dismiss(): void {
    this.dismissedSignatureSignal.set(this.alertSignature());
  }

  private loadPeaks(): Record<string, number> {
    try {
      const raw = localStorage.getItem(PEAK_STORAGE_KEY);
      if (!raw) {
        return {};
      }
      return JSON.parse(raw) as Record<string, number>;
    } catch {
      return {};
    }
  }

  private savePeaks(peaks: Record<string, number>): void {
    localStorage.setItem(PEAK_STORAGE_KEY, JSON.stringify(peaks));
  }
}
