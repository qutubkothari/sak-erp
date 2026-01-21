'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { locales } from '@/i18n/request';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLanguage = (newLocale: string) => {
    // Remove current locale from pathname
    const pathWithoutLocale = pathname.replace(`/${locale}`, '');
    // Navigate to new locale path
    router.push(`/${newLocale}${pathWithoutLocale}`);
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#E8DCC4] bg-white p-1">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => switchLanguage(loc)}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
            locale === loc
              ? 'bg-[#6F4E37] text-white'
              : 'text-[#6F4E37] hover:bg-[#F4ECE2]'
          }`}
        >
          {loc === 'en' ? 'English' : 'العربية'}
        </button>
      ))}
    </div>
  );
}
