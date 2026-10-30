import test from 'node:test';
import assert from 'node:assert/strict';
import {
  arabicDigits,
  buildSearchIndex,
  classifyCategoryGroup,
  extractSnippet,
  getCategoryProgress,
  normalizeArabic,
  parseRichMarkup,
  plainText,
  searchAzkar,
} from './arabic';
import { Category, Zekr } from './types';

test('normalizeArabic removes tashkeel and unifies alef, teh marbuta, and yeh', () => {
  const raw = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ — أذكارُ الصَّلاةِ والهدى';
  const norm = normalizeArabic(raw);
  assert.equal(norm, 'بسم الله الرحمن الرحيم — اذكار الصلاه والهدي');
});

test('arabicDigits converts Western digits to Eastern Arabic numerals', () => {
  assert.equal(arabicDigits(0), '٠');
  assert.equal(arabicDigits(33), '٣٣');
  assert.equal(arabicDigits(135), '١٣٥');
  assert.equal(arabicDigits('10/26'), '١٠/٢٦');
});

test('parseRichMarkup parses <v>, <s>, and <n> tags accurately', () => {
  const sample = 'قال تعالى: <v>قُلْ هُوَ اللَّهُ أَحَدٌ</v> <s>ثلاث مرات</s><n>12</n>';
  const tokens = parseRichMarkup(sample);
  assert.equal(tokens.length, 5);
  assert.deepEqual(tokens[0], { type: 'text', content: 'قال تعالى: ' });
  assert.deepEqual(tokens[1], { type: 'verse', content: '﴿قُلْ هُوَ اللَّهُ أَحَدٌ﴾' });
  assert.deepEqual(tokens[2], { type: 'text', content: ' ' });
  assert.deepEqual(tokens[3], { type: 'note', content: '[ثلاث مرات]' });
  assert.deepEqual(tokens[4], { type: 'mark', content: '١٢', footnoteNum: 12 });
});

test('plainText strips <n> footnotes and formats <v> and <s> brackets', () => {
  const sample = 'أَعُوذُ بِاللَّهِ <v>آية الكرسي</v> <s>مرة واحدة</s> <n>4</n>';
  assert.equal(plainText(sample), 'أَعُوذُ بِاللَّهِ ﴿آية الكرسي﴾ [مرة واحدة]');
});

test('searchAzkar finds matches across diacritic-heavy text and scopes', () => {
  const mockZekr: Zekr = {
    id: 101,
    text: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ',
    repeat: 1,
    footnote: 'رواه مسلم',
    sharh: 'قوله أصبحنا أي دخلنا في وقت الصباح متلبسين بنعمة الله',
    hadeth: 'عن ابن مسعود رضي الله عنه',
    benefit: 'إظهار العبودية والافتقار إلى الله كل صباح',
    catId: 27,
    catTitle: 'أذكار الصباح',
    idx: 0,
    hasExtras: true,
  };

  const index = buildSearchIndex([mockZekr]);

  // Search without hamza or diacritics
  const hitsText = searchAzkar(index, 'اصبح الملك');
  assert.equal(hitsText.length, 1);
  assert.equal(hitsText[0].where, 'الذكر');

  // Search in sharh specifically
  const hitsSharh = searchAzkar(index, 'متلبسين بنعمه', 'sharh');
  assert.equal(hitsSharh.length, 1);
  assert.equal(hitsSharh[0].where, 'الشرح');

  // Search in benefit
  const hitsBenefit = searchAzkar(index, 'العبوديه والافتقار', 'benefit');
  assert.equal(hitsBenefit.length, 1);
  assert.equal(hitsBenefit[0].where, 'الفوائد');
});

test('getCategoryProgress computes completed azkar and click totals', () => {
  const z1: Zekr = {
    id: 1,
    text: 'ذكر ١',
    repeat: 3,
    footnote: '',
    sharh: '',
    hadeth: '',
    benefit: '',
    catId: 27,
    catTitle: 'أذكار الصباح',
    idx: 0,
    hasExtras: false,
  };
  const z2: Zekr = {
    ...z1,
    id: 2,
    repeat: 1,
    idx: 1,
  };
  const cat: Category = {
    id: 27,
    title: 'أذكار الصباح',
    azkar: [z1, z2],
    group: classifyCategoryGroup(27),
  };

  const progress1 = getCategoryProgress(cat, { 1: 2, 2: 1 });
  assert.equal(progress1.doneAzkar, 1);
  assert.equal(progress1.totalAzkar, 2);
  assert.equal(progress1.doneClicks, 3);
  assert.equal(progress1.totalClicks, 4);
  assert.equal(progress1.percent, 50);

  const progress2 = getCategoryProgress(cat, { 1: 3, 2: 1 });
  assert.equal(progress2.doneAzkar, 2);
  assert.equal(progress2.percent, 100);
});

test('stripTashkeel removes diacritics while preserving hamzas and teh marbuta', async () => {
  const { stripTashkeel } = await import('./arabic');
  const raw = 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ رَبِّ الْعَالَمِينَ، الصَّلَاةُ';
  assert.equal(stripTashkeel(raw), 'أصبحنا وأصبح الملك لله رب العالمين، الصلاة');
});

test('calculateStreakStats computes consecutive streak and 7-day history accurately', async () => {
  const { calculateStreakStats } = await import('./arabic');
  const history = {
    '2026-10-29': { completedAzkar: 5, totalTaps: 15 },
    '2026-10-28': { completedAzkar: 10, totalTaps: 33 },
    '2026-10-27': { completedAzkar: 3, totalTaps: 9 },
  };
  const stats = calculateStreakStats(history, '2026-10-29');
  assert.equal(stats.currentStreak, 3);
  assert.equal(stats.totalActiveDays, 3);
  assert.equal(stats.last7Days.length, 7);
  assert.equal(stats.last7Days[6].dayLabel, 'اليوم');
  assert.equal(stats.last7Days[6].active, true);
});

