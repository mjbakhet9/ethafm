import { Category, CategoryGroupInfo, CategoryGroupKey, RichToken, SearchHit, SearchScope, Zekr } from './types';

/**
 * Checks if a character is an Arabic diacritic (tashkeel), tatweel, or Quranic annotation mark.
 */
export function isArabicMark(code: number): boolean {
  return (
    (code >= 0x064b && code <= 0x065f) ||
    code === 0x0670 ||
    (code >= 0x06d6 && code <= 0x06ed) ||
    code === 0x0640
  );
}

/**
 * Unifies Arabic letter variants (Alef forms, Teh Marbuta, Yeh/Alef Maqsura, Hamza forms)
 * so searching works seamlessly regardless of hamza or ending spelling.
 */
export function foldArabicChar(ch: string): string {
  switch (ch) {
    case 'أ':
    case 'إ':
    case 'آ':
    case 'ٱ':
      return 'ا';
    case 'ى':
      return 'ي';
    case 'ة':
      return 'ه';
    case 'ؤ':
      return 'و';
    case 'ئ':
      return 'ي';
    default:
      return ch;
  }
}

/**
 * Removes tashkeel and normalizes Arabic letter variants for fast, forgiving search.
 */
export function normalizeArabic(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (!isArabicMark(code)) {
      out += foldArabicChar(input[i]);
    }
  }
  return out;
}

/**
 * Converts Western digits in a number or string to Eastern Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩).
 */
export function arabicDigits(val: number | string): string {
  const s = String(val);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 48 && c <= 57) {
      out += String.fromCharCode(0x0660 + (c - 48));
    } else {
      out += s[i];
    }
  }
  return out;
}

const TAG_REGEX = /<v>|<\/v>|<s>|<\/s>|<n>(\d+)<\/n>/g;
const MARKER_REGEX = /\s*<n>\d+<\/n>/g;

/**
 * Parses custom markup in azkar.json:
 * <v>verse</v> -> Quranic verse wrapped in ﴿ ... ﴾
 * <s>narrator note</s> -> Narrator or action note wrapped in [ ... ]
 * <n>k</n> -> Superscript footnote number in Arabic digits
 */
export function parseRichMarkup(src: string): RichToken[] {
  if (!src) return [];
  const tokens: RichToken[] = [];
  let lastIndex = 0;
  let inVerse = false;
  let inNote = false;

  const pushText = (text: string) => {
    if (!text) return;
    const type = inVerse ? 'verse' : inNote ? 'note' : 'text';
    const prev = tokens[tokens.length - 1];
    if (prev && prev.type === type && prev.type !== 'mark') {
      prev.content += text;
    } else {
      tokens.push({ type, content: text });
    }
  };

  TAG_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_REGEX.exec(src)) !== null) {
    if (match.index > lastIndex) {
      pushText(src.slice(lastIndex, match.index));
    }
    lastIndex = TAG_REGEX.lastIndex;
    const tag = match[0];

    if (tag === '<v>') {
      inVerse = true;
      pushText('﴿');
    } else if (tag === '</v>') {
      pushText('﴾');
      inVerse = false;
    } else if (tag === '<s>') {
      inNote = true;
      pushText('[');
    } else if (tag === '</s>') {
      pushText(']');
      inNote = false;
    } else if (match[1] !== undefined) {
      const num = parseInt(match[1], 10);
      tokens.push({
        type: 'mark',
        content: arabicDigits(num),
        footnoteNum: num,
      });
    }
  }

  if (lastIndex < src.length) {
    pushText(src.slice(lastIndex));
  }

  return tokens;
}

/**
 * Strips markup tags for plain-text copying, sharing, and indexing.
 */
export function plainText(src: string): string {
  if (!src) return '';
  return src
    .replace(MARKER_REGEX, '')
    .replace(/<v>/g, '﴿')
    .replace(/<\/v>/g, '﴾')
    .replace(/<s>/g, '[')
    .replace(/<\/s>/g, ']');
}

/**
 * Extracts a contextual snippet from `src` around the first match of already-normalized `normToken`.
 */
