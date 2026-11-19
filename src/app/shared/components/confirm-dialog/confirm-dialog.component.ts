import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  readonly open = input.required<boolean>();
  readonly title = input('Confirmar exclusão');
  readonly message = input('Esta ação não poderá ser desfeita.');
  readonly confirmLabel = input('Excluir');
  readonly loading = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
