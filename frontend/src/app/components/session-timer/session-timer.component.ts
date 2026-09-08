import { Component, Output, EventEmitter, OnDestroy, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonIcon, IonRange, IonTextarea, IonItem, IonLabel, IonNote, IonText
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { playOutline, pauseOutline, stopOutline, sendOutline } from 'ionicons/icons';

// TASK-403: forma del dato emesso al termine della sessione.
// TASK-404: ora include pain_level (obbligatorio) e patient_notes (opzionale).
export interface SessionReport {
  duration_seconds: number;
  pain_level: number;
  patient_notes: string;
}

// Stato aggiunto 'report': il form dolore appare dopo che il timer viene fermato.
type TimerState = 'idle' | 'running' | 'paused' | 'report';

// TASK-403 + TASK-404: cronometro di sessione con form report fine sessione inline.
// Flusso: Avvia → (Pausa) → Termina → form pain_level + note → Invia Feedback → emette SessionReport.
@Component({
  selector: 'app-session-timer',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonButton, IonIcon, IonRange, IonTextarea, IonItem, IonLabel, IonNote, IonText
  ],
  template: `
    <!-- Timer display + controlli (nascosto nella fase report) -->
    @if (state !== 'report') {
      <div class="session-timer">
        <div class="time-wrap">
          <span class="time" [class.running]="state === 'running'">{{ formatted }}</span>
          <span class="time-label">{{ state === 'running' ? 'In corso' : state === 'paused' ? 'In pausa' : 'Pronto' }}</span>
        </div>

        <div class="controls">
          @if (state !== 'running') {
            <button class="ctrl-btn play" (click)="start()" aria-label="Avvia">
              <ion-icon name="play-outline"></ion-icon>
            </button>
          }
          @if (state === 'running') {
            <button class="ctrl-btn pause" (click)="pause()" aria-label="Pausa">
              <ion-icon name="pause-outline"></ion-icon>
            </button>
          }
          @if (state !== 'idle') {
            <button class="ctrl-btn stop" (click)="stopForReport()" aria-label="Termina">
              <ion-icon name="stop-outline"></ion-icon>
            </button>
          }
        </div>
      </div>
    }

    <!-- TASK-404: form report fine sessione — visibile solo nello stato 'report' -->
    @if (state === 'report') {
      <div class="report-form">
        <p class="report-header">Sessione completata — lascia il tuo feedback</p>

        <!-- Slider livello dolore (obbligatorio, 1-10) -->
        <ion-item lines="none" class="report-item">
          <ion-label position="stacked">
            Livello di dolore: <strong>{{ painLevel }}</strong> / 10
          </ion-label>
          <ion-range
            id="pain-range"
            min="1"
            max="10"
            step="1"
            snaps="true"
            color="danger"
            [(ngModel)]="painLevel"
          ></ion-range>
        </ion-item>
        <ion-note class="range-hint" color="medium">1 = nessun dolore · 10 = dolore massimo</ion-note>

        <!-- Note opzionali -->
        <ion-item lines="none" class="report-item">
          <ion-label position="stacked">Note (opzionale)</ion-label>
          <ion-textarea
            id="patient-notes"
            placeholder="Descrivi come ti sei sentito durante la sessione..."
            [autoGrow]="true"
            [(ngModel)]="patientNotes"
          ></ion-textarea>
        </ion-item>

        <!-- Pulsante invio -->
        <ion-button
          id="submit-report-btn"
          expand="block"
          color="primary"
          class="submit-btn"
          (click)="submitReport()"
        >
          <ion-icon slot="start" name="send-outline"></ion-icon>
          Invia Feedback
        </ion-button>
      </div>
    }
  `,
  styles: [`
    .session-timer {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }
    .time-wrap {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .time {
      font-variant-numeric: tabular-nums;
      font-size: 2.4rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1;
      color: #94a3b8;
      transition: color 0.35s ease;
    }
    .time.running {
      color: var(--ion-color-primary);
    }
    .time-label {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .controls {
      display: flex;
      gap: 0.5rem;
      margin-left: auto;
    }
    .ctrl-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      font-size: 1.1rem;
      transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.10);
    }
    .ctrl-btn:active { transform: scale(0.93); }
    .ctrl-btn.play {
      background: var(--ion-color-primary);
      color: #fff;
    }
    .ctrl-btn.play:hover { box-shadow: 0 4px 16px rgba(var(--ion-color-primary-rgb), 0.35); }
    .ctrl-btn.pause {
      background: #fff7ed;
      color: #f59e0b;
      border: 1.5px solid #fed7aa;
    }
    .ctrl-btn.stop {
      background: #fff1f2;
      color: #f43f5e;
      border: 1.5px solid #fecdd3;
    }
    /* TASK-404: stili form report */
    .report-form {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .report-header {
      font-size: 0.9rem;
      font-weight: 600;
      color: #64748b;
      margin: 0 0 0.75rem;
    }
    .report-item {
      --background: transparent;
      --padding-start: 0;
    }
    .range-hint {
      font-size: 0.75rem;
      padding: 0 0 0.5rem;
    }
    .submit-btn {
      margin-top: 0.75rem;
    }
  `],
})
export class SessionTimerComponent implements OnDestroy {
  /**
   * TASK-404: emette il report completo (duration + pain_level + notes).
   * Il tipo è cambiato da number a SessionReport per includere il feedback dolore.
   */
  @Output() finished = new EventEmitter<SessionReport>();

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);

  elapsed = 0;
  state: TimerState = 'idle';
  private intervalId: ReturnType<typeof setInterval> | null = null;

  // TASK-404: valori del form report
  painLevel = 5;
  patientNotes = '';

  get formatted(): string {
    const m = Math.floor(this.elapsed / 60);
    const s = String(this.elapsed % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  constructor() {
    addIcons({ playOutline, pauseOutline, stopOutline, sendOutline });
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  start(): void {
    this.state = 'running';
    this.clearTimer();
    this.ngZone.runOutsideAngular(() => {
      this.intervalId = setInterval(() => {
        this.ngZone.run(() => {
          this.elapsed++;
          this.cdr.markForCheck();
        });
      }, 1000);
    });
    this.cdr.markForCheck();
  }

  pause(): void {
    this.state = 'paused';
    this.clearTimer();
    this.cdr.markForCheck();
  }

  // TASK-404: "Termina" non emette più direttamente — apre il form report.
  stopForReport(): void {
    this.clearTimer();
    this.state = 'report';
    this.cdr.markForCheck();
  }

  // TODO (TASK-404): Testare visivamente il form del dolore e l'invio del payload non appena il TASK-304 (Compositore Schede) genererà dati reali nello Sprint 3.
  // TASK-404: invio del form — emette il report completo e azzera il componente.
  submitReport(): void {
    this.finished.emit({
      duration_seconds: this.elapsed,
      pain_level: this.painLevel,
      patient_notes: this.patientNotes,
    });
    // Reset per eventuale nuova sessione
    this.elapsed = 0;
    this.painLevel = 5;
    this.patientNotes = '';
    this.state = 'idle';
    this.cdr.markForCheck();
  }

  private clearTimer(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
