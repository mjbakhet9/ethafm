import React, { useMemo } from 'react';
import { arabicDigits, parseRichMarkup, stripTashkeel } from '../utils/arabic';

interface RichArabicTextProps {
  src: string;
  scale?: number;
  baseSize?: number; // in px
  showTashkeel?: boolean;
  className?: string;
  onFootnoteClick?: (num: number) => void;
}

export const RichArabicText: React.FC<RichArabicTextProps> = ({
  src,
  scale = 1,
  baseSize = 21,
  showTashkeel = true,
  className = '',
  onFootnoteClick,
}) => {
  const tokens = useMemo(() => parseRichMarkup(src), [src]);
  const fontSizePx = Math.round(baseSize * scale);
  // Generous line-height so Quranic marks and diacritics never collide
  const lineHeightPx = Math.round(fontSizePx * 2.05);

  return (
    <div
      className={`font-read text-[#1C1B17] dark:text-[#E6E2D9] select-text break-words ${className}`}
      style={{
        fontSize: `${fontSizePx}px`,
        lineHeight: `${lineHeightPx}px`,
      }}
    >
      {tokens.map((tok, i) => {
        const displayContent = showTashkeel ? tok.content : stripTashkeel(tok.content);
        if (tok.type === 'verse') {
          return (
            <span
              key={i}
              className="font-quran text-[#0F5C4D] dark:text-[#6FD3B8]"
              style={{
                fontSize: `${Math.round(fontSizePx * 1.04)}px`,
                lineHeight: `${Math.round(fontSizePx * 2.25)}px`,
              }}
            >
              {displayContent}
            </span>
          );
        }
        if (tok.type === 'note') {
          return (
            <span
              key={i}
              className="text-[#4A4639] dark:text-[#C2C9C4] font-normal"
              style={{ fontSize: `${Math.round(fontSizePx * 0.84)}px` }}
            >
              {displayContent}
            </span>
          );
        }
        if (tok.type === 'mark') {
          return (
            <sup
              key={i}
              onClick={(e) => {
                if (onFootnoteClick && tok.footnoteNum !== undefined) {
                  e.stopPropagation();
                  onFootnoteClick(tok.footnoteNum);
                }
              }}
              title={onFootnoteClick ? 'اضغط لعرض التخريج والمصدر' : undefined}
              className={`text-[#9A7515] dark:text-[#E7C46A] font-sans-ar font-bold mx-0.5 select-none ${
                onFootnoteClick ? 'cursor-pointer hover:underline' : ''
              }`}
              style={{ fontSize: `${Math.max(11, Math.round(fontSizePx * 0.56))}px` }}
            >
              ({tok.content})
            </sup>
          );
        }
        return <React.Fragment key={i}>{displayContent}</React.Fragment>;
      })}
    </div>
  );
};

interface ScholarlyLongTextProps {
  body: string;
  scale?: number;
  baseSize?: number;
  showTashkeel?: boolean;
}

/**
 * Formats scholarly commentary (الشرح، الحديث، الفوائد) into well-spaced paragraphs.
 * Short lines ending with ':' are styled as distinct editorial subheadings.
 */
export const ScholarlyLongText: React.FC<ScholarlyLongTextProps> = ({
  body,
  scale = 1,
  baseSize = 18,
  showTashkeel = true,
}) => {
  const paragraphs = useMemo(
    () =>
      body
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
    [body]
  );

  return (
    <div className="space-y-3 select-text">
      {paragraphs.map((line, idx) => {
        const isHeading =
          line.length < 55 && (line.endsWith(':') || line.startsWith('•') || line.startsWith('-'));
        if (isHeading) {
          return (
            <h4
              key={idx}
              className="font-read font-bold text-[#0F5C4D] dark:text-[#6FD3B8] pt-1.5"
            >
              <RichArabicText
                src={line}
                scale={scale}
                baseSize={Math.round(baseSize * 1.04)}
                showTashkeel={showTashkeel}
                className="!text-[#0F5C4D] dark:!text-[#6FD3B8] font-bold"
              />
            </h4>
          );
        }
        return (
          <RichArabicText
            key={idx}
            src={line}
            scale={scale}
            baseSize={baseSize}
            showTashkeel={showTashkeel}
            className="text-[#1C1B17]/95 dark:text-[#E6E2D9]/95"
          />
        );
      })}
    </div>
  );
};

export const StatProgressRing: React.FC<{
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}> = ({ percent, size = 44, strokeWidth = 3.5, label }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90 transform">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-[#EDE8DA] dark:text-[#243230]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-[#0F5C4D] dark:text-[#6FD3B8] transition-all duration-300"
        />
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums text-[#0F5C4D] dark:text-[#6FD3B8]">
        {label ?? `${arabicDigits(clamped)}٪`}
      </span>
    </div>
  );
};
