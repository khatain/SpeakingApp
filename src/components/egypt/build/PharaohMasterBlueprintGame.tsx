import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Square,
  Undo2,
  Volume2,
  XCircle,
} from 'lucide-react';
import type { AppLanguage, LocalizedText } from '../../../types/game';
import { GAME_COPY } from '../../../data/i18n';
import {
  joinNormalizedTiles,
  validatePharaohBlueprintSubmission,
  type BuildTile,
  type PharaohBlueprintVariant,
} from '../../../data/egyptBuild';
import { shuffleArray } from '../../../utils/shuffle';
import { PharaohBlueprintIllustrationSVG } from '../EgyptBuildArtwork';
import type { BuildSolvedPayload } from './ExpeditionCommandForgeGame';

interface PharaohMasterBlueprintGameProps {
  language: AppLanguage;
  isNight: boolean;
  variant: PharaohBlueprintVariant;
  challengeKey: string;
  isSolved: boolean;
  journalDrawerOpen: boolean;
  onToggleJournalDrawer: () => void;
  onSolved: (payload: BuildSolvedPayload) => void;
  onFeedback: (state: { isCorrect: boolean; message: LocalizedText } | null) => void;
  onPlaySfx: (kind?: 'click' | 'select' | 'reward') => void;
}

export function PharaohMasterBlueprintGame({
  language,
  isNight,
  variant,
  challengeKey,
  isSolved,
  journalDrawerOpen,
  onToggleJournalDrawer,
  onSolved,
  onFeedback,
  onPlaySfx,
}: PharaohMasterBlueprintGameProps) {
  const copy = GAME_COPY[language];
  const [sectionSelectedIds, setSectionSelectedIds] = useState<
    Record<string, string[]>
  >({});
  const [sectionResults, setSectionResults] = useState<
    Record<string, { isCorrect: boolean; sentence: string }> | null
  >(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const shuffledTilesBySection = useMemo(() => {
    const map: Record<string, BuildTile[]> = {};
    for (const sec of variant.sections) {
      map[sec.sectionId] = shuffleArray(sec.tiles);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeKey]);

  useEffect(() => {
    setSectionSelectedIds({});
    setSectionResults(null);
    setIsSpeaking(false);
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [challengeKey]);

  const speakBlueprint = (text: string) => {
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

  const handleAddTile = (sectionId: string, instanceId: string) => {
    if (isSolved) return;
    const current = sectionSelectedIds[sectionId] ?? [];
    if (current.includes(instanceId)) return;
    onPlaySfx('select');
    onFeedback(null);
    setSectionResults(null);
    setSectionSelectedIds((prev) => ({
      ...prev,
      [sectionId]: [...(prev[sectionId] ?? []), instanceId],
    }));
  };

  const handleRemoveTile = (sectionId: string, instanceId: string) => {
    if (isSolved) return;
    onPlaySfx('click');
    onFeedback(null);
    setSectionResults(null);
    setSectionSelectedIds((prev) => ({
      ...prev,
      [sectionId]: (prev[sectionId] ?? []).filter((id) => id !== instanceId),
    }));
  };

  const handleUndoSection = (sectionId: string) => {
    if (isSolved) return;
    onPlaySfx('click');
    onFeedback(null);
    setSectionResults(null);
    setSectionSelectedIds((prev) => ({
      ...prev,
      [sectionId]: (prev[sectionId] ?? []).slice(0, -1),
    }));
  };

  const handleClearSection = (sectionId: string) => {
    if (isSolved) return;
    onPlaySfx('click');
    onFeedback(null);
    setSectionResults(null);
    setSectionSelectedIds((prev) => ({
      ...prev,
      [sectionId]: [],
    }));
  };

  const handleVerifyBlueprint = () => {
    const selectionsByValue: Record<string, string[]> = {};
    for (const sec of variant.sections) {
      const tileMap = new Map(sec.tiles.map((t) => [t.instanceId, t.value]));
      selectionsByValue[sec.sectionId] = (sectionSelectedIds[sec.sectionId] ?? [])
        .map((id) => tileMap.get(id))
        .filter((v): v is string => Boolean(v));
    }
    const result = validatePharaohBlueprintSubmission(variant, selectionsByValue);
    setSectionResults(result.sectionResults);
    onFeedback({ isCorrect: result.isCorrect, message: result.feedback });
    if (result.isCorrect) {
      onPlaySfx('reward');
      onSolved({
        instructionText: result.joinedText,
        instructionLines: result.lines,
        thaiScaffold: variant.thaiScaffold,
      });
    } else {
      onPlaySfx('click');
    }
  };

  const fullSolvedText = variant.sections.map((s) => s.canonicalLine).join(' ');

  return (
    <div className="space-y-4">
      {/* Blueprint Brief Header */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${
          isNight
            ? 'border-[#E7B43C]/35 bg-[#162340]'
            : 'border-[#FDE68A] bg-[#FFFBEB]'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <PharaohBlueprintIllustrationSVG className="h-12 w-12 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#0D9488] dark:text-[#5EEAD4]">
              {language === 'th'
                ? 'แปลนภารกิจหลัก 4 หมวด'
                : '4-Section Master Blueprint'}
            </p>
            <p className="text-xs sm:text-sm font-semibold leading-snug">
              {variant.missionBrief[language]}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onPlaySfx('select');
            onToggleJournalDrawer();
          }}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold cursor-pointer shrink-0 ${
            journalDrawerOpen
              ? 'border-[#0D9488] bg-[#0D9488] text-white'
              : isNight
                ? 'border-white/15 bg-white/10 text-[#FDE68A]'
                : 'border-[#D97706]/35 bg-white text-[#92400E]'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{copy.egyptBuildOpenJournalButton}</span>
        </button>
      </div>

      {/* 4 Blueprint Section Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {variant.sections.map((sec) => {
          const tileMap = new Map(sec.tiles.map((t) => [t.instanceId, t]));
          const selectedIds = sectionSelectedIds[sec.sectionId] ?? [];
          const selectedTiles = selectedIds
            .map((id) => tileMap.get(id))
            .filter((t): t is BuildTile => Boolean(t));
          const sentence =
            isSolved && selectedTiles.length === 0
              ? sec.canonicalLine
              : joinNormalizedTiles(selectedTiles.map((t) => t.value));
          const secResult = sectionResults?.[sec.sectionId];
          const secPassed = isSolved || Boolean(secResult?.isCorrect);
          const secFailed = Boolean(secResult && !secResult.isCorrect);
          const bankTiles = shuffledTilesBySection[sec.sectionId] ?? sec.tiles;

          return (
            <div
              key={sec.sectionId}
              className={`rounded-2xl border p-3.5 space-y-2.5 ${
                secPassed
                  ? isNight
                    ? 'border-[#10B981]/50 bg-[#0F2A2A]'
                    : 'border-[#059669]/40 bg-[#ECFDF5]'
                  : secFailed
                    ? isNight
                      ? 'border-[#F87171]/50 bg-[#3B1822]/70'
                      : 'border-[#DC2626]/40 bg-[#FEF2F2]'
                    : isNight
                      ? 'border-white/12 bg-[#162340]'
                      : 'border-[#E2E8F0] bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-xs font-extrabold text-[#0D9488] dark:text-[#5EEAD4]">
                    {sec.sectionLabel[language]}
                  </p>
                  <p className="text-xs font-semibold leading-snug mt-0.5">
                    {sec.prompt[language]}
                  </p>
                </div>
                {secPassed && (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-[#059669] dark:text-[#34D399]"
                    aria-hidden="true"
                  />
                )}
                {secFailed && (
                  <XCircle
                    className="h-4 w-4 shrink-0 text-[#DC2626] dark:text-[#F87171]"
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Selected Tray */}
              <div className="min-h-[44px] flex flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-[#94A3B8]/50 p-2">
                {selectedTiles.length === 0 ? (
                  <span
                    className={`text-[11px] font-medium ${
                      isNight ? 'text-[#94A3B8]' : 'text-[#64748B]'
                    }`}
                  >
                    {isSolved
                      ? sec.canonicalLine
                      : language === 'th'
                        ? 'เลือกคำด้านล่าง...'
                        : 'Select tiles below...'}
                  </span>
                ) : (
                  selectedTiles.map((tile) => (
                    <button
                      key={tile.instanceId}
                      type="button"
                      disabled={isSolved}
                      onClick={() =>
                        handleRemoveTile(sec.sectionId, tile.instanceId)
                      }
                      className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
                        isSolved
                          ? isNight
                            ? 'border-[#10B981]/50 bg-[#064E3B] text-[#A7F3D0] cursor-default'
                            : 'border-[#059669]/40 bg-white text-[#065F46] cursor-default'
                          : isNight
                            ? 'border-[#E7B43C]/50 bg-[#1B2542] text-[#FDE68A] cursor-pointer'
                            : 'border-[#0D9488]/40 bg-white text-[#1E293B] cursor-pointer'
                      }`}
                    >
                      {tile.value}
                    </button>
                  ))
                )}
              </div>

              {sentence && (
                <p
                  className={`text-[11px] font-semibold ${
                    isNight ? 'text-[#CBD5E1]' : 'text-[#475569]'
                  }`}
                >
                  “{sentence}”
                </p>
              )}

              {/* Bank */}
              <div className="flex flex-wrap gap-1.5">
                {bankTiles.map((tile) => {
                  const used = selectedIds.includes(tile.instanceId);
                  return (
                    <button
                      key={tile.instanceId}
                      type="button"
                      disabled={used || isSolved}
                      onClick={() =>
                        handleAddTile(sec.sectionId, tile.instanceId)
                      }
                      className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors ${
                        used || isSolved
                          ? isNight
                            ? 'border-white/8 bg-white/5 text-[#64748B] opacity-45 cursor-default'
                            : 'border-[#E2E8F0] bg-[#F1F5F9] text-[#94A3B8] opacity-55 cursor-default'
                          : isNight
                            ? 'border-white/18 bg-[#1E2E52] text-white hover:border-[#E7B43C] cursor-pointer'
                            : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#1E293B] hover:border-[#0D9488] cursor-pointer'
                      }`}
                    >
                      {tile.value}
                    </button>
                  );
                })}
              </div>

              {!isSolved && selectedIds.length > 0 && (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleUndoSection(sec.sectionId)}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold cursor-pointer ${
                      isNight
                        ? 'border-white/15 bg-white/8 text-[#CBD5E1]'
                        : 'border-[#CBD5E1] bg-white text-[#475569]'
                    }`}
                  >
                    <Undo2 className="h-3 w-3" aria-hidden="true" />
                    <span>{copy.egyptDiscoverUndoButton}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleClearSection(sec.sectionId)}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold cursor-pointer ${
                      isNight
                        ? 'border-white/15 bg-white/8 text-[#CBD5E1]'
                        : 'border-[#CBD5E1] bg-white text-[#475569]'
                    }`}
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    <span>{copy.egyptDiscoverResetButton}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Verify / Listen */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {isSolved ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                isSpeaking ? stopSpeak() : speakBlueprint(fullSolvedText)
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
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669] dark:text-[#34D399]">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{variant.thaiScaffold}</span>
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleVerifyBlueprint}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-[#0D9488] px-5 py-2.5 font-display text-xs sm:text-sm font-extrabold text-white shadow hover:bg-[#0F766E] cursor-pointer"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>{copy.egyptBuildSaveBlueprintButton}</span>
          </button>
        )}
      </div>
    </div>
  );
}
