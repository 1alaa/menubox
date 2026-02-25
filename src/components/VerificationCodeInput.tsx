import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
};

export const VerificationCodeInput: React.FC<Props> = ({ length = 6, onComplete, disabled }) => {
  const [values, setValues] = useState<string[]>(() => Array.from({ length }, () => ""));
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const code = useMemo(() => values.join(""), [values]);

  useEffect(() => {
    if (!disabled) inputsRef.current[0]?.focus();
  }, [disabled]);

  useEffect(() => {
    if (code.length === length && values.every((v) => v !== "")) {
      onComplete(code);
    }
  }, [code, length, onComplete, values]);

  const setAt = (idx: number, val: string) => {
    setValues((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const focus = (idx: number) => inputsRef.current[idx]?.focus();

  const handleChange = (idx: number, raw: string) => {
    if (disabled) return;

    // paste multiple digits
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      setAt(idx, "");
      return;
    }

    if (digits.length === 1) {
      setAt(idx, digits);
      if (idx < length - 1) focus(idx + 1);
      return;
    }

    // distribute paste across inputs
    setValues((prev) => {
      const next = [...prev];
      let j = idx;
      for (const d of digits) {
        if (j >= length) break;
        next[j] = d;
        j++;
      }
      return next;
    });

    const nextIndex = Math.min(idx + digits.length, length - 1);
    focus(nextIndex);
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "Backspace") {
      if (values[idx]) {
        setAt(idx, "");
        return;
      }
      if (idx > 0) {
        focus(idx - 1);
        setAt(idx - 1, "");
      }
    }

    if (e.key === "ArrowLeft" && idx > 0) focus(idx - 1);
    if (e.key === "ArrowRight" && idx < length - 1) focus(idx + 1);
  };

  return (
    <div className="flex gap-2 justify-center">
      {values.map((v, idx) => (
        <input
          key={idx}
          ref={(el) => (inputsRef.current[idx] = el)}
          value={v}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={length}
          disabled={disabled}
          className="w-12 h-14 text-center text-2xl font-bold rounded-2xl border border-stone-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      ))}
    </div>
  );
};
