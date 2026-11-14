import { SetMetadata } from "@nestjs/common";
import type { Role } from "@clinic/shared";

export const Roles = (...roles: Role[]) => SetMetadata("roles", roles);
