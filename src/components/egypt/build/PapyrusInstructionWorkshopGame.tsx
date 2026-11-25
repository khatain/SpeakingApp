import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ScrollText,
  Square,
  Volume2,
} from 'lucide-react';
import type { AppLanguage, LocalizedText } from '../../../types/game';
import { GAME_COPY } from '../../../data/i18n';
import {
  joinNormalizedTiles,
  validatePapyrusWorkshopSubmission,
  type PapyrusStepDraft,
  type PapyrusWorkshopStepSpec,
  type PapyrusWorkshopVariant,
} from '../../../data/egyptBuild';
import { shuffleArray, shuffleDifferentFrom } from '../../../utils/shuffle';
import { PapyrusStepSceneSVG } from '../EgyptBuildArtwork';
import type { BuildSolvedPayload } from './ExpeditionCommandForgeGame';

interface PapyrusInstructionWorkshopGameProps {
  language: AppLanguage;
  isNight: boolean;
  variant: PapyrusWorkshopVariant;
  challengeKey: string;
  isSolved: boolean;
  onSolved: (payload: BuildSolvedPayload) => void;
  onFeedback: (state: { isCorrect: boolean; message: LocalizedText } | null) => void;
  onPlaySfx: (kind?: 'click' | 'select' | 'reward') => void;
}

interface StepOptionsCache {
  sequencers: string[];
  verbs: string[];
  complements: string[];
}

const ALL_COMMON_SEQUENCERS = [
  'First,',
  'Next,',
  'Then,',
  'After that,',
  'Finally,',
];

