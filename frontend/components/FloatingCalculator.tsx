import React, { useMemo, useState } from 'react';
import { Calculator, X, Delete, Equal } from 'lucide-react';

const KEYS = [
  '7', '8', '9', '/',
  '4', '5', '6', '*',
  '1', '2', '3', '-',
  '0', '.', 'C', '+',
];

const isSafeExpr = (expr: string) => /^[0-9+\-*/().\s]+$/.test(expr);

export const FloatingCalculator: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const display = useMemo(() => {
    if (result !== null) return result;
    return value.length > 0 ? value : '0';
  }, [value, result]);

  const append = (v: string) => {
    setResult(null);
    setValue(prev => (prev + v).slice(0, 64));
  };

  const clear = () => {
    setValue('');
    setResult(null);
  };

  const backspace = () => {
    setResult(null);
    setValue(prev => prev.slice(0, -1));
  };

  const compute = () => {
    if (!value.trim()) return;
    if (!isSafeExpr(value)) {
      setResult('Erreur');
      return;
    }
    try {
      // eslint-disable-next-line no-new-func
      const out = Function(`"use strict"; return (${value})`)();
      if (Number.isFinite(out)) {
        setResult(String(out));
      } else {
        setResult('Erreur');
      }
    } catch {
      setResult('Erreur');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 md:hidden">
      {open && (
        <div className="mb-3 w-72 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
              <Calculator size={16} />
              Calculatrice
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-100"
              title="Fermer"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-4 py-3 bg-white">
            <div className="w-full text-right text-2xl font-bold text-slate-900 break-all min-h-[32px]">
              {display}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50">
            {KEYS.map((k) => {
              if (k === 'C') {
                return (
                  <button
                    key={k}
                    onClick={clear}
                    className="h-12 rounded-xl bg-rose-50 text-rose-700 font-bold border border-rose-200"
                    title="Effacer"
                    aria-label="Effacer"
                  >
                    C
                  </button>
                );
              }
              return (
                <button
                  key={k}
                  onClick={() => append(k)}
                  className={`h-12 rounded-xl font-semibold border ${
                    ['+', '-', '*', '/'].includes(k)
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-white text-slate-800 border-slate-200'
                  }`}
                  aria-label={k}
                >
                  {k}
                </button>
              );
            })}
            <button
              onClick={backspace}
              className="h-12 rounded-xl bg-white text-slate-700 font-semibold border border-slate-200 col-span-2 flex items-center justify-center gap-2"
              title="Supprimer"
              aria-label="Supprimer"
            >
              <Delete size={16} />
              <span className="text-sm">DEL</span>
            </button>
            <button
              onClick={compute}
              className="h-12 rounded-xl bg-emerald-500 text-white font-bold col-span-2 flex items-center justify-center gap-2"
              title="Calculer"
              aria-label="Calculer"
            >
              <Equal size={16} />
              =
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        className="h-14 w-14 rounded-full bg-indigo-600 text-white shadow-2xl flex items-center justify-center"
        title="Calculatrice"
        aria-label="Calculatrice"
      >
        <Calculator size={22} />
      </button>
    </div>
  );
};
