import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createAppointmentSchema, updateAppointmentSchema } from "@clinic/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AvailabilityService } from "../catalog/availability.service";
import { NotificationsService } from "../notifications/notifications.service";
import { parseBody } from "../common/parse";
import { formatTehranDate, formatTehranSpoken, clockLabel } from "../common/time";
import { isStaff, type SessionUser } from "../common/http";

const include = {
  patient: { select: { id: true, fullName: true, phone: true } },
  doctor: { include: { user: { select: { fullName: true } } } },
  service: { select: { id: true, title: true, durationMin: true } },
} satisfies Prisma.AppointmentInclude;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(user: SessionUser, body: unknown) {
    const input = parseBody(createAppointmentSchema, body);
    const start = new Date(input.start);
    if (Number.isNaN(start.getTime())) throw new BadRequestException("ساعت نامعتبر است");
    const date = formatTehranDate(start);
    const slots = await this.availability.slots(input.doctorId, input.serviceId, date);
    const slot = slots.find((item) => new Date(item.start).getTime() === start.getTime());
    if (!slot) throw new BadRequestException("این ساعت در برنامه خالی نیست");
    try {
      const appointment = await this.prisma.$transaction(async (tx) => {
        const clash = await tx.appointment.findFirst({
          where: {
            doctorId: input.doctorId,
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
            startsAt: { lt: new Date(slot.end) },
            endsAt: { gt: start },
          },
        });
        if (clash) throw new BadRequestException("این ساعت همین حالا گرفته شد");
        return tx.appointment.create({
          data: {
            patientId: user.id,
            doctorId: input.doctorId,
            serviceId: input.serviceId,
            startsAt: start,
            endsAt: new Date(slot.end),
            note: input.note || null,
          },
          include,
        });
      });
      await this.notifications.fanout(
        "appointmentCreated",
        `نوبت جدید\n${appointment.patient.fullName}\n${appointment.service.title}\n${formatTehranSpoken(appointment.startsAt)} ساعت ${clockLabel(appointment.startsAt)}`,
      );
      return appointment;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException("این ساعت همین حالا گرفته شد");
      }
      throw error;
    }
  }

  async list(user: SessionUser, query: { from?: string; to?: string; scope?: string }) {
    if (!isStaff(user.roles) || query.scope === "mine") {
      return this.prisma.appointment.findMany({
        where: { patientId: user.id },
        include,
        orderBy: { startsAt: "desc" },
      });
    }
    const where: Prisma.AppointmentWhereInput = {};
    const dentistOnly = user.roles.includes("DENTIST") && !user.roles.includes("ADMIN") && !user.roles.includes("SECRETARY");
    if (dentistOnly || (query.scope === "doctor" && user.roles.includes("DENTIST"))) where.doctor = { userId: user.id };
    if (query.from || query.to) {
      where.startsAt = {};
      if (query.from) where.startsAt.gte = new Date(query.from);
      if (query.to) where.startsAt.lt = new Date(query.to);
    }
    return this.prisma.appointment.findMany({ where, include, orderBy: { startsAt: "asc" }, take: 400 });
  }

  async updateStatus(user: SessionUser, id: string, body: unknown) {
    const input = parseBody(updateAppointmentSchema, body);
    const appointment = await this.prisma.appointment.findUnique({ where: { id }, include });
    if (!appointment) throw new NotFoundException("نوبت پیدا نشد");
    if (!isStaff(user.roles)) {
      if (appointment.patientId !== user.id) throw new ForbiddenException("این نوبت مال شما نیست");
      if (input.status !== "CANCELLED") throw new ForbiddenException("فقط می‌توانید نوبت را لغو کنید");
      if (appointment.status !== "REQUESTED" && appointment.status !== "CONFIRMED") {
        throw new BadRequestException("این نوبت دیگر قابل لغو نیست");
      }
    }
    const updated = await this.prisma.appointment.update({ where: { id }, data: { status: input.status }, include });
    if (input.status === "CANCELLED") {
      await this.notifications.fanout(
        "appointmentCancelled",
        `لغو نوبت\n${updated.patient.fullName}\n${updated.service.title}\n${formatTehranSpoken(updated.startsAt)} ساعت ${clockLabel(updated.startsAt)}`,
      );
    }
    return updated;
  }
}
