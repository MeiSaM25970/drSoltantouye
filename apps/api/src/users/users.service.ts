import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import argon2 from "argon2";
import { staffSchema, updateUserSchema, type Role } from "@clinic/shared";
import { PrismaService } from "../prisma/prisma.service";
import { parseBody } from "../common/parse";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createStaff(body: unknown) {
    const input = parseBody(staffSchema, body);
    const existing = await this.prisma.user.findUnique({ where: { phone: input.phone } });
    if (existing) throw new BadRequestException("این شماره قبلاً ثبت شده");
    const staffRoles = input.roles.filter((role) => role !== "PATIENT");
    if (!staffRoles.length) throw new BadRequestException("حداقل یک نقش پرسنلی انتخاب کنید");
    const user = await this.prisma.user.create({
      data: {
        fullName: input.fullName,
        phone: input.phone,
        passwordHash: await argon2.hash(input.password),
        roles: staffRoles,
        staffProfile: { create: { title: input.title || null, telegramAllowed: input.telegramAllowed ?? staffRoles.includes("ADMIN") } },
        notificationPreference: { create: {} },
        doctorProfile: staffRoles.includes("DENTIST")
          ? {
              create: {
                specialty: input.specialty || "دندانپزشک",
                bio: input.bio || "پزشک این مطب.",
                slug: `doctor-${input.phone}`,
              },
            }
          : undefined,
      },
      include: { doctorProfile: true },
    });
    if (user.doctorProfile) await this.linkServices(user.doctorProfile.id);
    return { id: user.id, fullName: user.fullName, phone: user.phone, roles: user.roles };
  }

  async update(id: string, body: unknown) {
    const input = parseBody(updateUserSchema, body);
    const user = await this.prisma.user.findUnique({ where: { id }, include: { doctorProfile: true } });
    if (!user) throw new NotFoundException("کاربر پیدا نشد");
    const roles = (input.roles ?? user.roles) as Role[];
    await this.prisma.user.update({
      where: { id },
      data: {
        fullName: input.fullName,
        roles,
        passwordHash: input.password ? await argon2.hash(input.password) : undefined,
      },
    });
    if (roles.some((role) => role !== "PATIENT")) {
      await this.prisma.staffProfile.upsert({
        where: { userId: id },
        create: { userId: id, title: input.title || null, telegramAllowed: input.telegramAllowed ?? false },
        update: {
          title: input.title,
          telegramAllowed: input.telegramAllowed,
        },
      });
      await this.prisma.notificationPreference.upsert({
        where: { userId: id },
        create: { userId: id },
        update: {},
      });
    }
    if (roles.includes("DENTIST")) {
      const doctor = await this.prisma.doctorProfile.upsert({
        where: { userId: id },
        create: {
          userId: id,
          specialty: input.specialty || "دندانپزشک",
          bio: input.bio || "پزشک این مطب.",
          slug: `doctor-${user.phone}-${randomBytes(2).toString("hex")}`,
          published: true,
        },
        update: {
          specialty: input.specialty,
          bio: input.bio,
          published: true,
        },
      });
      await this.linkServices(doctor.id);
    } else if (user.doctorProfile) {
      await this.prisma.doctorProfile.update({ where: { id: user.doctorProfile.id }, data: { published: false } });
    }
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, fullName: true, phone: true, roles: true, staffProfile: true, doctorProfile: true },
    });
  }

  private async linkServices(doctorId: string) {
    const services = await this.prisma.service.findMany({ select: { id: true } });
    if (!services.length) return;
    await this.prisma.doctorService.createMany({
      data: services.map((service) => ({ doctorId, serviceId: service.id })),
      skipDuplicates: true,
    });
  }
}
