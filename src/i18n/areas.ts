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

export const areaName = (key: string | null | undefined, lang: Lang): string => {
  if (!key) return '';
  const a = AREAS[key];
  if (!a) return key;
  return lang === 'ar' ? a.ar : a.en || a.ar;
};
