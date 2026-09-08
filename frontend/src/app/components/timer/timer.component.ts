import { Component, Input, OnDestroy, inject, ChangeDetectorRef, NgZone } from '@angular/core';
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
      <div class="timer-display-wrap">
        <span class="timer-display" [class.running]="state === 'running'" [class.done]="state === 'done'">
          {{ minutes }}:{{ secondsPad }}
        </span>
        @if (state === 'done') {
          <ion-badge color="success" class="done-badge">Recupero ok!</ion-badge>
        }
      </div>

      <div class="timer-controls">
        @if (state === 'idle' || state === 'paused') {
          <button class="rc-btn play" (click)="start()" aria-label="Avvia recupero">
            <ion-icon name="play-outline"></ion-icon>
          </button>
        }
        @if (state === 'running') {
          <button class="rc-btn pause" (click)="pause()" aria-label="Pausa recupero">
            <ion-icon name="pause-outline"></ion-icon>
          </button>
        }
        @if (state !== 'idle') {
          <button class="rc-btn reset" (click)="reset()" aria-label="Reset recupero">
            <ion-icon name="refresh-outline"></ion-icon>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .timer-container {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }
    .timer-display-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .timer-display {
      font-variant-numeric: tabular-nums;
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #94a3b8;
      transition: color 0.25s ease;
    }
    .timer-display.running { color: var(--ion-color-primary); }
    .timer-display.done    { color: #22c55e; }
    .timer-controls {
      display: flex;
      gap: 0.35rem;
    }
    .rc-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      font-size: 0.95rem;
      transition: transform 0.12s ease, box-shadow 0.12s ease;
      box-shadow: 0 1px 4px rgba(0,0,0,0.10);
    }
    .rc-btn:active { transform: scale(0.91); }
    .rc-btn.play  { background: var(--ion-color-primary); color: #fff; }
    .rc-btn.pause { background: #fff7ed; color: #f59e0b; border: 1px solid #fed7aa; }
    .rc-btn.reset { background: #f8fafc; color: #94a3b8; border: 1px solid #e2e8f0; }
    .done-badge { font-size: 0.7rem; }
  `],
})
export class TimerComponent implements OnDestroy {
  /** Durata del recupero in secondi, passata dall'esercizio */
  @Input({ required: true }) durationSeconds = 0;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);

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
    this.ngZone.runOutsideAngular(() => {
      this.intervalId = setInterval(() => {
        this.ngZone.run(() => {
          if (--this.remaining <= 0) {
            this.remaining = 0;
            this.state = 'done';
            this.clearTimer();
          }
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

  reset(): void {
    this.state = 'idle';
    this.remaining = this.durationSeconds;
    this.clearTimer();
    this.cdr.markForCheck();
  }

  private clearTimer(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
