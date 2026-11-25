import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  Flag,
  MapPin,
  Navigation,
  Play,
  RotateCcw,
  Square,
  Undo2,
  Volume2,
} from 'lucide-react';
import type { AppLanguage, LocalizedText } from '../../../types/game';
import { GAME_COPY } from '../../../data/i18n';
import {
  ARCHITECT_BOARD_COLS,
  ARCHITECT_BOARD_LANDMARKS,
  ARCHITECT_BOARD_ROWS,
  joinNormalizedTiles,
  validatePyramidRouteArchitectSubmission,
  type ArchitectSimulationResult,
  type BuildTile,
  type RouteArchitectVariant,
  type RouteDirectionKind,
} from '../../../data/egyptBuild';
import { shuffleArray } from '../../../utils/shuffle';
import type { BuildSolvedPayload } from './ExpeditionCommandForgeGame';

interface PyramidRouteArchitectGameProps {
  language: AppLanguage;
  isNight: boolean;
  variant: RouteArchitectVariant;
  challengeKey: string;
  isSolved: boolean;
  onSolved: (payload: BuildSolvedPayload) => void;
  onFeedback: (state: { isCorrect: boolean; message: LocalizedText } | null) => void;
  onPlaySfx: (kind?: 'click' | 'select' | 'reward') => void;
}

const DIRECTION_ARROW: Record<RouteDirectionKind, string> = {
  N: '↑ N',
  E: '→ E',
  S: '↓ S',
  W: '← W',
};

