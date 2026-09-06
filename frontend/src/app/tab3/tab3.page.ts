import { Component, OnDestroy } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular';
import * as L from 'leaflet';

// TASK-503: fix icone Leaflet mancanti in build webpack/esbuild.
// Il bundler rinomina i file delle icone rompendo i path di default.
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

  // TASK-503: istanza mappa Leaflet — null finché la view non è entrata
  private map: L.Map | null = null;

  // TASK-503: ionViewDidEnter garantisce che il div #map sia nel DOM
  // (ngAfterViewInit può sparare prima che ion-content sia pronto)
  ionViewDidEnter(): void {
    if (this.map) return; // evita doppia inizializzazione

    this.map = L.map('map', {
      center: PALERMO,
      zoom: 13,
    });

    // TASK-503: layer OpenStreetMap standard
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    // TASK-503: marker fisso per il centro di riabilitazione
    L.marker(PALERMO)
      .addTo(this.map)
      .bindPopup('Centro di Riabilitazione')
      .openPopup();

    // TASK-503: invalidateSize risolve tile grigi quando il container
    // non ha ancora dimensioni definitive al momento dell'init
    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  // TASK-503: pulizia per evitare "Map container is already initialized"
  // al ritorno sulla tab (Ionic riutilizza i componenti)
  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
  }
}
