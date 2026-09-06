import { Component, OnDestroy } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular';
import * as L from 'leaflet';
import { Geolocation } from '@capacitor/geolocation';

// TASK-503: fix icone Leaflet mancanti in build webpack/esbuild.
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

// TASK-503: coordinate centro di riferimento (Palermo)
const PALERMO: L.LatLngExpression = [38.1157, 13.3615];

@Component({
  selector: 'app-tab3',
  standalone: true,
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class Tab3Page implements OnDestroy {

  private map: L.Map | null = null;

  // TASK-503: ionViewDidEnter garantisce che il div #map sia nel DOM
  ionViewDidEnter(): void {
    if (this.map) {
      // TASK-504: ritorno sulla tab — aggiorna solo le dimensioni
      this.map.invalidateSize();
      return;
    }

    this.map = L.map('map', {
      center: PALERMO,
      zoom: 13,
    });

    // TASK-503: layer OpenStreetMap standard
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    // TASK-503: marker fisso per il centro di riabilitazione (fallback sempre visibile)
    L.marker(PALERMO)
      .addTo(this.map)
      .bindPopup('Centro di Riabilitazione')
      .openPopup();

    // TASK-503: invalidateSize risolve tile grigi al primo render
    setTimeout(() => {
      this.map?.invalidateSize();
      // TASK-504: tenta la geolocalizzazione dopo che la mappa è stabile
      this.locateUser();
    }, 200);
  }

  // TASK-504: acquisisce la posizione GPS e centra la mappa sull'utente.
  // Fallback silenzioso su Palermo in caso di errore/permesso negato.
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

      // TASK-504: centra la mappa sulla posizione rilevata con zoom ravvicinato
      this.map.setView([lat, lng], 15);

      // TASK-504: marker posizione utente
      L.marker([lat, lng])
        .addTo(this.map)
        .bindPopup('La tua posizione')
        .openPopup();

      // TASK-504: cerchio di accuratezza GPS (raggio in metri)
      L.circle([lat, lng], {
        radius: accuracy,
        color: 'var(--ion-color-primary, #3880ff)',
        fillOpacity: 0.15,
        weight: 1,
      }).addTo(this.map);

    } catch (e) {
      // TASK-504: permesso negato, timeout o errore browser — UI intatta su Palermo
      console.warn('TASK-504: geolocalizzazione non disponibile, uso fallback Palermo', e);
    }
  }

  // TASK-503: pulizia per evitare "Map container is already initialized"
  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
  }
}
