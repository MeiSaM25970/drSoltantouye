import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CONTENT_BY_KEY, clinicSchema, faqSchema } from "@clinic/shared";
import { publicUploadPath, rejectNonImage, removeUploadedFile, type UploadedAsset } from "../common/http";
import { PrismaService } from "../prisma/prisma.service";
import { parseBody } from "../common/parse";

@Injectable()
export class ClinicService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const clinic = await this.prisma.clinicSettings.findUnique({ where: { id: "clinic" } });
    if (!clinic) throw new NotFoundException("تنظیمات مطب هنوز ساخته نشده");
    return clinic;
  }

  async update(body: unknown) {
    const input = parseBody(clinicSchema.partial(), body);
    return this.prisma.clinicSettings.update({ where: { id: "clinic" }, data: input });
  }

  async setLogo(file: UploadedAsset) {
    await rejectNonImage(file);
    const previous = await this.get();
    const updated = await this.prisma.clinicSettings.update({
      where: { id: "clinic" },
      data: { logoUrl: publicUploadPath(file.filename) },
    });
    await removeUploadedFile(previous.logoUrl);
    return updated;
  }

  async clearLogo() {
    const previous = await this.get();
    const updated = await this.prisma.clinicSettings.update({ where: { id: "clinic" }, data: { logoUrl: "" } });
    await removeUploadedFile(previous.logoUrl);
    return updated;
  }

  private async currentContent() {
    const clinic = await this.get();
    const raw = clinic.content && typeof clinic.content === "object" && !Array.isArray(clinic.content) ? (clinic.content as Record<string, unknown>) : {};
    return Object.fromEntries(Object.entries(raw).filter(([, value]) => typeof value === "string")) as Record<string, string>;
  }

  private writeContent(content: Record<string, string>) {
    return this.prisma.clinicSettings.update({ where: { id: "clinic" }, data: { content } });
  }

  async saveContent(body: unknown) {
    const values = (body as { values?: unknown } | null)?.values;
    if (!values || typeof values !== "object" || Array.isArray(values)) throw new BadRequestException("مقدارها فرستاده نشد");
    const current = await this.currentContent();
    for (const [key, raw] of Object.entries(values as Record<string, unknown>)) {
      const field = CONTENT_BY_KEY[key];
      if (!field || field.kind === "image") throw new BadRequestException("این بخش قابل ویرایش متنی نیست");
      if (typeof raw !== "string") throw new BadRequestException("متن معتبر نیست");
      const value = raw.trim();
      const limit = field.kind === "textarea" ? 400 : 120;
      if (value.length > limit) throw new BadRequestException(`«${field.label}» حداکثر ${limit} نویسه می‌تواند باشد`);
      if (!value || value === field.default) delete current[key];
      else current[key] = value;
    }
    return this.writeContent(current);
  }

  async setContentImage(key: unknown, file: UploadedAsset) {
    await rejectNonImage(file);
    const field = typeof key === "string" ? CONTENT_BY_KEY[key] : undefined;
    if (!field || field.kind !== "image") {
      await removeUploadedFile(publicUploadPath(file.filename));
      throw new BadRequestException("این بخش عکس ندارد");
    }
    const current = await this.currentContent();
    const previous = current[field.key];
    current[field.key] = publicUploadPath(file.filename);
    const updated = await this.writeContent(current);
    await removeUploadedFile(previous);
    return updated;
  }

  async resetContent(key: string) {
    if (!CONTENT_BY_KEY[key]) throw new NotFoundException("بخش پیدا نشد");
    const current = await this.currentContent();
    const previous = current[key];
    delete current[key];
    const updated = await this.writeContent(current);
    await removeUploadedFile(previous);
    return updated;
  }

  faqs(all = false) {
    return this.prisma.faq.findMany({
      where: all ? {} : { published: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  createFaq(body: unknown) {
    const input = parseBody(faqSchema, body);
    return this.prisma.faq.create({
      data: { question: input.question, answer: input.answer, published: input.published ?? true, sortOrder: input.sortOrder ?? 0 },
    });
  }

  async updateFaq(id: string, body: unknown) {
    const input = parseBody(faqSchema.partial(), body);
    try {
      return await this.prisma.faq.update({ where: { id }, data: input });
    } catch {
      throw new NotFoundException("پرسش پیدا نشد");
    }
  }

  async removeFaq(id: string) {
    await this.prisma.faq.delete({ where: { id } }).catch(() => {
      throw new NotFoundException("پرسش پیدا نشد");
    });
    return { ok: true };
  }
}
