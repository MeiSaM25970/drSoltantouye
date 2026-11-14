import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type NoticeEvent = "appointmentCreated" | "appointmentCancelled" | "consultationCreated" | "consultationMessage";

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.flush();
    }, 12_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async fanout(event: NoticeEvent, text: string) {
    const links = await this.prisma.telegramLink.findMany({
      where: { chatId: { not: null }, user: { staffProfile: { telegramAllowed: true } } },
      include: { user: { include: { notificationPreference: true } } },
    });
    for (const link of links) {
      const preference = link.user.notificationPreference;
      const enabled = preference ? preference[event] : true;
      if (!enabled || !link.chatId) continue;
      await this.prisma.notificationOutbox.create({
        data: { chatId: link.chatId, event, text },
      });
    }
  }

  async flush() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const pending = await this.prisma.notificationOutbox.findMany({
      where: { status: "pending", attempts: { lt: 5 } },
      orderBy: { createdAt: "asc" },
      take: 20,
    });
    for (const item of pending) {
      if (!token) {
        await this.prisma.notificationOutbox.update({
          where: { id: item.id },
          data: { status: "skipped", attempts: { increment: 1 }, lastError: "توکن ربات در env نیست" },
        });
        continue;
      }
      try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id: item.chatId, text: item.text }),
        });
        if (!response.ok) throw new Error(await response.text());
        await this.prisma.notificationOutbox.update({
          where: { id: item.id },
          data: { status: "sent", sentAt: new Date(), lastError: null },
        });
      } catch (error) {
        const attempts = item.attempts + 1;
        await this.prisma.notificationOutbox.update({
          where: { id: item.id },
          data: {
            attempts,
            status: attempts >= 5 ? "failed" : "pending",
            lastError: error instanceof Error ? error.message.slice(0, 400) : "خطای تلگرام",
          },
        });
        this.logger.warn(`telegram send failed: ${item.id}`);
      }
    }
  }

  recent() {
    return this.prisma.notificationOutbox.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
  }

  async retryFailed() {
    await this.prisma.notificationOutbox.updateMany({
      where: { status: { in: ["failed", "skipped"] } },
      data: { status: "pending", attempts: 0, lastError: null },
    });
    await this.flush();
    return this.recent();
  }
}
