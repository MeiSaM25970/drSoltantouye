import { CLINIC_PLACE, CLINIC_SEED, resolveContent } from "@clinic/shared";
import { mediaUrl } from "@/lib/api";
import { siteImage } from "@/lib/photos";
import { apiPublic } from "@/lib/public";
import { CLINIC_ID, SITE_NAME, SITE_URL } from "@/lib/seo";
import { JsonLd } from "./json-ld";

type Clinic = typeof CLINIC_SEED & { logoUrl?: string; content?: unknown };
type Service = { slug: string; title: string; summary: string };

const absolute = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path}`);

export async function ClinicJsonLd() {
  const [clinicData, services] = await Promise.all([apiPublic<Clinic>("/clinic"), apiPublic<Service[]>("/services")]);
  const clinic = clinicData ?? CLINIC_SEED;
  const content = resolveContent(clinicData?.content);
  const logo = clinicData?.logoUrl ? absolute(mediaUrl(clinicData.logoUrl)) : `${SITE_URL}/icon.svg`;
  const sameAs = `https://instagram.com/${clinic.instagram}`;
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: "fa-IR",
        publisher: { "@id": CLINIC_ID },
      },
      {
        "@type": ["Dentist", "MedicalClinic"],
        "@id": CLINIC_ID,
        name: clinic.name,
        description: clinic.about,
        url: SITE_URL,
        image: [absolute(siteImage(content["hero.image"])), absolute(siteImage(content["doctor.image"]))],
        logo,
        telephone: [`+98${clinic.phone1.slice(1)}`, `+98${clinic.phone2.slice(1)}`],
        medicalSpecialty: "https://schema.org/Dentistry",
        identifier: { "@type": "PropertyValue", propertyID: "نظام پزشکی", value: CLINIC_PLACE.license },
        address: {
          "@type": "PostalAddress",
          streetAddress: clinic.address,
          addressLocality: CLINIC_PLACE.city,
          addressRegion: CLINIC_PLACE.region,
          addressCountry: CLINIC_PLACE.country,
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: CLINIC_PLACE.latitude,
          longitude: CLINIC_PLACE.longitude,
        },
        hasMap: `https://www.openstreetmap.org/?mlat=${CLINIC_PLACE.latitude}&mlon=${CLINIC_PLACE.longitude}#map=17/${CLINIC_PLACE.latitude}/${CLINIC_PLACE.longitude}`,
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"],
            opens: "09:00",
            closes: "13:00",
          },
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"],
            opens: "16:00",
            closes: "21:00",
          },
          { "@type": "OpeningHoursSpecification", dayOfWeek: "Thursday", opens: "09:00", closes: "13:00" },
        ],
        openingHours: clinic.hoursNote,
        areaServed: { "@type": "City", name: CLINIC_PLACE.city },
        sameAs: [sameAs],
        currenciesAccepted: "IRR",
        paymentAccepted: "Cash",
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "خدمات دندانپزشکی",
          itemListElement: (services ?? []).map((service) => ({
            "@type": "Offer",
            itemOffered: { "@type": "Service", name: service.title, description: service.summary, url: `${SITE_URL}/services/${service.slug}` },
          })),
        },
      },
        ],
      }}
    />
  );
}
