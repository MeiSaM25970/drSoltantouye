import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AppointmentsService } from "./appointments.service";
import { AuthGuard } from "../common/auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { SessionUser } from "../common/http";
import { assertCaptcha } from "../captcha/captcha";

@Controller("appointments")
@UseGuards(AuthGuard)
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  create(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    const form = (body ?? {}) as { captchaToken?: unknown; captchaAnswer?: unknown };
    assertCaptcha(form.captchaToken, form.captchaAnswer);
    return this.appointments.create(user, body);
  }

  @Get()
  list(
    @CurrentUser() user: SessionUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("scope") scope?: string,
  ) {
    return this.appointments.list(user, { from, to, scope });
  }

  @Patch(":id")
  update(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() body: unknown) {
    return this.appointments.updateStatus(user, id, body);
  }
}
