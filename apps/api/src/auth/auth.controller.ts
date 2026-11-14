import { Body, Controller, Get, Patch, Post, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { loginSchema, registerSchema, updateProfileSchema } from "@clinic/shared";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { parseBody } from "../common/parse";
import { assertRate } from "../common/rate";
import { clearAuthCookies, setAuthCookies, type SessionUser } from "../common/http";
import { AuthGuard } from "../common/auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { assertCaptcha } from "../captcha/captcha";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  async register(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    assertRate(`register:${req.ip}`, 5, 10 * 60 * 1000);
    const form = (body ?? {}) as { captchaToken?: unknown; captchaAnswer?: unknown };
    assertCaptcha(form.captchaToken, form.captchaAnswer);
    const input = parseBody(registerSchema, body);
    const session = await this.auth.register(input.fullName, input.phone, input.password);
    setAuthCookies(res, session.accessToken, session.refreshToken);
    return session.profile;
  }

  @Post("login")
  async login(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    assertRate(`login:${req.ip}`, 8, 10 * 60 * 1000);
    const form = (body ?? {}) as { captchaToken?: unknown; captchaAnswer?: unknown };
    assertCaptcha(form.captchaToken, form.captchaAnswer);
    const input = parseBody(loginSchema, body);
    const session = await this.auth.login(input.phone, input.password);
    setAuthCookies(res, session.accessToken, session.refreshToken);
    return session.profile;
  }

  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refresh_token;
    if (!token) {
      clearAuthCookies(res);
      throw new UnauthorizedException("وارد شوید");
    }
    const session = await this.auth.refresh(token);
    setAuthCookies(res, session.accessToken, session.refreshToken);
    return session.profile;
  }

  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.refresh_token);
    clearAuthCookies(res);
    return { ok: true };
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: SessionUser) {
    return this.auth.profile(user.id);
  }

  @Patch("me")
  @UseGuards(AuthGuard)
  update(@CurrentUser() user: SessionUser, @Body() body: unknown, @Req() req: Request) {
    return this.auth.updateProfile(user.id, parseBody(updateProfileSchema, body), req.cookies?.refresh_token);
  }
}
