import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonGrid, IonRow, IonCol, IonImg,
  IonFab, IonFabButton, IonIcon,
  IonButton, IonModal
} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { addIcons } from 'ionicons';
import { camera, trashOutline, closeOutline } from 'ionicons/icons';

// TASK-502: chiave localStorage per la persistenza della galleria posturale
const STORAGE_KEY = 'rehabtrack_photos';

@Component({
  selector: 'app-tab2',
  standalone: true,
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonGrid, IonRow, IonCol, IonImg,
    IonFab, IonFabButton, IonIcon,
    IonButton, IonModal
  ]
})
export class Tab2Page implements OnInit {

  // TASK-502: array foto (DataUrl); caricato da localStorage all'avvio
  photos: string[] = [];

  // TASK-502: foto selezionata per l'anteprima full-screen
  selectedPhoto: string | null = null;

  constructor(private cdr: ChangeDetectorRef) {
    // TASK-502: 'camera' (solid) usato nel FAB per massima visibilità
    addIcons({ camera, trashOutline, closeOutline });
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
}
