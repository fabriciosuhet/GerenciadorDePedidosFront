import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly toastsSignal = signal<ToastMessage[]>([]);

  readonly toasts = this.toastsSignal.asReadonly();

  success(text: string, durationMs = 4000): void {
    this.show('success', text, durationMs);
  }

  error(text: string, durationMs = 5500): void {
    this.show('error', text, durationMs);
  }

  info(text: string, durationMs = 4000): void {
    this.show('info', text, durationMs);
  }

  dismiss(id: number): void {
    this.toastsSignal.update((items) => items.filter((item) => item.id !== id));
  }

  private show(type: ToastType, text: string, durationMs: number): void {
    const id = this.nextId++;
    this.toastsSignal.update((items) => [...items, { id, type, text }]);

    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
  }
}
