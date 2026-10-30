import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Heart,
  Image as ImageIcon,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Category, Zekr } from '../utils/types';
import {
  arabicDigits,
  formatCopyAll,
  formatCopyZekr,
  getCategoryProgress,
  plainText,
} from '../utils/arabic';
import { RichArabicText, ScholarlyLongText, StatProgressRing } from './RichArabicText';
import { ShareCardModal } from './ShareCardModal';

interface CategoryReaderViewProps {
  category: Category;
  initialZekrIndex?: number;
  counts: Record<number, number>;
  favorites: number[];
  fontScale: number;
  showTashkeel: boolean;
  onToggleTashkeel: () => void;
  autoAdvance: boolean;
  onSetAutoAdvance: (val: boolean) => void;
  onTapZekr: (zekr: Zekr) => boolean;
  onResetCategory: (cat: Category) => void;
  onToggleFavorite: (zekrId: number) => void;
  onBack: () => void;
  onCopyToast: (msg: string) => void;
  onSelectPosition: (catId: number, idx: number) => void;
}

export const CategoryReaderView: React.FC<CategoryReaderViewProps> = ({
  category,
  initialZekrIndex,
  counts,
  favorites,
  fontScale,
  showTashkeel,
  onToggleTashkeel,
  autoAdvance,
  onSetAutoAdvance,
  onTapZekr,
  onResetCategory,
  onToggleFavorite,
  onBack,
  onCopyToast,
  onSelectPosition,
}) => {
  const [mode, setMode] = useState<'list' | 'focus'>(
    initialZekrIndex !== undefined ? 'focus' : 'list'
  );
  const [activeIdx, setActiveIdx] = useState<number>(
    initialZekrIndex !== undefined
      ? Math.max(0, Math.min(category.azkar.length - 1, initialZekrIndex))
      : 0
  );
  const [expandedId, setExpandedId] = useState<number | null>(
    category.azkar.length === 1 ? category.azkar[0].id : null
  );
  const [activeCommentaryTab, setActiveCommentaryTab] = useState<
    'sharh' | 'hadeth' | 'benefit'
  >('sharh');
  const [showFootnoteId, setShowFootnoteId] = useState<number | null>(null);
  const [shareCardZekr, setShareCardZekr] = useState<Zekr | null>(null);
  const [speakingZekrId, setSpeakingZekrId] = useState<number | null>(null);

  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const progress = useMemo(
    () => getCategoryProgress(category, counts),
    [category, counts]
  );

  const handleCopy = (text: string, label = 'تم نسخ النص') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    onCopyToast(label);
  };

  const handleSpeakZekr = (z: Zekr) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onCopyToast('القراءة الصوتية غير مدعومة على هذا المتصفح');
      return;
    }

    if (speakingZekrId === z.id) {
      window.speechSynthesis.cancel();
      setSpeakingZekrId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(plainText(z.text));
    utterance.lang = 'ar-SA';
    utterance.rate = 0.88;
    utterance.onend = () => setSpeakingZekrId(null);
    utterance.onerror = () => setSpeakingZekrId(null);
    setSpeakingZekrId(z.id);
    window.speechSynthesis.speak(utterance);
  };

  const handleCountTap = (z: Zekr, indexInCat: number) => {
    const current = counts[z.id] || 0;
    if (current >= z.repeat) return;

    const justFinished = onTapZekr(z);
    onSelectPosition(category.id, indexInCat);

    if (justFinished && autoAdvance) {
      // Find next incomplete zekr in this category
      const nextIndex = category.azkar.findIndex(
        (item, idx) => idx > indexInCat && (counts[item.id] || 0) < item.repeat
      );
      if (nextIndex !== -1) {
        if (mode === 'focus') {
          setTimeout(() => {
            setActiveIdx(nextIndex);
            onSelectPosition(category.id, nextIndex);
          }, 260);
        } else {
          const nextZekr = category.azkar[nextIndex];
          setTimeout(() => {
            const el = cardRefs.current[nextZekr.id];
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 220);
        }
      }
    }
  };

  const currentFocusZekr = category.azkar[activeIdx] || category.azkar[0];

  return (
    <div className="space-y-3.5 sm:space-y-5 pb-24 lg:pb-12">
      {/* Category Header Bar — Compact & Well-Aligned on Mobile */}
      <div className="bg-[#F3EFE3] dark:bg-[#182120] border border-[#D0CABA] dark:border-[#3B4A46] rounded-2xl p-3.5 sm:p-5 space-y-3">
        {/* Row 1: Back Button + Title/Meta + Progress Ring */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={onBack}
              aria-label="رجوع إلى الأقسام"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-[#EDE8DA] dark:bg-[#243230] text-[#1C1B17] dark:text-[#E6E2D9] hover:bg-[#CFEADF] dark:hover:bg-[#14463B] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[#4A4639] dark:text-[#C2C9C4] tabular-nums truncate">
                <span>الباب {arabicDigits(category.id)}</span>
                <span aria-hidden="true">·</span>
                <span>{arabicDigits(category.azkar.length)} أذكار</span>
                <span aria-hidden="true">·</span>
                <span>{arabicDigits(progress.doneClicks)}/{arabicDigits(progress.totalClicks)} تسبيحة</span>
              </div>
              <h1 className="text-base sm:text-2xl font-display-ar font-bold text-[#0F5C4D] dark:text-[#6FD3B8] mt-0.5 leading-snug line-clamp-1">
                {category.title}
              </h1>
            </div>
          </div>

          <StatProgressRing
            percent={progress.percent}
            size={42}
            strokeWidth={3.5}
            label={`${arabicDigits(progress.doneAzkar)}/${arabicDigits(progress.totalAzkar)}`}
          />
        </div>

        {/* Row 2: Controls Strip (View Mode + Tashkeel + Reset + Auto-Advance) */}
        <div className="pt-2.5 border-t border-[#D0CABA]/60 dark:border-[#3B4A46]/60 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {category.azkar.length > 1 && (
              <div className="flex items-center bg-[#EDE8DA] dark:bg-[#243230] p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    mode === 'list'
                      ? 'bg-[#0F5C4D] text-white dark:bg-[#6FD3B8] dark:text-[#00382E]'
                      : 'text-[#4A4639] dark:text-[#C2C9C4]'
                  }`}
                >
                  قائمة
                </button>
                <button
                  type="button"
                  onClick={() => setMode('focus')}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    mode === 'focus'
                      ? 'bg-[#0F5C4D] text-white dark:bg-[#6FD3B8] dark:text-[#00382E]'
                      : 'text-[#4A4639] dark:text-[#C2C9C4]'
                  }`}
                >
                  بطاقة مركّزة
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onToggleTashkeel}
              title={showTashkeel ? 'إخفاء التشكيل' : 'إظهار التشكيل'}
              className={`h-8 px-2.5 rounded-xl border text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                showTashkeel
                  ? 'border-[#0F5C4D]/40 dark:border-[#6FD3B8]/40 bg-[#CFEADF]/40 dark:bg-[#14463B]/40 text-[#0F5C4D] dark:text-[#6FD3B8]'
                  : 'border-[#D0CABA] dark:border-[#3B4A46] text-[#4A4639] dark:text-[#C2C9C4]'
              }`}
            >
              {showTashkeel ? 'بالتشكيل' : 'بدون تشكيل'}
            </button>

            <button
              type="button"
              onClick={() => onResetCategory(category)}
              aria-label="إعادة العدّ لهذا الباب"
              title="تصفير عدّادات هذا الباب"
              className="h-8 px-2.5 rounded-xl border border-[#D0CABA] dark:border-[#3B4A46] text-xs font-bold text-[#4A4639] dark:text-[#C2C9C4] hover:bg-[#EDE8DA] dark:hover:bg-[#243230] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">إعادة العدّ</span>
            </button>
          </div>

          {category.azkar.length > 1 && (
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] sm:text-xs text-[#4A4639] dark:text-[#C2C9C4] select-none">
              <input
                type="checkbox"
                checked={autoAdvance}
                onChange={(e) => onSetAutoAdvance(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#0F5C4D] dark:accent-[#6FD3B8] rounded"
              />
              <span>انتقال تلقائي للتالي</span>
            </label>
          )}
        </div>
      </div>

      {/* MODE 1: Focused Single-Zekr Pager View */}
      {mode === 'focus' && currentFocusZekr && (
        <div className="space-y-3.5">
          {/* Pager Navigation Bar */}
          <div className="flex items-center justify-between gap-2 bg-[#F3EFE3] dark:bg-[#182120] border border-[#D0CABA] dark:border-[#3B4A46] rounded-xl px-2.5 sm:px-4 py-1.5">
            <button
              type="button"
              disabled={activeIdx === 0}
              onClick={() => {
                const next = Math.max(0, activeIdx - 1);
                setActiveIdx(next);
                onSelectPosition(category.id, next);
              }}
              className="h-9 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-40 hover:bg-[#EDE8DA] dark:hover:bg-[#243230] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {category.azkar.map((item, idx) => {
                const isDone = (counts[item.id] || 0) >= item.repeat;
                const isCurrent = idx === activeIdx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveIdx(idx);
                      onSelectPosition(category.id, idx);
                    }}
                    aria-label={`الذكر ${idx + 1}`}
                    className={`min-w-[30px] h-7 px-1.5 rounded-lg text-xs font-bold tabular-nums transition-colors shrink-0 cursor-pointer ${
                      isCurrent
                        ? 'bg-[#0F5C4D] text-white dark:bg-[#6FD3B8] dark:text-[#00382E]'
                        : isDone
                        ? 'bg-[#CFEADF] text-[#00201A] dark:bg-[#14463B] dark:text-[#B5F0DD]'
                        : 'bg-[#EDE8DA]/70 dark:bg-[#243230]/70 text-[#4A4639] dark:text-[#C2C9C4]'
                    }`}
                  >
                    {arabicDigits(idx + 1)}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={activeIdx >= category.azkar.length - 1}
              onClick={() => {
                const next = Math.min(category.azkar.length - 1, activeIdx + 1);
                setActiveIdx(next);
                onSelectPosition(category.id, next);
              }}
              className="h-9 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-40 hover:bg-[#EDE8DA] dark:hover:bg-[#243230] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <ZekrSingleCard
            zekr={currentFocusZekr}
            index={activeIdx}
            totalInCat={category.azkar.length}
            currentCount={counts[currentFocusZekr.id] || 0}
            isFavorite={favorites.includes(currentFocusZekr.id)}
            fontScale={fontScale}
            showTashkeel={showTashkeel}
            isSpeaking={speakingZekrId === currentFocusZekr.id}
            onSpeak={() => handleSpeakZekr(currentFocusZekr)}
            onOpenShareCard={() => setShareCardZekr(currentFocusZekr)}
            isCommentaryOpen={expandedId === currentFocusZekr.id}
            onToggleCommentary={() =>
              setExpandedId(expandedId === currentFocusZekr.id ? null : currentFocusZekr.id)
            }
            activeCommentaryTab={activeCommentaryTab}
            onSetCommentaryTab={setActiveCommentaryTab}
            showFootnote={showFootnoteId === currentFocusZekr.id}
            onToggleFootnote={() =>
              setShowFootnoteId(
                showFootnoteId === currentFocusZekr.id ? null : currentFocusZekr.id
              )
            }
            onTap={() => handleCountTap(currentFocusZekr, activeIdx)}
            onToggleFavorite={() => onToggleFavorite(currentFocusZekr.id)}
            onCopy={handleCopy}
          />
        </div>
      )}

      {/* MODE 2: Full Category Scrollable List View */}
      {mode === 'list' && (
        <div className="space-y-3.5 sm:space-y-5">
          {category.azkar.map((zekr, idx) => {
            const isExpanded = expandedId === zekr.id;
            return (
              <div
                key={zekr.id}
                ref={(el) => {
                  cardRefs.current[zekr.id] = el;
                }}
              >
                <ZekrSingleCard
                  zekr={zekr}
                  index={idx}
                  totalInCat={category.azkar.length}
                  currentCount={counts[zekr.id] || 0}
                  isFavorite={favorites.includes(zekr.id)}
                  fontScale={fontScale}
                  showTashkeel={showTashkeel}
                  isSpeaking={speakingZekrId === zekr.id}
                  onSpeak={() => handleSpeakZekr(zekr)}
                  onOpenShareCard={() => setShareCardZekr(zekr)}
                  isCommentaryOpen={isExpanded}
                  onToggleCommentary={() => setExpandedId(isExpanded ? null : zekr.id)}
                  activeCommentaryTab={activeCommentaryTab}
                  onSetCommentaryTab={setActiveCommentaryTab}
                  showFootnote={showFootnoteId === zekr.id}
                  onToggleFootnote={() =>
                    setShowFootnoteId(showFootnoteId === zekr.id ? null : zekr.id)
                  }
                  onTap={() => handleCountTap(zekr, idx)}
                  onToggleFavorite={() => onToggleFavorite(zekr.id)}
                  onCopy={handleCopy}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Calligraphic Da'wah Share Card Modal */}
      {shareCardZekr && (
        <ShareCardModal
          zekr={shareCardZekr}
          showTashkeel={showTashkeel}
          onClose={() => setShareCardZekr(null)}
          onToast={onCopyToast}
        />
      )}
    </div>
  );
};

interface ZekrSingleCardProps {
  zekr: Zekr;
  index: number;
  totalInCat: number;
  currentCount: number;
  isFavorite: boolean;
  fontScale: number;
  showTashkeel: boolean;
  isSpeaking: boolean;
  onSpeak: () => void;
  onOpenShareCard: () => void;
  isCommentaryOpen: boolean;
  onToggleCommentary: () => void;
  activeCommentaryTab: 'sharh' | 'hadeth' | 'benefit';
  onSetCommentaryTab: (tab: 'sharh' | 'hadeth' | 'benefit') => void;
  showFootnote: boolean;
  onToggleFootnote: () => void;
  onTap: () => void;
  onToggleFavorite: () => void;
  onCopy: (text: string, label?: string) => void;
}

const ZekrSingleCard: React.FC<ZekrSingleCardProps> = ({
  zekr,
  index,
  totalInCat,
  currentCount,
  isFavorite,
  fontScale,
  showTashkeel,
  isSpeaking,
  onSpeak,
  onOpenShareCard,
  isCommentaryOpen,
  onToggleCommentary,
  activeCommentaryTab,
  onSetCommentaryTab,
  showFootnote,
  onToggleFootnote,
  onTap,
  onToggleFavorite,
  onCopy,
}) => {
  const isDone = currentCount >= zekr.repeat;
  const remaining = Math.max(0, zekr.repeat - currentCount);
  const progressRatio = Math.min(100, Math.round((currentCount / zekr.repeat) * 100));

  const availableTabs = useMemo(() => {
    const list: { key: 'sharh' | 'hadeth' | 'benefit'; shortLabel: string; fullLabel: string; content: string }[] = [];
    if (zekr.sharh.trim()) list.push({ key: 'sharh', shortLabel: 'الشرح', fullLabel: 'الشرح والتفسير', content: zekr.sharh });
    if (zekr.hadeth.trim()) list.push({ key: 'hadeth', shortLabel: 'الحديث', fullLabel: 'نص الحديث والراوي', content: zekr.hadeth });
    if (zekr.benefit.trim()) list.push({ key: 'benefit', shortLabel: 'الفوائد', fullLabel: 'الفوائد والأحكام', content: zekr.benefit });
    return list;
  }, [zekr]);

  const resolvedTab =
    availableTabs.find((t) => t.key === activeCommentaryTab) || availableTabs[0] || null;

  return (
    <article
      className={`rounded-2xl border transition-colors ${
        isDone
          ? 'bg-[#E6EFE9]/70 dark:bg-[#1E3A32]/50 border-[#0F5C4D]/40 dark:border-[#6FD3B8]/40'
          : 'bg-[#F3EFE3] dark:bg-[#182120] border-[#D0CABA] dark:border-[#3B4A46]'
      } p-4 sm:p-6`}
    >
      {/* Single-Row Top Meta & Actions (Never wraps onto 2 lines on 360px mobile) */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3.5 border-b border-[#D0CABA]/60 dark:border-[#3B4A46]/60">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#9A7515] dark:text-[#E7C46A] tabular-nums whitespace-nowrap min-w-0 truncate">
          <span>
            الذكر {arabicDigits(index + 1)}/{arabicDigits(totalInCat)}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {zekr.repeat === 1
              ? 'مرة واحدة'
              : `${arabicDigits(zekr.repeat)} مرات`}
          </span>
          {isDone && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#0F5C4D] dark:text-[#6FD3B8]">مكتمل</span>
            </>
          )}
        </div>

        {/* Compact Action Icon Strip */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onSpeak}
            aria-label={isSpeaking ? 'إيقاف القراءة الصوتية' : 'استماع للنطق الصوتي'}
            title={isSpeaking ? 'إيقاف القراءة الصوتية' : 'استماع للنطق الصوتي'}
            className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isSpeaking
                ? 'text-[#0F5C4D] dark:text-[#6FD3B8] bg-[#CFEADF] dark:bg-[#14463B]'
                : 'text-[#4A4639] dark:text-[#C2C9C4] hover:bg-[#EDE8DA] dark:hover:bg-[#243230]'
            }`}
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
            title={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
            className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isFavorite
                ? 'text-[#0F5C4D] dark:text-[#6FD3B8] bg-[#CFEADF]/60 dark:bg-[#14463B]/60'
                : 'text-[#4A4639] dark:text-[#C2C9C4] hover:bg-[#EDE8DA] dark:hover:bg-[#243230]'
            }`}
          >
            <Heart className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
          </button>

          <button
            type="button"
            onClick={() => onCopy(formatCopyZekr(zekr, true), 'تم نسخ الذكر مع التخريج')}
            aria-label="نسخ الذكر"
            title="نسخ الذكر مع التخريج"
            className="h-9 w-9 rounded-lg text-[#4A4639] dark:text-[#C2C9C4] hover:bg-[#EDE8DA] dark:hover:bg-[#243230] flex items-center justify-center transition-colors cursor-pointer"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenShareCard}
            aria-label="مشاركة كبطاقة مصورة"
            title="تصميم ومشاركة بطاقة دعوية مصورة"
            className="h-9 px-2 rounded-lg text-[#0F5C4D] dark:text-[#6FD3B8] hover:bg-[#CFEADF]/50 dark:hover:bg-[#14463B]/50 flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer"
          >
            <ImageIcon className="w-4 h-4" />
            <span className="hidden sm:inline">بطاقة مصورة</span>
          </button>
        </div>
      </div>

      {/* Main Zekr Text Area — Balanced 21px mobile base, 24px desktop */}
      <div className="max-w-3xl mx-auto my-1.5">
        <RichArabicText
          src={zekr.text}
          scale={fontScale}
          baseSize={21}
          showTashkeel={showTashkeel}
          onFootnoteClick={() => onToggleFootnote()}
        />
      </div>

      {/* Footnote / Takhrij Toggle & Content */}
      {zekr.footnote.trim().length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-[#D0CABA]/40 dark:border-[#3B4A46]/40">
          <button
            type="button"
            onClick={onToggleFootnote}
            className="text-xs font-bold text-[#9A7515] dark:text-[#E7C46A] hover:underline flex items-center gap-1.5 py-0.5 cursor-pointer"
          >
            <span>{showFootnote ? 'إخفاء التخريج والمصدر' : 'عرض التخريج والمصدر'}</span>
          </button>
          {showFootnote && (
            <div className="mt-2 p-3 sm:p-4 rounded-xl bg-[#EDE8DA]/80 dark:bg-[#1F2A28] text-sm text-[#4A4639] dark:text-[#C2C9C4]">
              <RichArabicText
                src={zekr.footnote}
                scale={fontScale}
                baseSize={16}
                showTashkeel={showTashkeel}
              />
            </div>
          )}
        </div>
      )}

      {/* Interactive Counter & Scholarly Commentary Trigger — Side-by-side even on Mobile */}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onTap}
          disabled={isDone}
          aria-label={
            isDone
              ? 'تم إتمام هذا الذكر'
              : `اضغط للعدّ ${currentCount} من ${zekr.repeat}`
          }
          className={`relative overflow-hidden flex-1 min-h-[48px] px-3.5 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-base flex items-center justify-between gap-2 transition-all active:scale-[0.99] select-none cursor-pointer ${
            isDone
              ? 'bg-[#CFEADF] text-[#00201A] dark:bg-[#14463B] dark:text-[#B5F0DD] cursor-default'
              : 'bg-[#0F5C4D] text-white hover:bg-[#0c4a3e] dark:bg-[#6FD3B8] dark:text-[#00382E] dark:hover:bg-[#5bc2a6] shadow-xs'
          }`}
        >
          {/* Progress background fill */}
          {!isDone && currentCount > 0 && (
            <span
              className="absolute inset-y-0 right-0 bg-white/15 dark:bg-black/15 transition-all duration-200 pointer-events-none"
              style={{ width: `${progressRatio}%` }}
            />
          )}

          <span className="relative z-10 flex items-center gap-1.5 whitespace-nowrap">
            {isDone ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>تمّ بحمد الله</span>
              </>
            ) : zekr.repeat > 1 ? (
              <span>اضغط للعدّ</span>
            ) : (
              <span>اضغط عند الإتمام</span>
            )}
          </span>

          <span className="relative z-10 font-sans-ar text-xs sm:text-base tabular-nums whitespace-nowrap">
            {zekr.repeat > 1 ? (
              <>
                {arabicDigits(currentCount)} / {arabicDigits(zekr.repeat)}
                {!isDone && remaining > 0 && (
                  <span className="hidden sm:inline text-xs opacity-85 mr-1.5 font-normal">
                    (متبقٍ {arabicDigits(remaining)})
                  </span>
                )}
              </>
            ) : isDone ? (
              '١ / ١'
            ) : (
              'مرة واحدة'
            )}
          </span>
        </button>

        {availableTabs.length > 0 && (
          <button
            type="button"
            onClick={onToggleCommentary}
            aria-expanded={isCommentaryOpen}
            className={`min-h-[48px] px-3 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isCommentaryOpen
                ? 'bg-[#EDE8DA] dark:bg-[#243230] border-[#0F5C4D] dark:border-[#6FD3B8] text-[#0F5C4D] dark:text-[#6FD3B8]'
                : 'border-[#D0CABA] dark:border-[#3B4A46] text-[#1C1B17] dark:text-[#E6E2D9] hover:bg-[#EDE8DA] dark:hover:bg-[#243230]'
            }`}
          >
            <BookOpen className="w-4 h-4 text-[#0F5C4D] dark:text-[#6FD3B8] shrink-0" />
            <span>{isCommentaryOpen ? 'إخفاء الشرح' : 'الشرح والفوائد'}</span>
          </button>
        )}
      </div>

      {/* Scholarly Commentary Drawer (إتحاف المسلم بشرح حصن المسلم) */}
      {isCommentaryOpen && availableTabs.length > 0 && resolvedTab && (
        <div className="mt-4 pt-4 border-t border-[#D0CABA] dark:border-[#3B4A46]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5">
            {/* Equal-width grid on mobile so tab labels NEVER clip */}
            <div
              className="grid bg-[#EDE8DA] dark:bg-[#243230] p-1 rounded-xl gap-1 w-full sm:w-auto"
              style={{ gridTemplateColumns: `repeat(${availableTabs.length}, minmax(0, 1fr))` }}
            >
              {availableTabs.map((tab) => {
                const active = resolvedTab.key === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => onSetCommentaryTab(tab.key)}
                    className={`py-2 px-2 sm:px-3.5 rounded-lg text-xs font-bold transition-colors text-center truncate cursor-pointer ${
                      active
                        ? 'bg-[#FBF8F1] dark:bg-[#101514] text-[#0F5C4D] dark:text-[#6FD3B8] shadow-xs'
                        : 'text-[#4A4639] dark:text-[#C2C9C4] hover:text-[#1C1B17] dark:hover:text-white'
                    }`}
                  >
                    <span className="sm:hidden">{tab.shortLabel}</span>
                    <span className="hidden sm:inline">{tab.fullLabel}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onCopy(plainText(resolvedTab.content), `تم نسخ ${resolvedTab.shortLabel}`)
                }
                className="h-8 px-2.5 rounded-lg text-xs font-medium text-[#4A4639] dark:text-[#C2C9C4] hover:bg-[#EDE8DA] dark:hover:bg-[#243230] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ {resolvedTab.shortLabel}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onCopy(formatCopyAll(zekr), 'تم نسخ الذكر مع الشرح الكامل')
                }
                className="h-8 px-2.5 rounded-lg text-xs font-medium text-[#0F5C4D] dark:text-[#6FD3B8] hover:bg-[#CFEADF]/50 dark:hover:bg-[#14463B]/50 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ الكل</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 sm:p-6 rounded-xl bg-[#FBF8F1] dark:bg-[#101514] border border-[#D0CABA]/70 dark:border-[#3B4A46]/70 max-w-3xl">
            <div className="text-xs font-bold text-[#9A7515] dark:text-[#E7C46A] mb-2.5">
              من كتاب «إتحاف المسلم بشرح حصن المسلم» — {resolvedTab.fullLabel}
            </div>
            <ScholarlyLongText
              body={resolvedTab.content}
              scale={fontScale}
              baseSize={18}
              showTashkeel={showTashkeel}
            />
          </div>
        </div>
      )}
    </article>
  );
};
