"use client";

import React, { useState, Children, useRef, useLayoutEffect, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./stepper.css";

/* ─── types ─── */

interface StepperProps {
  children: React.ReactNode;
  initialStep?: number;
  onStepChange?: (step: number) => void;
  onFinalStepCompleted?: () => void;
  backButtonText?: string;
  nextButtonText?: string;
  disableStepIndicators?: boolean;
  /** Disable the Next button externally (e.g. required fields empty). */
  nextDisabled?: boolean;
}

interface StepProps {
  children: React.ReactNode;
}

/* ─── main ─── */

export default function Stepper({
  children,
  initialStep = 1,
  onStepChange,
  onFinalStepCompleted,
  backButtonText = "Back",
  nextButtonText = "Continue",
  disableStepIndicators = false,
  nextDisabled = false,
}: StepperProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(0);
  const stepsArray = Children.toArray(children);
  const totalSteps = stepsArray.length;
  const isCompleted = currentStep > totalSteps;
  const isLastStep = currentStep === totalSteps;

  const updateStep = (n: number) => {
    setCurrentStep(n);
    if (n > totalSteps) {
      onFinalStepCompleted?.();
    } else {
      onStepChange?.(n);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      updateStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (!isLastStep) {
      setDirection(1);
      updateStep(currentStep + 1);
    }
  };

  const handleComplete = () => {
    setDirection(1);
    updateStep(totalSteps + 1);
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== "Enter" || nextDisabled || isCompleted) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA") return;
      e.preventDefault();
      if (isLastStep) handleComplete();
      else handleNext();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nextDisabled, isCompleted, isLastStep, currentStep],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="stepper-outer">
      <div className="stepper-card">
        {/* indicators */}
        <div className="stepper-indicator-row">
          {stepsArray.map((_, index) => {
            const stepNum = index + 1;
            return (
              <React.Fragment key={stepNum}>
                <StepIndicator
                  step={stepNum}
                  currentStep={currentStep}
                  disabled={disableStepIndicators}
                  onClickStep={(s) => {
                    setDirection(s > currentStep ? 1 : -1);
                    updateStep(s);
                  }}
                />
                {index < totalSteps - 1 && <StepConnector isComplete={currentStep > stepNum} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* animated content */}
        <StepContentWrapper isCompleted={isCompleted} currentStep={currentStep} direction={direction}>
          {stepsArray[currentStep - 1]}
        </StepContentWrapper>

        {/* footer buttons */}
        {!isCompleted && (
          <div className="stepper-footer">
            <div className={`stepper-footer-nav ${currentStep !== 1 ? "spread" : "end"}`}>
              {currentStep !== 1 && (
                <button type="button" onClick={handleBack} className="stepper-back">
                  {backButtonText}
                </button>
              )}
              <button
                type="button"
                onClick={isLastStep ? handleComplete : handleNext}
                className="stepper-next"
                disabled={nextDisabled}
              >
                {isLastStep ? "Generate" : nextButtonText}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── step wrapper ─── */

export function Step({ children }: StepProps) {
  return <div className="stepper-step-body">{children}</div>;
}

/* ─── internals ─── */

function StepContentWrapper({
  isCompleted,
  currentStep,
  direction,
  children,
}: {
  isCompleted: boolean;
  currentStep: number;
  direction: number;
  children: React.ReactNode;
}) {
  const [parentHeight, setParentHeight] = useState(0);

  return (
    <motion.div
      className="stepper-content-wrap"
      style={{ position: "relative", overflow: "hidden" }}
      animate={{ height: isCompleted ? 0 : parentHeight }}
      transition={{ type: "spring", duration: 0.4 }}
    >
      <AnimatePresence initial={false} mode="sync" custom={direction}>
        {!isCompleted && (
          <SlideTransition key={currentStep} direction={direction} onHeightReady={(h) => setParentHeight(h)}>
            {children}
          </SlideTransition>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SlideTransition({
  children,
  direction,
  onHeightReady,
}: {
  children: React.ReactNode;
  direction: number;
  onHeightReady: (h: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (ref.current) onHeightReady(ref.current.offsetHeight);
  }, [children, onHeightReady]);

  return (
    <motion.div
      ref={ref}
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.35 }}
      style={{ position: "absolute", left: 0, right: 0, top: 0 }}
    >
      {children}
    </motion.div>
  );
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir >= 0 ? "-100%" : "100%", opacity: 0 }),
  center: { x: "0%", opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? "50%" : "-50%", opacity: 0 }),
};

function StepIndicator({
  step,
  currentStep,
  disabled,
  onClickStep,
}: {
  step: number;
  currentStep: number;
  disabled: boolean;
  onClickStep: (s: number) => void;
}) {
  const status = currentStep === step ? "active" : currentStep < step ? "inactive" : "complete";

  return (
    <motion.div
      onClick={() => {
        if (!disabled && step !== currentStep) onClickStep(step);
      }}
      className="stepper-dot-indicator"
      animate={status}
      initial={false}
    >
      <motion.div
        variants={{
          inactive: { scale: 1, backgroundColor: "#222", color: "#a3a3a3" },
          active: { scale: 1, backgroundColor: "#5227FF", color: "#5227FF" },
          complete: { scale: 1, backgroundColor: "#5227FF", color: "#3b82f6" },
        }}
        transition={{ duration: 0.3 }}
        className="stepper-dot-inner"
      >
        {status === "complete" ? (
          <CheckIcon className="stepper-check" />
        ) : status === "active" ? (
          <div className="stepper-active-dot" />
        ) : (
          <span className="stepper-step-num">{step}</span>
        )}
      </motion.div>
    </motion.div>
  );
}

function StepConnector({ isComplete }: { isComplete: boolean }) {
  return (
    <div className="stepper-connector">
      <motion.div
        className="stepper-connector-fill"
        variants={{
          incomplete: { width: 0, backgroundColor: "transparent" },
          complete: { width: "100%", backgroundColor: "#5227FF" },
        }}
        initial={false}
        animate={isComplete ? "complete" : "incomplete"}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.1, type: "tween", ease: "easeOut", duration: 0.3 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
