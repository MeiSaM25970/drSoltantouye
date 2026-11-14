import { CLINIC_PLACE, CLINIC_SEED, FAQS } from "@clinic/shared";
import { apiPublic } from "@/lib/public";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Clinic = typeof CLINIC_SEED;
type Faq = { question: string; answer: string };

export async function GET() {
  const clinic = (await apiPublic<Clinic>("/clinic")) ?? CLINIC_SEED;
  const faqs = (await apiPublic<Faq[]>("/faqs")) ?? FAQS;
  const lines = [
    `# ${clinic.name}`,
    "",
    `> ${clinic.tagline} در ${CLINIC_PLACE.city}. نوبت بدون پرداخت اینترنتی ثبت می‌شود. مشاورهٔ سایت جای معاینهٔ حضوری را نمی‌گیرد.`,
    "",
    "## Facts",
    `- Doctor: ${clinic.doctorName}`,
    `- Medical council license: ${CLINIC_PLACE.license}`,
    `- Clinic: ${clinic.name}`,
    `- Address: ${clinic.address}`,
    `- City: ${CLINIC_PLACE.city}, ${CLINIC_PLACE.region}, Iran`,
    `- Phones: ${clinic.phone1}, ${clinic.phone2}`,
    `- Hours: ${clinic.hoursNote}`,
    `- Coordinates (approximate): ${CLINIC_PLACE.latitude}, ${CLINIC_PLACE.longitude}`,
    `- Plus code: ${CLINIC_PLACE.plusCode}`,
    `- Website: ${SITE_URL}`,
    `- Instagram: https://instagram.com/${clinic.instagram}`,
    `- Booking: ${SITE_URL}/account/appointments/new`,
    `- Payment online: no`,
    "",
    "## Answers",
    ...faqs.flatMap((faq) => [`Q: ${faq.question}`, `A: ${faq.answer}`, ""]),
    "## English",
    `${clinic.doctorName} is a dentist and implant surgeon in Sari, Mazandaran, Iran.`,
    `The clinic is on Amir Mazandarani Street, opposite Khayyam Street, fourth floor, unit 401.`,
    `Iranian medical council number ${CLINIC_PLACE.license}.`,
    "Appointments on the website do not require an online payment. An online question is not a diagnosis.",
  ];
  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
