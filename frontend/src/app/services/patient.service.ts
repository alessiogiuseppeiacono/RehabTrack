import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
  is_completed_today?: boolean;
  last_completed_at?: string;
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

export interface SessionLogResponse {
  id: number;
  card_id: number;
  patient_id: number;
  completed_at: string;
  duration_seconds: number;
  pain_level: number | null;
  patient_notes: string;
  photo_base64: string | null;
  card_title: string;
}

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/patient`;

  getTodayCard(): Observable<TodayCardResponse> {
    return this.http.get<TodayCardResponse>(`${this.baseUrl}/today-card`);
  }

  saveSessionLog(logData: { card_id: number; duration_seconds: number; pain_level?: number; patient_notes?: string; photo_file?: Blob | File }): Observable<any> {
    if (logData.photo_file) {
      const formData = new FormData();
      formData.append('card_id', String(logData.card_id));
      formData.append('duration_seconds', String(logData.duration_seconds));
      if (logData.pain_level !== undefined && logData.pain_level !== null) {
        formData.append('pain_level', String(logData.pain_level));
      }
      if (logData.patient_notes) {
        formData.append('patient_notes', logData.patient_notes);
      }
      // Il nome del parametro 'photo_file' DEVE combaciare con upload.single('photo_file')
      formData.append('photo_file', logData.photo_file, 'diary.jpg');
      
      console.log("FormData photo_file pronto:", !!formData.get('photo_file'));
      return this.http.post(`${this.baseUrl}/session-logs`, formData);
    } else {
      // Fallback a JSON se non c'è la foto
      const payload: any = {
        card_id: logData.card_id,
        duration_seconds: logData.duration_seconds,
        pain_level: logData.pain_level,
        patient_notes: logData.patient_notes
      };
      return this.http.post(`${this.baseUrl}/session-logs`, payload);
    }
  }

  getSessionLogs(): Observable<SessionLogResponse[]> {
    return this.http.get<SessionLogResponse[]>(`${this.baseUrl}/session-logs`);
  }

  deleteSessionLog(logId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/session-logs/${logId}`);
  }
}
