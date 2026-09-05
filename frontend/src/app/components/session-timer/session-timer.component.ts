import { Component, Output, EventEmitter, OnDestroy } from '@angular/core';
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
        <span class="time" [class.running]="state === 'running'">{{ formatted }}</span>

        <div class="controls">
          @if (state !== 'running') {
            <ion-button size="small" fill="outline" color="primary" (click)="start()">
              <ion-icon slot="icon-only" name="play-outline"></ion-icon>
            </ion-button>
          }
          @if (state === 'running') {
            <ion-button size="small" fill="outline" color="warning" (click)="pause()">
              <ion-icon slot="icon-only" name="pause-outline"></ion-icon>
            </ion-button>
          }
          @if (state !== 'idle') {
            <ion-button size="small" fill="clear" color="danger" (click)="stopForReport()">
              <ion-icon slot="icon-only" name="stop-outline"></ion-icon>
            </ion-button>
          }
        </div>
      </div>
    }

    <!-- TASK-404: form report fine sessione — visibile solo nello stato 'report' -->
    @if (state === 'report') {
      <div class="report-form">
        <ion-text color="medium">
          <p class="report-header">Sessione completata — inserisci il tuo feedback</p>
        </ion-text>

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
      gap: 0.75rem;
    }
    .time {
      font-variant-numeric: tabular-nums;
      font-size: 1.75rem;
      font-weight: 700;
      min-width: 4.5rem;
      color: var(--ion-color-medium);
    }
    .time.running {
      color: var(--ion-color-primary);
    }
    .controls {
      display: flex;
      gap: 0.25rem;
    }
    /* TASK-404: stili form report */
    .report-form {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .report-header {
      font-size: 0.9rem;
      margin: 0 0 0.5rem;
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
    this.intervalId = setInterval(() => {
      this.elapsed++;
    }, 1000);
  }

  pause(): void {
    this.state = 'paused';
    this.clearTimer();
  }

  // TASK-404: "Termina" non emette più direttamente — apre il form report.
  stopForReport(): void {
    this.clearTimer();
    this.state = 'report';
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
  }

  private clearTimer(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
