import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';

@Component({
  imports: [RouterOutlet, ToastContainerComponent],
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.scss',
  templateUrl: './app.html',
  host: {
    '[class.dark]': 'themeService.isDarkMode()',
    class: 'block min-h-screen',
  },
})
export class App {
  protected readonly themeService = inject(ThemeService);
}
