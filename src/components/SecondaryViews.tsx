import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Heart,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { CustomTasbihPhrase, IndexedZekr, SearchScope, Zekr } from '../utils/types';
import { arabicDigits, plainText, searchAzkar, stripTashkeel } from '../utils/arabic';
import { RichArabicText } from './RichArabicText';

// ==========================================
// 1. SEARCH VIEW
// ==========================================
interface SearchViewProps {
  searchIndex: IndexedZekr[];
  initialQuery?: string;
  showTashkeel: boolean;
  onSelectZekr: (catId: number, idx: number) => void;
  onBack: () => void;
}

const SCOPES: { key: SearchScope; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'title', label: 'عناوين الأبواب' },
  { key: 'text', label: 'متن الذكر' },
  { key: 'sharh', label: 'الشرح' },
  { key: 'hadeth', label: 'الحديث' },
  { key: 'benefit', label: 'الفوائد' },
];

const SUGGESTED_QUERIES = [
  'الكرسي',
  'الاستغفار',
  'الهم والحزن',
  'الشفاء',
  'الرزق',
  'استخارة',
  'المطر',
  'السفر',
];

export const SearchView: React.FC<SearchViewProps> = ({
  searchIndex,
  initialQuery = '',
  showTashkeel,
  onSelectZekr,
  onBack,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [scope, setScope] = useState<SearchScope>('all');

  const hits = useMemo(
    () => searchAzkar(searchIndex, query, scope, 80),
    [searchIndex, query, scope]
  );

  return (
    <div className="space-y-5 sm:space-y-6 pb-28 lg:pb-12">
      <div className="bg-[#F3EFE3] dark:bg-[#182120] border border-[#D0CABA] dark:border-[#3B4A46] rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="رجوع"
              className="min-h-[42px] min-w-[42px] rounded-xl bg-[#EDE8DA] dark:bg-[#243230] flex items-center justify-center hover:bg-[#CFEADF] dark:hover:bg-[#14463B] transition-colors shrink-0 cursor-pointer"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-display-ar font-bold text-[#0F5C4D] dark:text-[#6FD3B8] truncate">
                البحث الشامل في الأذكار والشرح
              </h1>
              <p className="text-xs text-[#4A4639] dark:text-[#C2C9C4] truncate">
                يتجاوز التشكيل والهمزات ويبحث في المتن والشرح والحديث والفوائد
              </p>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 text-[#0F5C4D] dark:text-[#6FD3B8] absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="اكتب كلمة من الذكر، الشرح، أو الموضوع (مثل: الكرب، الاستغفار)…"
            aria-label="حقل البحث في الأذكار والشروحات"
            className="w-full min-h-[48px] sm:min-h-[52px] pr-11 sm:pr-12 pl-11 py-2.5 sm:py-3 rounded-xl bg-[#FBF8F1] dark:bg-[#101514] border border-[#D0CABA] dark:border-[#3B4A46] text-sm sm:text-base focus:outline-none focus:border-[#0F5C4D] dark:focus:border-[#6FD3B8]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="مسح البحث"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[#4A4639] dark:text-[#C2C9C4] hover:bg-[#EDE8DA] dark:hover:bg-[#243230]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Scope Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          {SCOPES.map((s) => {
            const active = scope === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setScope(s.key)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#0F5C4D] text-white dark:bg-[#6FD3B8] dark:text-[#00382E]'
                    : 'bg-[#EDE8DA] dark:bg-[#243230] text-[#4A4639] dark:text-[#C2C9C4] hover:text-[#1C1B17] dark:hover:text-white'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Quick suggestions when query is empty */}
        {query.trim().length < 2 && (
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#4A4639] dark:text-[#C2C9C4] ml-1">كلمات مقترحة:</span>
            {SUGGESTED_QUERIES.map((word) => (
              <button
                key={word}
                type="button"
                onClick={() => setQuery(word)}
                className="min-h-[34px] px-3 py-1.5 rounded-lg bg-[#EDE8DA]/70 dark:bg-[#243230]/70 hover:bg-[#CFEADF] dark:hover:bg-[#14463B] text-xs font-medium text-[#1C1B17] dark:text-[#E6E2D9] transition-colors cursor-pointer"
              >
                {word}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Area */}
      {query.trim().length >= 2 && (
        <div className="space-y-3">
          <div className="text-xs font-bold text-[#4A4639] dark:text-[#C2C9C4] px-1 tabular-nums">
            عدد النتائج: {arabicDigits(hits.length)} {hits.length === 80 ? '(أول ٨٠ نتيجة)' : ''}
          </div>

          {hits.length === 0 ? (
            <div className="p-10 sm:p-12 text-center bg-[#F3EFE3] dark:bg-[#182120] border border-[#D0CABA] dark:border-[#3B4A46] rounded-2xl">
              <p className="text-base font-bold text-[#1C1B17] dark:text-[#E6E2D9]">
                لا توجد نتائج مطابقة لعبارة «{query}»
              </p>
              <p className="text-xs text-[#4A4639] dark:text-[#C2C9C4] mt-1">
                جرّب البحث بكلمة مفردة أو تغيير نطاق البحث إلى «الكل»
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
              {hits.map((hit) => {
                const rawSnippet = plainText(hit.snippet);
                const snippetText = showTashkeel ? rawSnippet : stripTashkeel(rawSnippet);
                return (
                  <button
                    key={`${hit.zekr.id}-${hit.where}`}
                    type="button"
                    onClick={() => onSelectZekr(hit.zekr.catId, hit.zekr.idx)}
                    className="p-4 sm:p-5 rounded-2xl bg-[#F3EFE3] dark:bg-[#182120] border border-[#D0CABA] dark:border-[#3B4A46] hover:border-[#0F5C4D] dark:hover:border-[#6FD3B8] text-right flex flex-col justify-between gap-2.5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#0F5C4D] dark:text-[#6FD3B8] truncate">
                        {hit.zekr.catTitle}
                      </span>
                      <span className="font-bold text-[#9A7515] dark:text-[#E7C46A] shrink-0">
                        في {hit.where}
                      </span>
                    </div>
                    <p className="font-read text-base sm:text-lg text-[#1C1B17] dark:text-[#E6E2D9] line-clamp-3 leading-relaxed">
                      {snippetText}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 2. FAVORITES VIEW
// ==========================================
interface FavoritesViewProps {
  favoriteIds: number[];
  allAzkar: Zekr[];
  fontScale: number;
  showTashkeel: boolean;
  onSelectZekr: (catId: number, idx: number) => void;
  onToggleFavorite: (zekrId: number) => void;
  onExploreCategories: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  favoriteIds,
  allAzkar,
  fontScale,
  showTashkeel,
  onSelectZekr,
  onToggleFavorite,
  onExploreCategories,
}) => {
  const favItems = useMemo(
    () =>
      favoriteIds
        .map((id) => allAzkar.find((z) => z.id === id))
        .filter((z): z is Zekr => z !== undefined),
    [favoriteIds, allAzkar]
  );

  return (
    <div className="space-y-5 sm:space-y-6 pb-28 lg:pb-12">
      <div className="bg-[#F3EFE3] dark:bg-[#182120] border border-[#D0CABA] dark:border-[#3B4A46] rounded-2xl p-4 sm:p-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-display-ar font-bold text-[#0F5C4D] dark:text-[#6FD3B8]">
            الأذكار المفضلة
          </h1>
          <p className="text-xs sm:text-sm text-[#4A4639] dark:text-[#C2C9C4] mt-1">
            أذكارك المختارة للرجوع السريع إليها في أي وقت ({arabicDigits(favItems.length)})
          </p>
        </div>
      </div>

      {favItems.length === 0 ? (
        <div className="p-10 sm:p-12 text-center bg-[#F3EFE3] dark:bg-[#182120] border border-[#D0CABA] dark:border-[#3B4A46] rounded-2xl space-y-4">
          <Heart className="w-10 h-10 text-[#9A7515] dark:text-[#E7C46A] mx-auto opacity-80" />
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-[#1C1B17] dark:text-[#E6E2D9]">
              لم تضف أي ذكر إلى المفضلة بعد
            </h2>
            <p className="text-xs sm:text-sm text-[#4A4639] dark:text-[#C2C9C4] max-w-md mx-auto">
              اضغط على أيقونة القلب في أي ذكر داخل الأبواب لحفظه هنا والوصول إليه بسرعة.
            </p>
          </div>
          <button
            type="button"
            onClick={onExploreCategories}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0F5C4D] text-white dark:bg-[#6FD3B8] dark:text-[#00382E] text-xs font-bold cursor-pointer"
          >
            تصفح أبواب الأذكار
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {favItems.map((z) => (
            <div
              key={z.id}
              className="p-4 sm:p-5 rounded-2xl bg-[#F3EFE3] dark:bg-[#182120] border border-[#D0CABA] dark:border-[#3B4A46] flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold text-[#9A7515] dark:text-[#E7C46A] truncate">
                    {z.catTitle}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(z.id)}
                    aria-label="إزالة من المفضلة"
                    className="min-h-[40px] min-w-[40px] rounded-lg text-[#0F5C4D] dark:text-[#6FD3B8] hover:bg-[#EDE8DA] dark:hover:bg-[#243230] flex items-center justify-center cursor-pointer"
                  >
                    <Heart className="w-4 h-4" fill="currentColor" />
                  </button>
                </div>

                <div
                  onClick={() => onSelectZekr(z.catId, z.idx)}
                  className="cursor-pointer line-clamp-4"
                >
                  <RichArabicText
                    src={z.text}
                    scale={fontScale * 0.85}
                    baseSize={22}
                    showTashkeel={showTashkeel}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#D0CABA]/50 dark:border-[#3B4A46]/50 flex items-center justify-between">
                <span className="text-xs text-[#4A4639] dark:text-[#C2C9C4] tabular-nums">
                  {z.repeat > 1 ? `التكرار: ${arabicDigits(z.repeat)} مرات` : 'مرة واحدة'}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectZekr(z.catId, z.idx)}
                  className="min-h-[38px] px-3 rounded-lg text-xs font-bold text-[#0F5C4D] dark:text-[#6FD3B8] hover:bg-[#CFEADF]/40 dark:hover:bg-[#14463B]/40 flex items-center gap-1 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>فتح الذكر والشرح</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 3. TASBIH (MISBAHA) VIEW
// ==========================================
export const DEFAULT_TASBIH_PHRASES = [
  'سُبْحَانَ اللَّهِ',
  'الْحَمْدُ لِلَّهِ',
  'اللَّهُ أَكْبَرُ',
  'لَا إِلَهَ إِلَّا اللَّهُ',
  'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
  'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
  'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
  'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
];

interface TasbihViewProps {
  selectedPhraseIdx: number;
  onSelectPhraseIdx: (idx: number) => void;
  target: number;
  onSelectTarget: (target: number) => void;
  tasbihCounts: Record<number, number>;
  customPhrases: CustomTasbihPhrase[];
  onAddCustomPhrase: (text: string) => void;
  onRemoveCustomPhrase: (id: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onTap: () => void;
  onResetCurrent: () => void;
}

export const TasbihView: React.FC<TasbihViewProps> = ({
  selectedPhraseIdx,
  onSelectPhraseIdx,
  target,
  onSelectTarget,
  tasbihCounts,
  customPhrases,
  onAddCustomPhrase,
  onRemoveCustomPhrase,
  soundEnabled,
  onToggleSound,
  onTap,
  onResetCurrent,
}) => {
  const [newPhraseText, setNewPhraseText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const allPhrases = useMemo(
    () => [...DEFAULT_TASBIH_PHRASES, ...customPhrases.map((c) => c.text)],
    [customPhrases]
  );

  const safeIdx = selectedPhraseIdx < allPhrases.length ? selectedPhraseIdx : 0;
  const activePhrase = allPhrases[safeIdx] || DEFAULT_TASBIH_PHRASES[0];
  const count = tasbihCounts[safeIdx] || 0;
  const inRound = count % target;
  const completedRounds = Math.floor(count / target);
  const progressFraction = inRound === 0 && count > 0 ? 1 : inRound / target;

  // Total across all phrases
  const totalAllTasbih = useMemo(
    () => (Object.values(tasbihCounts) as number[]).reduce((acc, v) => acc + v, 0),
    [tasbihCounts]
  );

  const circleSize = 224;
  const strokeWidth = 9;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - progressFraction * circumference;

  const handleCreatePhrase = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPhraseText.trim();
    if (!trimmed) return;
    onAddCustomPhrase(trimmed);
    setNewPhraseText('');
    setShowAddForm(false);
    onSelectPhraseIdx(allPhrases.length);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 lg:pb-12">
      {/* On mobile, place the interactive counter first so it's immediately in the thumb zone */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Interactive Tactile Counter Ring (Ordered 1st on mobile, 2nd on desktop) */}
        <div className="order-1 lg:order-2 lg:col-span-7 bg-[#F3EFE3] dark:bg-[#182120] border border-[#D0CABA] dark:border-[#3B4A46] rounded-2xl p-4 sm:p-8 flex flex-col items-center justify-center text-center space-y-4 sm:space-y-6">
          <div className="space-y-1 max-w-xl">
            <span className="text-xs font-bold text-[#9A7515] dark:text-[#E7C46A]">
              الذكر الحالي
            </span>
            <h2 className="font-read text-lg sm:text-3xl font-bold text-[#1C1B17] dark:text-[#E6E2D9] leading-relaxed">
              {activePhrase}
            </h2>
          </div>

          {/* Circular Tactile Counter Button */}
          <div
            className="relative flex items-center justify-center"
            style={{ width: circleSize, height: circleSize }}
          >
            <svg
              width={circleSize}
              height={circleSize}
              className="-rotate-90 transform pointer-events-none"
            >
              <circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius}
                fill="transparent"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-[#EDE8DA] dark:text-[#243230]"
              />
              <circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius}
                fill="transparent"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="text-[#0F5C4D] dark:text-[#6FD3B8] transition-all duration-150"
              />
            </svg>

            <button
              type="button"
              onClick={onTap}
              aria-label="اضغط للتسبيح"
              className="absolute w-[188px] h-[188px] rounded-full bg-[#CFEADF] dark:bg-[#14463B] text-[#00201A] dark:text-[#B5F0DD] hover:brightness-95 active:scale-[0.97] transition-all flex flex-col items-center justify-center shadow-inner select-none cursor-pointer"
            >
              <span className="text-4xl sm:text-5xl font-display-ar font-bold tabular-nums tracking-tight">
                {arabicDigits(count)}
              </span>
              <span className="text-[11px] sm:text-xs font-bold opacity-80 mt-1.5 tabular-nums">
                الجولة: {arabicDigits(inRound)} من {arabicDigits(target)}
              </span>
              <span className="text-[11px] opacity-75 mt-0.5">اضغط للتسبيح</span>
            </button>
          </div>

          <div className="flex items-center justify-between w-full max-w-xs text-xs font-bold text-[#4A4639] dark:text-[#C2C9C4] tabular-nums pt-1">
            <span>الدورات المكتملة ({arabicDigits(target)}): {arabicDigits(completedRounds)}</span>
            <button
              type="button"
              onClick={onResetCurrent}
              className="px-2.5 py-1 rounded-lg border border-[#D0CABA] dark:border-[#3B4A46] hover:bg-[#EDE8DA] dark:hover:bg-[#243230] flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>تصفير</span>
            </button>
          </div>

          {/* Target Round Selector — Clean 4-column grid */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full max-w-sm">
            {[33, 99, 100, 1000].map((t) => {
              const active = target === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onSelectTarget(t)}
                  className={`h-9 px-2 rounded-xl text-xs font-bold tabular-nums transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#0F5C4D] text-white dark:bg-[#6FD3B8] dark:text-[#00382E]'
                      : 'bg-[#EDE8DA] dark:bg-[#243230] text-[#4A4639] dark:text-[#C2C9C4]'
                  }`}
                >
                  {arabicDigits(t)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Phrase Selector & Custom Phrases (Ordered 2nd on mobile, 1st on desktop) */}
        <div className="order-2 lg:order-1 lg:col-span-5 bg-[#F3EFE3] dark:bg-[#182120] border border-[#D0CABA] dark:border-[#3B4A46] rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-display-ar font-bold text-[#0F5C4D] dark:text-[#6FD3B8]">
                المسبحة الإلكترونية
              </h1>
              <p className="text-xs text-[#4A4639] dark:text-[#C2C9C4] mt-0.5 tabular-nums">
                مجموع التسبيحات الكلي: {arabicDigits(totalAllTasbih)}
              </p>
            </div>

            <button
              type="button"
              onClick={onToggleSound}
              aria-label={soundEnabled ? 'كتم صوت المسبحة' : 'تفعيل صوت المسبحة'}
              className="min-h-[42px] px-3 py-2 rounded-xl bg-[#EDE8DA] dark:bg-[#243230] text-xs font-bold flex items-center gap-1.5 text-[#1C1B17] dark:text-[#E6E2D9] cursor-pointer"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#0F5C4D] dark:text-[#6FD3B8]" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
              <span>{soundEnabled ? 'الصوت مفعّل' : 'صامت'}</span>
            </button>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#9A7515] dark:text-[#E7C46A]">
                اختر صيغة الذكر والتسبيح
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="text-xs font-bold text-[#0F5C4D] dark:text-[#6FD3B8] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة ذكر خاص</span>
              </button>
            </div>

            {showAddForm && (
              <form
                onSubmit={handleCreatePhrase}
                className="p-3 rounded-xl bg-[#FBF8F1] dark:bg-[#101514] border border-[#D0CABA] dark:border-[#3B4A46] space-y-2.5"
              >
                <input
                  type="text"
                  value={newPhraseText}
                  onChange={(e) => setNewPhraseText(e.target.value)}
                  placeholder="اكتب صيغة الذكر (مثل: سبحان الله وبحمده)…"
                  className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-[#F3EFE3] dark:bg-[#182120] text-sm focus:outline-none"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="min-h-[36px] px-3 py-1.5 text-xs text-[#4A4639] dark:text-[#C2C9C4]"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="min-h-[36px] px-4 py-1.5 rounded-lg bg-[#0F5C4D] text-white dark:bg-[#6FD3B8] dark:text-[#00382E] text-xs font-bold"
                  >
                    حفظ الذكر
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {allPhrases.map((phrase, idx) => {
                const active = idx === safeIdx;
                const c = tasbihCounts[idx] || 0;
                const isCustom = idx >= DEFAULT_TASBIH_PHRASES.length;
                const customObj = isCustom
                  ? customPhrases[idx - DEFAULT_TASBIH_PHRASES.length]
                  : null;

                return (
                  <div
                    key={idx}
                    className={`w-full rounded-xl border transition-colors flex items-center justify-between gap-2 px-3.5 py-2.5 ${
                      active
                        ? 'bg-[#CFEADF] dark:bg-[#14463B] border-[#0F5C4D] dark:border-[#6FD3B8] text-[#00201A] dark:text-[#B5F0DD]'
                        : 'bg-[#FBF8F1] dark:bg-[#101514] border-[#D0CABA]/70 dark:border-[#3B4A46]/70 text-[#1C1B17] dark:text-[#E6E2D9] hover:bg-[#EDE8DA]/60 dark:hover:bg-[#243230]/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectPhraseIdx(idx)}
                      className="flex-1 text-right font-read text-base sm:text-lg font-bold truncate cursor-pointer"
                    >
                      {phrase}
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold tabular-nums opacity-85">
                        {c > 0 ? `${arabicDigits(c)} تسبيحة` : '٠'}
                      </span>
                      {customObj && (
                        <button
                          type="button"
                          onClick={() => onRemoveCustomPhrase(customObj.id)}
                          aria-label="حذف الذكر المخصص"
                          className="p-1 text-red-600 dark:text-red-400 hover:opacity-80"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. SETTINGS & ABOUT VIEW
// ==========================================
interface SettingsViewProps {
  themeMode: 'system' | 'light' | 'dark';
  onSetThemeMode: (mode: 'system' | 'light' | 'dark') => void;
  fontScale: number;
  onSetFontScale: (scale: number) => void;
  showTashkeel: boolean;
  onSetShowTashkeel: (v: boolean) => void;
  soundEnabled: boolean;
  onSetSoundEnabled: (v: boolean) => void;
  hapticsEnabled: boolean;
  onSetHapticsEnabled: (v: boolean) => void;
  autoAdvance: boolean;
  onSetAutoAdvance: (v: boolean) => void;
  onResetAllTodayCounts: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  themeMode,
  onSetThemeMode,
  fontScale,
  onSetFontScale,
  showTashkeel,
  onSetShowTashkeel,
  soundEnabled,
  onSetSoundEnabled,
  hapticsEnabled,
  onSetHapticsEnabled,
  autoAdvance,
  onSetAutoAdvance,
  onResetAllTodayCounts,
}) => {
  const ABOUT_LINES = [
    {
      k: 'الكتاب',
      v: 'حصن المسلم من أذكار الكتاب والسنة، لمؤلفه الشيخ د. سعيد بن علي بن وهف القحطاني رحمه الله.',
    },
    {
      k: 'الشرح والتخريج',
      v: 'من كتاب «إتحاف المسلم بشرح حصن المسلم» للمؤلف نفسه، يتضمن الشرح والحديث والفوائد المستنبطة.',
    },
    {
      k: 'المصدر الرسمي',
      v: 'موقع الشيخ سعيد بن وهف القحطاني رحمه الله (www.binwahaf.com) والدار العربية لتقنية المعلومات.',
    },
    {
      k: 'الخصوصية والعمل دون اتصال',
      v: 'يعمل التطبيق بالكامل محليًا، ولا يجمع أي بيانات شخصية، ولا يحتوي على أي إعلانات.',
    },
    {
      k: 'الخطوط المستخدمة',
      v: 'خط «ثمانية» (Thmanyah Sans & Serif & Display) للواجهة والقراءة، وخط «الأميري القرآني» (Amiri Quran) لرسم الآيات القرآنية.',
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 pb-28 lg:pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Right Column (6 cols): Display & Reading Preferences */}
        <div className="lg:col-span-6 space-y-5 sm:space-y-6">
          <div className="bg-[#F3EFE3] dark:bg-[#182120] border border-[#D0CABA] dark:border-[#3B4A46] rounded-2xl p-4 sm:p-6 space-y-5">
            <h2 className="text-lg font-bold text-[#9A7515] dark:text-[#E7C46A]">
              المظهر وحجم الخط
            </h2>

            {/* Theme Selector */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#1C1B17] dark:text-[#E6E2D9] block">
                نمط الإضاءة والألوان
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {(
                  [
                    { key: 'system', label: 'تلقائي' },
                    { key: 'light', label: 'ورقي فاتح' },
                    { key: 'dark', label: 'ليلي داكن' },
                  ] as const
                ).map((item) => {
                  const active = themeMode === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onSetThemeMode(item.key)}
                      className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#0F5C4D] text-white dark:bg-[#6FD3B8] dark:text-[#00382E]'
                          : 'bg-[#EDE8DA] dark:bg-[#243230] text-[#4A4639] dark:text-[#C2C9C4]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Scale Slider */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="font-scale-slider"
                  className="text-sm font-bold text-[#1C1B17] dark:text-[#E6E2D9]"
                >
                  حجم خط القراءة والشرح
                </label>
                <span className="text-xs font-bold text-[#0F5C4D] dark:text-[#6FD3B8] tabular-nums">
                  {arabicDigits(Math.round(fontScale * 100))}٪
                </span>
              </div>
              <input
                id="font-scale-slider"
                type="range"
                min={0.8}
                max={1.6}
                step={0.05}
                value={fontScale}
                onChange={(e) => onSetFontScale(parseFloat(e.target.value))}
                className="w-full accent-[#0F5C4D] dark:accent-[#6FD3B8] cursor-pointer"
              />
              <div className="p-4 rounded-xl bg-[#FBF8F1] dark:bg-[#101514] border border-[#D0CABA] dark:border-[#3B4A46]">
                <RichArabicText
                  src="بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ — <v>أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ</v>"
                  scale={fontScale}
                  baseSize={22}
                  showTashkeel={showTashkeel}
                />
              </div>
            </div>
          </div>

          {/* Reading & Counter Behavior */}
          <div className="bg-[#F3EFE3] dark:bg-[#182120] border border-[#D0CABA] dark:border-[#3B4A46] rounded-2xl p-4 sm:p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#9A7515] dark:text-[#E7C46A]">
              القراءة والعدّاد
            </h2>

            <label className="flex items-center justify-between gap-4 py-2 cursor-pointer">
              <div>
                <div className="text-sm font-bold text-[#1C1B17] dark:text-[#E6E2D9]">
                  إظهار حركات التشكيل
                </div>
                <div className="text-xs text-[#4A4639] dark:text-[#C2C9C4]">
                  عرض الضبط الكامل للحركات على متون الأذكار والشروحات
                </div>
              </div>
              <input
                type="checkbox"
                checked={showTashkeel}
                onChange={(e) => onSetShowTashkeel(e.target.checked)}
                className="w-5 h-5 accent-[#0F5C4D] dark:accent-[#6FD3B8]"
              />
            </label>

            <label className="flex items-center justify-between gap-4 py-2 cursor-pointer border-t border-[#D0CABA]/50 dark:border-[#3B4A46]/50">
              <div>
                <div className="text-sm font-bold text-[#1C1B17] dark:text-[#E6E2D9]">
                  الانتقال التلقائي للذكر التالي
                </div>
                <div className="text-xs text-[#4A4639] dark:text-[#C2C9C4]">
                  ينتقل تلقائيًا إلى الذكر الذي يليه فور إتمام العدد المطلوب
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoAdvance}
                onChange={(e) => onSetAutoAdvance(e.target.checked)}
                className="w-5 h-5 accent-[#0F5C4D] dark:accent-[#6FD3B8]"
              />
            </label>

            <label className="flex items-center justify-between gap-4 py-2 cursor-pointer border-t border-[#D0CABA]/50 dark:border-[#3B4A46]/50">
              <div>
                <div className="text-sm font-bold text-[#1C1B17] dark:text-[#E6E2D9]">
                  نقرة صوتية هادئة عند العدّ
                </div>
                <div className="text-xs text-[#4A4639] dark:text-[#C2C9C4]">
                  صوت خفيف يحاكي حبات المسبحة مع تنبيه عند اكتمال الذكر
                </div>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => onSetSoundEnabled(e.target.checked)}
                className="w-5 h-5 accent-[#0F5C4D] dark:accent-[#6FD3B8]"
              />
            </label>

            <label className="flex items-center justify-between gap-4 py-2 cursor-pointer border-t border-[#D0CABA]/50 dark:border-[#3B4A46]/50">
              <div>
                <div className="text-sm font-bold text-[#1C1B17] dark:text-[#E6E2D9]">
                  اهتزاز لمسي عند التسبيح
                </div>
                <div className="text-xs text-[#4A4639] dark:text-[#C2C9C4]">
                  اهتزاز خفيف على الأجهزة الداعمة عند الضغط على العدّاد
                </div>
              </div>
              <input
                type="checkbox"
                checked={hapticsEnabled}
                onChange={(e) => onSetHapticsEnabled(e.target.checked)}
                className="w-5 h-5 accent-[#0F5C4D] dark:accent-[#6FD3B8]"
              />
            </label>

            <div className="pt-3 border-t border-[#D0CABA]/50 dark:border-[#3B4A46]/50">
              <button
                type="button"
                onClick={onResetAllTodayCounts}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-[#D0CABA] dark:border-[#3B4A46] text-xs font-bold text-[#4A4639] dark:text-[#C2C9C4] hover:bg-[#EDE8DA] dark:hover:bg-[#243230] flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>تصفير جميع عدّادات الأذكار لليوم</span>
              </button>
            </div>
          </div>
        </div>

        {/* Left Column (6 cols): Sources & Book Information */}
        <div className="lg:col-span-6 bg-[#F3EFE3] dark:bg-[#182120] border border-[#D0CABA] dark:border-[#3B4A46] rounded-2xl p-4 sm:p-6 space-y-5">
          <h2 className="text-lg font-bold text-[#9A7515] dark:text-[#E7C46A]">
            المصادر والمعلومات العلمية
          </h2>

          <div className="space-y-4">
            {ABOUT_LINES.map((item, i) => (
              <div
                key={i}
                className="pb-3.5 border-b border-[#D0CABA]/60 dark:border-[#3B4A46]/60 last:border-none"
              >
                <div className="text-sm font-bold text-[#0F5C4D] dark:text-[#6FD3B8]">
                  {item.k}
                </div>
                <div className="text-sm text-[#1C1B17] dark:text-[#E6E2D9] mt-1 leading-relaxed">
                  {item.v}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-[#4A4639] dark:text-[#C2C9C4] pt-2">
            نسخة وقفية مُهداة غير تجارية — لا تنسونا ومؤلف الكتاب من صالح دعائكم.
          </p>
        </div>
      </div>
    </div>
  );
};
