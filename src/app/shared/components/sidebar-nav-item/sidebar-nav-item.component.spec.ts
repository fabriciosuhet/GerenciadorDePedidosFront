import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SidebarNavItemComponent } from './sidebar-nav-item.component';

@Component({
  standalone: true,
  template: '',
})
class DummyPageComponent {}

describe('SidebarNavItemComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarNavItemComponent],
      providers: [
        provideRouter([
          { path: 'dashboard', component: DummyPageComponent },
          { path: 'orders', component: DummyPageComponent },
        ]),
      ],
    }).compileComponents();
  });

  it('applies high-contrast active classes without conflicting inactive text color', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');

    const fixture = TestBed.createComponent(SidebarNavItemComponent);
    fixture.componentRef.setInput('route', '/dashboard');
    fixture.componentRef.setInput('label', 'Visão Geral');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const anchor = (fixture.nativeElement as HTMLElement).querySelector('a');
    expect(anchor?.className).toContain('bg-lime-400');
    expect(anchor?.className).toContain('text-zinc-950');
    expect(anchor?.className).not.toContain('text-zinc-700');
  });

  it('applies legible inactive classes when route is not active', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/orders');

    const fixture = TestBed.createComponent(SidebarNavItemComponent);
    fixture.componentRef.setInput('route', '/dashboard');
    fixture.componentRef.setInput('label', 'Visão Geral');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const anchor = (fixture.nativeElement as HTMLElement).querySelector('a');
    expect(anchor?.className).toContain('text-zinc-700');
    expect(anchor?.className).not.toContain('bg-lime-400');
  });
});
