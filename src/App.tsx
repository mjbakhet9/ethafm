import React, { useEffect, useMemo, useState } from 'react';
import {
  CircleDot,
  Heart,
  Home,
  Search,
  Settings,
} from 'lucide-react';
import {
  AzkarDataset,
  Category,
  CustomTasbihPhrase,
  DailyHistoryMap,
  Zekr,
} from './utils/types';
import {
  arabicDigits,
  buildSearchIndex,
  classifyCategoryGroup,
} from './utils/arabic';
import { playTickSound, triggerHaptic } from './utils/sound';
import { HomeView } from './components/HomeView';
import { CategoryReaderView } from './components/CategoryReaderView';
import {
  FavoritesView,
  SearchView,
  SettingsView,
  TasbihView,
} from './components/SecondaryViews';

type ActiveRoute =
  | { view: 'home' }
  | { view: 'category'; catId: number; initialIdx?: number }
  | { view: 'search'; initialQuery?: string }
  | { view: 'favorites' }
  | { view: 'tasbih' }
  | { view: 'settings' };

const STORAGE_PREFIX = 'hisn_web_v1_';

function getTodayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allAzkar, setAllAzkar] = useState<Zekr[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [route, setRoute] = useState<ActiveRoute>({ view: 'home' });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const todayIso = useMemo(() => getTodayIso(), []);

  // User Preferences
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}theme`);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    return 'light';
  });

  const [fontScale, setFontScale] = useState<number>(() => {
    const saved = parseFloat(localStorage.getItem(`${STORAGE_PREFIX}fontScale`) || '1');
    return Number.isFinite(saved) ? Math.min(1.6, Math.max(0.8, saved)) : 1;
  });

  const [showTashkeel, setShowTashkeel] = useState<boolean>(() => {
    return localStorage.getItem(`${STORAGE_PREFIX}tashkeel`) !== 'false';
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem(`${STORAGE_PREFIX}sound`) !== 'false';
  });

  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() => {
    return localStorage.getItem(`${STORAGE_PREFIX}haptics`) !== 'false';
  });

  const [autoAdvance, setAutoAdvance] = useState<boolean>(() => {
    return localStorage.getItem(`${STORAGE_PREFIX}autoAdvance`) !== 'false';
  });

  // Favorites
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}favorites`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Today's Adhkar Counts (Resets daily)
  const [counts, setCounts] = useState<Record<number, number>>(() => {
    try {
      const day = localStorage.getItem(`${STORAGE_PREFIX}counts_day`);
      if (day !== getTodayIso()) return {};
      const raw = localStorage.getItem(`${STORAGE_PREFIX}counts`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Daily History Map for Streak & 7-Day Activity Strip
  const [history, setHistory] = useState<DailyHistoryMap>(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}history`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Last read position
  const [lastRead, setLastRead] = useState<{ catId: number; idx: number } | null>(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}lastRead`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Tasbih state
  const [tasbihPhraseIdx, setTasbihPhraseIdx] = useState<number>(() => {
    return parseInt(localStorage.getItem(`${STORAGE_PREFIX}tp`) || '0', 10) || 0;
  });

  const [tasbihTarget, setTasbihTarget] = useState<number>(() => {
    return parseInt(localStorage.getItem(`${STORAGE_PREFIX}tt`) || '33', 10) || 33;
  });

  const [tasbihCounts, setTasbihCounts] = useState<Record<number, number>>(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}tc`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [customPhrases, setCustomPhrases] = useState<CustomTasbihPhrase[]>(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}customPhrases`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Apply Dark Mode class on <html>
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}theme`, themeMode);
    const root = document.documentElement;
    const applyDark = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (themeMode === 'dark') {
      applyDark(true);
    } else if (themeMode === 'light') {
      applyDark(false);
    } else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      applyDark(mq.matches);
      const listener = (e: MediaQueryListEvent) => applyDark(e.matches);
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, [themeMode]);

  // Load azkar.json on mount
  useEffect(() => {
    let cancelled = false;
    fetch('/data/azkar.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: AzkarDataset) => {
        if (cancelled) return;
        const parsedCats: Category[] = [];
        const flatAzkar: Zekr[] = [];

        for (const rawCat of data.cats) {
          const zList: Zekr[] = rawCat.z.map((rz, idx) => ({
            id: rz.id,
            text: rz.t,
            repeat: rz.r,
            footnote: rz.f || '',
            sharh: rz.sh || '',
            hadeth: rz.hd || '',
            benefit: rz.bn || '',
            catId: rawCat.id,
            catTitle: rawCat.title,
            idx,
            hasExtras: Boolean(
              (rz.sh && rz.sh.trim()) ||
                (rz.hd && rz.hd.trim()) ||
                (rz.bn && rz.bn.trim())
            ),
          }));

          parsedCats.push({
            id: rawCat.id,
            title: rawCat.title,
            azkar: zList,
            group: classifyCategoryGroup(rawCat.id),
          });
          flatAzkar.push(...zList);
        }

        setCategories(parsedCats);
        setAllAzkar(flatAzkar);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err.message || 'تعذر تحميل بيانات الأذكار');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const searchIndex = useMemo(() => buildSearchIndex(allAzkar), [allAzkar]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  // Record activity in history map
  const recordDailyActivity = (justCompletedZekr: boolean) => {
    const iso = getTodayIso();
    setHistory((prev) => {
      const current = prev[iso] || { completedAzkar: 0, totalTaps: 0 };
      const next: DailyHistoryMap = {
        ...prev,
        [iso]: {
          completedAzkar: current.completedAzkar + (justCompletedZekr ? 1 : 0),
          totalTaps: current.totalTaps + 1,
        },
      };
      localStorage.setItem(`${STORAGE_PREFIX}history`, JSON.stringify(next));
      return next;
    });
  };

  // State updaters with persistence
  const handleSetFontScale = (val: number) => {
    setFontScale(val);
    localStorage.setItem(`${STORAGE_PREFIX}fontScale`, String(val));
  };

  const handleSetShowTashkeel = (val: boolean) => {
    setShowTashkeel(val);
    localStorage.setItem(`${STORAGE_PREFIX}tashkeel`, String(val));
  };

  const handleSetSound = (val: boolean) => {
    setSoundEnabled(val);
    localStorage.setItem(`${STORAGE_PREFIX}sound`, String(val));
  };

  const handleSetHaptics = (val: boolean) => {
    setHapticsEnabled(val);
    localStorage.setItem(`${STORAGE_PREFIX}haptics`, String(val));
  };

  const handleSetAutoAdvance = (val: boolean) => {
    setAutoAdvance(val);
    localStorage.setItem(`${STORAGE_PREFIX}autoAdvance`, String(val));
  };

  const handleToggleFavorite = (zekrId: number) => {
    setFavorites((prev) => {
      const exists = prev.includes(zekrId);
      const next = exists ? prev.filter((id) => id !== zekrId) : [zekrId, ...prev];
      localStorage.setItem(`${STORAGE_PREFIX}favorites`, JSON.stringify(next));
      showToast(exists ? 'تمت الإزالة من المفضلة' : 'تمت الإضافة إلى المفضلة');
      return next;
    });
  };

  const handleTapZekr = (zekr: Zekr): boolean => {
    const current = counts[zekr.id] || 0;
    const nextVal = current + 1;
    const finished = nextVal >= zekr.repeat;

    if (soundEnabled) playTickSound(finished);
    if (hapticsEnabled) triggerHaptic(finished);

    setCounts((prev) => {
      const next = { ...prev, [zekr.id]: nextVal };
      localStorage.setItem(`${STORAGE_PREFIX}counts`, JSON.stringify(next));
      localStorage.setItem(`${STORAGE_PREFIX}counts_day`, getTodayIso());
      return next;
    });

    recordDailyActivity(finished && current < zekr.repeat);

    return finished;
  };

  const handleResetCategory = (cat: Category) => {
    setCounts((prev) => {
      const next = { ...prev };
      for (const z of cat.azkar) {
        delete next[z.id];
      }
      localStorage.setItem(`${STORAGE_PREFIX}counts`, JSON.stringify(next));
      return next;
    });
    showToast(`تم تصفير عدّاد «${cat.title}»`);
  };

  const handleResetAllTodayCounts = () => {
    setCounts({});
    localStorage.removeItem(`${STORAGE_PREFIX}counts`);
    showToast('تم تصفير جميع عدّادات اليوم');
  };

  const handleSelectPosition = (catId: number, idx: number) => {
    const pos = { catId, idx };
    setLastRead(pos);
    localStorage.setItem(`${STORAGE_PREFIX}lastRead`, JSON.stringify(pos));
  };

  const handleOpenCategory = (catId: number, initialIdx?: number) => {
    handleSelectPosition(catId, initialIdx ?? 0);
    setRoute({ view: 'category', catId, initialIdx });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Tasbih handlers
  const handleSelectTasbihPhrase = (idx: number) => {
    setTasbihPhraseIdx(idx);
    localStorage.setItem(`${STORAGE_PREFIX}tp`, String(idx));
  };

  const handleSelectTasbihTarget = (target: number) => {
    setTasbihTarget(target);
    localStorage.setItem(`${STORAGE_PREFIX}tt`, String(target));
  };

  const handleTasbihTap = () => {
    const current = tasbihCounts[tasbihPhraseIdx] || 0;
    const nextVal = current + 1;
    const completedRound = nextVal % tasbihTarget === 0;

    if (soundEnabled) playTickSound(completedRound);
    if (hapticsEnabled) triggerHaptic(completedRound);

    setTasbihCounts((prev) => {
      const next = { ...prev, [tasbihPhraseIdx]: nextVal };
      localStorage.setItem(`${STORAGE_PREFIX}tc`, JSON.stringify(next));
      return next;
    });

    recordDailyActivity(completedRound);
  };

  const handleTasbihReset = () => {
    setTasbihCounts((prev) => {
      const next = { ...prev, [tasbihPhraseIdx]: 0 };
      localStorage.setItem(`${STORAGE_PREFIX}tc`, JSON.stringify(next));
      return next;
    });
    showToast('تم تصفير عدّاد المسبحة');
  };

  const handleAddCustomPhrase = (text: string) => {
    const item: CustomTasbihPhrase = {
      id: `custom_${Date.now()}`,
      text,
      defaultTarget: 33,
    };
    setCustomPhrases((prev) => {
      const next = [...prev, item];
      localStorage.setItem(`${STORAGE_PREFIX}customPhrases`, JSON.stringify(next));
      return next;
    });
    showToast('تمت إضافة الذكر إلى المسبحة');
  };

  const handleRemoveCustomPhrase = (id: string) => {
    setCustomPhrases((prev) => {
      const next = prev.filter((p) => p.id !== id);
      localStorage.setItem(`${STORAGE_PREFIX}customPhrases`, JSON.stringify(next));
      return next;
    });
    setTasbihPhraseIdx(0);
  };

  // Quick action in Top Bar: Open Morning or Evening Adhkar depending on local hour
  const isEveningHour = new Date().getHours() >= 15;
  const quickWerdCatId = isEveningHour ? 135 : 27;
  const quickWerdLabel = isEveningHour ? 'أذكار المساء' : 'أذكار الصباح';

  const activeCategory =
    route.view === 'category'
      ? categories.find((c) => c.id === route.catId) || null
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF8F1] dark:bg-[#101514] text-[#1C1B17] dark:text-[#E6E2D9]">
      {/* Strict 3-Zone Top Bar Contract with safe-area support and compact 52px mobile height */}
      <header className="sticky top-0 z-30 pt-safe bg-[#FBF8F1]/90 dark:bg-[#101514]/90 backdrop-blur-md border-b border-[#D0CABA] dark:border-[#3B4A46]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 h-[52px] sm:h-16">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => setRoute({ view: 'home' })}
            className="text-lg sm:text-2xl font-display-ar font-bold text-[#0F5C4D] dark:text-[#6FD3B8] whitespace-nowrap shrink-0 cursor-pointer"
          >
            حصن المسلم
          </button>

          {/* Zone 2: 5 concise single-line navigation links */}
          <nav
            aria-label="التنقل الرئيسي"
            className="hidden md:flex items-center gap-6 text-sm font-bold text-[#4A4639] dark:text-[#C2C9C4]"
          >
            <button
              type="button"
              onClick={() => setRoute({ view: 'home' })}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route.view === 'home' || route.view === 'category'
                  ? 'text-[#0F5C4D] dark:text-[#6FD3B8] border-b-2 border-[#0F5C4D] dark:border-[#6FD3B8]'
                  : 'hover:text-[#1C1B17] dark:hover:text-white'
              }`}
            >
              الأذكار
            </button>
            <button
              type="button"
              onClick={() => setRoute({ view: 'search' })}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route.view === 'search'
                  ? 'text-[#0F5C4D] dark:text-[#6FD3B8] border-b-2 border-[#0F5C4D] dark:border-[#6FD3B8]'
                  : 'hover:text-[#1C1B17] dark:hover:text-white'
              }`}
            >
              البحث
            </button>
            <button
              type="button"
              onClick={() => setRoute({ view: 'favorites' })}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route.view === 'favorites'
                  ? 'text-[#0F5C4D] dark:text-[#6FD3B8] border-b-2 border-[#0F5C4D] dark:border-[#6FD3B8]'
                  : 'hover:text-[#1C1B17] dark:hover:text-white'
              }`}
            >
              المفضلة {favorites.length > 0 ? `(${arabicDigits(favorites.length)})` : ''}
            </button>
            <button
              type="button"
              onClick={() => setRoute({ view: 'tasbih' })}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route.view === 'tasbih'
                  ? 'text-[#0F5C4D] dark:text-[#6FD3B8] border-b-2 border-[#0F5C4D] dark:border-[#6FD3B8]'
                  : 'hover:text-[#1C1B17] dark:hover:text-white'
              }`}
            >
              المسبحة
            </button>
            <button
              type="button"
              onClick={() => setRoute({ view: 'settings' })}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route.view === 'settings'
                  ? 'text-[#0F5C4D] dark:text-[#6FD3B8] border-b-2 border-[#0F5C4D] dark:border-[#6FD3B8]'
                  : 'hover:text-[#1C1B17] dark:hover:text-white'
              }`}
            >
              الإعدادات
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => handleOpenCategory(quickWerdCatId)}
              className="min-h-[38px] sm:min-h-[40px] px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-white bg-[#0F5C4D] hover:bg-[#0c4a3e] dark:bg-[#6FD3B8] dark:text-[#00382E] dark:hover:bg-[#5bc2a6] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {quickWerdLabel}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-6">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#0F5C4D] dark:border-[#6FD3B8] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-[#4A4639] dark:text-[#C2C9C4]">
              جاري تحميل موسوعة حصن المسلم والشرح…
            </p>
          </div>
        ) : loadError ? (
          <div className="p-8 rounded-2xl bg-[#F3EFE3] dark:bg-[#182120] border border-red-400 text-center space-y-3">
            <p className="text-base font-bold text-red-700 dark:text-red-400">
              حدث خطأ أثناء تحميل قاعدة البيانات: {loadError}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-[#0F5C4D] text-white text-xs font-bold"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
            {route.view === 'home' && (
              <HomeView
                categories={categories}
                allAzkar={allAzkar}
                counts={counts}
                history={history}
                todayIso={todayIso}
                lastRead={lastRead}
                fontScale={fontScale}
                showTashkeel={showTashkeel}
                onOpenCategory={handleOpenCategory}
                onOpenSearch={(q) => setRoute({ view: 'search', initialQuery: q })}
              />
            )}

            {route.view === 'category' && activeCategory && (
              <CategoryReaderView
                category={activeCategory}
                initialZekrIndex={route.initialIdx}
                counts={counts}
                favorites={favorites}
                fontScale={fontScale}
                showTashkeel={showTashkeel}
                onToggleTashkeel={() => handleSetShowTashkeel(!showTashkeel)}
                autoAdvance={autoAdvance}
                onSetAutoAdvance={handleSetAutoAdvance}
                onTapZekr={handleTapZekr}
                onResetCategory={handleResetCategory}
                onToggleFavorite={handleToggleFavorite}
                onBack={() => setRoute({ view: 'home' })}
                onCopyToast={showToast}
                onSelectPosition={handleSelectPosition}
              />
            )}

            {route.view === 'search' && (
              <SearchView
                searchIndex={searchIndex}
                initialQuery={route.initialQuery}
                showTashkeel={showTashkeel}
                onSelectZekr={(catId, idx) => handleOpenCategory(catId, idx)}
                onBack={() => setRoute({ view: 'home' })}
              />
            )}

            {route.view === 'favorites' && (
              <FavoritesView
                favoriteIds={favorites}
                allAzkar={allAzkar}
                fontScale={fontScale}
                showTashkeel={showTashkeel}
                onSelectZekr={(catId, idx) => handleOpenCategory(catId, idx)}
                onToggleFavorite={handleToggleFavorite}
                onExploreCategories={() => setRoute({ view: 'home' })}
              />
            )}

            {route.view === 'tasbih' && (
              <TasbihView
                selectedPhraseIdx={tasbihPhraseIdx}
                onSelectPhraseIdx={handleSelectTasbihPhrase}
                target={tasbihTarget}
                onSelectTarget={handleSelectTasbihTarget}
                tasbihCounts={tasbihCounts}
                customPhrases={customPhrases}
                onAddCustomPhrase={handleAddCustomPhrase}
                onRemoveCustomPhrase={handleRemoveCustomPhrase}
                soundEnabled={soundEnabled}
                onToggleSound={() => handleSetSound(!soundEnabled)}
                onTap={handleTasbihTap}
                onResetCurrent={handleTasbihReset}
              />
            )}

            {route.view === 'settings' && (
              <SettingsView
                themeMode={themeMode}
                onSetThemeMode={setThemeMode}
                fontScale={fontScale}
                onSetFontScale={handleSetFontScale}
                showTashkeel={showTashkeel}
                onSetShowTashkeel={handleSetShowTashkeel}
                soundEnabled={soundEnabled}
                onSetSoundEnabled={handleSetSound}
                hapticsEnabled={hapticsEnabled}
                onSetHapticsEnabled={handleSetHaptics}
                autoAdvance={autoAdvance}
                onSetAutoAdvance={handleSetAutoAdvance}
                onResetAllTodayCounts={handleResetAllTodayCounts}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Tab Navigation Bar (56px height + safe area bottom, <15% total sticky height) */}
      <nav
        aria-label="شريط التنقل السفلي"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 pb-safe bg-[#FBF8F1]/95 dark:bg-[#101514]/95 backdrop-blur-md border-t border-[#D0CABA] dark:border-[#3B4A46] grid grid-cols-5 items-center h-14 px-1"
      >
        {(
          [
            { key: 'home', label: 'الرئيسية', icon: Home },
            { key: 'search', label: 'البحث', icon: Search },
            { key: 'favorites', label: 'المفضلة', icon: Heart },
            { key: 'tasbih', label: 'المسبحة', icon: CircleDot },
            { key: 'settings', label: 'الإعدادات', icon: Settings },
          ] as const
        ).map((tab) => {
          const isActive =
            route.view === tab.key || (tab.key === 'home' && route.view === 'category');
          const IconComp = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setRoute({ view: tab.key })}
              className={`min-h-[48px] flex flex-col items-center justify-center transition-colors cursor-pointer ${
                isActive
                  ? 'text-[#0F5C4D] dark:text-[#6FD3B8] font-bold'
                  : 'text-[#4A4639] dark:text-[#C2C9C4]'
              }`}
            >
              <IconComp className="w-[18px] h-[18px]" />
              <span className="text-[11px] mt-0.5 whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Toast Feedback Banner */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-18 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl bg-[#1C1B17] dark:bg-[#E6E2D9] text-[#FBF8F1] dark:text-[#101514] text-xs font-bold shadow-lg whitespace-nowrap"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
