import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import argon2 from "argon2";
import {
  RECORD_FIELDS,
  SECTION_META,
  canEditSection,
  canSeeLedger,
  canViewSection,
  createPatientSchema,
  emptyValue,
  fieldByKey,
  ledgerEntrySchema,
  nationalIdSchema,
  normalizePhone,
  recordPatchSchema,
  toothSchema,
  visitSchema,
  type RecordSection,
  type RecordValues,
} from "@clinic/shared";
import { PrismaService } from "../prisma/prisma.service";
import { parseBody } from "../common/parse";
import { isStaff, privateUploadPath, removeUploadedFile, type SessionUser, type UploadedAsset } from "../common/http";

type Viewer = { roles: readonly string[]; own: boolean };

const TEMP_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function tempPassword() {
  const bytes = randomBytes(10);
  return Array.from(bytes, (byte) => TEMP_ALPHABET[byte % TEMP_ALPHABET.length]).join("");
}

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, filter = "all") {
    const q = query.trim();
    const and: object[] = [];
    if (q) {
      and.push({ OR: [{ fullName: { contains: q, mode: "insensitive" } }, { phone: { contains: normalizePhone(q) || q } }] });
    }
    if (filter === "patients") and.push({ roles: { has: "PATIENT" } });
    if (filter === "staff") and.push({ NOT: { roles: { equals: ["PATIENT"] } } });
    if (filter === "noRecord") and.push({ roles: { has: "PATIENT" } }, { OR: [{ patientProfile: null }, { patientProfile: { record: null } }] });
    if (filter === "withRecord") and.push({ patientProfile: { record: { isNot: null } } });
    const rows = await this.prisma.user.findMany({
      where: and.length ? { AND: and } : undefined,
      orderBy: { createdAt: "desc" },
      take: 120,
      select: {
        id: true,
        fullName: true,
        phone: true,
        roles: true,
        staffProfile: { select: { telegramAllowed: true } },
        createdAt: true,
        patientProfile: {
          select: { id: true, record: { select: { id: true, fileNo: true, fileStatus: true, updatedAt: true } } },
        },
      },
    });
    return rows.map(({ staffProfile, ...row }) => ({ ...row, telegramAllowed: Boolean(staffProfile?.telegramAllowed) }));
  }

  async summary() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [patients, withRecord, newThisWeek, staff] = await Promise.all([
      this.prisma.user.count({ where: { roles: { has: "PATIENT" } } }),
      this.prisma.patientRecord.count(),
      this.prisma.user.count({ where: { roles: { has: "PATIENT" }, createdAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { NOT: { roles: { equals: ["PATIENT"] } } } }),
    ]);
    return { patients, withRecord, withoutRecord: Math.max(patients - withRecord, 0), newThisWeek, staff };
  }

  async create(actor: SessionUser, body: unknown) {
    const input = parseBody(createPatientSchema, body);
    const existing = await this.prisma.user.findUnique({ where: { phone: input.phone } });
    if (existing) throw new ConflictException("این شماره قبلاً ثبت شده. از فهرست، پرونده‌اش را باز کنید");
    const password = input.password ?? tempPassword();
    const user = await this.prisma.user.create({
      data: {
        fullName: input.fullName,
        phone: input.phone,
        passwordHash: await argon2.hash(password),
        roles: ["PATIENT"],
        patientProfile: { create: { record: { create: {} } } },
      },
      include: { patientProfile: { include: { record: true } } },
    });
    const record = user.patientProfile?.record;
    if (record) await this.audit(actor.id, record.id, "پرونده برای بیمار تازه ساخته شد");
    return { id: user.id, fullName: user.fullName, phone: user.phone, tempPassword: input.password ? null : password };
  }

  me(user: SessionUser) {
    return this.detail(user.id, { roles: user.roles, own: true });
  }

  staffDetail(actor: SessionUser, userId: string) {
    return this.detail(userId, { roles: actor.roles, own: false });
  }

  async openRecord(actor: SessionUser, userId: string, own = false) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("کاربر پیدا نشد");
    const profile = await this.prisma.patientProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: { record: true },
    });
    if (!profile.record) {
      const created = await this.prisma.patientRecord.create({ data: { patientProfileId: profile.id } });
      await this.audit(actor.id, created.id, own ? "بیمار پرونده خودش را ساخت" : "پرونده ساخته شد");
    }
    if (!user.roles.includes("PATIENT")) {
      await this.prisma.user.update({ where: { id: userId }, data: { roles: { push: "PATIENT" } } });
    }
    return this.detail(userId, { roles: actor.roles, own });
  }

  async updateRecord(actor: SessionUser, userId: string, body: unknown, own = false) {
    const input = parseBody(recordPatchSchema, body);
    const keys = Object.keys(input);
    const denied = new Set<RecordSection>();
    for (const key of keys) {
      const field = fieldByKey(key);
      if (field && !canEditSection(actor.roles, field.section, own)) denied.add(field.section);
    }
    if (denied.size) {
      const names = [...denied].map((section) => `«${SECTION_META[section].title}»`).join("، ");
      throw new ForbiddenException(`ویرایش بخش ${names} برای شما مجاز نیست`);
    }

    const record = await this.ensure(userId);
    const profileData: Record<string, unknown> = {};
    const recordData: Record<string, unknown> = {};
    for (const key of keys) {
      const field = fieldByKey(key)!;
      let value: unknown = (input as Record<string, unknown>)[key];
      if (field.kind === "toggle") {
        if (key === "consentSigned") recordData.consentAt = value ? (record.consentAt ?? new Date()) : null;
        continue;
      }
      if (typeof value === "string") {
        if (key === "nationalId") {
          const parsed = nationalIdSchema.safeParse(value);
          if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? "کد ملی نامعتبر است");
        }
        if (key === "emergencyPhone" && value) value = normalizePhone(value);
        value = value === "" ? null : value;
      }
      (field.store === "profile" ? profileData : recordData)[key] = value;
    }

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(profileData).length) {
        await tx.patientProfile.update({ where: { id: record.patientProfileId }, data: profileData as never });
      }
      await tx.patientRecord.update({ where: { id: record.id }, data: recordData as never });
    });

    const labels = keys.map((key) => fieldByKey(key)?.label).filter(Boolean);
    await this.audit(actor.id, record.id, `${own ? "بیمار" : "مطب"} این موارد را ثبت کرد: ${labels.slice(0, 6).join("، ")}${labels.length > 6 ? " و ..." : ""}`);
    return this.detail(userId, { roles: actor.roles, own });
  }

  async setTooth(actor: SessionUser, userId: string, body: unknown) {
    this.requireClinical(actor);
    const input = parseBody(toothSchema, body);
    const record = await this.ensure(userId);
    await this.prisma.toothState.upsert({
      where: { recordId_fdi: { recordId: record.id, fdi: input.fdi } },
      create: { recordId: record.id, fdi: input.fdi, condition: input.condition, note: input.note || null },
      update: { condition: input.condition, note: input.note || null },
    });
    await this.audit(actor.id, record.id, `دندان ${input.fdi} به ${input.condition} تغییر کرد`);
    return this.detail(userId, { roles: actor.roles, own: false });
  }

  async addVisit(actor: SessionUser, userId: string, body: unknown) {
    this.requireClinical(actor);
    const input = parseBody(visitSchema, body);
    const record = await this.ensure(userId);
    await this.prisma.visitNote.create({
      data: { recordId: record.id, authorId: actor.id, body: input.body, internal: input.internal ?? true },
    });
    await this.audit(actor.id, record.id, input.internal === false ? "یادداشت قابل‌مشاهده برای بیمار ثبت شد" : "یادداشت داخلی ثبت شد");
    return this.detail(userId, { roles: actor.roles, own: false });
  }

  async addAttachment(actor: SessionUser, userId: string, file: UploadedAsset | undefined, caption?: string, own = false) {
    if (!file) throw new BadRequestException("فایل انتخاب نشده");
    const record = await this.ensure(userId);
    await this.prisma.attachment.create({
      data: { recordId: record.id, url: privateUploadPath(file.filename), caption: caption || null, byPatient: own },
    });
    await this.audit(actor.id, record.id, own ? "بیمار تصویر اضافه کرد" : "تصویر به پرونده اضافه شد");
    return this.detail(userId, { roles: actor.roles, own });
  }

  async removeAttachment(actor: SessionUser, userId: string, attachmentId: string) {
    const record = await this.ensure(userId);
    const found = await this.prisma.attachment.findFirst({ where: { id: attachmentId, recordId: record.id } });
    if (!found) throw new NotFoundException("تصویر پیدا نشد");
    await this.prisma.attachment.delete({ where: { id: found.id } });
    await this.audit(actor.id, record.id, "یک تصویر حذف شد");
    return this.detail(userId, { roles: actor.roles, own: false });
  }

  async addLedger(actor: SessionUser, userId: string, body: unknown) {
    this.requireLedger(actor);
    const input = parseBody(ledgerEntrySchema, body);
    const record = await this.ensure(userId);
    await this.prisma.ledgerEntry.create({
      data: { recordId: record.id, kind: input.kind, title: input.title, amount: input.amount, authorId: actor.id },
    });
    await this.audit(actor.id, record.id, input.kind === "PAYMENT" ? "پرداخت ثبت شد" : "هزینه ثبت شد");
    return this.detail(userId, { roles: actor.roles, own: false });
  }

  async removeLedger(actor: SessionUser, userId: string, entryId: string) {
    this.requireLedger(actor);
    const record = await this.ensure(userId);
    const found = await this.prisma.ledgerEntry.findFirst({ where: { id: entryId, recordId: record.id } });
    if (!found) throw new NotFoundException("ردیف پیدا نشد");
    await this.prisma.ledgerEntry.delete({ where: { id: found.id } });
    await this.audit(actor.id, record.id, "یک ردیف مالی حذف شد");
    return this.detail(userId, { roles: actor.roles, own: false });
  }

  private requireClinical(actor: SessionUser) {
    if (!canEditSection(actor.roles, "clinical")) throw new ForbiddenException("این بخش فقط برای پزشک و ادمین است");
  }

  private requireLedger(actor: SessionUser) {
    if (!canSeeLedger(actor.roles)) throw new ForbiddenException("بخش مالی فقط برای منشی و ادمین است");
  }

  /** Admin only: removes the whole patient (account, record, appointments, consultations and their files). */
  async deletePatient(actor: SessionUser, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { patientProfile: { include: { record: true } } } });
    if (!user) throw new NotFoundException("بیمار پیدا نشد");
    if (user.id === actor.id) throw new BadRequestException("حساب خودتان را نمی‌توانید حذف کنید");
    if (user.roles.some((role) => role !== "PATIENT")) {
      throw new BadRequestException("این حساب پرسنل مطب است. از بخش تیم مدیریتش کنید");
    }
    const recordId = user.patientProfile?.record?.id;
    const [attachments, messages] = await Promise.all([
      recordId ? this.prisma.attachment.findMany({ where: { recordId }, select: { url: true } }) : [],
      this.prisma.consultationMessage.findMany({ where: { consultation: { patientId: userId }, imageUrl: { not: null } }, select: { imageUrl: true } }),
    ]);
    await this.prisma.$transaction([
      this.prisma.consultationMessage.deleteMany({ where: { OR: [{ consultation: { patientId: userId } }, { authorId: userId }] } }),
      this.prisma.consultation.deleteMany({ where: { patientId: userId } }),
      this.prisma.appointment.deleteMany({ where: { patientId: userId } }),
      this.prisma.visitNote.deleteMany({ where: { authorId: userId } }),
      this.prisma.auditLog.deleteMany({ where: { entityId: { in: recordId ? [recordId, userId] : [userId] } } }),
      this.prisma.auditLog.updateMany({ where: { actorId: userId }, data: { actorId: null } }),
      this.prisma.user.delete({ where: { id: userId } }),
      this.prisma.auditLog.create({ data: { actorId: actor.id, action: "بیمار حذف شد", entity: "patient", entityId: userId, detail: `${user.fullName} (${user.phone})` } }),
    ]);
    await Promise.all([...attachments.map((item) => item.url), ...messages.map((item) => item.imageUrl)].map((url) => removeUploadedFile(url)));
    return { ok: true };
  }

  /** Admin only: removes the record (and its pictures) but keeps the patient's account. */
  async deleteRecord(actor: SessionUser, userId: string) {
    const record = await this.ensure(userId);
    const attachments = await this.prisma.attachment.findMany({ where: { recordId: record.id }, select: { url: true } });
    await this.prisma.$transaction([
      this.prisma.auditLog.deleteMany({ where: { entityId: record.id } }),
      this.prisma.patientRecord.delete({ where: { id: record.id } }),
      this.prisma.auditLog.create({ data: { actorId: actor.id, action: "پرونده حذف شد", entity: "patient", entityId: userId } }),
    ]);
    await Promise.all(attachments.map((item) => removeUploadedFile(item.url)));
    return { ok: true };
  }

  private async ensure(userId: string) {
    const profile = await this.prisma.patientProfile.findUnique({ where: { userId }, include: { record: true } });
    if (!profile?.record) throw new NotFoundException("اول برای این بیمار پرونده بسازید");
    return profile.record;
  }

  private async detail(userId: string, viewer: Viewer) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: {
          include: {
            record: {
              include: {
                teeth: true,
                visits: { include: { author: { select: { fullName: true } } }, orderBy: { createdAt: "desc" } },
                attachments: { orderBy: { createdAt: "desc" } },
                ledger: { orderBy: { createdAt: "desc" } },
              },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException("کاربر پیدا نشد");
    const profile = user.patientProfile;
    const record = profile?.record;
    const staffView = !viewer.own && isStaff([...viewer.roles]);
    const audits = staffView && record
      ? await this.prisma.auditLog.findMany({
          where: { entity: "PatientRecord", entityId: record.id },
          orderBy: { createdAt: "desc" },
          take: 12,
          include: { actor: { select: { fullName: true } } },
        })
      : [];

    const access = {
      patient: canEditSection(viewer.roles, "patient", viewer.own),
      clinical: canEditSection(viewer.roles, "clinical", viewer.own),
      clinic: canEditSection(viewer.roles, "clinic", viewer.own),
      ledger: !viewer.own && canSeeLedger(viewer.roles),
    };

    let ledger: null | { entries: { id: string; kind: string; title: string; amount: number; createdAt: Date }[]; charged: number; paid: number; balance: number } = null;
    if (record && access.ledger) {
      const charged = record.ledger.filter((entry) => entry.kind === "CHARGE").reduce((sum, entry) => sum + entry.amount, 0);
      const paid = record.ledger.filter((entry) => entry.kind === "PAYMENT").reduce((sum, entry) => sum + entry.amount, 0);
      ledger = {
        entries: record.ledger.map(({ id, kind, title, amount, createdAt }) => ({ id, kind, title, amount, createdAt })),
        charged,
        paid,
        balance: charged - paid,
      };
    }

    return {
      user: { id: user.id, fullName: user.fullName, phone: user.phone, roles: user.roles, createdAt: user.createdAt },
      access,
      record: record
        ? {
            id: record.id,
            fileNo: record.fileNo,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            values: this.valuesFor(profile as Record<string, unknown>, record as unknown as Record<string, unknown>, viewer),
            teeth: record.teeth,
            attachments: record.attachments,
            visits: record.visits.filter((visit) => staffView || !visit.internal),
            ledger,
          }
        : null,
      audits,
    };
  }

  private valuesFor(profile: Record<string, unknown>, record: Record<string, unknown>, viewer: Viewer): RecordValues {
    const values: RecordValues = {};
    for (const field of RECORD_FIELDS) {
      const allowed = viewer.own
        ? field.section === "patient" || field.patientVisible
        : canViewSection(viewer.roles, field.section) || field.patientVisible;
      if (!allowed) continue;
      if (field.key === "consentSigned") {
        values[field.key] = Boolean(record.consentAt);
        continue;
      }
      const raw = (field.store === "profile" ? profile : record)[field.key];
      const fallback = emptyValue(field);
      values[field.key] = (raw ?? fallback) as RecordValues[string];
    }
    return values;
  }

  private audit(actorId: string, entityId: string, detail: string) {
    return this.prisma.auditLog.create({
      data: { actorId, action: "record", entity: "PatientRecord", entityId, detail },
    });
  }
}
