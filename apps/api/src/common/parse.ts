import { BadRequestException } from "@nestjs/common";
import { z } from "zod";

export function parseBody<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new BadRequestException(result.error.issues[0]?.message ?? "اطلاعات فرم کامل نیست");
  }
  return result.data;
}
