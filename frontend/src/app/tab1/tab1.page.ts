import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonItem, IonLabel, IonNote,
  IonSpinner, IonIcon, IonText,
  IonButton, IonRange, IonTextarea, IonBadge, AlertController
} from '@ionic/angular';
import { finalize } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  barbellOutline, timerOutline, repeatOutline,
  documentTextOutline, fitnessOutline, alertCircleOutline,
  playOutline, pauseOutline, stopOutline, sendOutline, checkmarkCircleOutline,
  playForwardOutline, logOutOutline, cameraOutline, trashOutline
} from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { PatientService, Card, Exercise } from '../services/patient.service';
import { AuthService } from '../services/auth.service';

type WorkoutState = 'overview' | 'prepare' | 'exercise' | 'rest' | 'feedback' | 'completed';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonItem, IonLabel, IonNote,
    IonButton, IonButtons, IonIcon, IonBadge, IonRange, IonTextarea,
    IonSpinner, IonText
  ],
})
export class Tab1Page implements OnInit, OnDestroy {
  private readonly patientService = inject(PatientService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly alertCtrl = inject(AlertController);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  card: Card | null = null;
  exercises: Exercise[] = [];
  loading = true;
  error: string | null = null;

  // Stato Workout
  workoutState: WorkoutState = 'overview';
  currentExerciseIndex = 0;
  currentSet = 1;
  
  // Timers
  totalElapsedSeconds = 0;
  countdownSeconds = 0;
  isTimerRunning = false;
  private sessionIntervalId: ReturnType<typeof setInterval> | null = null;

  // Feedback form
  painLevel = 5;
  patientNotes = '';
  photoPreview: string | null = null;
  photoBlob: Blob | null = null;
  sessionLogState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  isEarlyExit = false;

  constructor() {
    addIcons({
      barbellOutline, timerOutline, repeatOutline,
      documentTextOutline, fitnessOutline, alertCircleOutline,
      playOutline, pauseOutline, stopOutline, sendOutline, checkmarkCircleOutline,
      playForwardOutline, logOutOutline, cameraOutline, trashOutline
    });
  }

  ngOnInit(): void {
    this.loadTodayCard();
  }

  ngOnDestroy(): void {
    this.clearSessionTimer();
  }

  loadTodayCard(): void {
    this.loading = true;
    this.error = null;
    this.patientService.getTodayCard()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.card = res?.card ?? null;
          this.exercises = res?.exercises ?? [];
        },
        error: (err) => {
          if (err?.status === 404) {
            this.card = null;
            this.exercises = [];
          } else {
            this.error = err?.error?.error || err?.message || 'Errore nel caricamento della scheda';
          }
        },
      });
  }

  get currentExercise(): Exercise | null {
    if (this.exercises.length === 0 || this.currentExerciseIndex >= this.exercises.length) {
      return null;
    }
    return this.exercises[this.currentExerciseIndex];
  }

  get isTimeBased(): boolean {
    const ex = this.currentExercise;
    if (!ex) return false;
    return this.parseExerciseDuration(ex.reps_or_duration) !== null;
  }

  get timeTarget(): number {
    const ex = this.currentExercise;
    if (!ex) return 0;
    return this.parseExerciseDuration(ex.reps_or_duration) || 0;
  }

  parseExerciseDuration(repsOrDuration: string): number | null {
    const lower = repsOrDuration.toLowerCase();
    if (lower.includes('s') || lower.includes('sec') || lower.includes('secondi')) {
      const match = lower.match(/\d+/);
      return match ? parseInt(match[0], 10) : null;
    }
    return null;
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  async startWorkout(): Promise<void> {
    if (this.card?.is_completed_today) {
      const alert = await this.alertCtrl.create({
        header: 'Attenzione',
        message: 'Hai già registrato l\'allenamento di oggi. Vuoi ripeterlo?',
        buttons: [
          {
            text: 'Annulla',
            role: 'cancel'
          },
          {
            text: 'Ripeti',
            handler: () => {
              this.doStartWorkout();
            }
          }
        ]
      });
      await alert.present();
    } else {
      this.doStartWorkout();
    }
  }

  private doStartWorkout(): void {
    this.currentExerciseIndex = 0;
    this.currentSet = 1;
    this.totalElapsedSeconds = 0;
    this.painLevel = 5;
    this.patientNotes = '';
    this.photoPreview = null;
    this.photoBlob = null;
    this.sessionLogState = 'idle';
    this.isEarlyExit = false;
    this.startGlobalTimer();
    this.startPreparePhase();
  }

  startPreparePhase(): void {
    this.workoutState = 'prepare';
    this.countdownSeconds = 5;
    this.isTimerRunning = true;
    this.cdr.markForCheck();
  }

  skipPrepare(): void {
    this.finishPrepare();
  }

  finishPrepare(): void {
    this.startExercisePhase();
  }

  startExercisePhase(): void {
    this.workoutState = 'exercise';
    if (this.isTimeBased) {
      this.countdownSeconds = this.timeTarget;
      this.isTimerRunning = true;
    } else {
      this.countdownSeconds = 0;
      this.isTimerRunning = false;
    }
    this.cdr.markForCheck();
  }

  startGlobalTimer(): void {
    this.clearSessionTimer();
    this.ngZone.runOutsideAngular(() => {
      this.sessionIntervalId = setInterval(() => {
        this.ngZone.run(() => {
          if (this.workoutState !== 'feedback' && this.workoutState !== 'completed' && this.workoutState !== 'overview') {
            this.totalElapsedSeconds++;
          }

          if (this.isTimerRunning && this.countdownSeconds > 0) {
            this.countdownSeconds--;
            if (this.countdownSeconds === 0) {
              if (this.workoutState === 'prepare') {
                this.finishPrepare();
              } else if (this.workoutState === 'exercise') {
                this.completeSet();
              } else if (this.workoutState === 'rest') {
                this.finishRest();
              }
            }
          }
          this.cdr.markForCheck();
        });
      }, 1000);
    });
  }

  clearSessionTimer(): void {
    if (this.sessionIntervalId) {
      clearInterval(this.sessionIntervalId);
      this.sessionIntervalId = null;
    }
  }

  toggleExerciseTimer(): void {
    this.isTimerRunning = !this.isTimerRunning;
    this.cdr.markForCheck();
  }

  skipExercise(): void {
    this.completeSet();
  }

  completeSet(): void {
    const ex = this.exercises[this.currentExerciseIndex];
    if (!ex) return;

    if (this.currentSet < ex.sets) {
      this.currentSet++;
      this.startRestPhase(ex.rest_seconds);
    } else {
      if (this.currentExerciseIndex < this.exercises.length - 1) {
        this.currentExerciseIndex++;
        this.currentSet = 1;
        this.startRestPhase(ex.rest_seconds, true); // true indica che il prossimo passo sarà un nuovo esercizio
      } else {
        this.finishWorkout();
      }
    }
  }

  startRestPhase(restSeconds: number, nextIsNewExercise = false): void {
    if (restSeconds > 0) {
      this.workoutState = 'rest';
      this.countdownSeconds = restSeconds;
      this.isTimerRunning = true;
      // Tracciamo se il prossimo esercizio è nuovo per avviare la prepare phase
      // Possiamo usare una variabile di stato, oppure dedurre se (currentSet === 1) nella finishRest
      this.cdr.markForCheck();
    } else {
      this.finishRest();
    }
  }

  finishRest(): void {
    // Il prepare va fatto solo all'inizio dell'allenamento.
    // Durante il workout, dopo il recupero, si passa direttamente all'esercizio successivo.
    this.startExercisePhase();
  }

  skipRest(): void {
    this.finishRest();
  }

  abandonWorkout(): void {
    this.isEarlyExit = true;
    this.workoutState = 'feedback';
    this.isTimerRunning = false;
    this.clearSessionTimer();
    this.cdr.markForCheck();
  }

  finishWorkout(): void {
    this.workoutState = 'feedback';
    this.isTimerRunning = false;
    this.clearSessionTimer();
    this.cdr.markForCheck();
  }

  submitFeedback(): void {
    if (!this.card) return;
    this.sessionLogState = 'saving';
    
    console.log('DEBUG submitSession - photo presente?:', !!this.photoBlob, this.photoBlob);
    
    this.patientService.saveSessionLog({
      card_id: this.card.id,
      duration_seconds: this.totalElapsedSeconds,
      pain_level: this.painLevel,
      patient_notes: this.patientNotes,
      photo_file: this.photoBlob || undefined
    }).subscribe({
      next: () => {
        this.sessionLogState = 'saved';
        if (this.card) {
          this.card.is_completed_today = true;
        }
        this.workoutState = 'completed';
        this.cdr.markForCheck();
      },
      error: () => {
        this.sessionLogState = 'error';
        this.cdr.markForCheck();
      },
    });
  }

  async takePicture(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      this.openFilePicker();
      return;
    }

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt
      });
      
      if (image.dataUrl) {
        this.photoPreview = image.dataUrl;
        this.photoBlob = await this.dataUrlToBlob(image.dataUrl);
        this.cdr.markForCheck();
      }
    } catch (e) {
      console.warn('Camera fallita o annullata', e);
      this.openFilePicker();
    }
  }

  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl);
    return await res.blob();
  }

  private openFilePicker(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      this.photoBlob = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview = reader.result as string;
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  removePhoto(): void {
    this.photoPreview = null;
    this.photoBlob = null;
    this.cdr.markForCheck();
  }

  resetToOverview(): void {
    this.workoutState = 'overview';
    this.cdr.markForCheck();
  }

  async logout(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Conferma',
      message: 'Vuoi davvero disconnetterti?',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        { 
          text: 'Esci', 
          role: 'destructive',
          handler: () => {
            this.authService.logout();
          }
        }
      ]
    });
    await alert.present();
  }
}
