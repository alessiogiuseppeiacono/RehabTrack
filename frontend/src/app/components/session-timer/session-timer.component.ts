import { Component, Output, EventEmitter, OnDestroy } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { playOutline, pauseOutline, stopOutline } from 'ionicons/icons';

type TimerState = 'idle' | 'running' | 'paused';

// TASK-403: cronometro di sessione (conta in avanti) con Avvia/Pausa/Termina.
// Al termine emette i secondi trascorsi; il padre (Tab 1) li invia a /session-logs.
@Component({
  selector: 'app-session-timer',
  standalone: true,
  imports: [IonButton, IonIcon],
  template: `
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
          <ion-button size="small" fill="clear" color="danger" (click)="finish()">
            <ion-icon slot="icon-only" name="stop-outline"></ion-icon>
          </ion-button>
        }
      </div>
    </div>
  `,
  styles: [
    `
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
    `,
  ],
})
export class SessionTimerComponent implements OnDestroy {
  /** Emette i secondi trascorsi quando l'utente termina la sessione. */
  @Output() finished = new EventEmitter<number>();

  elapsed = 0;
  state: TimerState = 'idle';
  private intervalId: ReturnType<typeof setInterval> | null = null;

  get formatted(): string {
    const m = Math.floor(this.elapsed / 60);
    const s = String(this.elapsed % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  constructor() {
    addIcons({ playOutline, pauseOutline, stopOutline });
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

  finish(): void {
    this.clearTimer();
    this.state = 'idle';
    if (this.elapsed > 0) {
      this.finished.emit(this.elapsed);
    }
    this.elapsed = 0;
  }

  private clearTimer(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}