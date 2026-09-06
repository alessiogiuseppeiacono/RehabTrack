import { Component, ChangeDetectorRef } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonGrid, IonRow, IonCol, IonImg } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonGrid, IonRow, IonCol, IonImg]
})
export class Tab2Page {

  // TASK-502: Array per memorizzare le foto
  photos: string[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  // TASK-501: Integrazione servizio fotocamera nativa
  async takePicture() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      if (image.dataUrl) {
        this.photos.unshift(image.dataUrl);
        // Modalità Zoneless: trigger esplicito della Change Detection
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Errore fotocamera:', error);
    }
  }
}
