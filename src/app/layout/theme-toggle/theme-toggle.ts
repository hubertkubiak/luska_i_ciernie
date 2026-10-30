import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { isReplayed } from '../../core/event-replay';
import { ThemeService } from '../../core/theme';

/**
 * Night ⇄ parchment toggle. A plain POST /motyw form — without JS the server sets the cookie
 * and sends you back to the same page. With JS we intercept the submit and switch the theme in place.
 */
@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss',
})
export class ThemeToggle {
  private readonly themes = inject(ThemeService);
  private readonly router = inject(Router);

  protected readonly theme = this.themes.theme;
  protected readonly next = computed(() => (this.theme() === 'night' ? 'parchment' : 'night'));

  /** Where to return after switching without JS. */
  protected readonly here = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected toggle(event: SubmitEvent): void {
    if (isReplayed(event)) return; // a form from before hydration has already gone natively
    event.preventDefault();
    this.themes.set(this.next());
  }
}
