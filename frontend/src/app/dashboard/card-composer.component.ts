// TASK-304: CardComposerComponent — modale compositore schede esercizi.
// Standalone, si apre dalla dashboard al click "+ Nuova Scheda".
import {
  Component, inject, Input, Output, EventEmitter,
  ChangeDetectorRef, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
  IonButton, IonButtons, IonIcon, IonSpinner,
  IonItem, IonLabel, IonInput, IonTextarea,
  ToastController,
  IonCard, IonCardContent
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, addOutline, trashOutline, barbellOutline } from 'ionicons/icons';
import { TherapistService, CardPayload, Patient } from '../services/therapist.service';

@Component({
  selector: 'app-card-composer',
  templateUrl: 'card-composer.component.html',
  styleUrls: ['card-composer.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
    IonButton, IonButtons, IonIcon, IonSpinner,
    IonItem, IonLabel, IonInput, IonTextarea,
    IonCard, IonCardContent
  ],
})
export class CardComposerComponent implements OnInit {
  // TASK-304: paziente a cui assegnare la scheda (passato dalla dashboard)
  @Input() patient!: Patient;
  // TASK-304: emette la card creata verso la dashboard per aggiornare la view
  @Output() cardCreated = new EventEmitter<void>();
  @Output() dismissed = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly therapistService = inject(TherapistService);
  private readonly toastCtrl = inject(ToastController);
  private readonly cdr = inject(ChangeDetectorRef);

  // TASK-304: stato invio
  saving = false;

  // TASK-304: form reattivo con FormArray esercizi
  form!: FormGroup;

  constructor() {
    addIcons({ closeOutline, addOutline, trashOutline, barbellOutline });
  }

  ngOnInit(): void {
    // TASK-304: inizializza form con almeno 1 esercizio vuoto
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      notes: [''],
      exercises: this.fb.array([this.buildExerciseGroup()])
    });
  }

  // TASK-304: getter comodo per il FormArray nel template
  get exercises(): FormArray {
    return this.form.get('exercises') as FormArray;
  }

  // TASK-304: costruisce un FormGroup per un singolo esercizio
  private buildExerciseGroup(): FormGroup {
    return this.fb.group({
      name:             ['', Validators.required],
      sets:             [3,  [Validators.required, Validators.min(1)]],
      reps_or_duration: ['10', Validators.required],
      rest_seconds:     [60, [Validators.required, Validators.min(0)]],
      posture_notes:    ['']
    });
  }

  addExercise(): void {
    this.exercises.push(this.buildExerciseGroup());
  }

  removeExercise(index: number): void {
    // TASK-304: non rimuovere l'ultimo esercizio (il backend richiede almeno 1)
    if (this.exercises.length > 1) {
      this.exercises.removeAt(index);
    }
  }

  // TASK-304: il bottone Salva è disabilitato se form invalido, nessun esercizio o invio in corso
  get canSubmit(): boolean {
    return this.form.valid && this.exercises.length > 0 && !this.saving;
  }

  async submit(): Promise<void> {
    if (!this.canSubmit) return;

    this.saving = true;
    this.cdr.detectChanges();

    // TASK-304: costruisce il payload esatto atteso da therapistControllers.createCard()
    // ponytail: FormGroup.value è intrinsecamente untyped ({[key: string]: any}), cast inevitabile
    const payload: CardPayload = {
      patient_id: this.patient.id,
      title: this.form.value.title.trim(),
      exercises: this.form.value.exercises.map((ex: any, i: number) => ({
        name:             ex.name.trim(),
        sets:             Number(ex.sets),
        reps_or_duration: String(ex.reps_or_duration).trim(),
        rest_seconds:     Number(ex.rest_seconds),
        posture_notes:    ex.posture_notes?.trim() || '',
        order_index:      i + 1
      }))
    };

    this.therapistService.createCard(payload).subscribe({
      next: async () => {
        this.saving = false;
        const toast = await this.toastCtrl.create({
          message: 'Scheda creata e assegnata con successo!',
          duration: 3000,
          color: 'success',
          position: 'top',
          icon: 'barbell-outline'
        });
        await toast.present();
        // TASK-304: notifica la dashboard di ricaricare i log e chiude il modale
        this.cardCreated.emit();
      },
      error: async (err) => {
        this.saving = false;
        this.cdr.detectChanges();
        const msg = err?.error?.error || err?.message || 'Errore nella creazione della scheda';
        const toast = await this.toastCtrl.create({
          message: msg,
          duration: 4000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    });
  }

  dismiss(): void {
    this.dismissed.emit();
  }
}
