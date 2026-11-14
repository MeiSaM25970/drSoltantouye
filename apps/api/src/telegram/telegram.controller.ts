import { Body, Controller, Get, Headers, Patch, Post, UseGuards } from "@nestjs/common";
import { TelegramService } from "./telegram.service";
import { AuthGuard } from "../common/auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { CurrentUser } from "../common/current-user.decorator";
import type { SessionUser } from "../common/http";
import { assertRate } from "../common/rate";

@Controller("telegram")
export class TelegramController {
  constructor(private readonly telegram: TelegramService) {}

  @Post("webhook")
  webhook(
    @Headers("x-telegram-bot-api-secret-token") secret: string | undefined,
    @Body() body: { message?: { text?: string; chat?: { id?: number } } },
  ) {
    return this.telegram.handleWebhook(secret, body ?? {});
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("SECRETARY", "DENTIST", "ADMIN")
  status(@CurrentUser() user: SessionUser) {
    return this.telegram.status(user);
  }

  @Post("connect")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("SECRETARY", "DENTIST", "ADMIN")
  connect(@CurrentUser() user: SessionUser) {
    assertRate(`tg:${user.id}`, 5, 10 * 60 * 1000);
    return this.telegram.connect(user);
  }

  @Post("disconnect")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("SECRETARY", "DENTIST", "ADMIN")
  disconnect(@CurrentUser() user: SessionUser) {
    return this.telegram.disconnect(user);
  }

  @Patch("preferences")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("SECRETARY", "DENTIST", "ADMIN")
  preferences(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    return this.telegram.updatePreferences(user, body);
  }

  @Get("outbox")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  outbox() {
    return this.telegram.outbox();
  }

  @Post("outbox/retry")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  retry() {
    return this.telegram.retry();
  }
}
