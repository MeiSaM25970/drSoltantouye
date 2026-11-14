import { Body, Controller, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ConsultationsService } from "./consultations.service";
import { AuthGuard } from "../common/auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { assertRate } from "../common/rate";
import { assertCaptcha } from "../captcha/captcha";
import { privateUploadOptions, type SessionUser, type UploadedAsset } from "../common/http";

@Controller("consultations")
@UseGuards(AuthGuard)
export class ConsultationsController {
  constructor(private readonly consultations: ConsultationsService) {}

  @Post()
  @UseInterceptors(FileInterceptor("image", privateUploadOptions))
  create(@CurrentUser() user: SessionUser, @Body() body: unknown, @UploadedFile() file?: UploadedAsset) {
    const form = (body ?? {}) as { captchaToken?: unknown; captchaAnswer?: unknown };
    assertCaptcha(form.captchaToken, form.captchaAnswer);
    return this.consultations.create(user, body, file);
  }

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.consultations.list(user);
  }

  @Get(":id")
  one(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.consultations.one(user, id);
  }

  @Post(":id/messages")
  @UseInterceptors(FileInterceptor("image", privateUploadOptions))
  message(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() body: unknown,
    @UploadedFile() file?: UploadedAsset,
  ) {
    assertRate(`consultation-message:${user.id}`, 40, 60 * 60 * 1000);
    return this.consultations.message(user, id, body, file);
  }

  @Patch(":id")
  update(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() body: unknown) {
    return this.consultations.updateStatus(user, id, body);
  }
}
