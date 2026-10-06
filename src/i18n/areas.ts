import type { Lang, LocalizedText } from '@/domain/types';

/** Doha / Qatar areas used by companies and addresses. Keys are stable identifiers stored in data. */
export const AREAS: Record<string, LocalizedText> = {
  alsadd: { ar: 'السد', en: 'Al Sadd' },
  westbay: { ar: 'الخليج الغربي', en: 'West Bay' },
  dafna: { ar: 'الدفنة', en: 'Al Dafna' },
  thepearl: { ar: 'اللؤلؤة', en: 'The Pearl' },
  lusail: { ar: 'لوسيل', en: 'Lusail' },
  alwakrah: { ar: 'الوكرة', en: 'Al Wakrah' },
  alrayyan: { ar: 'الريان', en: 'Al Rayyan' },
  alwaab: { ar: 'الوعب', en: 'Al Waab' },
  msheireb: { ar: 'مشيرب', en: 'Msheireb' },
  madinatkhalifa: { ar: 'مدينة خليفة', en: 'Madinat Khalifa' },
  almuraikh: { ar: 'المريخ', en: 'Al Muraikh' },
  aziziyah: { ar: 'العزيزية', en: 'Al Aziziyah' },
  alsailiya: { ar: 'السيلية', en: 'Al Sailiya' },
  industrial: { ar: 'المنطقة الصناعية', en: 'Industrial Area' },
  mesaimeer: { ar: 'مسيمير', en: 'Mesaimeer' },
  alhilal: { ar: 'الهلال', en: 'Al Hilal' },
  binmahmoud: { ar: 'بن محمود', en: 'Bin Mahmoud' },
  alduhail: { ar: 'الدحيل', en: 'Al Duhail' },
  ummsalal: { ar: 'أم صلال', en: 'Umm Salal' },
  alkhor: { ar: 'الخور', en: 'Al Khor' },
  oldairport: { ar: 'المطار القديم', en: 'Old Airport' },
  alghanim: { ar: 'الغانم', en: 'Al Ghanim' },
  alnasr: { ar: 'النصر', en: 'Al Nasr' },
  ummghuwailina: { ar: 'أم غويلينا', en: 'Umm Ghuwailina' },
};

export const AREA_KEYS = Object.keys(AREAS);

/** Approximate centre of each area — used when the customer picks an area instead of sharing GPS. */
export const AREA_CENTERS: Record<string, { lat: number; lng: number }> = {
  alsadd: { lat: 25.2825, lng: 51.5102 },
  westbay: { lat: 25.3231, lng: 51.5311 },
  dafna: { lat: 25.3153, lng: 51.5273 },
  thepearl: { lat: 25.3712, lng: 51.5509 },
  lusail: { lat: 25.4321, lng: 51.5033 },
  alwakrah: { lat: 25.1715, lng: 51.6034 },
  alrayyan: { lat: 25.2919, lng: 51.4244 },
  alwaab: { lat: 25.2628, lng: 51.4564 },
  msheireb: { lat: 25.2863, lng: 51.5266 },
  madinatkhalifa: { lat: 25.3158, lng: 51.4762 },
  almuraikh: { lat: 25.2984, lng: 51.4482 },
  aziziyah: { lat: 25.2481, lng: 51.4593 },
  alsailiya: { lat: 25.2283, lng: 51.4112 },
  industrial: { lat: 25.1962, lng: 51.4568 },
  mesaimeer: { lat: 25.2334, lng: 51.4958 },
  alhilal: { lat: 25.2641, lng: 51.5413 },
  binmahmoud: { lat: 25.2833, lng: 51.5192 },
  alduhail: { lat: 25.3452, lng: 51.4703 },
  ummsalal: { lat: 25.4121, lng: 51.4063 },
  alkhor: { lat: 25.6834, lng: 51.5058 },
  oldairport: { lat: 25.2571, lng: 51.5614 },
  alghanim: { lat: 25.2812, lng: 51.5463 },
  alnasr: { lat: 25.2792, lng: 51.4902 },
  ummghuwailina: { lat: 25.2713, lng: 51.5452 },
};

export const areaName = (key: string | null | undefined, lang: Lang): string => {
  if (!key) return '';
  const a = AREAS[key];
  if (!a) return key;
  return lang === 'ar' ? a.ar : a.en || a.ar;
};
