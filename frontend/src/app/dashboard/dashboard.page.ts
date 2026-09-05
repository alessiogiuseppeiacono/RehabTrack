import { Component } from '@angular/core';
import { IonContent, IonText, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { constructOutline } from 'ionicons/icons';

// FIX: placeholder dashboard — sostituisce il LoginPage caricato erroneamente nella route /dashboard
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [IonContent, IonText, IonIcon],
  template: `
    <ion-content class="ion-padding ion-text-center">
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;gap:1rem;">
        <ion-icon name="construct-outline" style="font-size:4rem;color:var(--ion-color-medium)"></ion-icon>
        <ion-text color="medium">
          <h2>Dashboard Fisioterapista</h2>
          <p>In costruzione — disponibile con TASK-303.</p>
        </ion-text>
      </div>
    </ion-content>
  `,
})
export class DashboardPage {
  constructor() {
    addIcons({ constructOutline });
  }
}