export function extractSnippet(src: string, normToken: string): string {
  if (!src) return '';
  let normBuilder = '';
  const indexMap: number[] = [];

  for (let i = 0; i < src.length; i++) {
    const code = src.charCodeAt(i);
    if (!isArabicMark(code)) {
      normBuilder += foldArabicChar(src[i]);
      indexMap.push(i);
    }
  }

  const pos = normBuilder.indexOf(normToken);
  if (pos < 0 || indexMap.length === 0) {
    return src.slice(0, 110).replace(/\n/g, ' ').trim();
  }

  const startIdx = indexMap[Math.max(0, pos - 30)];
  const endIdx = indexMap[Math.min(indexMap.length - 1, pos + normToken.length + 75)];
  const prefix = startIdx > 0 ? '…' : '';
  const suffix = endIdx < src.length - 1 ? '…' : '';
  return (prefix + src.slice(startIdx, endIdx + 1).replace(/\n/g, ' ').trim() + suffix);
}

/**
 * Formats a Zekr for clipboard copy.
 */
export function formatCopyZekr(zekr: Zekr, withSource = true): string {
  const base = plainText(zekr.text);
  if (withSource && zekr.footnote.trim().length > 0) {
    return `${base}\n\n${plainText(zekr.footnote)}`;
  }
  return base;
}

/**
 * Formats the full Zekr with its scholarly Sharh, Hadeth, and Benefits.
 */
export function formatCopyAll(zekr: Zekr): string {
  const parts: string[] = [zekr.catTitle, '', formatCopyZekr(zekr, true)];
  if (zekr.repeat > 1) {
    parts.push('', `يُقال ${arabicDigits(zekr.repeat)} مرات`);
  }
  if (zekr.sharh.trim()) {
    parts.push('', '— الشرح —', plainText(zekr.sharh));
  }
  if (zekr.hadeth.trim()) {
    parts.push('', '— الحديث —', plainText(zekr.hadeth));
  }
  if (zekr.benefit.trim()) {
    parts.push('', '— الفوائد —', plainText(zekr.benefit));
  }
  parts.push('', '— حصن المسلم مع الشرح (إتحاف المسلم)');
  return parts.join('\n');
}

/**
 * Thematic classification of all 133 categories in Hisn Al-Muslim for effortless browsing.
 */
export const CATEGORY_GROUPS: CategoryGroupInfo[] = [
  { key: 'all', label: 'جميع الأبواب', description: 'فهرس الكتاب الكامل (١٣٣ بابًا)' },
  { key: 'daily', label: 'اليوم والليلة', description: 'الصباح والمساء والنوم والاستيقاظ واللباس' },
  { key: 'prayer', label: 'الطهارة والصلاة', description: 'الوضوء والأذان وأذكار الصلاة وبعدها' },
  { key: 'home_mosque', label: 'المنزل والمسجد', description: 'دخول وخروج المنزل والخلاء والمسجد' },
  { key: 'distress_sickness', label: 'الكرب والمرض والجنائز', description: 'الهم والحزن والرقية والمرض والتعزية' },
  { key: 'food_social', label: 'الطعام والآداب', description: 'الطعام والشراب والمجلس والسلام والزواج' },
  { key: 'travel_nature', label: 'السفر والطبيعة', description: 'السفر والركوب والمطر والريح والرعد' },
  { key: 'hajj_fasting', label: 'الصيام والحج', description: 'رؤية الهلال والإفطار والتلبية وعرفة والمشاعر' },
  { key: 'virtues_repentance', label: 'التوبة والفضائل', description: 'الاستغفار والصلاة على النبي وفضائل الذكر' },
];

