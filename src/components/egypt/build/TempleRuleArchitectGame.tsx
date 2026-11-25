import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  Square,
  Undo2,
  Users,
  Volume2,
} from 'lucide-react';
import type { AppLanguage, LocalizedText } from '../../../types/game';
import { GAME_COPY } from '../../../data/i18n';
import {
  joinNormalizedTiles,
  validateTempleRuleArchitectSubmission,
  type BuildTile,
  type TempleRuleArchitectVariant,
} from '../../../data/egyptBuild';
import { shuffleArray } from '../../../utils/shuffle';
import {
  TempleCourtyardSceneSVG,
  TempleSignPlaqueSVG,
} from '../EgyptBuildArtwork';
import type { BuildSolvedPayload } from './ExpeditionCommandForgeGame';

interface TempleRuleArchitectGameProps {
  language: AppLanguage;
  isNight: boolean;
  variant: TempleRuleArchitectVariant;
  challengeKey: string;
  isSolved: boolean;
  onSolved: (payload: BuildSolvedPayload) => void;
  onFeedback: (state: { isCorrect: boolean; message: LocalizedText } | null) => void;
  onPlaySfx: (kind?: 'click' | 'select' | 'reward') => void;
}

export function TempleRuleArchitectGame({
  language,
  isNight,
  variant,
  challengeKey,
  isSolved,
  onSolved,
  onFeedback,
  onPlaySfx,
}: TempleRuleArchitectGameProps) {
  const copy = GAME_COPY[language];
  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const shuffledTiles = useMemo(
    () => shuffleArray(variant.tiles),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [challengeKey],
  );

  useEffect(() => {
    setSelectedTileIds([]);
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
    setSelectedTileIds((prev) => [...prev, instanceId]);
  };

  const handleRemoveTile = (instanceId: string) => {
    if (isSolved) return;
    onPlaySfx('click');
    onFeedback(null);
    setSelectedTileIds((prev) => prev.filter((id) => id !== instanceId));
  };

  const handleUndo = () => {
    if (isSolved || selectedTileIds.length === 0) return;
    onPlaySfx('click');
    onFeedback(null);
    setSelectedTileIds((prev) => prev.slice(0, -1));
  };

  const handleReset = () => {
    if (isSolved) return;
    onPlaySfx('click');
    onFeedback(null);
    setSelectedTileIds([]);
  };

  const handleCheckSign = () => {
    const result = validateTempleRuleArchitectSubmission(
      variant,
      selectedTiles.map((t) => t.value),
    );
    onFeedback({ isCorrect: result.isCorrect, message: result.feedback });
    if (result.isCorrect) {
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

  return (
    <div className="space-y-4">
      {/* Courtyard Scene + Audience Situation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        <div className="lg:col-span-5">
          <TempleCourtyardSceneSVG
            sceneKey={variant.courtyardSceneKey}
            className="w-full h-auto rounded-2xl shadow-sm"
          />
        </div>

        <div
          className={`lg:col-span-7 rounded-2xl border p-4 space-y-2 ${
            isNight
              ? 'border-white/12 bg-[#162340]'
              : 'border-[#E2E8F0] bg-white'
          }`}
        >
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#E7B43C]/20 px-2.5 py-1 text-xs font-extrabold text-[#B45309] dark:text-[#FDE68A]">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{variant.audienceLabel[language]}</span>
          </div>
          <p className="text-sm font-bold leading-snug">
            {variant.situationPrompt[language]}
          </p>
        </div>
      </div>

      {/* Live Sandstone Sign Plaque */}
      <TempleSignPlaqueSVG
        sentence={constructedSentence}
        isSolved={isSolved}
        isNight={isNight}
      />

      {/* Selected Tiles Strip */}
      {selectedTiles.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {selectedTiles.map((tile) => (
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
                    : 'border-[#D97706]/40 bg-white text-[#78350F] hover:bg-[#FFFBEB] cursor-pointer'
              }`}
            >
              {tile.value}
            </button>
          ))}
        </div>
      )}

      {/* Tile Bank & Actions */}
      <div
        className={`rounded-2xl border p-4 space-y-3 ${
          isNight ? 'border-white/12 bg-[#162340]' : 'border-[#E2E8F0] bg-white'
        }`}
      >
        <p className="text-xs font-extrabold uppercase tracking-wide text-[#0D9488] dark:text-[#5EEAD4]">
          {language === 'th'
            ? 'เลือกคำที่เหมาะสมกับสถานการณ์และระดับความสุภาพ'
            : 'Choose Words & Tone for Your Temple Sign'}
        </p>

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

        {!isSolved ? (
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
              onClick={handleCheckSign}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0D9488] px-5 py-2 font-display text-xs sm:text-sm font-extrabold text-white shadow hover:bg-[#0F766E] cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>{copy.egyptBuildCheckSignButton}</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 pt-1">
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
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669] dark:text-[#34D399]">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{variant.thaiScaffold}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
