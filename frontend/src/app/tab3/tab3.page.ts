import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { mapOutline, logOutOutline } from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import * as L from 'leaflet';
import { Geolocation } from '@capacitor/geolocation';

const iconDefault = L.icon({
  iconUrl:      'assets/leaflet/marker-icon.png',
  iconRetinaUrl:'assets/leaflet/marker-icon-2x.png',
  shadowUrl:    'assets/leaflet/marker-shadow.png',
  iconSize:    [25, 41],
  iconAnchor:  [12, 41],
  popupAnchor: [1, -34],
  shadowSize:  [41, 41],
});
L.Marker.prototype.options.icon = iconDefault;

const PALERMO: L.LatLngExpression = [38.1157, 13.3615];

@Component({
  selector: 'app-tab3',
  standalone: true,
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon
  ],
})
export class Tab3Page implements OnInit, OnDestroy {
  private map: L.Map | undefined | null = null;
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);

  constructor() {
    addIcons({ mapOutline, logOutOutline });
  }

  ngOnInit(): void {}

  ionViewDidEnter(): void {
    if (this.map) {
      this.map.invalidateSize();
      return;
    }

    this.map = L.map('map', {
      center: PALERMO,
      zoom: 13,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    L.marker(PALERMO)
      .addTo(this.map)
      .bindPopup('Centro di Riabilitazione')
      .openPopup();

    setTimeout(() => {
      this.map?.invalidateSize();
      this.locateUser();
    }, 200);
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

  private async locateUser(): Promise<void> {
    if (!this.map) return;

    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;

      this.map.setView([lat, lng], 15);

      L.marker([lat, lng])
        .addTo(this.map)
        .bindPopup('La tua posizione')
        .openPopup();

      L.circle([lat, lng], {
        radius: accuracy,
        color: 'var(--ion-color-primary, #3880ff)',
        fillOpacity: 0.15,
        weight: 1,
      }).addTo(this.map);

    } catch (e) {
      console.warn('Geolocalizzazione non disponibile, uso fallback Palermo', e);
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
  }
}
