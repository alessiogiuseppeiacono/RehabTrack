/**
 * Client HTTP per le API del fisioterapista.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Patient {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  pathology: string | null;
  clinical_notes?: string | null;
  therapist_id: number | null;
  created_at: string;
}

export interface TherapistCard {
  id: number;
  patient_id: number;
  therapist_id: number;
  title: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface PatientCard extends TherapistCard {
  exercise_count: number;
}

export interface PatientLog {
  id: number;
  card_id: number;
  patient_id: number;
  card_title: string;
  pain_level: number | null;
  patient_notes: string | null;
  duration_seconds: number;
  completed_at: string;
  photo_base64?: string | null;
}

export interface CardExercisePayload {
  name: string;
  sets: number;
  reps_or_duration: string;
  rest_seconds: number;
  posture_notes?: string;
}

export interface CardPayload {
  patient_id: number;
  title: string;
  start_date?: string;
  end_date?: string;
  exercises: CardExercisePayload[];
}

export interface CreateCardResponse {
  card: TherapistCard;
  exerciseIds: number[];
}

export interface Exercise {
  id: number;
  card_id: number;
  name: string;
  sets: number;
  reps_or_duration: string;
  rest_seconds: number;
  posture_notes: string;
  order_index: number;
}

export interface CardDetailsResponse {
  card: TherapistCard;
  exercises: Exercise[];
}

@Injectable({ providedIn: 'root' })
export class TherapistService {
  private readonly http = inject(HttpClient);
  // Usa URL assoluto per prevenire "Invalid base URL" crash in Capacitor
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

  /** POST /api/therapist/cards — crea scheda con N esercizi per un paziente */
  createCard(payload: CardPayload): Observable<CreateCardResponse> {
    return this.http.post<CreateCardResponse>(`${this.baseUrl}/cards`, payload);
  }

  /** PUT /api/therapist/cards/:id — aggiorna scheda ed esercizi */
  updateCard(cardId: number, data: any): Observable<CardDetailsResponse> {
    return this.http.put<CardDetailsResponse>(`${this.baseUrl}/cards/${cardId}`, data);
  }

  /** DELETE /api/therapist/cards/:id — elimina scheda */
  deleteCard(cardId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/cards/${cardId}`);
  }

  /** GET /api/therapist/patients/:id/cards — schede assegnate con conteggio esercizi */
  getPatientCards(patientId: number): Observable<PatientCard[]> {
    return this.http.get<PatientCard[]>(`${this.baseUrl}/patients/${patientId}/cards`);
  }

  /** GET /api/therapist/cards/:id — Recupera i dettagli di una scheda e dei suoi esercizi */
  getCardDetails(cardId: number): Observable<CardDetailsResponse> {
    return this.http.get<CardDetailsResponse>(`${this.baseUrl}/cards/${cardId}`);
  }

  /** GET /api/therapist/exercises — lista esercizi disponibili nel DB */
  getAvailableExercises(): Observable<{ name: string }[]> {
    return this.http.get<{ name: string }[]>(`${this.baseUrl}/exercises`);
  }

  /** POST /api/therapist/assign-patient — associa un paziente via email */
  assignPatientByEmail(email: string): Observable<Patient> {
    return this.http.post<Patient>(`${this.baseUrl}/assign-patient`, { email });
  }

  /** DELETE /api/therapist/patients/:id/unassign — dissocia un paziente */
  unassignPatient(patientId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/patients/${patientId}/unassign`);
  }

  /** PUT /api/therapist/patients/:id/notes — aggiorna patologia e note cliniche */
  updatePatientClinicalNotes(patientId: number, data: { condition?: string; notes?: string }): Observable<Patient> {
    return this.http.put<Patient>(`${this.baseUrl}/patients/${patientId}/notes`, data);
  }
}
