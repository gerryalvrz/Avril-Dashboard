"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { LoaderIcon, ChevronDown, ChevronUp } from "lucide-react";
import Stepper, { Step } from "@/components/ui/stepper";

/* ─── types ─── */

export interface WizardAnswers {
  rawIdea: string;
  problem: string;
  targetUser: string;
  founderName: string;
  country: string;
  language: string;
  timeAvailable: string;
  skillsResources: string;
  monetization: string;
  businessModel: string;
  riskTolerance: "conservative" | "balanced" | "ambitious" | "";
  automationLevel: string;
  channels: string;
}

const EMPTY: WizardAnswers = {
  rawIdea: "",
  problem: "",
  targetUser: "",
  founderName: "",
  country: "",
  language: "",
  timeAvailable: "",
  skillsResources: "",
  monetization: "",
  businessModel: "",
  riskTolerance: "",
  automationLevel: "",
  channels: "",
};

export interface FounderWizardProps {
  onGenerate: (answers: WizardAnswers) => void;
  isGenerating?: boolean;
}

/* ─── chip options ─── */

const COUNTRY_OPTIONS = ["US", "UK", "EU", "LATAM", "Canada", "India", "SEA", "Africa", "Other"];
const LANG_OPTIONS = ["English", "Spanish", "Portuguese", "French", "German", "Other"];
const TIME_OPTIONS = ["< 10 hrs", "10–20 hrs", "20–40 hrs", "40+ hrs"];
const SKILLS_OPTIONS = ["Solo technical", "Solo non-technical", "Small team (2-5)", "Team with devs", "Agency / studio"];
const MONETIZATION_OPTIONS = ["Subscription", "One-time", "Freemium", "Usage-based", "Commission / take-rate", "Ad-supported", "Other"];
const MODEL_OPTIONS = ["SaaS", "Marketplace", "Services / agency", "E-commerce", "API / infra", "Content / media", "Other"];
const RISK_OPTIONS: Array<{ value: WizardAnswers["riskTolerance"]; label: string; desc: string }> = [
  { value: "conservative", label: "Conservative", desc: "Validate first, low burn" },
  { value: "balanced", label: "Balanced", desc: "Ship weekly, iterate fast" },
  { value: "ambitious", label: "Ambitious", desc: "Move fast, parallel bets" },
];
const AUTO_OPTIONS = ["Full auto — humans only for exceptions", "Mostly auto + human review", "Human-led, AI assists", "Minimal automation"];
const CHANNEL_OPTIONS = ["Twitter / X", "LinkedIn", "Product Hunt", "Cold email", "SEO / content", "Paid ads", "Community / Discord", "Referrals", "Other"];

/* ─── shared components ─── */

