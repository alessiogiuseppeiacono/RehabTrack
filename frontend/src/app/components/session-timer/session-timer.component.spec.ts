import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// FIX: importa SessionReport — il tipo dell'@Output e' cambiato da number a SessionReport (TASK-404)
import { SessionTimerComponent, SessionReport } from './session-timer.component';

describe('SessionTimerComponent', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // FIX: finish() e' stato sostituito da stopForReport() + submitReport() (TASK-404).
  // stopForReport() ferma il timer e apre il form; submitReport() emette il SessionReport.
  it('emette il SessionReport con i secondi trascorsi quando la sessione termina', () => {
    const component = new SessionTimerComponent();
    let emitted: SessionReport | null = null;
    component.finished.subscribe((r) => (emitted = r));

    component.start();
    vi.advanceTimersByTime(5000);
    component.stopForReport();   // ferma timer -> stato 'report'
    component.submitReport();    // invia il form con i valori di default (painLevel=5, patientNotes='')

    expect(emitted).not.toBeNull();
    expect(emitted!.duration_seconds).toBe(5);
    expect(emitted!.pain_level).toBe(5);       // default dello slider
    expect(emitted!.patient_notes).toBe('');   // default textarea
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

  // FIX: il guard "elapsed === 0 non emette" era in finish(); submitReport() emette sempre
  // (il paziente ha completato il form). Il test verifica che stopForReport() su un timer
  // mai avviato porti allo stato 'report' senza emettere nulla.
  it('stopForReport senza timer avviato non emette log', () => {
    const component = new SessionTimerComponent();
    let emitted = false;
    component.finished.subscribe(() => (emitted = true));

    component.stopForReport();   // elapsed=0, stato -> 'report', ma non emette ancora

    expect(emitted).toBe(false);
    expect(component.state).toBe('report');
    expect(component.elapsed).toBe(0);
  });
});
