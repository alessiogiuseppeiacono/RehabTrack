// TASK-303: Dashboard Desktop Fisioterapista — layout master-detail.
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonIcon, IonSpinner, IonText,
  IonSearchbar, IonChip, IonLabel, IonNote,
  IonBadge, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonList
} from '@ionic/angular';
import { finalize } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  peopleOutline, personOutline, logOutOutline,
  addCircleOutline, analyticsOutline, alertCircleOutline,
  bodyOutline, calendarOutline, heartOutline, timeOutline,
  chevronForwardOutline, pulseOutline
} from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { TherapistService, Patient, PatientLog } from '../services/therapist.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonIcon, IonSpinner, IonText,
    IonSearchbar, IonChip, IonLabel, IonNote,
    IonBadge, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonList
  ],
})
export class DashboardPage implements OnInit {
  private readonly therapistService = inject(TherapistService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  // TASK-303: stato lista pazienti
  patients: Patient[] = [];
  filteredPatients: Patient[] = [];
  loadingPatients = true;
  patientsError: string | null = null;

  // TASK-303: paziente selezionato e relativi log
  selectedPatient: Patient | null = null;
  patientLogs: PatientLog[] = [];
  loadingLogs = false;
  logsError: string | null = null;

  // TASK-303: filtro ricerca
  searchQuery = '';

  constructor() {
    addIcons({
      peopleOutline, personOutline, logOutOutline,
      addCircleOutline, analyticsOutline, alertCircleOutline,
      bodyOutline, calendarOutline, heartOutline, timeOutline,
      chevronForwardOutline, pulseOutline
    });
  }

  ngOnInit(): void {
    this.loadPatients();
  }

  // TASK-303: carica lista pazienti dal backend
  loadPatients(): void {
    this.loadingPatients = true;
    this.patientsError = null;
    this.therapistService.getPatients()
      .pipe(finalize(() => {
        this.loadingPatients = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (patients) => {
          this.patients = patients;
          this.filteredPatients = patients;
        },
        error: (err) => {
          this.patientsError = err?.error?.error || err?.message || 'Errore nel caricamento dei pazienti';
        },
      });
  }

  // TASK-303: filtro ricerca in tempo reale sulla lista locale
  onSearch(event: CustomEvent): void {
    const q = (event.detail.value ?? '').toLowerCase().trim();
    this.searchQuery = q;
    this.filteredPatients = q
      ? this.patients.filter(p =>
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
          (p.pathology ?? '').toLowerCase().includes(q)
        )
      : this.patients;
    this.cdr.detectChanges();
  }

  // TASK-303: selezione paziente → carica log
  selectPatient(patient: Patient): void {
    this.selectedPatient = patient;
    this.patientLogs = [];
    this.logsError = null;
    this.loadingLogs = true;
    this.therapistService.getPatientLogs(patient.id)
      .pipe(finalize(() => {
        this.loadingLogs = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (logs) => { this.patientLogs = logs; },
        error: (err) => {
          this.logsError = err?.error?.error || err?.message || 'Errore nel caricamento dei log';
        },
      });
  }

  // TASK-303: pain_level > 7 → evidenziazione critica (usato nel template)
  isPainCritical(level: number | null): boolean {
    return level !== null && level > 7;
  }

  // TASK-303: formatta secondi in mm:ss leggibile
  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }

  // TASK-303: logout — pulisce token e torna al login
  logout(): void {
    this.authService.logout();
  }
}
