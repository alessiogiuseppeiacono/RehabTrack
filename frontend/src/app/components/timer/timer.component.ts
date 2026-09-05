import { Component, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton, IonIcon, IonBadge, IonText
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { playOutline, pauseOutline, refreshOutline } from 'ionicons/icons';

type TimerState = 'idle' | 'running' | 'paused' | 'done';

@Component({
  selector: 'app-timer',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon, IonBadge],
  template: `
    <div class="timer-container" [class.done]="state === 'done'">
      <span class="timer-display" [class.running]="state === 'running'" [class.done]="state === 'done'">
        {{ minutes }}:{{ secondsPad }}
      </span>

      <div class="timer-controls">
        @if (state === 'idle' || state === 'paused') {
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
          <ion-button size="small" fill="clear" color="medium" (click)="reset()">
            <ion-icon slot="icon-only" name="refresh-outline"></ion-icon>
          </ion-button>
        }
      </div>

      @if (state === 'done') {
        <ion-badge color="success" class="done-badge">Recupero completato!</ion-badge>
      }
    </div>
  `,
  styles: [`
    .timer-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .timer-display {
      font-variant-numeric: tabular-nums;
      font-size: 1.25rem;
      font-weight: 600;
      min-width: 3.2rem;
      color: var(--ion-color-medium);
    }
    .timer-display.running {
      color: var(--ion-color-primary);
    }
    .timer-display.done {
      color: var(--ion-color-success);
    }
    .timer-controls {
      display: flex;
      gap: 0.15rem;
    }
    .done-badge {
      font-size: 0.75rem;
    }
  `],
})
export class TimerComponent implements OnDestroy {
  /** Durata del recupero in secondi, passata dall'esercizio */
  @Input({ required: true }) durationSeconds = 0;

  remaining = 0;
  state: TimerState = 'idle';
  private intervalId: ReturnType<typeof setInterval> | null = null;

  get minutes(): number {
    return Math.floor(this.remaining / 60);
  }

  get secondsPad(): string {
    return String(this.remaining % 60).padStart(2, '0');
  }

  constructor() {
    addIcons({ playOutline, pauseOutline, refreshOutline });
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  start(): void {
    if (this.state === 'idle') {
      this.remaining = this.durationSeconds;
    }
    this.state = 'running';
    this.clearTimer();
    this.intervalId = setInterval(() => {
      if (--this.remaining <= 0) {
        this.remaining = 0;
        this.state = 'done';
        this.clearTimer();
      }
    }, 1000);
  }

  pause(): void {
    this.state = 'paused';
    this.clearTimer();
  }

  reset(): void {
    this.state = 'idle';
    this.remaining = this.durationSeconds;
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
