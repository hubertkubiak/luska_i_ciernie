import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { isReplayed } from '../../core/event-replay';
import { ThemeService } from '../../core/theme';

/**
 * Przełącznik noc ⇄ pergamin. Zwykły formularz POST /motyw — bez JS serwer ustawia ciasteczko
 * i odsyła z powrotem na tę samą stronę. Z JS przechwytujemy wysłanie i zmieniamy motyw w miejscu.
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

  /** Dokąd wrócić po przełączeniu bez JS. */
  protected readonly here = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected toggle(event: SubmitEvent): void {
    if (isReplayed(event)) return; // formularz sprzed hydracji poszedł już natywnie
    event.preventDefault();
    this.themes.set(this.next());
  }
}
