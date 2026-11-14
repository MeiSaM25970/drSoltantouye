import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import argon2 from "argon2";
import type { Role } from "@clinic/shared";
import { PrismaService } from "../prisma/prisma.service";
import { hashToken, newRefreshToken, type SessionUser } from "../common/http";
import { jwtSecret } from "../common/secrets";

const ACCESS_SECRET = jwtSecret;

// verified when the phone is unknown, so response time does not reveal which numbers are registered
const DUMMY_HASH = argon2.hash("not-a-real-password");

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(fullName: string, phone: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) throw new ConflictException("با این شماره قبلاً ثبت‌نام شده. وارد شوید");
    const user = await this.prisma.user.create({
      data: {
        fullName,
        phone,
        passwordHash: await argon2.hash(password),
        roles: ["PATIENT"],
        patientProfile: { create: {} },
      },
    });
    return this.issue(user.id);
  }

  async login(phone: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    const valid = await argon2.verify(user ? user.passwordHash : await DUMMY_HASH, password).catch(() => false);
    if (!user) return this.reject();
    if (!valid) return this.reject();
    return this.issue(user.id);
  }

  private reject(): never {
    throw new UnauthorizedException("شماره یا رمز نادرست است");
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.refreshSession.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
    if (!session || session.expiresAt.getTime() < Date.now()) {
      if (session) await this.prisma.refreshSession.delete({ where: { id: session.id } });
      throw new UnauthorizedException("نشست تمام شده. دوباره وارد شوید");
    }
    await this.prisma.refreshSession.delete({ where: { id: session.id } });
    return this.issue(session.userId);
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    await this.prisma.refreshSession.deleteMany({ where: { tokenHash: hashToken(refreshToken) } });
  }

  async userFromAccessToken(token: string): Promise<SessionUser> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, { secret: ACCESS_SECRET() });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new Error("missing");
      return { id: user.id, phone: user.phone, fullName: user.fullName, roles: user.roles as Role[] };
    } catch {
      throw new UnauthorizedException("نشست شما تمام شده. دوباره وارد شوید");
    }
  }

  async updateProfile(userId: string, input: { fullName?: string; password?: string }, currentRefreshToken?: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: input.fullName,
        passwordHash: input.password ? await argon2.hash(input.password) : undefined,
      },
    });
    // a new password signs the account out everywhere except this device
    if (input.password) {
      await this.prisma.refreshSession.deleteMany({
        where: { userId, ...(currentRefreshToken ? { tokenHash: { not: hashToken(currentRefreshToken) } } : {}) },
      });
    }
    return this.profile(userId);
  }

  async profile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        doctorProfile: { select: { id: true, slug: true, specialty: true } },
        staffProfile: { select: { title: true, telegramAllowed: true } },
        telegramLink: true,
        notificationPreference: true,
      },
    });
    return {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      roles: user.roles,
      doctor: user.doctorProfile,
      staff: user.staffProfile,
      telegram: user.staffProfile
        ? {
            allowed: user.staffProfile.telegramAllowed,
            connected: Boolean(user.telegramLink?.chatId),
            preferences: user.notificationPreference ?? {
              appointmentCreated: true,
              appointmentCancelled: true,
              consultationCreated: true,
              consultationMessage: false,
            },
          }
        : null,
    };
  }

  private async issue(userId: string) {
    const accessToken = await this.jwt.signAsync({ sub: userId }, { secret: ACCESS_SECRET(), expiresIn: "15m" });
    const refreshToken = newRefreshToken();
    await this.prisma.refreshSession.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    const profile = await this.profile(userId);
    return { accessToken, refreshToken, profile };
  }
}
