import { Controller, Get, Header, Req } from "@nestjs/common";
import type { Request } from "express";
import { assertRate } from "../common/rate";
import { createCaptcha } from "./captcha";

@Controller("captcha")
export class CaptchaController {
  @Get()
  @Header("Cache-Control", "no-store")
  issue(@Req() req: Request) {
    assertRate(`captcha:${req.ip}`, 60, 10 * 60 * 1000);
    return createCaptcha();
  }
}
