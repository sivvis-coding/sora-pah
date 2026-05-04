import { IsArray, ValidateNested, IsIn, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { WeekDay, TimeSlot, DayTimeSlot } from '../interfaces/training-session.interface';

class DayTimeSlotDto implements DayTimeSlot {
  @IsString()
  @IsIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
  day: WeekDay;

  @IsString()
  @IsIn(['morning', 'afternoon', 'all-day'])
  time: TimeSlot;
}

export class JoinTrainingDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayTimeSlotDto)
  slots: DayTimeSlotDto[];
}
