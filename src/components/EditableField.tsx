import React, { useEffect, useState } from 'react';

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  isReadOnly?: boolean;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  inputClassName?: string;
  title?: string;
}

export const EditableText: React.FC<EditableTextProps> = ({
  value,
  onChange,
  isReadOnly = false,
  placeholder = 'Editar...',
  emptyText = '—',
  className = '',
  inputClassName = '',
  title,
}) => {
  if (isReadOnly) {
    return (
      <span className={className} title={title}>
        {value || emptyText}
      </span>
    );
  }

  return (
    <input
      type="text"
      value={value || ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      title={title || 'Clique para editar manualmente'}
      className={`bg-transparent hover:bg-[#1d1f26] focus:bg-[#1a1c22] border border-transparent hover:border-amber-500/40 focus:border-amber-400 rounded-md px-1.5 py-0.5 focus:outline-none transition-colors ${className} ${inputClassName}`}
    />
  );
};

export function parseLocalizedNumber(raw: string, format: 'brl' | 'int' | 'decimal'): number {
  const cleaned = (raw || '').replace(/R\$\s?/gi, '').replace(/\s+/g, '').replace(/[^0-9.,-]/g, '');
  if (!cleaned || cleaned === '-') return 0;

  let normalized = cleaned;
  if (cleaned.includes(',')) {
    // Brazilian style: dots are thousands separators, comma is decimal separator
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes('.')) {
    if (format === 'int' && /^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
      normalized = cleaned.replace(/\./g, '');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
      normalized = cleaned.replace(/\./g, '');
    }
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return format === 'int' ? Math.round(parsed) : parsed;
}

function formatEditableDraft(val: number, format: 'brl' | 'int' | 'decimal'): string {
  if (!val || val <= 0) return '';
  if (format === 'int') return String(Math.round(val));
  const decimals = format === 'brl' ? 2 : 4;
  return val.toFixed(decimals).replace(/\.?0+$/, '').replace('.', ',');
}

interface EditableNumberProps {
  value: number;
  onChange: (value: number) => void;
  format: 'brl' | 'int' | 'decimal';
  isReadOnly?: boolean;
  dashWhenZero?: boolean;
  prefix?: string;
  suffix?: string;
  className?: string;
  inputClassName?: string;
  title?: string;
}

export const EditableNumber: React.FC<EditableNumberProps> = ({
  value,
  onChange,
  format,
  isReadOnly = false,
  dashWhenZero = true,
  prefix = '',
  suffix = '',
  className = '',
  inputClassName = '',
  title,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState(() => formatEditableDraft(value, format));

  useEffect(() => {
    if (!isFocused) {
      setDraft(formatEditableDraft(value, format));
    }
  }, [value, format, isFocused]);

  const formatDisplay = (v: number): string => {
    if ((!v || v <= 0) && dashWhenZero) return '—';
    if (format === 'brl') {
      return `${prefix}${new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(v || 0)}${suffix}`;
    }
    if (format === 'decimal') {
      return `${prefix}${new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }).format(v || 0)}${suffix}`;
    }
    return `${prefix}${new Intl.NumberFormat('pt-BR').format(Math.round(v || 0))}${suffix}`;
  };

  if (isReadOnly) {
    return (
      <span className={className} title={title}>
        {formatDisplay(value)}
      </span>
    );
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={isFocused ? draft : formatDisplay(value)}
      onFocus={(e) => {
        setIsFocused(true);
        const initialDraft = formatEditableDraft(value, format);
        setDraft(initialDraft);
        requestAnimationFrame(() => e.target.select());
      }}
      onChange={(e) => {
        const nextDraft = e.target.value;
        setDraft(nextDraft);
        const parsed = parseLocalizedNumber(nextDraft, format);
        onChange(parsed);
      }}
      onBlur={() => {
        setIsFocused(false);
      }}
      title={title || 'Clique para editar o valor (cálculos atualizados automaticamente)'}
      className={`bg-transparent hover:bg-[#1d1f26] focus:bg-[#1a1c22] border border-transparent hover:border-amber-500/40 focus:border-amber-400 rounded-md px-1.5 py-0.5 focus:outline-none transition-colors font-mono tabular-nums ${className} ${inputClassName}`}
    />
  );
};
