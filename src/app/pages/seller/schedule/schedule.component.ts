import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TableModule } from 'primeng/table';
import { BaseIcon } from "primeng/icons/baseicon";
import { ScheduleService } from '../../service/schedule.service';
import { AuthService } from '../../service/auth.service';
import { AvailabilityMap, SellerAvailabilityDto, TimeSlot } from '../../../models/availabilityMap';
import { ToastService } from '../../service/toast.service';

// Representa un día de la semana
interface Day {
  key: string;
  label: string;
}

@Component({
  selector: 'app-schedule',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    ChipModule,
    DialogModule,
    //CalendarModule,
    DatePickerModule,
    MultiSelectModule,
    CheckboxModule,
    RadioButtonModule
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss'
})
export class ScheduleComponent implements OnInit {

  daysOfWeek: Day[] = [
    { key: 'MONDAY', label: 'Lunes' },
    { key: 'TUESDAY', label: 'Martes' },
    { key: 'WEDNESDAY', label: 'Miércoles' },
    { key: 'THURSDAY', label: 'Jueves' },
    { key: 'FRIDAY', label: 'Viernes' },
    { key: 'SATURDAY', label: 'Sábado' },
    { key: 'SUNDAY', label: 'Domingo' }
  ];
  availability: AvailabilityMap = {};
  availabilityMode: 'allDay' | 'schedule' = 'allDay';
  displayDialog = false;
  copyDialogVisible = false;
  currentDayKey = '';
  newSlot: TimeSlot = { start: null, end: null};
  copyTargets: Day[] = [];
  sellerId: string;

  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly authService: AuthService,
    private readonly toastService: ToastService,
  ) {
    this.daysOfWeek.forEach(day => (this.availability[day.key] = []));
    this.sellerId = this.authService.getValueFromToken('userId');
  }

  ngOnInit(): void {
    this.scheduleService.getAvailability(this.sellerId).subscribe({
      next: (response: SellerAvailabilityDto[]) => {
        // 1) Inicializa el mapa con las mismas keys de daysOfWeek
        const map: AvailabilityMap = {};
        this.daysOfWeek.forEach(d => {
          map[d.key] = [];
        });

        let is24H = true;

        // 2) Rellena cada día según el JSON recibido
        response.forEach(item => {
          const dayKey = item.dayOfWeek; // ej. "MONDAY", "THURSDAY", etc.

          // parsea "HH:mm:ss" a Date local
          const [h1, m1, s1] = item.startTime.split(':').map(Number);
          const [h2, m2, s2] = item.endTime.split(':').map(Number);
          const today = new Date();
          const start = new Date(today);
          start.setHours(h1, m1, s1 || 0, 0);
          const end = new Date(today);
          end.setHours(h2, m2, s2 || 0, 0);

          // Añade el slot al día correspondiente
          if (map[dayKey]) {
            map[dayKey].push({ start, end });
          }

          is24H = is24H && item.startTime == '00:00:00' && item.endTime == '23:59:00';

        });

        this.availabilityMode = is24H && response.length == 7 ? 'allDay' : 'schedule';

        // 3) Asigna al estado del componente
        this.availability = map;
      },
      error: err => {
        console.error('Error cargando disponibilidad', err);
      }
    });
  }

  onModeChange(mode: 'allDay' | 'schedule') {
    this.availabilityMode = mode;
    if (mode === 'allDay') {
      this.daysOfWeek.forEach(d => {
        this.availability[d.key] = [{ start: this.makeTime(0, 0), end: this.makeTime(23, 59) }];
      });
    } else {
      this.daysOfWeek.forEach(d => this.availability[d.key] = []);
    }
  }

  formatTime(date: Date | null): string {
    return date
      ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      : '';
  }

  makeTime(h: number, m: number): Date {
    const d = new Date(); d.setHours(h, m, 0, 0); return d;
  }

  openSlotDialog(dayKey: string) {
    this.currentDayKey = dayKey;
    this.newSlot = { start: this.makeTime(8, 0), end: this.makeTime(17, 0) };
    this.displayDialog = true;
  }

  saveSlot() {
    if (!this.newSlot.start || !this.newSlot.end || this.newSlot.end <= this.newSlot.start) return;
    const slots = this.availability[this.currentDayKey] || [];
    if (slots.some(s => this.newSlot.start! < s.end! && this.newSlot.end! > s.start!)) return;
    this.availability[this.currentDayKey].push({ ...this.newSlot });
    this.displayDialog = false;
  }

  removeSlot(dayKey: string, slot: TimeSlot) {
    this.availability[dayKey] = this.availability[dayKey].filter(s => s !== slot);
  }

  openCopyDialog(dayKey: string) {
    this.currentDayKey = dayKey;
    this.copyTargets = [];
    this.copyDialogVisible = true;
  }

  applyCopy() {
    const source = this.availability[this.currentDayKey] || [];
    this.copyTargets.forEach(t => {
      this.availability[t.key] = [...(this.availability[t.key] || []), ...source.map(s => ({ start: s.start!, end: s.end! }))];
    });
    this.copyDialogVisible = false;
  }

  updateSchedule() {
    const payload: AvailabilityMap = {};
    Object.entries(this.availability).forEach(([day, slots]) => {
      payload[day] = slots
        .filter(s => s.start && s.end)
        .map(s => ({ start: s.start!, end: s.end!, is24: false }));
    });
    this.scheduleService.saveAvailability(this.sellerId, payload).subscribe({
      next: () => this.toastService.showInfo("Actuilización exitosa", "Se cambiaron los horarios de atencion")
    });
  }

}
