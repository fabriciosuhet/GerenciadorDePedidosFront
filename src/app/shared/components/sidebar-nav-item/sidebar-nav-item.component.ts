import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar-nav-item',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar-nav-item.component.html',
})
export class SidebarNavItemComponent {
  readonly route = input.required<string>();
  readonly label = input.required<string>();
  readonly exact = input(false);
  readonly badge = input<number | null>(null);
  readonly navigated = output<void>();
}
