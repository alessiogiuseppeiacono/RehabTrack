import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonGrid, IonRow, IonCol, IonImg,
  IonFab, IonFabButton, IonIcon,
  IonButton, IonModal, IonSegment, IonSegmentButton, IonLabel,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonBadge, IonRefresher, IonRefresherContent, IonSpinner, IonText,
  IonSearchbar, IonChip,
  AlertController, ToastController
} from '@ionic/angular';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { addIcons } from 'ionicons';
import { camera, trashOutline, closeOutline, documentTextOutline, searchOutline, logOutOutline } from 'ionicons/icons';
import { PatientService, SessionLogResponse } from '../services/patient.service';
import { AuthService } from '../services/auth.service';
import { finalize } from 'rxjs';

// TASK-502: chiave localStorage per la persistenza della galleria posturale
const STORAGE_KEY = 'rehabtrack_photos';

@Component({
  selector: 'app-tab2',
  standalone: true,
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
    IonGrid, IonRow, IonCol, IonImg,
    IonFab, IonFabButton, IonIcon,
    IonButton, IonModal, IonSegment, IonSegmentButton, IonLabel,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonBadge, IonRefresher, IonRefresherContent, IonSpinner, IonText,
    IonSearchbar, IonChip
  ],
  providers: [DatePipe]
})
export class Tab2Page implements OnInit, ViewWillEnter {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);

  currentSegment: 'sessions' | 'photos' = 'sessions';
  allSessionLogs: SessionLogResponse[] = [];
  sessionLogs: SessionLogResponse[] = [];
  loadingLogs = false;

  searchQuery = '';
  activeFilter: 'all' | 'mild' | 'moderate' | 'intense' | 'notes' = 'all';

  // TASK-502: array foto (DataUrl); caricato da localStorage all'avvio
  photos: string[] = [];

  // TASK-502: foto selezionata per l'anteprima full-screen
  selectedPhoto: string | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private patientService: PatientService
  ) {
    // TASK-502: 'camera' (solid) usato nel FAB per massima visibilità
    addIcons({ camera, trashOutline, closeOutline, documentTextOutline, searchOutline, logOutOutline });
  }

  // TASK-502: ricarica la galleria dal localStorage all'inizializzazione
  ngOnInit(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.photos = JSON.parse(stored);
      } catch {
        this.photos = [];
      }
    }
  }

  ionViewWillEnter(): void {
    this.loadSessionLogs();
  }

  segmentChanged(event: any): void {
    this.currentSegment = event.detail.value;
    this.cdr.detectChanges();
  }

  loadSessionLogs(event?: any): void {
    if (!event) this.loadingLogs = true;
    
    this.patientService.getSessionLogs().pipe(
      finalize(() => {
        this.loadingLogs = false;
        if (event) {
          event.target.complete();
        }
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (logs) => {
        this.allSessionLogs = logs;
        this.applyFilters();
      },
      error: (err) => {
        console.error('Errore nel recupero dei log di sessione', err);
      }
    });
  }

  onSearchChange(event: any): void {
    this.searchQuery = event.detail.value || '';
    this.applyFilters();
  }

  setFilter(filter: 'all' | 'mild' | 'moderate' | 'intense' | 'notes'): void {
    this.activeFilter = filter;
    this.applyFilters();
  }

  applyFilters(): void {
    const query = this.searchQuery.toLowerCase().trim();

    this.sessionLogs = this.allSessionLogs.filter(log => {
      // 1. Text search on title and notes
      const titleMatch = log.card_title?.toLowerCase().includes(query) ?? false;
      const notesMatch = log.patient_notes?.toLowerCase().includes(query) ?? false;
      if (query && !titleMatch && !notesMatch) {
        return false;
      }

      // 2. Chip filter
      if (this.activeFilter === 'mild') {
        if (log.pain_level === null || log.pain_level > 3) return false;
      } else if (this.activeFilter === 'moderate') {
        if (log.pain_level === null || log.pain_level < 4 || log.pain_level > 6) return false;
      } else if (this.activeFilter === 'intense') {
        if (log.pain_level === null || log.pain_level < 7) return false;
      } else if (this.activeFilter === 'notes') {
        if (!log.patient_notes || log.patient_notes.trim() === '') return false;
      }

      return true;
    });

    this.cdr.detectChanges();
  }

  getPainColor(level: number | null): string {
    if (level === null) return 'medium';
    if (level <= 3) return 'success';
    if (level <= 6) return 'warning';
    return 'danger';
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m} min ${s} sec`;
    return `${s} sec`;
  }

  // TASK-502: scatto/selezione foto — platform-first:
  // su browser desktop bypassa Camera.getPhoto() e va diretto al file picker
  async takePicture(): Promise<void> {
    console.log('FAB cliccato');
    if (!Capacitor.isNativePlatform()) {
      // Su browser desktop esegui subito il fallback
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
        this.photos.unshift(image.dataUrl);
        this.persist();
        this.cdr.detectChanges();
      }
    } catch (e) {
      console.warn('Camera nativa annullata o fallita, provo fallback', e);
      this.openFilePicker();
    }
  }

  // TASK-502: fallback per ambienti non nativi (browser desktop)
  private openFilePicker(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        this.photos.unshift(dataUrl);
        this.persist();
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  // TASK-502: eliminazione foto per indice con aggiornamento persistenza
  deletePhoto(index: number): void {
    this.photos.splice(index, 1);
    this.persist();
    this.cdr.detectChanges();
  }

  // TASK-502: apertura modal preview full-screen
  openPreview(photo: string): void {
    this.selectedPhoto = photo;
    this.cdr.detectChanges();
  }

  // TASK-502: chiusura modal preview
  closePreview(): void {
    this.selectedPhoto = null;
    this.cdr.detectChanges();
  }

  // TASK-502: salva l'array aggiornato in localStorage
  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.photos));
  }

  async confirmDeleteLog(logId: number): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Conferma eliminazione',
      message: 'Sei sicuro di voler eliminare questa sessione?',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina',
          role: 'destructive',
          handler: () => {
            this.patientService.deleteSessionLog(logId).subscribe({
              next: async () => {
                this.allSessionLogs = this.allSessionLogs.filter(l => l.id !== logId);
                this.applyFilters();
                const toast = await this.toastCtrl.create({ message: 'Sessione eliminata', duration: 2000, color: 'success' });
                await toast.present();
              },
              error: (err) => console.error('Errore eliminazione sessione', err),
            });
          },
        },
      ],
    });
    await alert.present();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