export function classifyCategoryGroup(catId: number): CategoryGroupKey {
  // Morning, Evening, Sleep, Waking up, Clothes
  if ([1, 2, 3, 4, 5, 27, 135, 28, 29, 30, 31].includes(catId)) {
    return 'daily';
  }
  // Restroom, Home, Mosque
  if ([6, 7, 10, 11, 12, 13, 14].includes(catId)) {
    return 'home_mosque';
  }
  // Wudu, Adhan, Prayer, Istikharah, Witr
  if (
    [8, 9, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 32, 33, 42].includes(catId)
  ) {
    return 'prayer';
  }
  // Distress, Fear, Debt, Sickness, Death, Graves, Evil Eye
  if (
    (catId >= 34 && catId <= 46 && catId !== 42) ||
    (catId >= 49 && catId <= 61) ||
    [83, 84, 89, 93, 95, 125, 126, 127, 130].includes(catId)
  ) {
    return 'distress_sickness';
  }
  // Weather, Travel, Market, Animals
  if (
    (catId >= 62 && catId <= 67) ||
    (catId >= 96 && catId <= 106) ||
    [111, 112].includes(catId)
  ) {
    return 'travel_nature';
  }
  // Fasting, Crescent, Hajj, Sacrifice
  if (
    [68, 69, 74, 75, 76].includes(catId) ||
    (catId >= 116 && catId <= 122) ||
    catId === 128
  ) {
    return 'hajj_fasting';
  }
  // Virtues, Istighfar, Salawat, Comprehensive adab
  if ([108, 131, 132, 133, 134].includes(catId)) {
    return 'virtues_repentance';
  }
  // Everything else: Food, Sneezing, Marriage, Newborn, Majlis, Social greetings
  return 'food_social';
}

export interface IndexedZekr {
  zekr: Zekr;
  normTitle: string;
  normText: string;
  normSharh: string;
  normHadeth: string;
  normBenefit: string;
}

export function buildSearchIndex(allAzkar: Zekr[]): IndexedZekr[] {
  return allAzkar.map((zekr) => ({
    zekr,
    normTitle: normalizeArabic(zekr.catTitle),
    normText: normalizeArabic(plainText(zekr.text)),
    normSharh: normalizeArabic(plainText(zekr.sharh)),
    normHadeth: normalizeArabic(plainText(zekr.hadeth)),
    normBenefit: normalizeArabic(plainText(zekr.benefit)),
  }));
}

export function searchAzkar(
  index: IndexedZekr[],
  query: string,
  scope: SearchScope = 'all',
  limit = 80
): SearchHit[] {
  const tokens = normalizeArabic(query.trim())
    .split(/\s+/)
    .filter((t) => t.length > 0);

  const totalChars = tokens.reduce((acc, t) => acc + t.length, 0);
  if (tokens.length === 0 || totalChars < 2) {
    return [];
  }

  const hits: SearchHit[] = [];
  const matchesAll = (target: string) => tokens.every((t) => target.includes(t));

  for (let i = 0; i < index.length; i++) {
    const item = index[i];
    const z = item.zekr;
    let where: SearchHit['where'] | null = null;
    let src = '';

    if ((scope === 'all' || scope === 'title') && matchesAll(item.normTitle)) {
      where = 'القسم';
      src = z.catTitle;
    } else if ((scope === 'all' || scope === 'text') && matchesAll(item.normText)) {
      where = 'الذكر';
      src = plainText(z.text);
    } else if ((scope === 'all' || scope === 'sharh') && matchesAll(item.normSharh)) {
      where = 'الشرح';
      src = plainText(z.sharh);
    } else if ((scope === 'all' || scope === 'hadeth') && matchesAll(item.normHadeth)) {
      where = 'الحديث';
      src = plainText(z.hadeth);
    } else if ((scope === 'all' || scope === 'benefit') && matchesAll(item.normBenefit)) {
      where = 'الفوائد';
      src = plainText(z.benefit);
    }

    if (where) {
      hits.push({
        zekr: z,
        where,
        snippet: extractSnippet(src, tokens[0]),
      });
      if (hits.length >= limit) break;
    }
  }

  return hits;
}

/**
 * Calculates progress statistics for a category given a map of today's counts.
 */
export function getCategoryProgress(
  cat: Category,
  counts: Record<number, number>
): { doneAzkar: number; totalAzkar: number; doneClicks: number; totalClicks: number; percent: number } {
  let doneAzkar = 0;
  let doneClicks = 0;
  let totalClicks = 0;

  for (const z of cat.azkar) {
    const c = Math.min(counts[z.id] || 0, z.repeat);
    if (c >= z.repeat) {
      doneAzkar++;
    }
    doneClicks += c;
    totalClicks += z.repeat;
  }

  const totalAzkar = cat.azkar.length;
  return {
    doneAzkar,
    totalAzkar,
    doneClicks,
    totalClicks,
    percent: totalAzkar > 0 ? Math.round((doneAzkar / totalAzkar) * 100) : 0,
  };
}

