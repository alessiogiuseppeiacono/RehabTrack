/** Componente per visualizzare log sessioni e foto del paziente. */
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

  logs: PatientLog[] = [];
  loading = true;
  error: string | null = null;

  constructor() {
    addIcons({ closeOutline, heartOutline, timeOutline, calendarOutline, alertCircleOutline, cameraOutline, imagesOutline, trashOutline });
  }

  ngOnInit(): void {
    this.therapistService.getPatientLogs(this.patient.id)
      .pipe(finalize(() => { this.loading = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (logs) => { this.logs = logs; },
        error: (err) => { this.error = err?.error?.error || err?.message || 'Errore caricamento feedback'; },
      });
  }

  painColor(level: number | null): string {
    if (level === null) return 'medium';
    if (level <= 4) return 'success';
    if (level <= 7) return 'warning';
    return 'danger';
  }

  // Colore esadecimale per la timeline CSS
  getPainHexColor(level: number | null): string {
    if (level === null) return '#92949c';
    if (level <= 4) return '#2dd36f';
    if (level <= 7) return '#ffc409';
    return '#eb445a';
  }

  // Ultime 5 sessioni con dolore, in ordine cronologico (dalla più vecchia alla più recente)
  get painTimelineLogs(): PatientLog[] {
    return [...this.logs]
      .filter(l => l.pain_level !== null)
      .slice(0, 5)
      .reverse();
  }

  get avgPain(): string {
    const withPain = this.logs.filter(l => l.pain_level !== null);
    if (!withPain.length) return '—';
    const avg = withPain.reduce((s, l) => s + l.pain_level!, 0) / withPain.length;
    return avg.toFixed(1);
  }

  get criticalCount(): number {
    return this.logs.filter(l => l.pain_level !== null && l.pain_level > 7).length;
  }

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
