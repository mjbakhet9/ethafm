import React, { useMemo, useRef, useState } from 'react';
import { Download, Image as ImageIcon, Share2, X } from 'lucide-react';
import { Zekr } from '../utils/types';
import { arabicDigits, plainText, stripTashkeel } from '../utils/arabic';

interface ShareCardModalProps {
  zekr: Zekr;
  showTashkeel: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}

type CardPaletteKey = 'paper' | 'emerald' | 'night';

const PALETTES: Record<
  CardPaletteKey,
  {
    name: string;
    bg: string;
    border: string;
    accent: string;
    text: string;
    subtext: string;
  }
> = {
  paper: {
    name: 'ورقي تراثي',
    bg: '#FBF8F1',
    border: '#D0CABA',
    accent: '#0F5C4D',
    text: '#1C1B17',
    subtext: '#6E6856',
  },
  emerald: {
    name: 'أخضر زمردي',
    bg: '#0E483C',
    border: '#2B6E5F',
    accent: '#E7C46A',
    text: '#FBF8F1',
    subtext: '#B5F0DD',
  },
  night: {
    name: 'ليلي فاخر',
    bg: '#101514',
    border: '#2F403C',
    accent: '#6FD3B8',
    text: '#E6E2D9',
    subtext: '#9BA8A3',
  },
};

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
  zekr,
  showTashkeel,
  onClose,
  onToast,
}) => {
  const [paletteKey, setPaletteKey] = useState<CardPaletteKey>('paper');
  const [includeFootnote, setIncludeFootnote] = useState<boolean>(true);
  const [includeBenefit, setIncludeBenefit] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const pal = PALETTES[paletteKey];

  const cleanMainText = useMemo(() => {
    const raw = plainText(zekr.text);
    return showTashkeel ? raw : stripTashkeel(raw);
  }, [zekr.text, showTashkeel]);

  const cleanBenefitSnippet = useMemo(() => {
    if (!zekr.benefit.trim()) return '';
    const raw = plainText(zekr.benefit).replace(/\s+/g, ' ').trim();
    const sliced = raw.length > 180 ? `${raw.slice(0, 180)}…` : raw;
    return showTashkeel ? sliced : stripTashkeel(sliced);
  }, [zekr.benefit, showTashkeel]);

  /**
   * Renders the calligraphic Da'wah card onto an HTML5 Canvas and triggers PNG download.
   */
  const handleDownloadPng = async () => {
    setExporting(true);
    try {
      const canvas = canvasRef.current || document.createElement('canvas');
      const width = 1080;
      const height = 1350;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Background Fill
      ctx.fillStyle = pal.bg;
      ctx.fillRect(0, 0, width, height);

      // 2. Ornamental Outer & Inner Frames
      ctx.strokeStyle = pal.border;
      ctx.lineWidth = 3;
      ctx.strokeRect(48, 48, width - 96, height - 96);

      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(64, 64, width - 128, height - 128);

      // 3. Header: Category Title & Repeat
      ctx.direction = 'rtl';
      ctx.textAlign = 'center';

      ctx.fillStyle = pal.accent;
      ctx.font = 'bold 32px ThmanyahSans, sans-serif';
      ctx.fillText(zekr.catTitle, width / 2, 145);

      ctx.fillStyle = pal.subtext;
      ctx.font = '24px ThmanyahSans, sans-serif';
      const repeatLabel =
        zekr.repeat > 1
          ? `يُقال ${arabicDigits(zekr.repeat)} مرات`
          : 'يُقال مرة واحدة';
      ctx.fillText(repeatLabel, width / 2, 190);

      // Divider line
      ctx.beginPath();
      ctx.moveTo(width / 2 - 140, 225);
      ctx.lineTo(width / 2 + 140, 225);
      ctx.strokeStyle = pal.border;
      ctx.lineWidth = 2;
      ctx.stroke();

      // 4. Word-wrap Main Zekr Text
      const maxTextWidth = width - 220;
      const fontSize = cleanMainText.length > 350 ? 36 : cleanMainText.length > 180 ? 44 : 52;
      const lineHeight = Math.round(fontSize * 1.85);
      ctx.font = `${fontSize}px ThmanyahSerif, AmiriQuran, serif`;
      ctx.fillStyle = pal.text;

      const words = cleanMainText.split(/\s+/);
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const m = ctx.measureText(testLine);
        if (m.width > maxTextWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      const maxLines = 11;
      const visibleLines = lines.slice(0, maxLines);
      if (lines.length > maxLines) {
        visibleLines[maxLines - 1] += ' …';
      }

      const totalBlockHeight = visibleLines.length * lineHeight;
      let startY = Math.max(320, (height - totalBlockHeight) / 2 - 20);

      for (const line of visibleLines) {
        ctx.fillText(line, width / 2, startY);
        startY += lineHeight;
      }

      // 5. Optional Benefit or Footnote at bottom
      let footerY = height - 220;
      if (includeBenefit && cleanBenefitSnippet) {
        ctx.fillStyle = pal.accent;
        ctx.font = 'bold 24px ThmanyahSans, sans-serif';
        ctx.fillText('من فوائد الذكر:', width / 2, footerY - 50);

        ctx.fillStyle = pal.subtext;
        ctx.font = '24px ThmanyahSans, sans-serif';
        ctx.fillText(cleanBenefitSnippet.slice(0, 85) + '…', width / 2, footerY - 12);
      } else if (includeFootnote && zekr.footnote.trim()) {
        ctx.fillStyle = pal.subtext;
        ctx.font = '23px ThmanyahSans, sans-serif';
        const fnShort = plainText(zekr.footnote).replace(/\s+/g, ' ').slice(0, 90);
        ctx.fillText(fnShort, width / 2, footerY);
      }

      // 6. Signature Footer
      ctx.fillStyle = pal.accent;
      ctx.font = 'bold 26px ThmanyahDisplay, ThmanyahSans, sans-serif';
      ctx.fillText('حصن المسلم من أذكار الكتاب والسنة — مع الشرح', width / 2, height - 105);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `hisn-zekr-${zekr.id}.png`;
      link.href = dataUrl;
      link.click();
      onToast('تم تحميل بطاقة الذكر المصورة بنجاح');
    } catch {
      onToast('تعذر تصدير الصورة');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="تصميم ومشاركة بطاقة الذكر"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-[#FBF8F1] dark:bg-[#101514] border border-[#D0CABA] dark:border-[#3B4A46] p-4 sm:p-6 space-y-5 pb-safe"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#D0CABA] dark:border-[#3B4A46] pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#0F5C4D] dark:text-[#6FD3B8]" />
            <h2 className="text-lg font-display-ar font-bold text-[#1C1B17] dark:text-[#E6E2D9]">
              بطاقة دعوية مصوّرة للذكر
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="min-h-[40px] min-w-[40px] rounded-xl bg-[#EDE8DA] dark:bg-[#243230] flex items-center justify-center text-[#1C1B17] dark:text-[#E6E2D9]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Visual Preview of Card */}
        <div
          className="rounded-2xl p-5 sm:p-7 border-2 transition-colors text-center space-y-4 relative overflow-hidden"
          style={{
            backgroundColor: pal.bg,
            borderColor: pal.border,
            color: pal.text,
          }}
        >
          <div
            className="text-xs font-bold tracking-wide"
            style={{ color: pal.accent }}
          >
            {zekr.catTitle} ·{' '}
            {zekr.repeat > 1
              ? `يُقال ${arabicDigits(zekr.repeat)} مرات`
              : 'مرة واحدة'}
          </div>

          <div
            className="font-read text-lg sm:text-xl leading-loose py-2 select-text"
            style={{ color: pal.text }}
          >
            {cleanMainText}
          </div>

          {includeBenefit && cleanBenefitSnippet && (
            <div
              className="text-xs pt-3 border-t leading-relaxed"
              style={{ borderColor: pal.border, color: pal.subtext }}
            >
              <strong style={{ color: pal.accent }}>من الفوائد: </strong>
              {cleanBenefitSnippet}
            </div>
          )}

          {includeFootnote && !includeBenefit && zekr.footnote.trim() && (
            <div
              className="text-[11px] pt-3 border-t leading-relaxed"
              style={{ borderColor: pal.border, color: pal.subtext }}
            >
              {plainText(zekr.footnote)}
            </div>
          )}

          <div
            className="text-[11px] font-bold pt-2"
            style={{ color: pal.accent }}
          >
            حصن المسلم من أذكار الكتاب والسنة — مع الشرح
          </div>
        </div>

        {/* Customization Controls */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#4A4639] dark:text-[#C2C9C4]">
              نمط ألوان البطاقة:
            </span>
            <div className="flex items-center gap-2">
              {(Object.keys(PALETTES) as CardPaletteKey[]).map((k) => {
                const active = paletteKey === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPaletteKey(k)}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      active
                        ? 'bg-[#0F5C4D] text-white border-[#0F5C4D] dark:bg-[#6FD3B8] dark:text-[#00382E]'
                        : 'bg-[#F3EFE3] dark:bg-[#182120] border-[#D0CABA] dark:border-[#3B4A46] text-[#1C1B17] dark:text-[#E6E2D9]'
                    }`}
                  >
                    {PALETTES[k].name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[#4A4639] dark:text-[#C2C9C4]">
            {zekr.footnote.trim() && (
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeFootnote && !includeBenefit}
                  onChange={(e) => {
                    setIncludeFootnote(e.target.checked);
                    if (e.target.checked) setIncludeBenefit(false);
                  }}
                  className="w-4 h-4 accent-[#0F5C4D]"
                />
                <span>إظهار التخريج والمصدر</span>
              </label>
            )}
            {cleanBenefitSnippet && (
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBenefit}
                  onChange={(e) => {
                    setIncludeBenefit(e.target.checked);
                    if (e.target.checked) setIncludeFootnote(false);
                  }}
                  className="w-4 h-4 accent-[#0F5C4D]"
                />
                <span>إظهار مقتطف الفوائد العلمية</span>
              </label>
            )}
          </div>
        </div>

        {/* Hidden high-res canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            disabled={exporting}
            onClick={handleDownloadPng}
            className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-[#0F5C4D] text-white dark:bg-[#6FD3B8] dark:text-[#00382E] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'جاري التجهيز…' : 'تحميل البطاقة كصورة (PNG)'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] px-4 py-2.5 rounded-xl border border-[#D0CABA] dark:border-[#3B4A46] text-xs font-bold text-[#4A4639] dark:text-[#C2C9C4]"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
