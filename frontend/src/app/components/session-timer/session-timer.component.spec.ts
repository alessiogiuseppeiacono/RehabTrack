import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionTimerComponent } from './session-timer.component';

describe('SessionTimerComponent', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('emette i secondi trascorsi quando la sessione termina', () => {
    const component = new SessionTimerComponent();
    let emitted: number | null = null;
    component.finished.subscribe((s) => (emitted = s));

    component.start();
    vi.advanceTimersByTime(5000);
    component.finish();

    expect(emitted).toBe(5);
    expect(component.state).toBe('idle');
  });

  it('la pausa ferma il conteggio', () => {
    const component = new SessionTimerComponent();

    component.start();
    vi.advanceTimersByTime(3000);
    component.pause();
    vi.advanceTimersByTime(5000);

    expect(component.elapsed).toBe(3);
  });

  it('riprendere da pausa continua dal valore corrente', () => {
    const component = new SessionTimerComponent();

    component.start();
    vi.advanceTimersByTime(2000);
    component.pause();
    component.start();
    vi.advanceTimersByTime(1000);

    expect(component.elapsed).toBe(3);
  });

  it('terminare senza tempo trascorso non emette log', () => {
    const component = new SessionTimerComponent();
    let emitted = false;
    component.finished.subscribe(() => (emitted = true));

    component.finish();

    expect(emitted).toBe(false);
  });
});