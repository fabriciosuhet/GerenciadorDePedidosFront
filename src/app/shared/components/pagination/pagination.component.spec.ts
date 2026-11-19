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
});
