import { TestBed } from '@angular/core/testing';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent],
    }).compileComponents();
  });

  it('computes start/end indices and emits pageChange on next/previous click', () => {
    const fixture = TestBed.createComponent(PaginationComponent);
    fixture.componentRef.setInput('totalItems', 20);
    fixture.componentRef.setInput('pageSize', 8);
    fixture.componentRef.setInput('currentPage', 1);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('1–8');
    expect(el.textContent).toContain('1 / 3');

    const emitted: number[] = [];
    fixture.componentInstance.pageChange.subscribe((p) => emitted.push(p));

    const buttons = el.querySelectorAll('button');
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(false);

    buttons[1].click();
    expect(emitted).toEqual([2]);
  });

  it('emits pageSizeChange when selector is enabled and changed', () => {
    const fixture = TestBed.createComponent(PaginationComponent);
    fixture.componentRef.setInput('totalItems', 50);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('currentPage', 1);
    fixture.componentRef.setInput('showPageSizeSelector', true);
    fixture.detectChanges();

    const emittedSizes: number[] = [];
    fixture.componentInstance.pageSizeChange.subscribe((size) => emittedSizes.push(size));

    const select = (fixture.nativeElement as HTMLElement).querySelector('select')!;
    select.value = '50';
    select.dispatchEvent(new Event('change'));

    expect(emittedSizes).toEqual([50]);
  });
});
