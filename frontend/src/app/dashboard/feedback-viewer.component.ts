// TASK-305: FeedbackViewerComponent — modale feedback dolore & diario posturale.
// Si apre dalla dashboard al click "Vedi Feedback & Diario".
import { Component, inject, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonList, IonItem, IonLabel, IonBadge, IonText, IonSpinner, IonImg,
  AlertController
} from '@ionic/angular';
import { finalize } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  closeOutline, heartOutline, timeOutline, calendarOutline,
  alertCircleOutline, cameraOutline, imagesOutline, trashOutline
} from 'ionicons/icons';
import { TherapistService, PatientLog, Patient } from '../services/therapist.service';
import { PatientService } from '../services/patient.service';

@Component({
  selector: 'app-feedback-viewer',
  templateUrl: 'feedback-viewer.component.html',
  styleUrls: ['feedback-viewer.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonList, IonItem, IonLabel, IonBadge, IonText, IonSpinner, IonImg
  ],
})

export class FeedbackViewerComponent implements OnInit {
  @Input() patient!: Patient;
  @Output() dismissed = new EventEmitter<void>();

  private readonly therapistService = inject(TherapistService);
  private readonly patientService = inject(PatientService);
  private readonly alertCtrl = inject(AlertController);
  private readonly cdr = inject(ChangeDetectorRef);

  // TASK-305: log sessioni caricati dal backend
  logs: PatientLog[] = [];
  loading = true;
  error: string | null = null;

  constructor() {
    addIcons({ closeOutline, heartOutline, timeOutline, calendarOutline, alertCircleOutline, cameraOutline, imagesOutline, trashOutline });
  }

  ngOnInit(): void {
    // TASK-305: riusa getPatientLogs — nessuna nuova API necessaria
    this.therapistService.getPatientLogs(this.patient.id)
      .pipe(finalize(() => { this.loading = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (logs) => { this.logs = logs; },
        error: (err) => { this.error = err?.error?.error || err?.message || 'Errore caricamento feedback'; },
      });
  }

  // TASK-305: colore badge dolore a 3 livelli (basso/medio/critico)
  painColor(level: number | null): string {
    if (level === null) return 'medium';
    if (level <= 4) return 'success';
    if (level <= 7) return 'warning';
    return 'danger';
  }

  // TASK-305: media dolore su sessioni con pain_level valorizzato
  get avgPain(): string {
    const withPain = this.logs.filter(l => l.pain_level !== null);
    if (!withPain.length) return '—';
    const avg = withPain.reduce((s, l) => s + l.pain_level!, 0) / withPain.length;
    return avg.toFixed(1);
  }

  // TASK-305: conteggio sessioni critiche (pain_level > 7)
  get criticalCount(): number {
    return this.logs.filter(l => l.pain_level !== null && l.pain_level > 7).length;
  }

  // TASK-305: formatta secondi in mm:ss
  formatDuration(s: number): string {
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  async confirmDeleteLog(logId: number, event: Event): Promise<void> {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Conferma eliminazione',
      message: 'Sei sicuro di voler eliminare questa sessione di allenamento e la relativa foto?',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina',
          role: 'destructive',
          handler: () => {
            this.patientService.deleteSessionLog(logId).subscribe({
              next: () => {
                this.logs = this.logs.filter(l => l.id !== logId);
                this.cdr.detectChanges();
              },
              error: (err) => console.error('Errore eliminazione sessione', err),
            });
          },
        },
      ],
    });
    await alert.present();
  }

  dismiss(): void { this.dismissed.emit(); }
}
