import { Injectable, computed, effect, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'stackflow.theme';
const ORDER: ThemePreference[] = ['system', 'light', 'dark'];

/**
 * Light / dark / system preference, persisted per browser.
 *
 * <p>"System" is a first-class choice rather than just the default: a user who has never touched
 * the toggle should follow their OS, and one who explicitly picked light should stay light even
 * after their OS switches at sunset. An explicit choice stamps `data-theme` on the document, which
 * the stylesheet gives precedence over the media query; "system" removes the attribute entirely.
 *
 * <p>The same value is applied by an inline script in index.html before first paint — this service
 * owns changes made while the app is running.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly preferenceSignal = signal<ThemePreference>(readStoredPreference());

  readonly preference = this.preferenceSignal.asReadonly();

  /** What the user actually sees right now, with "system" resolved. */
  readonly resolved = computed<'light' | 'dark'>(() => {
    const preference = this.preferenceSignal();
    return preference === 'system' ? systemPrefersDark() : preference;
  });

  constructor() {
    effect(() => this.apply(this.preferenceSignal()));
  }

  set(preference: ThemePreference): void {
    this.preferenceSignal.set(preference);
  }

  /** Cycles system → light → dark, so every state is reachable from one control. */
  cycle(): void {
    const next = ORDER[(ORDER.indexOf(this.preferenceSignal()) + 1) % ORDER.length];
    this.set(next);
  }

  private apply(preference: ThemePreference): void {
    const root = document.documentElement;
    if (preference === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', preference);
    }
    try {
      if (preference === 'system') {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, preference);
      }
    } catch {
      /* storage blocked: the choice simply does not survive a reload */
    }
  }
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

function systemPrefersDark(): 'light' | 'dark' {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}
