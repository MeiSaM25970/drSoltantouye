import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ cookies?: { access_token?: string }; user?: unknown }>();
    const token = request.cookies?.access_token;
    if (!token) throw new UnauthorizedException("وارد شوید");
    request.user = await this.auth.userFromAccessToken(token);
    return true;
  }
}
