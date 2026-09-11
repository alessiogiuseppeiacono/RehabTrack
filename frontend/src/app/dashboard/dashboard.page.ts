// TASK-303: Dashboard Desktop Fisioterapista — layout master-detail.
// TASK-304: integrato CardComposerComponent (modale compositore schede).
// TASK-305: sezione schede assegnate + modale feedback dolore & diario posturale.
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonIcon, IonSpinner, IonText,
  IonSearchbar, IonChip, IonLabel, IonNote,
  IonBadge, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonList, IonModal, IonButtons, IonBackButton,
  AlertController, ToastController
} from '@ionic/angular';
import { finalize } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  peopleOutline, personOutline, logOutOutline,
  addCircleOutline, analyticsOutline, alertCircleOutline,
  bodyOutline, calendarOutline, heartOutline, timeOutline,
  chevronForwardOutline, pulseOutline, layersOutline, fitnessOutline,
  barbellOutline, trashOutline, createOutline, saveOutline,
  personAddOutline, personRemoveOutline
} from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { TherapistService, Patient, PatientLog, PatientCard, CardDetailsResponse } from '../services/therapist.service';
import { CardComposerComponent } from './card-composer.component';
import { FeedbackViewerComponent } from './feedback-viewer.component';

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
    IonItem, IonList, IonModal, IonButtons, IonBackButton,
    CardComposerComponent,
    FeedbackViewerComponent
  ],
})
export class DashboardPage implements OnInit {
  private readonly therapistService = inject(TherapistService);
  private readonly authService = inject(AuthService);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);
  private readonly router = inject(Router);
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

  // TASK-304: controllo visibilità modale compositore
  showComposer = false;

  // TASK-305: schede assegnate al paziente selezionato
  patientCards: PatientCard[] = [];
  loadingCards = false;
  cardsError: string | null = null;

  // TASK-305: controllo visibilità modale feedback & diario
  showFeedback = false;

  // Modifica scheda: dati per il composer in edit mode
  editCardData: CardDetailsResponse | null = null;

  constructor() {
    addIcons({
      peopleOutline, personOutline, logOutOutline,
      addCircleOutline, analyticsOutline, alertCircleOutline,
      bodyOutline, calendarOutline, heartOutline, timeOutline,
      chevronForwardOutline, pulseOutline, layersOutline, fitnessOutline,
      barbellOutline, trashOutline, createOutline, saveOutline,
      personAddOutline, personRemoveOutline
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

  // TASK-303: selezione paziente → carica log e schede
  selectPatient(patient: Patient): void {
    this.selectedPatient = patient;
    this.patientLogs = [];
    this.patientCards = [];
    this.logsError = null;
    this.cardsError = null;
    this.showComposer = false;
    this.showFeedback = false;
    this.loadingLogs = true;
    this.loadingCards = true;
    // TASK-305: carica log e schede in parallelo
    this.therapistService.getPatientLogs(patient.id)
      .pipe(finalize(() => { this.loadingLogs = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (logs) => { this.patientLogs = logs; },
        error: (err) => { this.logsError = err?.error?.error || err?.message || 'Errore log'; },
      });
    this.therapistService.getPatientCards(patient.id)
      .pipe(finalize(() => { this.loadingCards = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (cards) => { this.patientCards = cards; },
        error: (err) => { this.cardsError = err?.error?.error || err?.message || 'Errore caricamento schede'; },
      });
  }

  // TASK-304: apre il modale compositore schede (creazione)
  openComposer(): void {
    this.editCardData = null;
    this.showComposer = true;
    this.cdr.detectChanges();
  }

  // Apre il modale compositore in modalità modifica
  openEditCard(card: PatientCard): void {
    this.therapistService.getCardDetails(card.id).subscribe({
      next: (details) => {
        this.editCardData = details;
        this.showComposer = true;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Errore caricamento dettagli scheda', err)
    });
  }

  // Conferma ed elimina scheda
  async confirmDeleteCard(card: PatientCard): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Conferma eliminazione',
      message: `Sei sicuro di voler eliminare la scheda "${card.title}"? Gli esercizi associati verranno rimossi.`,
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina',
          role: 'destructive',
          handler: () => {
            this.therapistService.deleteCard(card.id).subscribe({
              next: () => {
                if (this.selectedPatient) {
                  this.selectPatient(this.selectedPatient);
                }
                this.toastCtrl.create({
                  message: 'Elemento eliminato',
                  duration: 2000,
                  color: 'dark'
                }).then(t => t.present());
              },
              error: (err) => {
                console.error('Errore eliminazione scheda', err);
                this.toastCtrl.create({
                  message: err?.error?.error || 'Errore durante l\'eliminazione',
                  duration: 3000,
                  color: 'danger'
                }).then(t => t.present());
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  // TASK-304: scheda creata/aggiornata → chiude modale, ricarica schede e log
  onCardCreated(): void {
    this.showComposer = false;
    this.editCardData = null;
    if (this.selectedPatient) {
      this.selectPatient(this.selectedPatient);
    }
  }

  // TASK-305: apre modale feedback & diario
  openFeedback(): void {
    this.showFeedback = true;
    this.cdr.detectChanges();
  }

  // Sprint Finale: colore badge dolore a 3 livelli (allineato a FeedbackViewerComponent)
  painColor(level: number | null): string {
    if (level === null) return 'medium';
    if (level <= 4) return 'success';
    if (level <= 7) return 'warning';
    return 'danger';
  }

  // TASK-303: formatta secondi in mm:ss leggibile
  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }

  navigateToCard(cardId: number): void {
    this.router.navigate(['/dashboard/card', cardId]);
  }

  // TASK-303: logout — pulisce token e torna al login
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

  async promptAddPatient(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Aggiungi Paziente',
      message: 'Inserisci l\'email del paziente da associare',
      inputs: [{ name: 'email', type: 'email', placeholder: 'Email paziente' }],
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Associa',
          handler: (data) => {
            if (data.email) {
              this.therapistService.assignPatientByEmail(data.email).subscribe({
                next: () => this.loadPatients(),
                error: (err) => {
                  console.error('Errore associazione paziente', err);
                  const errorMsg = err?.status === 404 ? 'Utente non presente' : (err?.error?.error || 'Errore di rete');
                  this.toastCtrl.create({
                    message: errorMsg,
                    duration: 3000,
                    color: 'danger'
                  }).then(t => t.present());
                }
              });
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async promptUnassignPatient(patient: Patient, event: Event): Promise<void> {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Dissocia Paziente',
      message: `Sei sicuro di voler dissociare ${patient.first_name} ${patient.last_name}?`,
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Dissocia',
          role: 'destructive',
          handler: () => {
            this.therapistService.unassignPatient(patient.id).subscribe({
              next: () => {
                if (this.selectedPatient?.id === patient.id) {
                  this.selectedPatient = null;
                }
                this.loadPatients();
                this.toastCtrl.create({
                  message: 'Paziente dissociato',
                  duration: 2000,
                  color: 'dark'
                }).then(t => t.present());
              },
              error: (err) => {
                console.error('Errore dissociazione paziente', err);
                this.toastCtrl.create({
                  message: err?.error?.error || 'Errore di rete',
                  duration: 3000,
                  color: 'danger'
                }).then(t => t.present());
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async promptEditClinicalNotes(): Promise<void> {
    if (!this.selectedPatient) return;
    const patient = this.selectedPatient;
    const alert = await this.alertCtrl.create({
      header: 'Note Cliniche',
      inputs: [
        { name: 'condition', type: 'text', placeholder: 'Patologia/Condizione', value: patient.pathology },
        { name: 'notes', type: 'textarea', placeholder: 'Note cliniche', value: patient.clinical_notes }
      ],
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Salva',
          handler: (data) => {
            this.therapistService.updatePatientClinicalNotes(patient.id, data).subscribe({
              next: (updatedPatient) => {
                this.selectedPatient = updatedPatient;
                const idx = this.patients.findIndex(p => p.id === updatedPatient.id);
                if (idx > -1) {
                  this.patients[idx] = updatedPatient;
                  // Aggiorna anche filteredPatients
                  const fIdx = this.filteredPatients.findIndex(p => p.id === updatedPatient.id);
                  if (fIdx > -1) this.filteredPatients[fIdx] = updatedPatient;
                }
                this.cdr.detectChanges();
                this.toastCtrl.create({
                  message: 'Note cliniche aggiornate',
                  duration: 2000,
                  color: 'success'
                }).then(t => t.present());
              },
              error: (err) => {
                console.error('Errore aggiornamento note', err);
                this.toastCtrl.create({
                  message: err?.error?.error || 'Errore durante il salvataggio',
                  duration: 3000,
                  color: 'danger'
                }).then(t => t.present());
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }
}