export function PapyrusInstructionWorkshopGame({
  language,
  isNight,
  variant,
  challengeKey,
  isSolved,
  onSolved,
  onFeedback,
  onPlaySfx,
}: PapyrusInstructionWorkshopGameProps) {
  const copy = GAME_COPY[language];
  const [drafts, setDrafts] = useState<PapyrusStepDraft[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const stepSpecById = useMemo(() => {
    const map = new Map<string, PapyrusWorkshopStepSpec>();
    for (const step of variant.stepsInCorrectOrder) {
      map.set(step.stepId, step);
    }
    return map;
  }, [variant.stepsInCorrectOrder]);

  const optionsByStepId = useMemo(() => {
    const map = new Map<string, StepOptionsCache>();
    for (const step of variant.stepsInCorrectOrder) {
      const seqChoices = Array.from(
        new Set([...step.allowedSequencers, ...ALL_COMMON_SEQUENCERS]),
      );
      map.set(step.stepId, {
        sequencers: seqChoices,
        verbs: shuffleArray(step.verbOptions),
        complements: shuffleArray(step.complementOptions),
      });
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeKey]);

  useEffect(() => {
    const initialOrder = isSolved
      ? variant.stepsInCorrectOrder
      : shuffleDifferentFrom(
          variant.stepsInCorrectOrder,
          (a, b) => a.stepId === b.stepId,
        );
    setDrafts(
      initialOrder.map((step) => ({
        stepId: step.stepId,
        sequencer: isSolved
          ? step.allowedSequencers[step.preferredSequencerIndex]
          : '',
        verb: isSolved ? step.correctVerb : '',
        complement: isSolved ? step.correctComplement : '',
      })),
    );
    setIsSpeaking(false);
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeKey]);

  const speakScroll = (text: string) => {
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

  const moveStep = (index: number, delta: -1 | 1) => {
    if (isSolved) return;
    const nextIdx = index + delta;
    if (nextIdx < 0 || nextIdx >= drafts.length) return;
    onPlaySfx('select');
    onFeedback(null);
    setDrafts((prev) => {
      const next = [...prev];
      [next[index], next[nextIdx]] = [next[nextIdx], next[index]];
      return next;
    });
  };

  const updateField = (
    stepId: string,
    field: 'sequencer' | 'verb' | 'complement',
    value: string,
  ) => {
    if (isSolved) return;
    onPlaySfx('select');
    onFeedback(null);
    setDrafts((prev) =>
      prev.map((d) => (d.stepId === stepId ? { ...d, [field]: value } : d)),
    );
  };

  const handleVerify = () => {
    const result = validatePapyrusWorkshopSubmission(variant, drafts);
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

  const fullScrollPreview = drafts
    .map((d) => joinNormalizedTiles([d.sequencer, d.verb, d.complement]))
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-4">
      <div
        className={`rounded-2xl border p-4 space-y-1.5 ${
          isNight
            ? 'border-white/12 bg-[#162340]'
            : 'border-[#E2E8F0] bg-white'
        }`}
      >
        <p className="text-xs font-extrabold uppercase tracking-wide text-[#0D9488] dark:text-[#5EEAD4]">
          {language === 'th' ? 'หัวข้อคู่มือปาปิรุส' : 'Papyrus Scroll Topic'}
        </p>
        <p className="text-sm font-bold leading-snug">
          {variant.scrollTopic[language]}
        </p>
      </div>

      {/* Step Cards */}
      <div className="space-y-3">
        {drafts.map((draft, idx) => {
          const spec = stepSpecById.get(draft.stepId);
          const opts = optionsByStepId.get(draft.stepId);
          if (!spec || !opts) return null;
          const previewLine = joinNormalizedTiles([
            draft.sequencer || '___',
            draft.verb || '___',
            draft.complement || '___',
          ]);

          return (
            <div
              key={draft.stepId}
              className={`rounded-2xl border p-3.5 space-y-3 ${
                isSolved
                  ? isNight
                    ? 'border-[#10B981]/45 bg-[#0F2A2A]'
                    : 'border-[#059669]/35 bg-[#ECFDF5]'
                  : isNight
                    ? 'border-[#E7B43C]/30 bg-[#14203C]'
                    : 'border-[#FDE68A] bg-[#FFFDF8]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <PapyrusStepSceneSVG
                    sceneKey={spec.sceneKey}
                    className="h-11 w-11 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[11px] font-extrabold text-[#0D9488] dark:text-[#5EEAD4]">
                      {language === 'th' ? `ขั้นตอนที่ ${idx + 1}` : `Step ${idx + 1}`}
                    </span>
                    <p className="font-display text-sm font-extrabold truncate">
                      {spec.stepCaption[language]}
                    </p>
                    <p
                      className={`text-xs font-medium ${
                        isNight ? 'text-[#CBD5E1]' : 'text-[#475569]'
                      }`}
                    >
                      {previewLine}
                    </p>
                  </div>
                </div>

                {!isSolved && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveStep(idx, -1)}
                      aria-label={`Move step ${idx + 1} up`}
                      className={`flex h-8 w-8 items-center justify-center rounded-xl border cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                        isNight
                          ? 'border-white/15 bg-white/10 text-white'
                          : 'border-[#CBD5E1] bg-white text-[#334155]'
                      }`}
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === drafts.length - 1}
                      onClick={() => moveStep(idx, 1)}
                      aria-label={`Move step ${idx + 1} down`}
                      className={`flex h-8 w-8 items-center justify-center rounded-xl border cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                        isNight
                          ? 'border-white/15 bg-white/10 text-white'
                          : 'border-[#CBD5E1] bg-white text-[#334155]'
                      }`}
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {/* 1. Sequencer */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wide opacity-75">
                    {language === 'th' ? 'คำเชื่อมลำดับ' : 'Sequencer'}
                  </label>
                  <select
                    disabled={isSolved}
                    value={draft.sequencer}
                    onChange={(e) =>
                      updateField(draft.stepId, 'sequencer', e.target.value)
                    }
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-bold ${
                      isNight
                        ? 'border-white/15 bg-[#1B2542] text-white'
                        : 'border-[#CBD5E1] bg-white text-[#1E293B]'
                    }`}
                  >
                    <option value="">
                      {language === 'th' ? '— เลือกคำเชื่อม —' : '— Choose sequencer —'}
                    </option>
                    {opts.sequencers.map((seq) => (
                      <option key={seq} value={seq}>
                        {seq}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Verb */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wide opacity-75">
                    {language === 'th' ? 'กริยาคำสั่ง' : 'Action Verb'}
                  </label>
                  <select
                    disabled={isSolved}
                    value={draft.verb}
                    onChange={(e) =>
                      updateField(draft.stepId, 'verb', e.target.value)
                    }
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-bold ${
                      isNight
                        ? 'border-white/15 bg-[#1B2542] text-white'
                        : 'border-[#CBD5E1] bg-white text-[#1E293B]'
                    }`}
                  >
                    <option value="">
                      {language === 'th' ? '— เลือกกริยา —' : '— Choose verb —'}
                    </option>
                    {opts.verbs.map((verb) => (
                      <option key={verb} value={verb}>
                        {verb}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Complement */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wide opacity-75">
                    {language === 'th' ? 'ส่วนขยาย / กรรม' : 'Object / Phrase'}
                  </label>
                  <select
                    disabled={isSolved}
                    value={draft.complement}
                    onChange={(e) =>
                      updateField(draft.stepId, 'complement', e.target.value)
                    }
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-bold ${
                      isNight
                        ? 'border-white/15 bg-[#1B2542] text-white'
                        : 'border-[#CBD5E1] bg-white text-[#1E293B]'
                    }`}
                  >
                    <option value="">
                      {language === 'th' ? '— เลือกวลี —' : '— Choose phrase —'}
                    </option>
                    {opts.complements.map((comp) => (
                      <option key={comp} value={comp}>
                        {comp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer action */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {isSolved ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                isSpeaking
                  ? stopSpeak()
                  : speakScroll(
                      fullScrollPreview || variant.canonicalLines.join(' '),
                    )
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
            onClick={handleVerify}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-[#0D9488] px-5 py-2.5 font-display text-xs sm:text-sm font-extrabold text-white shadow hover:bg-[#0F766E] cursor-pointer"
          >
            <ScrollText className="h-4 w-4" aria-hidden="true" />
            <span>{copy.egyptBuildVerifyScrollButton}</span>
          </button>
        )}
      </div>
    </div>
  );
}
