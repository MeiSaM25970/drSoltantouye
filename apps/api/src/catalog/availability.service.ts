import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { addDays, clockLabel, isDateOnly, tehranInstant, weekdayIndex } from "../common/time";

const ACTIVE = ["REQUESTED", "CONFIRMED", "ARRIVED", "COMPLETED"] as const;

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async slots(doctorId: string, serviceId: string, date: string) {
    if (!isDateOnly(date)) throw new BadRequestException("تاریخ نامعتبر است");
    const context = await this.load(doctorId, serviceId);
    const dayStart = tehranInstant(date, 0);
    const dayEnd = tehranInstant(addDays(date, 1), 0);
    const [appointments, blocks] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { doctorId, status: { in: [...ACTIVE] }, startsAt: { gte: dayStart, lt: dayEnd } },
      }),
      this.prisma.timeBlock.findMany({
        where: { doctorId, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } },
      }),
    ]);
    return this.build(date, context.durationMin, context.hours, appointments, blocks);
  }

  async days(doctorId: string, serviceId: string, from: string, count = 21) {
    if (!isDateOnly(from)) throw new BadRequestException("تاریخ نامعتبر است");
    const context = await this.load(doctorId, serviceId);
    const rangeStart = tehranInstant(from, 0);
    const rangeEnd = tehranInstant(addDays(from, count), 0);
    const [appointments, blocks] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { doctorId, status: { in: [...ACTIVE] }, startsAt: { gte: rangeStart, lt: rangeEnd } },
      }),
      this.prisma.timeBlock.findMany({
        where: { doctorId, startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } },
      }),
    ]);
    return {
      days: Array.from({ length: count }, (_, index) => {
        const date = addDays(from, index);
        return { date, count: this.build(date, context.durationMin, context.hours, appointments, blocks).length };
      }),
    };
  }

  private async load(doctorId: string, serviceId: string) {
    const doctor = await this.prisma.doctorProfile.findFirst({
      where: { id: doctorId, published: true },
      include: { hours: true, services: true },
    });
    if (!doctor) throw new NotFoundException("پزشک پیدا نشد");
    if (!doctor.services.some((item) => item.serviceId === serviceId)) {
      throw new BadRequestException("این خدمت برای این پزشک فعال نیست");
    }
    const service = await this.prisma.service.findFirst({ where: { id: serviceId, published: true } });
    if (!service) throw new NotFoundException("خدمت پیدا نشد");
    return { durationMin: service.durationMin, hours: doctor.hours };
  }

  private build(
    date: string,
    duration: number,
    hours: { weekday: number; startMin: number; endMin: number }[],
    appointments: { startsAt: Date; endsAt: Date }[],
    blocks: { startsAt: Date; endsAt: Date }[],
  ) {
    const weekday = weekdayIndex(date);
    const slots: { start: string; end: string; label: string }[] = [];
    for (const window of hours.filter((item) => item.weekday === weekday)) {
      for (let minute = window.startMin; minute + duration <= window.endMin; minute += 30) {
        const start = tehranInstant(date, minute);
        const end = tehranInstant(date, minute + duration);
        if (end.getTime() <= Date.now()) continue;
        const overlaps = (from: Date, to: Date) => start < to && end > from;
        if (appointments.some((item) => overlaps(item.startsAt, item.endsAt))) continue;
        if (blocks.some((item) => overlaps(item.startsAt, item.endsAt))) continue;
        slots.push({ start: start.toISOString(), end: end.toISOString(), label: clockLabel(start) });
      }
    }
    return slots;
  }
}