export function PyramidRouteArchitectGame({
  language,
  isNight,
  variant,
  challengeKey,
  isSolved,
  onSolved,
  onFeedback,
  onPlaySfx,
}: PyramidRouteArchitectGameProps) {
  const copy = GAME_COPY[language];
  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [simResult, setSimResult] = useState<
    (ArchitectSimulationResult & { sentence: string }) | null
  >(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const shuffledTiles = useMemo(
    () => shuffleArray(variant.tiles),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [challengeKey],
  );

  useEffect(() => {
    setSelectedTileIds([]);
    setSimResult(null);
    setIsSpeaking(false);
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [challengeKey]);

  const tileById = useMemo(() => {
    const map = new Map<string, BuildTile>();
    for (const t of variant.tiles) {
      map.set(t.instanceId, t);
    }
    return map;
  }, [variant.tiles]);

  const selectedTiles = selectedTileIds
    .map((id) => tileById.get(id))
    .filter((t): t is BuildTile => Boolean(t));

  const constructedSentence =
    isSolved && selectedTiles.length === 0
      ? variant.canonicalModel
      : joinNormalizedTiles(selectedTiles.map((t) => t.value));

  const speakSentence = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) {
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.94;
    u.pitch = 1.02;
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  const stopSpeak = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const handleAddTile = (instanceId: string) => {
    if (isSolved || selectedTileIds.includes(instanceId)) return;
    onPlaySfx('select');
    onFeedback(null);
    setSimResult(null);
    setSelectedTileIds((prev) => [...prev, instanceId]);
  };

  const handleRemoveTile = (instanceId: string) => {
    if (isSolved) return;
    onPlaySfx('click');
    onFeedback(null);
    setSimResult(null);
    setSelectedTileIds((prev) => prev.filter((id) => id !== instanceId));
  };

  const handleUndo = () => {
    if (isSolved || selectedTileIds.length === 0) return;
    onPlaySfx('click');
    onFeedback(null);
    setSimResult(null);
    setSelectedTileIds((prev) => prev.slice(0, -1));
  };

  const handleReset = () => {
    if (isSolved) return;
    onPlaySfx('click');
    onFeedback(null);
    setSimResult(null);
    setSelectedTileIds([]);
  };

  const handleSimulateRoute = () => {
    const result = validatePyramidRouteArchitectSubmission(
      variant,
      selectedTiles.map((t) => t.value),
    );
    setSimResult(result);
    const passed = result.validGrammar && result.validRoute;
    onFeedback({ isCorrect: passed, message: result.feedback });
    if (passed) {
      onPlaySfx('reward');
      onSolved({
        instructionText: result.sentence,
        instructionLines: [result.sentence],
        thaiScaffold: variant.thaiScaffold,
      });
    } else {
      onPlaySfx('click');
    }
  };

  const blockedKeys = useMemo(
    () => new Set(variant.blockedCells.map((c) => `${c.x},${c.y}`)),
    [variant.blockedCells],
  );

  const visitedPathSet = useMemo(() => {
    const set = new Set<string>();
    if (simResult) {
      for (const step of simResult.path) {
        if (
          step.x >= 0 &&
          step.x < ARCHITECT_BOARD_COLS &&
          step.y >= 0 &&
          step.y < ARCHITECT_BOARD_ROWS
        ) {
          set.add(`${step.x},${step.y}`);
        }
      }
    }
    return set;
  }, [simResult]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* 6x4 Giza Learning Map */}
        <div
          className={`lg:col-span-7 rounded-2xl border p-3.5 space-y-2.5 ${
            isNight
              ? 'border-white/12 bg-[#162340]'
              : 'border-[#E2E8F0] bg-white'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-[#0D9488] dark:text-[#5EEAD4]">
              <Compass className="h-4 w-4" aria-hidden="true" />
              <span>
                {language === 'th' ? 'แผนที่จำลองกีซา 6×4' : 'Giza Route Grid (6×4)'}
              </span>
            </span>
            <span
              className={`rounded-lg px-2 py-0.5 font-mono-num text-[11px] font-bold ${
                isNight
                  ? 'bg-[#1B2542] text-[#FDE68A]'
                  : 'bg-[#FEF3C7] text-[#92400E]'
              }`}
            >
              Start ({variant.startPos.x}, {variant.startPos.y}) ·{' '}
              {DIRECTION_ARROW[variant.startPos.facing]}
            </span>
          </div>

          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${ARCHITECT_BOARD_COLS}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: ARCHITECT_BOARD_ROWS }).map((_, y) =>
              Array.from({ length: ARCHITECT_BOARD_COLS }).map((__, x) => {
                const key = `${x},${y}`;
                const isBlocked = blockedKeys.has(key);
                const isStart =
                  variant.startPos.x === x && variant.startPos.y === y;
                const isTarget =
                  variant.targetPos.x === x && variant.targetPos.y === y;
                const landmark = ARCHITECT_BOARD_LANDMARKS.find(
                  (lm) => lm.x === x && lm.y === y,
                );
                const onPath = visitedPathSet.has(key);
                const isFinalPos =
                  simResult &&
                  simResult.finalPos.x === x &&
                  simResult.finalPos.y === y;

                return (
                  <div
                    key={key}
                    className={`relative flex min-h-[60px] flex-col items-center justify-between rounded-xl border p-1.5 text-center transition-colors ${
                      isBlocked
                        ? isNight
                          ? 'border-[#F87171]/45 bg-[#3B1822]/70 text-[#FECACA]'
                          : 'border-[#FCA5A5] bg-[#FEE2E2] text-[#991B1B]'
                        : isTarget
                          ? isNight
                            ? 'border-[#10B981]/60 bg-[#0F2A2A] text-[#A7F3D0]'
                            : 'border-[#059669]/50 bg-[#ECFDF5] text-[#065F46]'
                          : onPath
                            ? isNight
                              ? 'border-[#E7B43C]/60 bg-[#2A2416] text-[#FDE68A]'
                              : 'border-[#D97706]/50 bg-[#FEF3C7] text-[#78350F]'
                            : isNight
                              ? 'border-white/10 bg-[#121D36] text-[#CBD5E1]'
                              : 'border-[#E2E8F0] bg-[#FFFBEB]/60 text-[#334155]'
                    }`}
                  >
                    <span className="font-mono-num text-[9px] opacity-65">
                      ({x},{y})
                    </span>

                    {isBlocked ? (
                      <AlertTriangle
                        className="h-4 w-4 text-[#DC2626] dark:text-[#F87171]"
                        aria-hidden="true"
                      />
                    ) : isTarget ? (
                      <Flag
                        className="h-4 w-4 text-[#059669] dark:text-[#34D399]"
                        aria-hidden="true"
                      />
                    ) : isStart ? (
                      <Navigation
                        className="h-4 w-4 text-[#0D9488] dark:text-[#5EEAD4]"
                        aria-hidden="true"
                      />
                    ) : landmark ? (
                      <MapPin className="h-3.5 w-3.5 opacity-80" aria-hidden="true" />
                    ) : onPath ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-[#E7B43C]" />
                    ) : null}

                    <span className="text-[9px] font-bold leading-tight line-clamp-2">
                      {isBlocked
                        ? language === 'th'
                          ? 'เขตห้ามเข้า'
                          : 'Blocked'
                        : landmark
                          ? landmark.label[language]
                          : isStart
                            ? 'Start'
                            : isTarget
                              ? 'Goal'
                              : ''}
                    </span>

                    {isFinalPos && (
                      <span
                        className={`absolute -top-1 -right-1 rounded-full px-1.5 py-0.5 text-[8px] font-extrabold ${
                          simResult.validRoute && simResult.validGrammar
                            ? 'bg-[#059669] text-white'
                            : 'bg-[#DC2626] text-white'
                        }`}
                      >
                        {DIRECTION_ARROW[simResult.finalFacing]}
                      </span>
                    )}
                  </div>
                );
              }),
            )}
          </div>
        </div>

        {/* Mission Brief + Simulator Status */}
        <div
          className={`lg:col-span-5 rounded-2xl border p-4 space-y-3 ${
            isNight
              ? 'border-white/12 bg-[#162340]'
              : 'border-[#E2E8F0] bg-white'
          }`}
        >
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#0D9488] dark:text-[#5EEAD4]">
            {language === 'th' ? 'ภารกิจนำทาง' : 'Route Mission'}
          </p>
          <p className="text-xs sm:text-sm font-semibold leading-relaxed">
            {variant.missionGoal[language]}
          </p>

          {simResult && (
            <div
              className={`rounded-xl border p-3 text-xs space-y-1 ${
                simResult.validGrammar && simResult.validRoute
                  ? isNight
                    ? 'border-[#10B981]/45 bg-[#0F2A2A] text-[#A7F3D0]'
                    : 'border-[#059669]/35 bg-[#ECFDF5] text-[#065F46]'
                  : isNight
                    ? 'border-[#F87171]/45 bg-[#3B1822] text-[#FECACA]'
                    : 'border-[#DC2626]/35 bg-[#FEF2F2] text-[#991B1B]'
              }`}
            >
              <p className="font-extrabold">
                {language === 'th' ? 'ผลการจำลองเส้นทาง' : 'Simulation Trace'}
              </p>
              <p>
                {language === 'th' ? 'จุดสิ้นสุด' : 'Final position'}: (
                {simResult.finalPos.x}, {simResult.finalPos.y}) ·{' '}
                {DIRECTION_ARROW[simResult.finalFacing]}
              </p>
            </div>
          )}

          {isSolved && (
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  isSpeaking ? stopSpeak() : speakSentence(constructedSentence)
                }
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold cursor-pointer ${
                  isNight
                    ? 'border-[#12B8B0]/45 bg-[#102A33] text-[#5EEAD4]'
                    : 'border-[#0D9488]/35 bg-[#F0FDFA] text-[#0F766E]'
                }`}
              >
                {isSpeaking ? (
                  <Square className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>
                  {isSpeaking
                    ? copy.egyptDiscoverStopAudioButton
                    : copy.egyptJournalListenButton}
                </span>
              </button>
              <div className="flex items-center gap-2 text-xs font-bold text-[#059669] dark:text-[#34D399]">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{variant.thaiScaffold}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Constructed Route Instruction */}
      <div
        className={`rounded-2xl border-2 p-4 space-y-2.5 ${
          isSolved
            ? isNight
              ? 'border-[#10B981]/60 bg-[#0F2A2A]'
              : 'border-[#059669]/45 bg-[#ECFDF5]'
            : isNight
              ? 'border-[#E7B43C]/35 bg-[#111B33]'
              : 'border-[#CBD5E1] bg-[#F8FAFC]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wide text-[#0D9488] dark:text-[#5EEAD4]">
            {language === 'th'
              ? 'คำสั่งนำทางของคุณ'
              : 'Your Route Direction Sentence'}
          </span>
          {constructedSentence && (
            <span
              className={`text-xs font-semibold ${
                isNight ? 'text-[#CBD5E1]' : 'text-[#475569]'
              }`}
            >
              “{constructedSentence}”
            </span>
          )}
        </div>

        <div className="min-h-[52px] flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-[#94A3B8]/50 p-2.5">
          {selectedTiles.length === 0 ? (
            <span
              className={`text-xs font-medium ${
                isNight ? 'text-[#94A3B8]' : 'text-[#64748B]'
              }`}
            >
              {isSolved
                ? variant.canonicalModel
                : language === 'th'
                  ? 'แตะชิ้นส่วนทิศทางด้านล่างเพื่อสร้างประโยคแล้วกดทดสอบเส้นทาง...'
                  : 'Tap direction tiles below to build your route, then click Test Route...'}
            </span>
          ) : (
            selectedTiles.map((tile) => (
              <button
                key={tile.instanceId}
                type="button"
                disabled={isSolved}
                onClick={() => handleRemoveTile(tile.instanceId)}
                className={`rounded-xl border px-3 py-1.5 text-xs sm:text-sm font-bold transition-colors ${
                  isSolved
                    ? isNight
                      ? 'border-[#10B981]/50 bg-[#064E3B] text-[#A7F3D0] cursor-default'
                      : 'border-[#059669]/40 bg-white text-[#065F46] cursor-default'
                    : isNight
                      ? 'border-[#E7B43C]/50 bg-[#1B2542] text-[#FDE68A] hover:bg-[#243258] cursor-pointer'
                      : 'border-[#0D9488]/40 bg-white text-[#1E293B] hover:bg-[#F0FDFA] cursor-pointer'
                }`}
              >
                {tile.value}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Tile Bank & Controls */}
      <div
        className={`rounded-2xl border p-4 space-y-3 ${
          isNight ? 'border-white/12 bg-[#162340]' : 'border-[#E2E8F0] bg-white'
        }`}
      >
        <div className="flex flex-wrap gap-2">
          {shuffledTiles.map((tile) => {
            const used = selectedTileIds.includes(tile.instanceId);
            return (
              <button
                key={tile.instanceId}
                type="button"
                disabled={used || isSolved}
                onClick={() => handleAddTile(tile.instanceId)}
                className={`rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-bold transition-colors ${
                  used || isSolved
                    ? isNight
                      ? 'border-white/8 bg-white/5 text-[#64748B] opacity-45 cursor-default'
                      : 'border-[#E2E8F0] bg-[#F1F5F9] text-[#94A3B8] opacity-55 cursor-default'
                    : isNight
                      ? 'border-white/18 bg-[#1E2E52] text-white hover:border-[#E7B43C] hover:bg-[#263B68] cursor-pointer'
                      : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#1E293B] hover:border-[#0D9488] hover:bg-[#F0FDFA] cursor-pointer'
                }`}
              >
                {tile.value}
              </button>
            );
          })}
        </div>

        {!isSolved && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={selectedTileIds.length === 0}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                  isNight
                    ? 'border-white/15 bg-white/8 text-[#CBD5E1]'
                    : 'border-[#CBD5E1] bg-white text-[#475569]'
                }`}
              >
                <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{copy.egyptDiscoverUndoButton}</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={selectedTileIds.length === 0}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                  isNight
                    ? 'border-white/15 bg-white/8 text-[#CBD5E1]'
                    : 'border-[#CBD5E1] bg-white text-[#475569]'
                }`}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{copy.egyptDiscoverResetButton}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSimulateRoute}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0D9488] px-5 py-2 font-display text-xs sm:text-sm font-extrabold text-white shadow hover:bg-[#0F766E] cursor-pointer"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              <span>{copy.egyptBuildTestRouteButton}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
