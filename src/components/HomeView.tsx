import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  Check,
  ChevronLeft,
  Compass,
  Moon,
  Search,
  Sunrise,
  Sunset,
  X,
} from 'lucide-react';
import { Category, CategoryGroupKey, DailyHistoryMap, Zekr } from '../utils/types';
import {
  CATEGORY_GROUPS,
  MOOD_GUIDANCE_PRESETS,
  arabicDigits,
  calculateStreakStats,
  getCategoryProgress,
  normalizeArabic,
  stripTashkeel,
} from '../utils/arabic';
import { RichArabicText, StatProgressRing } from './RichArabicText';

interface HomeViewProps {
  categories: Category[];
  allAzkar: Zekr[];
  counts: Record<number, number>;
  history: DailyHistoryMap;
  todayIso: string;
  lastRead: { catId: number; idx: number } | null;
  fontScale: number;
  showTashkeel: boolean;
  onOpenCategory: (catId: number, idx?: number) => void;
  onOpenSearch: (initialQuery?: string) => void;
}

const QUICK_CATS = [
  { catId: 27, title: 'أذكار الصباح', subtitle: 'تحصين اليوم وبركته', icon: Sunrise },
  { catId: 135, title: 'أذكار المساء', subtitle: 'حفظ المساء والسكينة', icon: Sunset },
  { catId: 28, title: 'أذكار النوم', subtitle: 'الختام والوضوء قبل المنام', icon: Moon },
  { catId: 25, title: 'بعد الصلاة', subtitle: 'الأذكار دبر الصلوات المفروضة', icon: Compass },
];

