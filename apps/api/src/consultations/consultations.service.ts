import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { consultationMessageSchema, createConsultationSchema, updateConsultationSchema } from "@clinic/shared";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { parseBody } from "../common/parse";
import { isStaff, privateUploadPath, type SessionUser, type UploadedAsset } from "../common/http";
import { TOPIC_LABEL } from "@clinic/shared";

const listInclude = {
  patient: { select: { id: true, fullName: true, phone: true } },
  messages: { orderBy: { createdAt: "desc" as const }, take: 1 },
} satisfies Prisma.ConsultationInclude;

@Injectable()
export class ConsultationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(user: SessionUser, body: unknown, file?: UploadedAsset) {
    const input = parseBody(createConsultationSchema, body);
    const consultation = await this.prisma.consultation.create({
      data: {
        patientId: user.id,
        topic: input.topic,
        messages: {
          create: {
            authorId: user.id,
            body: input.body,
            imageUrl: file ? privateUploadPath(file.filename) : null,
          },
        },
      },
      include: this.detailInclude(),
    });
    await this.notifications.fanout(
      "consultationCreated",
      `مشاوره جدید\n${user.fullName}\nموضوع: ${TOPIC_LABEL[input.topic]}\n${input.body.slice(0, 180)}`,
    );
    return consultation;
  }

  list(user: SessionUser) {
    const where = isStaff(user.roles) ? {} : { patientId: user.id };
    return this.prisma.consultation.findMany({
      where,
      include: listInclude,
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
  }

  async one(user: SessionUser, id: string) {
    const consultation = await this.prisma.consultation.findUnique({ where: { id }, include: this.detailInclude() });
    if (!consultation) throw new NotFoundException("مشاوره پیدا نشد");
    if (!isStaff(user.roles) && consultation.patientId !== user.id) throw new ForbiddenException("این مشاوره مال شما نیست");
    return consultation;
  }

  async message(user: SessionUser, id: string, body: unknown, file?: UploadedAsset) {
    const input = parseBody(consultationMessageSchema, body);
    const consultation = await this.one(user, id);
    if (consultation.status === "CLOSED" && !isStaff(user.roles)) {
      throw new BadRequestException("این مشاوره بسته شده");
    }
    const staff = isStaff(user.roles);
    await this.prisma.consultationMessage.create({
      data: {
        consultationId: id,
        authorId: user.id,
        body: input.body,
        imageUrl: file ? privateUploadPath(file.filename) : null,
      },
    });
    const status = staff ? (consultation.status === "CLOSED" ? "CLOSED" : "ANSWERED") : "OPEN";
    const updated = await this.prisma.consultation.update({
      where: { id },
      data: { status },
      include: this.detailInclude(),
    });
    if (!staff) {
      await this.notifications.fanout(
        "consultationMessage",
        `پیام جدید مشاوره\n${user.fullName}\n${input.body.slice(0, 180)}`,
      );
    }
    return updated;
  }

  async updateStatus(user: SessionUser, id: string, body: unknown) {
    if (!isStaff(user.roles)) throw new ForbiddenException("فقط مطب وضعیت مشاوره را عوض می‌کند");
    const input = parseBody(updateConsultationSchema, body);
    await this.one(user, id);
    return this.prisma.consultation.update({ where: { id }, data: { status: input.status }, include: this.detailInclude() });
  }

  private detailInclude() {
    return {
      patient: { select: { id: true, fullName: true, phone: true } },
      messages: { include: { author: { select: { id: true, fullName: true, roles: true } } }, orderBy: { createdAt: "asc" as const } },
    } satisfies Prisma.ConsultationInclude;
  }
}
