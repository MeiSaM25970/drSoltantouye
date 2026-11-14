import "reflect-metadata";
import { mkdirSync } from "fs";
import { join } from "path";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { jwtSecret } from "./common/secrets";

async function bootstrap() {
  jwtSecret(); // fail fast when the production secret is missing
  mkdirSync(join(process.cwd(), "uploads"), { recursive: true });
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // behind nginx and the web proxy: take the visitor IP from X-Forwarded-For (rate limits)
  app.set("trust proxy", true);
  app.use(cookieParser());
  app.enableCors({
    origin: (process.env.WEB_ORIGIN ?? "http://localhost:3000").split(","),
    credentials: true,
  });
  // patient files live in uploads/private and are only served by /files after an access check
  app.use("/uploads/private", (_req: unknown, res: { status: (code: number) => { end: () => void } }) => res.status(404).end());
  app.useStaticAssets(join(process.cwd(), "uploads"), {
    prefix: "/uploads/",
    index: false,
    dotfiles: "deny",
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    },
  });
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`api listening on ${port}`);
}

void bootstrap();
