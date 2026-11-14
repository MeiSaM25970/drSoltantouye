import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { saveHoursSchema, serviceSchema, timeBlockSchema, updateDoctorSchema } from "@clinic/shared";
import { PrismaService } from "../prisma/prisma.service";
import { parseBody } from "../common/parse";
import { tehranInstant } from "../common/time";
import { publicUploadPath, rejectNonImage, removeUploadedFile, type UploadedAsset } from "../common/http";

const doctorPublic = {
  user: { select: { fullName: true } },
  services: { include: { service: true } },
} as const;

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  services(includeHidden = false) {
    return this.prisma.service.findMany({
      where: includeHidden ? {} : { published: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  async serviceBySlug(slug: string) {
    const service = await this.prisma.service.findFirst({ where: { slug, published: true } });
    if (!service) throw new NotFoundException("خدمت پیدا نشد");
    return service;
  }

  async createService(body: unknown) {
    const input = parseBody(serviceSchema, body);
    const count = await this.prisma.service.count();
    const service = await this.prisma.service.create({
      data: {
        slug: `service-${randomBytes(3).toString("hex")}`,
        title: input.title,
        summary: input.summary,
        description: input.description,
        durationMin: input.durationMin,
        published: input.published ?? true,
        sortOrder: count,
      },
    });
    const doctors = await this.prisma.doctorProfile.findMany({ select: { id: true } });
    if (doctors.length) {
      await this.prisma.doctorService.createMany({
        data: doctors.map((doctor) => ({ doctorId: doctor.id, serviceId: service.id })),
      });
    }
    return service;
  }

  async setServiceImage(id: string, file: UploadedAsset) {
    await rejectNonImage(file);
    const previous = await this.prisma.service.findUnique({ where: { id } });
    if (!previous) {
      await removeUploadedFile(publicUploadPath(file.filename));
      throw new NotFoundException("خدمت پیدا نشد");
    }
    const updated = await this.prisma.service.update({ where: { id }, data: { imageUrl: publicUploadPath(file.filename) } });
    await removeUploadedFile(previous.imageUrl);
    return updated;
  }

  async clearServiceImage(id: string) {
    const previous = await this.prisma.service.findUnique({ where: { id } });
    if (!previous) throw new NotFoundException("خدمت پیدا نشد");
    const updated = await this.prisma.service.update({ where: { id }, data: { imageUrl: "" } });
    await removeUploadedFile(previous.imageUrl);
    return updated;
  }

  async updateService(id: string, body: unknown) {
    const input = parseBody(serviceSchema.partial(), body);
    try {
      return await this.prisma.service.update({ where: { id }, data: input });
    } catch {
      throw new NotFoundException("خدمت پیدا نشد");
    }
  }

  async doctors() {
    const rows = await this.prisma.doctorProfile.findMany({
      where: { published: true },
      include: doctorPublic,
      orderBy: { user: { fullName: "asc" } },
    });
    return rows.map(presentDoctor);
  }

  async doctorBySlug(slug: string) {
    const doctor = await this.prisma.doctorProfile.findFirst({
      where: { slug, published: true },
      include: doctorPublic,
    });
    if (!doctor) throw new NotFoundException("پزشک پیدا نشد");
    return presentDoctor(doctor);
  }

  async allDoctors() {
    const rows = await this.prisma.doctorProfile.findMany({
      include: { user: { select: { fullName: true } }, hours: true, blocks: { orderBy: { startsAt: "asc" }, take: 30 } },
    });
    return rows;
  }

  async updateDoctor(id: string, body: unknown) {
    const input = parseBody(updateDoctorSchema, body);
    try {
      return await this.prisma.doctorProfile.update({ where: { id }, data: input });
    } catch {
      throw new NotFoundException("پزشک پیدا نشد");
    }
  }

  hours(id: string) {
    return this.prisma.workingHour.findMany({ where: { doctorId: id }, orderBy: [{ weekday: "asc" }, { startMin: "asc" }] });
  }

  async saveHours(id: string, body: unknown) {
    const input = parseBody(saveHoursSchema, body);
    if (input.hours.some((hour) => hour.endMin <= hour.startMin)) {
      throw new BadRequestException("ساعت پایان باید بعد از شروع باشد");
    }
    await this.prisma.doctorProfile.findUniqueOrThrow({ where: { id } }).catch(() => {
      throw new NotFoundException("پزشک پیدا نشد");
    });
    await this.prisma.$transaction([
      this.prisma.workingHour.deleteMany({ where: { doctorId: id } }),
      this.prisma.workingHour.createMany({ data: input.hours.map((hour) => ({ ...hour, doctorId: id })) }),
    ]);
    return this.hours(id);
  }

  blocks(id: string) {
    return this.prisma.timeBlock.findMany({
      where: { doctorId: id, endsAt: { gt: new Date() } },
      orderBy: { startsAt: "asc" },
    });
  }

  async addBlock(id: string, body: unknown) {
    const input = parseBody(timeBlockSchema, body);
    if (input.endMin <= input.startMin) throw new BadRequestException("بازهٔ تعطیلی درست نیست");
    return this.prisma.timeBlock.create({
      data: {
        doctorId: id,
        startsAt: tehranInstant(input.date, input.startMin),
        endsAt: tehranInstant(input.date, input.endMin),
        reason: input.reason || null,
      },
    });
  }

  async removeBlock(id: string) {
    await this.prisma.timeBlock.delete({ where: { id } }).catch(() => {
      throw new NotFoundException("تعطیلی پیدا نشد");
    });
    return { ok: true };
  }
}

function presentDoctor(doctor: {
  id: string;
  slug: string;
  specialty: string;
  bio: string;
  user: { fullName: string };
  services: { service: { id: string; slug: string; title: string; summary: string; durationMin: number; published: boolean } }[];
}) {
  return {
    id: doctor.id,
    slug: doctor.slug,
    specialty: doctor.specialty,
    bio: doctor.bio,
    fullName: doctor.user.fullName,
    services: doctor.services.map((item) => item.service).filter((service) => service.published),
  };
}
