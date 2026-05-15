'use client';

import { ChangeEvent, FocusEvent, InputHTMLAttributes, useEffect, useMemo, useState } from 'react';
import { formatDateInputDisplay, parseDisplayDateToInputValue } from '@/lib/date';

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
};

function formatDateDraft(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function DateInput({ value, onChange, onBlur, placeholder = 'DD/MM/YY', ...props }: DateInputProps) {
  const formattedValue = useMemo(() => formatDateInputDisplay(value), [value]);
  const [draftValue, setDraftValue] = useState(formattedValue);
  const [rangeError, setRangeError] = useState('');

  useEffect(() => {
    setDraftValue(formattedValue);
  }, [formattedValue]);

  const commitValue = (nextDisplayValue: string) => {
    const parsedValue = parseDisplayDateToInputValue(nextDisplayValue);
    if (parsedValue) {
      if (typeof props.min === 'string' && props.min && parsedValue < props.min) {
        setRangeError(`Date cannot be before ${formatDateInputDisplay(props.min)}`);
        setDraftValue(formatDateInputDisplay(value));
        return;
      }

      if (typeof props.max === 'string' && props.max && parsedValue > props.max) {
        setRangeError(`Date cannot be after ${formatDateInputDisplay(props.max)}`);
        setDraftValue(formatDateInputDisplay(value));
        return;
      }

      setRangeError('');
      onChange(parsedValue);
      setDraftValue(formatDateInputDisplay(parsedValue));
      return;
    }

    if (!nextDisplayValue.trim()) {
      setRangeError('');
      onChange('');
      setDraftValue('');
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = formatDateDraft(event.target.value);
    setDraftValue(nextValue);
    if (nextValue.length === 8 || !nextValue.trim()) {
      commitValue(nextValue);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    commitValue(event.target.value);
    onBlur?.(event);
  };

  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      value={draftValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      pattern="\\d{2}/\\d{2}/\\d{2}"
      aria-invalid={rangeError ? true : props['aria-invalid']}
      title={rangeError || 'Use DD/MM/YY format'}
    />
  );
}
