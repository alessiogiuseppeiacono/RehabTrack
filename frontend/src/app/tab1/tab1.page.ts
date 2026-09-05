import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonNote,
  IonSpinner, IonIcon, IonChip, IonText
} from '@ionic/angular';
import { finalize } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  barbellOutline, timerOutline, repeatOutline,
  documentTextOutline, fitnessOutline, alertCircleOutline
} from 'ionicons/icons';
import { PatientService, Card, Exercise } from '../services/patient.service';
import { TimerComponent } from '../components/timer/timer.component';
import { SessionTimerComponent } from '../components/session-timer/session-timer.component';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonNote,
    IonSpinner, IonIcon, IonChip, IonText,
    TimerComponent, SessionTimerComponent
  ],
})
export class Tab1Page implements OnInit {
  private readonly patientService = inject(PatientService);
  private readonly cdr = inject(ChangeDetectorRef);

  card: Card | null = null;
  exercises: Exercise[] = [];
  loading = true;
  error: string | null = null;

  // TASK-403: stato dell'invio del log di fine sessione
  sessionLogState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';

  ngOnInit(): void {
    this.loadTodayCard();
  }

  loadTodayCard(): void {
    this.loading = true;
    this.error = null;
    // finalize(): lo spinner si ferma SEMPRE (successo, errore o handler che fallisce)
    this.patientService.getTodayCard()
      .pipe(finalize(() => {
        this.loading = false;
        // App zoneless (nessun zone.js): forziamo la Change Detection dopo l'async HTTP
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          // TASK-402: assegnazioni difensive se la risposta è vuota/undefined
          this.card = res?.card ?? null;
          this.exercises = res?.exercises ?? [];
        },
        error: (err) => {
          // TASK-402: 404 (nessuna scheda oggi) → stato vuoto, non errore
          if (err?.status === 404) {
            this.card = null;
            this.exercises = [];
          } else {
            this.error = err?.error?.error || err?.message || 'Errore nel caricamento della scheda';
          }
        },
      });
  }

  // TASK-403: al termine del cronometro invia la durata della sessione al backend
  onSessionFinished(durationSeconds: number): void {
    if (!this.card) return;
    this.sessionLogState = 'saving';
    this.patientService.saveSessionLog({ card_id: this.card.id, duration_seconds: durationSeconds }).subscribe({
      // Zoneless: stessa forzatura della Change Detection del caricamento scheda
      next: () => {
        this.sessionLogState = 'saved';
        this.cdr.detectChanges();
      },
      error: () => {
        this.sessionLogState = 'error';
        this.cdr.detectChanges();
      },
    });
  }

  constructor() {
    // Tutte le icone usate nel template vanno registrate qui (vedi alert-circle-outline)
    addIcons({ barbellOutline, timerOutline, repeatOutline, documentTextOutline, fitnessOutline, alertCircleOutline });
  }
}
