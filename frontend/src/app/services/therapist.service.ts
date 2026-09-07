// TASK-303: TherapistService — client HTTP per le API del fisioterapista.
// TASK-304: aggiunto createCard().
// Pattern identico a PatientService: inject(HttpClient), URL assoluti, Observable.
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// TASK-303: interfacce allineate alla risposta di User.findPatientsByTherapist()
export interface Patient {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  pathology: string | null;
  therapist_id: number;
  created_at: string;
}

// TASK-303: Card dal backend (cardModel.js — Card.findByPatient)
export interface TherapistCard {
  id: number;
  patient_id: number;
  therapist_id: number;
  title: string;
  created_at: string;
}

// TASK-305: Card con conteggio esercizi (GET /patients/:id/cards JOIN exercises)
export interface PatientCard extends TherapistCard {
  exercise_count: number;
}

// TASK-303: SessionLog dal backend (therapistControllers.js — getPatientLogs JOIN cards)
export interface PatientLog {
  id: number;
  card_id: number;
  patient_id: number;
  card_title: string;
  pain_level: number | null;
  patient_notes: string | null;
  duration_seconds: number;
  completed_at: string;
}

// TASK-304: payload esercizio — campi matching cardModel.js Exercise.createBulk()
export interface CardExercisePayload {
  name: string;
  sets: number;
  reps_or_duration: string;
  rest_seconds: number;
  posture_notes?: string;
}

// TASK-304: payload scheda — matching therapistControllers.js createCard()
export interface CardPayload {
  patient_id: number;
  title: string;
  exercises: CardExercisePayload[];
}

// TASK-304: risposta 201 da POST /api/therapist/cards
export interface CreateCardResponse {
  card: TherapistCard;
  exerciseIds: number[];
}

@Injectable({ providedIn: 'root' })
export class TherapistService {
  private readonly http = inject(HttpClient);
  // TASK-303: URL assoluto — stesso pattern di PatientService (evita crash "Invalid base URL")
  private readonly baseUrl = `${environment.apiUrl}/therapist`;

  /** GET /api/therapist/patients — lista pazienti del terapista autenticato */
  getPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(`${this.baseUrl}/patients`);
  }

  /** GET /api/therapist/patients/:id/logs — storico sessioni di un paziente */
  getPatientLogs(patientId: number): Observable<PatientLog[]> {
    return this.http.get<PatientLog[]>(`${this.baseUrl}/patients/${patientId}/logs`);
  }

  /** POST /api/therapist/patients — crea un nuovo paziente associato al terapista */
  createPatient(data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    pathology?: string;
  }): Observable<Patient> {
    return this.http.post<Patient>(`${this.baseUrl}/patients`, data);
  }

  /** POST /api/therapist/cards — TASK-304: crea scheda con N esercizi per un paziente */
  createCard(payload: CardPayload): Observable<CreateCardResponse> {
    return this.http.post<CreateCardResponse>(`${this.baseUrl}/cards`, payload);
  }

  /** GET /api/therapist/patients/:id/cards — TASK-305: schede assegnate con conteggio esercizi */
  getPatientCards(patientId: number): Observable<PatientCard[]> {
    return this.http.get<PatientCard[]>(`${this.baseUrl}/patients/${patientId}/cards`);
  }
}
