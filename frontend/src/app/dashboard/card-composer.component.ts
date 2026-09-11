/** Componente standalone per creazione o modifica schede. */
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
import { closeOutline, addOutline, trashOutline, barbellOutline, saveOutline } from 'ionicons/icons';
import { TherapistService, CardPayload, Patient, CardDetailsResponse } from '../services/therapist.service';

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
  @Input() patient!: Patient;
  /** Se valorizzato, il form opera in modalità modifica */
  @Input() editCard: CardDetailsResponse | null = null;
  @Output() cardCreated = new EventEmitter<void>();
  @Output() dismissed = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly therapistService = inject(TherapistService);
  private readonly toastCtrl = inject(ToastController);
  private readonly cdr = inject(ChangeDetectorRef);

  saving = false;
  form!: FormGroup;

  get isEditMode(): boolean {
    return !!this.editCard;
  }

  constructor() {
    addIcons({ closeOutline, addOutline, trashOutline, barbellOutline, saveOutline });
  }

  ngOnInit(): void {
    if (this.editCard) {
      // Modalità modifica: pre-popola dal card esistente
      const c = this.editCard.card;
      this.form = this.fb.group({
        title: [c.title, [Validators.required, Validators.minLength(3)]],
        start_date: [c.start_date || ''],
        end_date: [c.end_date || ''],
        exercises: this.fb.array(
          this.editCard.exercises.map(ex => this.fb.group({
            name:             [ex.name, Validators.required],
            sets:             [ex.sets, [Validators.required, Validators.min(1)]],
            reps_or_duration: [ex.reps_or_duration, Validators.required],
            rest_seconds:     [ex.rest_seconds, [Validators.required, Validators.min(0)]],
            posture_notes:    [ex.posture_notes || '']
          }))
        )
      });
    } else {
      // Modalità creazione
      this.form = this.fb.group({
        title: ['', [Validators.required, Validators.minLength(3)]],
        start_date: [''],
        end_date: [''],
        exercises: this.fb.array([this.buildExerciseGroup()])
      });
    }
  }

  get exercises(): FormArray {
    return this.form.get('exercises') as FormArray;
  }

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
    if (this.exercises.length > 1) {
      this.exercises.removeAt(index);
    }
  }

  get canSubmit(): boolean {
    return this.form.valid && this.exercises.length > 0 && !this.saving;
  }

  async submit(): Promise<void> {
    if (!this.canSubmit) return;

    this.saving = true;
    this.cdr.detectChanges();

    const exercisesPayload = this.form.value.exercises.map((ex: any, i: number) => ({
      name:             ex.name.trim(),
      sets:             Number(ex.sets),
      reps_or_duration: String(ex.reps_or_duration).trim(),
      rest_seconds:     Number(ex.rest_seconds),
      posture_notes:    ex.posture_notes?.trim() || '',
      order_index:      i + 1
    }));

    if (this.isEditMode) {
      // Modalità modifica
      const updateData = {
        title: this.form.value.title.trim(),
        start_date: this.form.value.start_date || null,
        end_date: this.form.value.end_date || null,
        exercises: exercisesPayload
      };
      this.therapistService.updateCard(this.editCard!.card.id, updateData).subscribe({
        next: async () => {
          this.saving = false;
          const toast = await this.toastCtrl.create({
            message: 'Scheda aggiornata con successo!',
            duration: 3000,
            color: 'success',
            position: 'top',
            icon: 'barbell-outline'
          });
          await toast.present();
          this.cardCreated.emit();
        },
        error: async (err) => {
          this.saving = false;
          this.cdr.detectChanges();
          const msg = err?.error?.error || err?.message || 'Errore nell\'aggiornamento della scheda';
          const toast = await this.toastCtrl.create({ message: msg, duration: 4000, color: 'danger', position: 'top' });
          await toast.present();
        }
      });
    } else {
      // Modalità creazione
      const payload: CardPayload = {
        patient_id: this.patient.id,
        title: this.form.value.title.trim(),
        start_date: this.form.value.start_date || undefined,
        end_date: this.form.value.end_date || undefined,
        exercises: exercisesPayload
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
          this.cardCreated.emit();
        },
        error: async (err) => {
          this.saving = false;
          this.cdr.detectChanges();
          const msg = err?.error?.error || err?.message || 'Errore nella creazione della scheda';
          const toast = await this.toastCtrl.create({ message: msg, duration: 4000, color: 'danger', position: 'top' });
          await toast.present();
        }
      });
    }
  }

  dismiss(): void {
    this.dismissed.emit();
  }
}
