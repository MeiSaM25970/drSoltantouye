import { CLINIC_SEED } from "@clinic/shared";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/motion";
import { Empty, PageIntro } from "@/components/ui";
import { mediaUrl } from "@/lib/api";
import { apiPublic } from "@/lib/public";
import { pageMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "پست‌ها",
  description: "ویدیو و عکس‌های مطب دکتر امیر سلطان‌طویه در ساری، با همان کپشن‌ها، روی خود سایت.",
  path: "/posts",
});

type Item = { id: string; kind: "IMAGE" | "VIDEO"; url: string; caption: string; instagramUrl?: string | null };
type Clinic = typeof CLINIC_SEED;

export default async function PostsPage() {
  const [items, clinic] = await Promise.all([apiPublic<Item[]>("/gallery"), apiPublic<Clinic>("/clinic")]);
  const instagram = clinic?.instagram ?? CLINIC_SEED.instagram;
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-16">
      <PageIntro eyebrow="از مطب" title="پست‌ها" text={`عکس و ویدیوهای صفحه اینستاگرام ${instagram}، همین‌جا و بدون نیاز به باز کردن اینستاگرام.`} />
      {items?.length ? (
        <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5">
          {items.map((item, index) => (
            <Reveal key={item.id} delay={(index % 3) * 80} className="break-inside-avoid">
              <article className="card card-hover overflow-hidden">
                {item.kind === "VIDEO" ? (
                  <video src={mediaUrl(item.url)} controls playsInline preload="metadata" className="aspect-[4/5] w-full bg-ink object-cover" />
                ) : (
                  <div className="shot"><img src={mediaUrl(item.url)} alt={item.caption.slice(0, 140) || "پست مطب"} loading="lazy" className="w-full object-cover" /></div>
                )}
                {item.caption ? <p className="line-clamp-6 whitespace-pre-line px-5 py-4 text-sm leading-8">{item.caption}</p> : null}
                {item.instagramUrl ? (
                  <p className="px-5 pb-4 text-sm">
                    <a className="link-underline inline-flex items-center gap-1.5 font-medium text-accent-deep" href={item.instagramUrl} rel="noreferrer"><Icon name="instagram" size={16} />پست اصلی</a>
                  </p>
                ) : null}
              </article>
            </Reveal>
          ))}
        </div>
      ) : (
        <Empty icon="image" title="هنوز پستی روی سایت نیست" text="به‌زودی عکس و ویدیوهای مطب اینجا قرار می‌گیرد." />
      )}
    </div>
  );
}