export const HomeView: React.FC<HomeViewProps> = ({
  categories,
  allAzkar,
  counts,
  history,
  todayIso,
  lastRead,
  fontScale,
  showTashkeel,
  onOpenCategory,
  onOpenSearch,
}) => {
  const [selectedGroup, setSelectedGroup] = useState<CategoryGroupKey>('all');
  const [catFilterQuery, setCatFilterQuery] = useState('');
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [selectedMoodId, setSelectedMoodId] = useState<string>(MOOD_GUIDANCE_PRESETS[0].id);

  // Deterministic Daily Zekr based on epoch day (prefer substantive 95-320 char adhkar)
  const dailyZekr = useMemo(() => {
    const richPool = allAzkar.filter(
      (z) =>
        z.text.length >= 95 &&
        z.text.length <= 320 &&
        z.sharh.length > 0 &&
        z.benefit.length > 0
    );
    const pool = richPool.length > 0 ? richPool : allAzkar;
    if (pool.length === 0) return null;
    const epochDay = Math.floor(Date.now() / 86400000);
    return pool[epochDay % pool.length];
  }, [allAzkar]);

  // Overall Daily Werd Progress across the 4 primary daily adhkar categories
  const dailySummary = useMemo(() => {
    const targetIds = [27, 135, 28, 25];
    let done = 0;
    let total = 0;
    for (const id of targetIds) {
      const cat = categories.find((c) => c.id === id);
      if (cat) {
        const p = getCategoryProgress(cat, counts);
        done += p.doneAzkar;
        total += p.totalAzkar;
      }
    }
    return {
      done,
      total,
      percent: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [categories, counts]);

  // Streak & 7-Day Consistency
  const streakStats = useMemo(
    () => calculateStreakStats(history, todayIso),
    [history, todayIso]
  );

  const lastCategory = useMemo(
    () => (lastRead ? categories.find((c) => c.id === lastRead.catId) || null : null),
    [categories, lastRead]
  );

  // Active Mood Guidance Preset & Matched Categories
  const activeMoodPreset = useMemo(
    () =>
      MOOD_GUIDANCE_PRESETS.find((m) => m.id === selectedMoodId) ||
      MOOD_GUIDANCE_PRESETS[0],
    [selectedMoodId]
  );

  const moodMatchedCategories = useMemo(
    () =>
      activeMoodPreset.catIds
        .map((id) => categories.find((c) => c.id === id))
        .filter((c): c is Category => c !== undefined),
    [activeMoodPreset, categories]
  );

  // Filtered Categories
  const filteredCategories = useMemo(() => {
    const normFilter = normalizeArabic(catFilterQuery.trim());
    return categories.filter((c) => {
      if (selectedGroup !== 'all' && c.group !== selectedGroup) return false;
      if (normFilter.length > 0 && !normalizeArabic(c.title).includes(normFilter)) {
        return false;
      }
      if (onlyIncomplete) {
        const p = getCategoryProgress(c, counts);
        if (p.doneAzkar >= p.totalAzkar) return false;
      }
      return true;
    });
  }, [categories, selectedGroup, catFilterQuery, onlyIncomplete, counts]);

  // Count per group
  const groupCounts = useMemo(() => {
    const map: Record<string, number> = { all: categories.length };
    for (const c of categories) {
      map[c.group] = (map[c.group] || 0) + 1;
    }
    return map;
  }, [categories]);

  const benefitExcerpt = useMemo(() => {
    if (!dailyZekr?.benefit) return '';
    const raw = dailyZekr.benefit.replace(/<[^>]+>/g, '').slice(0, 140);
    return showTashkeel ? raw : stripTashkeel(raw);
  }, [dailyZekr, showTashkeel]);

  return (
    <div className="space-y-5 sm:space-y-8 pb-24 lg:pb-12">
      {/* Section 1: Hero & Daily Werd Summary Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
        {/* Right Column (7 cols): Editorial Welcome, Quick Search Trigger & 4 Primary Adhkar */}
        <div className="lg:col-span-7 bg-[#F3EFE3] dark:bg-[#182120] border border-[#D0CABA] dark:border-[#3B4A46] rounded-2xl p-4 sm:p-7 flex flex-col justify-between gap-4 sm:gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <div className="text-[11px] sm:text-xs font-bold text-[#9A7515] dark:text-[#E7C46A]">
                موسوعة الأذكار النبوية الصحيحة مع الشرح
              </div>
              <div className="text-[11px] sm:text-xs text-[#4A4639] dark:text-[#C2C9C4] tabular-nums whitespace-nowrap shrink-0">
                {arabicDigits(categories.length)} بابًا · {arabicDigits(allAzkar.length)} ذكرًا
              </div>
            </div>

            <h1 className="text-xl sm:text-3xl lg:text-4xl font-display-ar font-bold text-[#0F5C4D] dark:text-[#6FD3B8] leading-snug">
              حصن المسلم من أذكار الكتاب والسنة
            </h1>
            <p className="text-xs sm:text-base text-[#4A4639] dark:text-[#C2C9C4] leading-relaxed max-w-2xl">
              تصنيف الشيخ د. سعيد بن علي بن وهف القحطاني رحمه الله، مضبوطًا بالتشكيل الكامل مع الشرح المستمد من كتاب «إتحاف المسلم بشرح حصن المسلم».
            </p>
          </div>

          {/* Search Bar Trigger */}
          <button
            type="button"
            onClick={() => onOpenSearch()}
            className="w-full min-h-[46px] sm:min-h-[52px] px-3 sm:px-4 py-2.5 rounded-xl bg-[#FBF8F1] dark:bg-[#101514] border border-[#D0CABA] dark:border-[#3B4A46] hover:border-[#0F5C4D] dark:hover:border-[#6FD3B8] flex items-center justify-between gap-2.5 text-right transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-2 sm:gap-3 text-[#4A4639] dark:text-[#C2C9C4] min-w-0">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-[#0F5C4D] dark:text-[#6FD3B8] shrink-0" />
              <span className="text-xs sm:text-sm truncate">
                ابحث في متون الأذكار، الشروحات، الأحاديث، أو الفوائد…
              </span>
            </div>
            <span className="text-xs font-bold text-[#0F5C4D] dark:text-[#6FD3B8] group-hover:translate-x-[-2px] transition-transform whitespace-nowrap shrink-0">
              بحث
            </span>
          </button>

          {/* 4 Quick Daily Adhkar Cards — 2x2 Grid on both Mobile and Desktop with unclipped titles */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {QUICK_CATS.map((q) => {
              const cat = categories.find((c) => c.id === q.catId);
              const prog = cat
                ? getCategoryProgress(cat, counts)
                : { doneAzkar: 0, totalAzkar: 0, percent: 0 };
              const IconComp = q.icon;
              return (
                <button
                  key={q.catId}
                  type="button"
                  onClick={() => onOpenCategory(q.catId)}
                  className="p-3 sm:p-4 rounded-xl bg-[#E6EFE9] dark:bg-[#1E3A32] hover:bg-[#CFEADF] dark:hover:bg-[#14463B] border border-[#0F5C4D]/15 dark:border-[#6FD3B8]/15 text-right flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors group cursor-pointer"
                >
                  <div className="w-full sm:w-auto sm:min-w-0 sm:flex-1 flex flex-col gap-1">
                    <div className="flex items-center justify-between sm:justify-start gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <IconComp className="w-4 h-4 sm:w-5 sm:h-5 text-[#0F5C4D] dark:text-[#6FD3B8] shrink-0" />
                        <h2 className="font-bold text-[13px] sm:text-base text-[#14332B] dark:text-[#CDE9DF] leading-snug whitespace-nowrap">
                          {q.title}
                        </h2>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[11px] sm:text-xs text-[#4A4639] dark:text-[#C2C9C4] tabular-nums">
                        {prog.doneAzkar > 0
                          ? `أُنجز ${arabicDigits(prog.doneAzkar)}/${arabicDigits(prog.totalAzkar)}`
                          : `${arabicDigits(prog.totalAzkar)} ذكرًا`}
                      </p>
                      <span className="sm:hidden text-[11px] font-bold text-[#0F5C4D] dark:text-[#6FD3B8] tabular-nums">
                        {arabicDigits(prog.percent)}٪
                      </span>
                    </div>
                  </div>

                  <div className="hidden sm:block shrink-0">
                    <StatProgressRing
                      percent={prog.percent}
                      size={40}
                      strokeWidth={3.5}
                      label={`${arabicDigits(prog.doneAzkar)}/${arabicDigits(prog.totalAzkar)}`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Left Column (5 cols): Daily Zekr Card + Resume Reading + Daily Progress & 7-Day Streak */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          {/* Daily Zekr Spotlight */}
          {dailyZekr && (
            <div className="flex-1 bg-[#F3EFE3] dark:bg-[#182120] border border-[#D0CABA] dark:border-[#3B4A46] rounded-2xl p-4 sm:p-6 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#9A7515] dark:text-[#E7C46A]">
                    ذكر وتأمل اليوم
                  </span>
                  <span className="text-xs text-[#4A4639] dark:text-[#C2C9C4] truncate max-w-[180px] sm:max-w-[220px]">
                    {dailyZekr.catTitle}
                  </span>
                </div>
                <div className="line-clamp-4">
                  <RichArabicText
                    src={dailyZekr.text}
                    scale={fontScale * 0.92}
                    baseSize={22}
                    showTashkeel={showTashkeel}
                  />
                </div>
                {benefitExcerpt && (
                  <p className="text-xs sm:text-sm text-[#4A4639] dark:text-[#C2C9C4] line-clamp-2 pt-2 border-t border-[#D0CABA]/40 dark:border-[#3B4A46]/40 leading-relaxed">
                    من فوائده: {benefitExcerpt}…
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-[#D0CABA]/60 dark:border-[#3B4A46]/60 flex items-center justify-between gap-3">
                <span className="text-xs text-[#4A4639] dark:text-[#C2C9C4]">
                  {dailyZekr.repeat > 1
                    ? `التكرار: ${arabicDigits(dailyZekr.repeat)} مرات`
                    : 'مع الشرح والفوائد'}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenCategory(dailyZekr.catId, dailyZekr.idx)}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0F5C4D] text-white dark:bg-[#6FD3B8] dark:text-[#00382E] text-xs font-bold hover:opacity-90 flex items-center gap-1.5 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>قراءة الذكر وشرحه</span>
                </button>
              </div>
            </div>
          )}

          {/* Resume Last Read + Daily Werd & 7-Day Streak Tracker */}
          <div className="space-y-3.5">
            {lastCategory && lastRead && (
              <button
                type="button"
                onClick={() => onOpenCategory(lastCategory.id, lastRead.idx)}
                className="w-full p-4 rounded-2xl bg-[#CFEADF] dark:bg-[#14463B] text-[#00201A] dark:text-[#B5F0DD] text-right flex items-center justify-between gap-4 hover:opacity-95 transition-opacity cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold opacity-80">تابع من حيث توقفت</div>
                  <div className="text-sm sm:text-base font-bold truncate mt-0.5">
                    {lastCategory.title}
                  </div>
                  <div className="text-xs opacity-85 mt-0.5 tabular-nums">
                    الذكر {arabicDigits(lastRead.idx + 1)} من {arabicDigits(lastCategory.azkar.length)}
                  </div>
                </div>
                <ChevronLeft className="w-5 h-5 shrink-0" />
              </button>
            )}

            <div className="p-4 sm:p-5 rounded-2xl bg-[#F3EFE3] dark:bg-[#182120] border border-[#D0CABA] dark:border-[#3B4A46] space-y-3.5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-[#9A7515] dark:text-[#E7C46A]">
                    سجل المواظبة والأوراد اليومية
                  </div>
                  <div className="text-sm font-bold text-[#1C1B17] dark:text-[#E6E2D9] mt-1 tabular-nums">
                    أتممت {arabicDigits(dailySummary.done)} من {arabicDigits(dailySummary.total)} ذكرًا اليوم
                  </div>
                  <div className="text-xs text-[#4A4639] dark:text-[#C2C9C4] mt-0.5 tabular-nums">
                    المواظبة المتتالية: {arabicDigits(streakStats.currentStreak)}{' '}
                    {streakStats.currentStreak === 1 ? 'يوم' : 'أيام'}
                  </div>
                </div>
                <StatProgressRing percent={dailySummary.percent} size={50} strokeWidth={4.5} />
              </div>

              {/* 7-Day Activity Strip */}
              <div className="pt-3 border-t border-[#D0CABA]/60 dark:border-[#3B4A46]/60 grid grid-cols-7 gap-1.5 text-center">
                {streakStats.last7Days.map((d) => (
                  <div
                    key={d.iso}
                    className={`py-1.5 px-1 rounded-lg border text-[10px] sm:text-xs transition-colors ${
                      d.active
                        ? 'bg-[#CFEADF] dark:bg-[#14463B] border-[#0F5C4D]/40 dark:border-[#6FD3B8]/40 text-[#00201A] dark:text-[#B5F0DD] font-bold'
                        : 'bg-[#FBF8F1]/60 dark:bg-[#101514]/60 border-[#D0CABA]/50 dark:border-[#3B4A46]/50 text-[#4A4639] dark:text-[#C2C9C4]'
                    }`}
                  >
                    <div className="truncate">{d.dayLabel}</div>
                    <div className="mt-1 flex items-center justify-center h-4">
                      {d.active ? (
                        <Check className="w-3.5 h-3.5 text-[#0F5C4D] dark:text-[#6FD3B8] stroke-[2.5]" />
                      ) : (
                        <span className="opacity-40">·</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Curated Emotional & Situational Guidance ("بمَ تشعر الآن؟ — أذكار الأحوال والمواقف") */}
      <section className="bg-[#F3EFE3] dark:bg-[#182120] border border-[#D0CABA] dark:border-[#3B4A46] rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-[#9A7515] dark:text-[#E7C46A]">
              مرشد الأذكار حسب الحال والموقف
            </span>
            <h2 className="text-lg sm:text-xl font-display-ar font-bold text-[#1C1B17] dark:text-[#E6E2D9] mt-0.5">
              بمَ تشعر الآن؟ اختر حالك للوصول الفوري للأذكار النبوية المناسبة
            </h2>
          </div>
          <span className="text-xs text-[#4A4639] dark:text-[#C2C9C4]">
            {activeMoodPreset.subtitle}
          </span>
        </div>

        {/* Horizontal Scrollable Mood Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          {MOOD_GUIDANCE_PRESETS.map((preset) => {
            const active = preset.id === selectedMoodId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedMoodId(preset.id)}
                className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#0F5C4D] text-white dark:bg-[#6FD3B8] dark:text-[#00382E]'
                    : 'bg-[#FBF8F1] dark:bg-[#101514] text-[#4A4639] dark:text-[#C2C9C4] hover:bg-[#EDE8DA] dark:hover:bg-[#243230] border border-[#D0CABA]/70 dark:border-[#3B4A46]/70'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Matched Chapters for Selected Mood */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {moodMatchedCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onOpenCategory(cat.id)}
              className="p-3.5 rounded-xl bg-[#FBF8F1] dark:bg-[#101514] border border-[#D0CABA] dark:border-[#3B4A46] hover:border-[#0F5C4D] dark:hover:border-[#6FD3B8] text-right flex items-center justify-between gap-3 transition-colors cursor-pointer"
            >
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#9A7515] dark:text-[#E7C46A] tabular-nums">
                  الباب {arabicDigits(cat.id)} · {arabicDigits(cat.azkar.length)}{' '}
                  {cat.azkar.length === 1 ? 'ذكر' : 'أذكار'}
                </div>
                <div className="text-sm font-bold text-[#1C1B17] dark:text-[#E6E2D9] line-clamp-1 mt-0.5">
                  {cat.title}
                </div>
              </div>
              <ChevronLeft className="w-4 h-4 text-[#0F5C4D] dark:text-[#6FD3B8] shrink-0" />
            </button>
          ))}
        </div>
      </section>

      {/* Section 3: Thematic Categories Directory (133 Chapters) */}
      <section className="space-y-4 sm:space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#D0CABA] dark:border-[#3B4A46] pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-display-ar font-bold text-[#1C1B17] dark:text-[#E6E2D9]">
              فهرس أبواب حصن المسلم ({arabicDigits(filteredCategories.length)})
            </h2>
            <p className="text-xs sm:text-sm text-[#4A4639] dark:text-[#C2C9C4] mt-1">
              مرتبة حسب الموضوع لتسهيل الوصول إلى الذكر المناسب في كل حال
            </p>
          </div>

          {/* Quick Category Filter Input + Incomplete Toggle */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <div className="relative flex-1 sm:w-64 min-w-[180px]">
              <Search className="w-4 h-4 text-[#4A4639] dark:text-[#C2C9C4] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={catFilterQuery}
                onChange={(e) => setCatFilterQuery(e.target.value)}
                placeholder="تصفية عناوين الأبواب…"
                aria-label="تصفية عناوين الأبواب"
                className="w-full min-h-[44px] pr-10 pl-8 py-2 rounded-xl bg-[#F3EFE3] dark:bg-[#182120] border border-[#D0CABA] dark:border-[#3B4A46] text-sm focus:outline-none focus:border-[#0F5C4D] dark:focus:border-[#6FD3B8]"
              />
              {catFilterQuery && (
                <button
                  type="button"
                  onClick={() => setCatFilterQuery('')}
                  aria-label="مسح التصفية"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-[#4A4639] dark:text-[#C2C9C4]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOnlyIncomplete(!onlyIncomplete)}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                onlyIncomplete
                  ? 'bg-[#0F5C4D] text-white border-[#0F5C4D] dark:bg-[#6FD3B8] dark:text-[#00382E] dark:border-[#6FD3B8]'
                  : 'bg-[#F3EFE3] dark:bg-[#182120] border-[#D0CABA] dark:border-[#3B4A46] text-[#4A4639] dark:text-[#C2C9C4]'
              }`}
            >
              غير المكتملة فقط
            </button>
          </div>
        </div>

        {/* Thematic Group Filter Tabs (Interactive Functional Buttons) */}
        <div
          role="tablist"
          aria-label="تصنيفات الأبواب"
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1"
        >
          {CATEGORY_GROUPS.map((g) => {
            const active = selectedGroup === g.key;
            const count = groupCounts[g.key] || 0;
            return (
              <button
                key={g.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedGroup(g.key)}
                className={`min-h-[42px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-[#0F5C4D] text-white dark:bg-[#6FD3B8] dark:text-[#00382E]'
                    : 'bg-[#F3EFE3] dark:bg-[#182120] text-[#4A4639] dark:text-[#C2C9C4] hover:bg-[#EDE8DA] dark:hover:bg-[#243230] border border-[#D0CABA]/70 dark:border-[#3B4A46]/70'
                }`}
              >
                <span>{g.label}</span>
                <span className="opacity-75 text-xs tabular-nums">({arabicDigits(count)})</span>
              </button>
            );
          })}
        </div>

        {/* Categories Grid */}
        {filteredCategories.length === 0 ? (
          <div className="p-10 sm:p-12 text-center bg-[#F3EFE3] dark:bg-[#182120] rounded-2xl border border-[#D0CABA] dark:border-[#3B4A46]">
            <p className="text-base font-bold text-[#1C1B17] dark:text-[#E6E2D9]">
              لا توجد أبواب مطابقة للتصفية الحالية
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedGroup('all');
                setCatFilterQuery('');
                setOnlyIncomplete(false);
              }}
              className="mt-3 min-h-[42px] px-4 py-2 rounded-xl bg-[#0F5C4D] text-white dark:bg-[#6FD3B8] dark:text-[#00382E] text-xs font-bold cursor-pointer"
            >
              إظهار جميع الأبواب ({arabicDigits(categories.length)})
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
            {filteredCategories.map((cat) => {
              const prog = getCategoryProgress(cat, counts);
              const isAllDone = prog.doneAzkar >= prog.totalAzkar && prog.totalAzkar > 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onOpenCategory(cat.id)}
                  className={`p-3.5 sm:p-4 rounded-xl border text-right flex items-center justify-between gap-3 transition-all hover:translate-y-[-1px] cursor-pointer ${
                    isAllDone
                      ? 'bg-[#E6EFE9]/80 dark:bg-[#1E3A32]/60 border-[#0F5C4D]/40 dark:border-[#6FD3B8]/40'
                      : 'bg-[#F3EFE3] dark:bg-[#182120] border-[#D0CABA] dark:border-[#3B4A46] hover:border-[#0F5C4D]/60 dark:hover:border-[#6FD3B8]/60'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-[#EDE8DA] dark:bg-[#243230] text-[#0F5C4D] dark:text-[#6FD3B8] font-bold text-xs flex items-center justify-center shrink-0 tabular-nums mt-0.5">
                      {arabicDigits(cat.id)}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm sm:text-base text-[#1C1B17] dark:text-[#E6E2D9] line-clamp-2 leading-snug">
                        {cat.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-[#4A4639] dark:text-[#C2C9C4] mt-1 tabular-nums">
                        <span>
                          {prog.doneAzkar > 0
                            ? `${arabicDigits(prog.doneAzkar)}/${arabicDigits(prog.totalAzkar)} مكتمل`
                            : `${arabicDigits(prog.totalAzkar)} ${
                                prog.totalAzkar === 1 ? 'ذكر' : 'أذكار'
                              }`}
                        </span>
                        {cat.azkar.some((z) => z.hasExtras) && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#9A7515] dark:text-[#E7C46A]">مع الشرح</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <ChevronLeft className="w-4 h-4 text-[#4A4639] dark:text-[#C2C9C4] shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
