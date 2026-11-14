import { PrismaClient, type Role } from "@prisma/client";
import argon2 from "argon2";
import { CLINIC_SEED, DOCTOR_BIO, DOCTOR_PHOTO, FAQS, HERO_PHOTO, SERVICES } from "@clinic/shared";

const prisma = new PrismaClient();

async function main() {
  const clinic = await prisma.clinicSettings.findUnique({ where: { id: "clinic" } });
  if (!clinic) {
    await prisma.clinicSettings.create({ data: { id: "clinic", ...CLINIC_SEED, content: { "doctor.image": DOCTOR_PHOTO, "hero.image": HERO_PHOTO } } });
  }

  for (const [index, service] of SERVICES.entries()) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: {},
      create: { ...service, sortOrder: index },
    });
  }

  if ((await prisma.faq.count()) === 0) {
    await prisma.faq.createMany({
      data: FAQS.map((faq, index) => ({ ...faq, sortOrder: index })),
    });
  }

  const production = process.env.NODE_ENV === "production";
  const adminPassword = process.env.ADMIN_PASSWORD || "Dr@Amir#";
  if (production && adminPassword.length < 8) {
    throw new Error("ADMIN_PASSWORD باید در محیط پروداکشن حداقل ۸ کاراکتر باشد");
  }

  const admin = await ensureUser({
    phone: process.env.ADMIN_PHONE || "09113556531",
    legacyPhone: "09120000001",
    password: adminPassword,
    fullName: "دکتر امیر سلطان‌طویه",
    roles: ["ADMIN", "DENTIST"],
    title: "جراح دندانپزشک",
    telegramAllowed: true,
    doctor: {
      specialty: "جراح دندانپزشک و ایمپلنت",
      bio: DOCTOR_BIO,
      slug: "amir-soltantouye",
    },
  });

  const doctor = await prisma.doctorProfile.findUnique({ where: { userId: admin.id } });
  if (doctor) {
    const services = await prisma.service.findMany();
    await prisma.doctorService.createMany({
      data: services.map((service) => ({ doctorId: doctor.id, serviceId: service.id })),
      skipDuplicates: true,
    });
    if ((await prisma.workingHour.count({ where: { doctorId: doctor.id } })) === 0) {
      const fullDays = [6, 0, 1, 2, 3];
      await prisma.workingHour.createMany({
        data: [
          ...fullDays.flatMap((weekday) => [
            { doctorId: doctor.id, weekday, startMin: 9 * 60, endMin: 13 * 60 },
            { doctorId: doctor.id, weekday, startMin: 16 * 60, endMin: 21 * 60 },
          ]),
          { doctorId: doctor.id, weekday: 4, startMin: 9 * 60, endMin: 13 * 60 },
        ],
      });
    }
  }

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS appointment_one_active_slot
    ON "Appointment" ("doctorId", "startsAt")
    WHERE status NOT IN ('CANCELLED', 'NO_SHOW')
  `);

  console.log("seed ready");
}

async function ensureUser(input: {
  phone: string;
  /** An account created by an older seed under this number is moved to the new number and password. */
  legacyPhone?: string;
  password: string;
  fullName: string;
  roles: Role[];
  title?: string;
  telegramAllowed?: boolean;
  doctor?: { specialty: string; bio: string; slug: string };
}) {
  const existing = await prisma.user.findUnique({ where: { phone: input.phone } });
  if (existing) return existing;
  if (input.legacyPhone) {
    const legacy = await prisma.user.findUnique({ where: { phone: input.legacyPhone } });
    if (legacy) {
      return prisma.user.update({
        where: { id: legacy.id },
        data: { phone: input.phone, passwordHash: await argon2.hash(input.password) },
      });
    }
  }
  return prisma.user.create({
    data: {
      phone: input.phone,
      fullName: input.fullName,
      passwordHash: await argon2.hash(input.password),
      roles: input.roles,
      patientProfile: input.roles.includes("PATIENT") ? { create: {} } : undefined,
      staffProfile: input.roles.some((role) => role !== "PATIENT")
        ? { create: { title: input.title, telegramAllowed: input.telegramAllowed ?? false } }
        : undefined,
      notificationPreference: input.roles.some((role) => role !== "PATIENT") ? { create: {} } : undefined,
      doctorProfile: input.doctor ? { create: input.doctor } : undefined,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
