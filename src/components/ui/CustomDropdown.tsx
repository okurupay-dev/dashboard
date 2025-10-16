import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className = "",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const selectedOption = options.find(option => option.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          relative w-full bg-white border border-gray-300 rounded-lg shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          hover:border-gray-400 transition-colors duration-200
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}
          ${isOpen ? 'ring-2 ring-indigo-500 border-indigo-500' : ''}
        `}
      >
        <div className="flex items-center">
          {selectedOption?.icon && (
            <span className="mr-2 flex-shrink-0">
              {selectedOption.icon}
            </span>
          )}
          <span className="block truncate text-sm font-medium text-gray-900">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown 
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`} 
          />
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-lg py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none border border-gray-200">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`
                relative w-full cursor-pointer select-none py-2 pl-3 pr-9 text-left hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none
                ${value === option.value ? 'bg-indigo-50 text-indigo-900' : 'text-gray-900'}
              `}
            >
              <div className="flex items-center">
                {option.icon && (
                  <span className="mr-2 flex-shrink-0">
                    {option.icon}
                  </span>
                )}
                <span className={`block truncate text-sm ${
                  value === option.value ? 'font-semibold' : 'font-normal'
                }`}>
                  {option.label}
                </span>
              </div>
              
              {value === option.value && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-indigo-600">
                  <Check className="h-4 w-4" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
