import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pagination.component.html',
})
export class PaginationComponent {
  readonly totalItems = input.required<number>();
  readonly pageSize = input<number>(10);
  readonly currentPage = input<number>(1);
  readonly showPageSizeSelector = input<boolean>(false);
  readonly pageSizeOptions = input<number[]>([10, 25, 50, 100]);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / this.pageSize())),
  );

  protected readonly startIndex = computed(() => {
    if (this.totalItems() === 0) {
      return 0;
    }
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  protected readonly endIndex = computed(() =>
    Math.min(this.totalItems(), this.currentPage() * this.pageSize()),
  );

  protected goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.pageChange.emit(page);
    }
  }

  protected onPageSizeSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const nextSize = Number(select.value);
    if (Number.isFinite(nextSize) && nextSize > 0) {
      this.pageSizeChange.emit(nextSize);
    }
  }
}