function WInput({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  const cls =
    "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/90 placeholder:text-white/25 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-colors";
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-white/60">{label}</span>
      {textarea ? (
        <textarea
          rows={2}
          className={cn(cls, "resize-none")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className={cls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}

function ChipSelect({
  label,
  options,
  value,
  onChange,
  multi,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  multi?: boolean;
}) {
  const selected = multi ? value.split(",").map((s) => s.trim()).filter(Boolean) : [value];

  const toggle = (opt: string) => {
    if (multi) {
      const set = new Set(selected);
      if (set.has(opt)) set.delete(opt);
      else set.add(opt);
      onChange(Array.from(set).join(", "));
    } else {
      onChange(value === opt ? "" : opt);
    }
  };

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-white/60">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                active
                  ? "border-violet-500 bg-violet-500/20 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.06] hover:text-white/70",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RiskPicker({ value, onChange }: { value: string; onChange: (v: WizardAnswers["riskTolerance"]) => void }) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-white/60">Risk & pace</span>
      <div className="grid grid-cols-3 gap-2">
        {RISK_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value as WizardAnswers["riskTolerance"])}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-left transition-all",
              value === opt.value
                ? "border-violet-500 bg-violet-500/20"
                : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
            )}
          >
            <div className={cn("text-xs font-semibold", value === opt.value ? "text-white" : "text-white/60")}>{opt.label}</div>
            <div className={cn("text-[10px] mt-0.5", value === opt.value ? "text-white/70" : "text-white/35")}>{opt.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── main ─── */

export function FounderWizard({ onGenerate, isGenerating = false }: FounderWizardProps) {
  const [answers, setAnswers] = useState<WizardAnswers>(EMPTY);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [step, setStep] = useState(1);

  const set = useCallback(
    <K extends keyof WizardAnswers>(key: K, val: WizardAnswers[K]) =>
      setAnswers((prev) => ({ ...prev, [key]: val })),
    [],
  );

  const nextDisabled = useMemo(() => {
    switch (step) {
      case 1:
        return !answers.rawIdea.trim();
      case 2:
        return !answers.founderName.trim();
      case 3:
        return !answers.riskTolerance;
      case 4:
        return false;
      default:
        return false;
    }
  }, [step, answers]);

  const filledCount = useMemo(
    () => Object.values(answers).filter((v) => typeof v === "string" && v.trim().length > 0).length,
    [answers],
  );

  return (
    <div className="w-full space-y-4">
      <Stepper
        initialStep={1}
        onStepChange={setStep}
        onFinalStepCompleted={() => onGenerate(answers)}
        backButtonText="Back"
        nextButtonText="Continue"
        nextDisabled={nextDisabled || isGenerating}
      >
        {/* Step 1 — Idea (always text) */}
        <Step>
          <div className="space-y-3 pb-2">
            <h2 className="text-base font-semibold text-white/90">What are you building?</h2>
            <p className="text-xs text-white/45 leading-relaxed">
              {`Describe your idea, who it's for, and the pain it solves.`}
            </p>
            <WInput label="Your idea" value={answers.rawIdea} onChange={(v) => set("rawIdea", v)} placeholder="e.g. AI-powered bookkeeping for freelancers" textarea />
            <WInput label="Problem it solves" value={answers.problem} onChange={(v) => set("problem", v)} placeholder="e.g. Freelancers spend 5+ hrs/wk on invoices" />
            <WInput label="Target user / ICP" value={answers.targetUser} onChange={(v) => set("targetUser", v)} placeholder="e.g. Solo freelancers earning $50-200k/yr" />
          </div>
        </Step>

        {/* Step 2 — About you */}
        <Step>
          <div className="space-y-3 pb-2">
            <h2 className="text-base font-semibold text-white/90">About you</h2>
            <WInput label="Your name" value={answers.founderName} onChange={(v) => set("founderName", v)} placeholder="e.g. Alex" />
            <ChipSelect label="Country / market" options={COUNTRY_OPTIONS} value={answers.country} onChange={(v) => set("country", v)} multi />
            <ChipSelect label="Language" options={LANG_OPTIONS} value={answers.language} onChange={(v) => set("language", v)} multi />
            <ChipSelect label="Hours / week" options={TIME_OPTIONS} value={answers.timeAvailable} onChange={(v) => set("timeAvailable", v)} />
            <ChipSelect label="Skills / team" options={SKILLS_OPTIONS} value={answers.skillsResources} onChange={(v) => set("skillsResources", v)} multi />
          </div>
        </Step>

        {/* Step 3 — Economics */}
        <Step>
          <div className="space-y-3 pb-2">
            <h2 className="text-base font-semibold text-white/90">Economics & execution</h2>
            <ChipSelect label="Monetization" options={MONETIZATION_OPTIONS} value={answers.monetization} onChange={(v) => set("monetization", v)} multi />
            <ChipSelect label="Business model" options={MODEL_OPTIONS} value={answers.businessModel} onChange={(v) => set("businessModel", v)} multi />
            <RiskPicker value={answers.riskTolerance} onChange={(v) => set("riskTolerance", v)} />
            <ChipSelect label="Automation level" options={AUTO_OPTIONS} value={answers.automationLevel} onChange={(v) => set("automationLevel", v)} multi />
            <ChipSelect label="Go-to-market channels" options={CHANNEL_OPTIONS} value={answers.channels} onChange={(v) => set("channels", v)} multi />
          </div>
        </Step>

        {/* Step 4 — Review */}
        <Step>
          <div className="space-y-3 pb-2">
            <h2 className="text-base font-semibold text-white/90">Review & generate</h2>
            <p className="text-xs text-white/45 leading-relaxed">
              {filledCount}/{Object.keys(answers).length} fields filled. Hit Generate to create your agent brief.
            </p>
            <div className="space-y-1.5 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs text-white/70">
              <ReviewLine label="Idea" value={answers.rawIdea} />
              <ReviewLine label="Problem" value={answers.problem} />
              <ReviewLine label="Target user" value={answers.targetUser} />
              <ReviewLine label="Founder" value={answers.founderName} />
              <ReviewLine label="Market" value={[answers.country, answers.language].filter(Boolean).join(" · ")} />
              <ReviewLine label="Time" value={answers.timeAvailable} />
              <ReviewLine label="Skills" value={answers.skillsResources} />
              <ReviewLine label="Monetization" value={answers.monetization} />
              <ReviewLine label="Model" value={answers.businessModel} />
              <ReviewLine label="Pace" value={answers.riskTolerance} />
              <ReviewLine label="Automation" value={answers.automationLevel} />
              <ReviewLine label="Channels" value={answers.channels} />
            </div>
            {isGenerating && (
              <motion.div
                className="flex items-center gap-2 rounded-lg border border-violet-400/20 bg-violet-500/10 px-3 py-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <LoaderIcon className="h-3.5 w-3.5 animate-[spin_1.5s_linear_infinite] text-violet-300" />
                <span className="text-xs text-violet-300/90">Venice is generating your agent brief…</span>
              </motion.div>
            )}
          </div>
        </Step>
      </Stepper>

      {/* Advanced Settings (collapsible — always editable text fields) */}
      <div className="mx-auto w-full max-w-[32rem]">
        <button
          type="button"
          onClick={() => setShowAdvanced((p) => !p)}
          className="flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2 text-xs text-white/50 hover:text-white/70 transition-colors"
        >
          <span>Advanced Settings</span>
          {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-[11px] text-white/40 mb-2">Edit any field to refine the generated brief.</p>
                <WInput label="Idea" value={answers.rawIdea} onChange={(v) => set("rawIdea", v)} />
                <WInput label="Problem" value={answers.problem} onChange={(v) => set("problem", v)} />
                <WInput label="Target user" value={answers.targetUser} onChange={(v) => set("targetUser", v)} />
                <div className="grid grid-cols-2 gap-3">
                  <WInput label="Founder name" value={answers.founderName} onChange={(v) => set("founderName", v)} />
                  <WInput label="Country" value={answers.country} onChange={(v) => set("country", v)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <WInput label="Language" value={answers.language} onChange={(v) => set("language", v)} />
                  <WInput label="Hours / week" value={answers.timeAvailable} onChange={(v) => set("timeAvailable", v)} />
                </div>
                <WInput label="Skills / team" value={answers.skillsResources} onChange={(v) => set("skillsResources", v)} />
                <WInput label="Monetization" value={answers.monetization} onChange={(v) => set("monetization", v)} />
                <WInput label="Business model" value={answers.businessModel} onChange={(v) => set("businessModel", v)} />
                <WInput label="Automation level" value={answers.automationLevel} onChange={(v) => set("automationLevel", v)} />
                <WInput label="Channels" value={answers.channels} onChange={(v) => set("channels", v)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 font-medium text-white/40 w-20">{label}</span>
      <span className={value.trim() ? "text-white/80" : "italic text-white/25"}>{value.trim() || "—"}</span>
    </div>
  );
}
