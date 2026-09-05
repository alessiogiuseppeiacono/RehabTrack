import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

export interface Card {
  id: number;
  patient_id: number;
  therapist_id: number;
  title: string;
  created_at: string;
}

export interface TodayCardResponse {
  card: Card | null;
  exercises: Exercise[];
}

export interface SessionLog {
  card_id: number;
  // TASK-403: durata in secondi inviata dal timer di sessione
  duration_seconds: number;
  // TASK-404 (prossimo sprint): feedback dolore 1-10 dal form di fine sessione
  pain_level?: number;
  patient_notes?: string;
}

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/patient';

  getTodayCard(): Observable<TodayCardResponse> {
    return this.http.get<TodayCardResponse>(`${this.baseUrl}/today-card`);
  }

  saveSessionLog(log: SessionLog): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/session-logs`, log);
  }
}
