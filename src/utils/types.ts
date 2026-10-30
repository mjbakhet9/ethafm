export interface RawZekr {
  id: number;
  t: string;
  r: number;
  f: string;
  sh: string;
  hd: string;
  bn: string;
}

export interface RawCategory {
  id: number;
  title: string;
  z: RawZekr[];
}

export interface AzkarDataset {
  cats: RawCategory[];
}

export interface Zekr {
  id: number;
  text: string;
  repeat: number;
  footnote: string;
  sharh: string;
  hadeth: string;
  benefit: string;
  catId: number;
  catTitle: string;
  idx: number;
  hasExtras: boolean;
}

export interface Category {
  id: number;
  title: string;
  azkar: Zekr[];
  group: CategoryGroupKey;
}

export type CategoryGroupKey =
  | 'all'
  | 'daily'
  | 'prayer'
  | 'home_mosque'
  | 'food_social'
  | 'travel_nature'
  | 'distress_sickness'
  | 'hajj_fasting'
  | 'virtues_repentance';

export interface CategoryGroupInfo {
  key: CategoryGroupKey;
  label: string;
  description: string;
}

export interface SearchHit {
  zekr: Zekr;
  where: 'القسم' | 'الذكر' | 'الشرح' | 'الحديث' | 'الفوائد';
  snippet: string;
}

export type SearchScope = 'all' | 'title' | 'text' | 'sharh' | 'hadeth' | 'benefit';

export interface RichToken {
  type: 'text' | 'verse' | 'note' | 'mark';
  content: string;
  footnoteNum?: number;
}

export interface CustomTasbihPhrase {
  id: string;
  text: string;
  defaultTarget: number;
}

export interface MoodGuidancePreset {
  id: string;
  label: string;
  subtitle: string;
  catIds: number[];
}

export interface DailyHistoryMap {
  [isoDate: string]: {
    completedAzkar: number;
    totalTaps: number;
  };
}
