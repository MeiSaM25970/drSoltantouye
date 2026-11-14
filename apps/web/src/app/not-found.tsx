import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui";
import { RoleButtonLink } from "@/components/role-link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 text-center">
      <span className="bob grid h-20 w-20 place-items-center rounded-3xl bg-accent-soft text-accent"><Icon name="tooth" size={40} /></span>
      <p className="mt-6 text-sm font-medium text-accent">خطای ۴۰۴</p>
      <h1 className="mt-2 text-3xl font-bold">این صفحه پیدا نشد</h1>
      <p className="mt-3 text-muted">آدرس را دوباره بررسی کنید یا از صفحه اول ادامه دهید.</p>
      <div className="mt-7 flex gap-3">
        <ButtonLink href="/" icon="home">صفحه اول</ButtonLink>
        <RoleButtonLink kind="book" variant="ghost" icon="calendar">گرفتن نوبت</RoleButtonLink>
      </div>
    </div>
  );
}
