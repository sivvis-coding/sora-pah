/**
 * Training proposal entity — anyone proposes, others sign up with availability.
 *
 * Cosmos DB design:
 *   Container: "training-sessions"
 *   Partition key: /id
 */

export type TrainingFormat = 'online' | 'in-person' | 'either';
export type TrainingStatus = 'proposed' | 'scheduled' | 'completed' | 'cancelled';
export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
export type TimeSlot = 'morning' | 'afternoon' | 'all-day';

export interface DayTimeSlot {
  day: WeekDay;
  time: TimeSlot;
}

export interface TrainingAvailability {
  userId: string;
  userName: string;
  slots: DayTimeSlot[];
}

export interface TrainingSession {
  id: string;
  title: string;
  description: string;
  format: TrainingFormat;
  status: TrainingStatus;
  proposedBy: string;
  proposedByName: string;
  attendees: TrainingAvailability[];
  /** Set by admin when scheduling */
  scheduledAt: string | null;
  durationMinutes: number | null;
  link: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
}
