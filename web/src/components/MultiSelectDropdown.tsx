import { useState, useRef, useEffect } from 'react';

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export default function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select options...'
}: MultiSelectDropdownProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const handleClearAll = () => {
    onChange([]);
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
        {label}
      </label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm flex items-center justify-between hover:border-slate-400 transition-colors"
      >
        <span className={selected.length === 0 ? 'text-slate-400' : 'text-slate-900'}>
          {selected.length === 0
            ? placeholder
            : selected.length === 1
            ? selected[0]
            : `${selected.length} selected`}
        </span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-300 bg-white shadow-lg">
          {/* Search box */}
          <div className="border-b border-slate-200 p-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">No options found</div>
            ) : (
              <>
                {filteredOptions.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(option)}
                      onChange={() => handleToggleOption(option)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm text-slate-700">{option}</span>
                  </label>
                ))}
              </>
            )}
          </div>

          {/* Footer with clear button */}
          {selected.length > 0 && (
            <div className="border-t border-slate-200 p-2">
              <button
                type="button"
                onClick={handleClearAll}
                className="w-full rounded bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Clear all ({selected.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
