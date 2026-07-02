'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface Option {
  value: string;
  label: string;
  subtitle?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string, option?: Option) => void;
  placeholder?: string;
  className?: string;
  dropdownClassName?: string;
  truncateInput?: boolean;
  required?: boolean;
  disabled?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  dropdownClassName = '',
  truncateInput = true,
  required = false,
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const updateDropdownPos = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption
    ? `${selectedOption.label}${selectedOption.subtitle ? ` - ${selectedOption.subtitle}` : ''}`
    : '';

  const filteredOptions = options.filter((option) => {
    if (!searchTerm) return true; // Show all options when no search term
    return (
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.subtitle?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(event.target as Node) &&
        (!dropdownRef.current || !dropdownRef.current.contains(event.target as Node))
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateDropdownPos();
      const handleScrollResize = () => updateDropdownPos();
      window.addEventListener('scroll', handleScrollResize, true);
      window.addEventListener('resize', handleScrollResize);
      return () => {
        window.removeEventListener('scroll', handleScrollResize, true);
        window.removeEventListener('resize', handleScrollResize);
      };
    }
  }, [isOpen, updateDropdownPos]);

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
    }
  }, [searchTerm, isOpen]);

  useEffect(() => {
    if (isOpen) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          selectOption(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  const selectOption = (option: Option) => {
    onChange(option.value, option);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? searchTerm : displayValue}
        title={displayValue}
        onChange={(e) => {
          if (disabled) return;
          setSearchTerm(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => {
          if (disabled) return;
          updateDropdownPos();
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        className={`w-full min-h-10 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm text-slate-900 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500 disabled:opacity-60 ${
          truncateInput ? 'truncate' : ''
        }`}
        autoComplete="off"
      />
      
      {isOpen && !disabled && dropdownPos && createPortal(
        <div
          ref={dropdownRef}
          role="listbox"
          className={`fixed z-[99999] bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto ${dropdownClassName}`}
          style={{ top: dropdownPos.top + 2, left: dropdownPos.left, width: dropdownPos.width }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-500">No items found</div>
          ) : (
            filteredOptions.map((option, index) => (
              <div
                key={option.value}
                ref={(el) => { itemRefs.current[index] = el; }}
                onClick={() => selectOption(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-3 py-2 cursor-pointer text-sm ${
                  index === highlightedIndex
                    ? 'bg-indigo-50 text-indigo-900'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium whitespace-normal break-words">{option.label}</div>
                {option.subtitle && (
                  <div className="text-xs text-slate-500 mt-0.5 whitespace-normal break-words">{option.subtitle}</div>
                )}
              </div>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
