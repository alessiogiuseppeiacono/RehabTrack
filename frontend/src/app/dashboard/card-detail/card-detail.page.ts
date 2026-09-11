import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, 
  IonButtons, IonBackButton, IonList, IonItem, IonLabel, 
  IonBadge, IonIcon, IonSpinner, IonText, IonNote, IonItemDivider
} from '@ionic/angular';
import { TherapistService, CardDetailsResponse } from '../../services/therapist.service';
import { addIcons } from 'ionicons';
import { barbellOutline, timeOutline, alertCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-card-detail',
  templateUrl: './card-detail.page.html',
  styleUrls: ['./card-detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    IonHeader, IonToolbar, IonTitle, IonContent, 
    IonButtons, IonBackButton, IonList, IonItem, IonLabel, 
    IonBadge, IonIcon, IonSpinner, IonText, IonNote, IonItemDivider
  ]
})
export class CardDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private therapistService = inject(TherapistService);
  private cdr = inject(ChangeDetectorRef);

  cardDetails: CardDetailsResponse | null = null;
  loading = true;
  error: string | null = null;

  constructor() {
    addIcons({ barbellOutline, timeOutline, alertCircleOutline });
  }

  ngOnInit() {
    const cardIdParam = this.route.snapshot.paramMap.get('id');
    console.log('CardDetailPage ngOnInit - ID param:', cardIdParam);
    if (cardIdParam) {
      this.loadCardDetails(Number(cardIdParam));
    } else {
      this.loading = false;
      this.error = 'Nessun ID scheda fornito nella rotta';
      this.cdr.detectChanges();
    }
  }

  loadCardDetails(id: number) {
    console.log('CardDetailPage loadCardDetails - fetching ID:', id);
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();
    
    this.therapistService.getCardDetails(id).subscribe({
      next: (res) => {
        console.log('CardDetailPage loadCardDetails - success:', JSON.stringify(res));
        this.cardDetails = res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('CardDetailPage loadCardDetails - error:', err);
        this.error = err?.error?.error || 'Errore nel caricamento della scheda';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
