import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

export default function Tooltip({ content }) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        className="text-slate-400 hover:text-brand-700 transition-colors focus:outline-none"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        aria-label="도움말"
      >
        <HelpCircle size={15} />
      </button>

      {visible && (
        <span
          role="tooltip"
          className="
            absolute z-50 bottom-6 left-1/2 -translate-x-1/2
            w-64 rounded-xl bg-slate-800 text-white text-xs leading-relaxed
            px-3 py-2.5 shadow-xl pointer-events-none
          "
        >
          {content}
          {/* 아래 삼각형 */}
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 rotate-45 rounded-sm" />
        </span>
      )}
    </span>
  );
}
