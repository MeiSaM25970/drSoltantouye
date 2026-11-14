import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { randomBytes, timingSafeEqual } from "crypto";
import { telegramPrefSchema } from "@clinic/shared";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { parseBody } from "../common/parse";
import type { SessionUser } from "../common/http";

@Injectable()
export class TelegramService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async status(user: SessionUser) {
    const staff = await this.prisma.staffProfile.findUnique({ where: { userId: user.id } });
    if (!staff) throw new ForbiddenException("این بخش برای پرسنل مطب است");
    const link = await this.prisma.telegramLink.findUnique({ where: { userId: user.id } });
    const preference = await this.prisma.notificationPreference.findUnique({ where: { userId: user.id } });
    return {
      allowed: staff.telegramAllowed,
      connected: Boolean(link?.chatId),
      botUsername: process.env.TELEGRAM_BOT_USERNAME || null,
      preferences: preference ?? {
        appointmentCreated: true,
        appointmentCancelled: true,
        consultationCreated: true,
        consultationMessage: false,
      },
    };
  }

  async connect(user: SessionUser) {
    const staff = await this.prisma.staffProfile.findUnique({ where: { userId: user.id } });
    if (!staff?.telegramAllowed) throw new ForbiddenException("اتصال تلگرام برای حساب شما باز نیست");
    const code = randomBytes(9).toString("base64url");
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.prisma.telegramLink.upsert({
      where: { userId: user.id },
      create: { userId: user.id, linkCode: code, codeExpiresAt },
      update: { linkCode: code, codeExpiresAt },
    });
    const username = process.env.TELEGRAM_BOT_USERNAME;
    return {
      code,
      expiresInSec: 600,
      url: username ? `https://t.me/${username}?start=${code}` : null,
    };
  }

  async disconnect(user: SessionUser) {
    await this.prisma.telegramLink.updateMany({
      where: { userId: user.id },
      data: { chatId: null, connectedAt: null, linkCode: null, codeExpiresAt: null },
    });
    return this.status(user);
  }

  async updatePreferences(user: SessionUser, body: unknown) {
    const input = parseBody(telegramPrefSchema, body);
    await this.prisma.notificationPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...input },
      update: input,
    });
    return this.status(user);
  }

  async handleWebhook(secret: string | undefined, body: { message?: { text?: string; chat?: { id?: number } } }) {
    // the webhook is closed until a secret is configured, so strangers cannot attach their chat to a staff account
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!expected || !secret || secret.length !== expected.length || !timingSafeEqual(Buffer.from(secret), Buffer.from(expected))) {
      throw new UnauthorizedException();
    }
    const text = body.message?.text ?? "";
    const chatId = body.message?.chat?.id;
    if (!text.startsWith("/start") || chatId == null) return { ok: true };
    const code = text.split(/\s+/)[1];
    if (!code) return { ok: true };
    const link = await this.prisma.telegramLink.findUnique({ where: { linkCode: code } });
    if (!link?.codeExpiresAt || link.codeExpiresAt.getTime() < Date.now()) {
      return { ok: true };
    }
    await this.prisma.telegramLink.update({
      where: { id: link.id },
      data: { chatId: String(chatId), linkCode: null, codeExpiresAt: null, connectedAt: new Date() },
    });
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: "اتصال مطب دکتر سلطان‌طویه برقرار شد. اعلان نوبت و مشاوره به همین گفتگو می‌آید." }),
      }).catch(() => undefined);
    }
    return { ok: true };
  }

  outbox() {
    return this.notifications.recent();
  }

  retry() {
    return this.notifications.retryFailed();
  }

  assertStaff(user: SessionUser) {
    if (!user.roles.some((role) => role === "ADMIN" || role === "SECRETARY" || role === "DENTIST")) {
      throw new BadRequestException("دسترسی ندارید");
    }
  }
}
