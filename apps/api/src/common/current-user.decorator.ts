import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { SessionUser } from "./http";

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest<{ user: SessionUser }>().user;
});
