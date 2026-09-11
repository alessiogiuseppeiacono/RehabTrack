import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonInput, IonButton, IonText, IonSpinner
} from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { addIcons } from 'ionicons';
import { checkmarkOutline, refreshOutline } from 'ionicons/icons';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonInput, IonButton, IonText, IonSpinner,
  ],
})
export class LoginPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  errorMsg = '';
  loading = false;

  constructor() {
    addIcons({ checkmarkOutline, refreshOutline });
  }

  ngOnInit() {
    this.loading = false;
    this.cdr.markForCheck();
  }

  ionViewWillEnter() {
    this.loading = false;
    this.cdr.markForCheck();
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.errorMsg = '';
    this.cdr.markForCheck();
    
    const { email, password } = this.loginForm.getRawValue();

    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading = false;
        this.cdr.markForCheck();
        const role = this.auth.getRole();
        const target = role === 'fisioterapista' ? '/dashboard' : '/tabs/tab1';
        this.router.navigateByUrl(target);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.error || 'Credenziali non valide.';
        this.cdr.markForCheck();
      },
    });
  }
}