/**
 * Removes Arabic diacritics (tashkeel) from text while preserving original letter forms (أ، إ، آ، ة، ى)
 * for users who prefer clean reading without diacritics.
 */
export function stripTashkeel(src: string): string {
  if (!src) return '';
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const code = src.charCodeAt(i);
    if (!isArabicMark(code)) {
      out += src[i];
    }
  }
  return out;
}

/**
 * Curated Emotional & Situational Guidance ("بمَ تشعر الآن؟") mapping real-life states to authentic chapters.
 */
export const MOOD_GUIDANCE_PRESETS = [
  {
    id: 'distress',
    label: 'الهمّ والكرب',
    subtitle: 'تفريج الكروب وزوال الغم والحزن',
    catIds: [34, 35, 43, 54],
  },
  {
    id: 'insomnia_fear',
    label: 'الأرق والفزع',
    subtitle: 'السكينة عند النوم والتقلب ليلاً والوحشة',
    catIds: [28, 29, 30, 31, 127],
  },
  {
    id: 'sickness_pain',
    label: 'المرض والألم',
    subtitle: 'ما يُقال عند الوجع وعيادة المريض والرقية',
    catIds: [125, 50, 51, 49, 126],
  },
  {
    id: 'debt_difficulty',
    label: 'الدَّين وتيسير الأمور',
    subtitle: 'قضاء الدين وما يُقال عند استصعاب الأمر',
    catIds: [41, 43, 46],
  },
  {
    id: 'waswasa_anger',
    label: 'الوسوسة والغضب',
    subtitle: 'طرد الشيطان ووساوس الإيمان والصلاة وعلاج الغضب',
    catIds: [40, 42, 45, 83, 130],
  },
  {
    id: 'repentance',
    label: 'التوبة والاستغفار',
    subtitle: 'سيد الاستغفار وما يقول ويفعل من أذنب ذنبًا',
    catIds: [44, 131, 86, 132],
  },
  {
    id: 'istikharah_travel',
    label: 'الاستخارة والسفر',
    subtitle: 'طلب الخيرة من الله وأدعية الركوب والسفر',
    catIds: [26, 96, 97, 98, 105],
  },
  {
    id: 'joy_gratitude',
    label: 'السرور والنعمة',
    subtitle: 'ما يقول من أتاه أمر يسره أو صُنع إليه معروف',
    catIds: [107, 123, 124, 88, 3],
  },
];

/**
 * Calculates consecutive active days (streak) and 7-day history strip from a DailyHistoryMap.
 */
export function calculateStreakStats(
  history: Record<string, { completedAzkar: number; totalTaps: number }>,
  todayIso: string
): {
  currentStreak: number;
  totalActiveDays: number;
  last7Days: { iso: string; dayLabel: string; active: boolean; count: number }[];
} {
  const ARABIC_DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const baseDate = new Date(`${todayIso}T12:00:00`);

  const toIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Build last 7 days array (oldest to newest: 6 days ago -> today)
  const last7Days: { iso: string; dayLabel: string; active: boolean; count: number }[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(baseDate.getTime() - offset * 86400000);
    const iso = toIso(d);
    const entry = history[iso];
    const count = entry ? entry.completedAzkar : 0;
    last7Days.push({
      iso,
      dayLabel: offset === 0 ? 'اليوم' : ARABIC_DAY_NAMES[d.getDay()],
      active: count > 0 || (entry ? entry.totalTaps > 0 : false),
      count,
    });
  }

  // Count consecutive streak ending today (or yesterday if today hasn't started yet)
  let currentStreak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(baseDate.getTime() - i * 86400000);
    const iso = toIso(d);
    const entry = history[iso];
    const isActive = Boolean(entry && (entry.completedAzkar > 0 || entry.totalTaps > 0));
    if (isActive) {
      currentStreak++;
    } else if (i === 0) {
      // Allow streak from yesterday to stay visible before user taps today
      continue;
    } else {
      break;
    }
  }

  const totalActiveDays = Object.values(history).filter(
    (e) => e.completedAzkar > 0 || e.totalTaps > 0
  ).length;

  return { currentStreak, totalActiveDays, last7Days };
}

