'use client';

import { useState, useRef, useEffect } from 'react';

export default function AutocompleteInput({ value, onChange, placeholder, types, countryCode, disabled }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleInput(text) {
    onChange(text);
    clearTimeout(debounceRef.current);
    if (text.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      const params = new URLSearchParams({ input: text, types: types || '(cities)' });
      if (countryCode) params.set('countryCode', countryCode);
      try {
        const res = await fetch(`/api/places-autocomplete?${params.toString()}`);
        const data = await res.json();
        setSuggestions(data.predictions || []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 350);
  }

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        style={inputStyle}
      />
      {open && suggestions.length > 0 && (
        <div style={dropdownStyle}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              style={optionStyle}
              onClick={() => { onChange(s.mainText); setOpen(false); setSuggestions([]); }}
            >
              {s.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '8px 10px', border: '0.5px solid var(--border)',
  borderRadius: 6, fontSize: 13, background: 'white', boxSizing: 'border-box',
};
const dropdownStyle = {
  position: 'absolute', top: '100%', left: 0, right: 0, background: 'white',
  border: '0.5px solid var(--border)', borderRadius: 6, marginTop: 4, zIndex: 20,
  maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};
const optionStyle = { padding: '8px 10px', fontSize: 13, cursor: 'pointer' };
