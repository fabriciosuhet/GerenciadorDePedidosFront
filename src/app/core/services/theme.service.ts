import { Injectable, signal } from '@angular/core';

const THEME_STORAGE_KEY = 'gdp_theme_dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly darkModeSignal = signal<boolean>(this.readInitialPreference());

  readonly isDarkMode = this.darkModeSignal.asReadonly();

  toggleTheme(): void {
    const next = !this.darkModeSignal();
    this.darkModeSignal.set(next);
    localStorage.setItem(THEME_STORAGE_KEY, String(next));
  }

  private readInitialPreference(): boolean {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'true';
  }
}
