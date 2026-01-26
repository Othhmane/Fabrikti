
import React from 'react';
import { useUIStore } from '../store/useStore';

/**
 * BOUTON RESPONSIVE
 * S'adapte à la taille de l'écran et gère les états de chargement.
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', isLoading, className, ...props }) => {
  const { themeColor } = useUIStore();
  
  const baseStyles = "px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base active:scale-95";
  
  const variants = {
    primary: `bg-${themeColor}-600 text-white hover:bg-${themeColor}-700 shadow-sm`,
    secondary: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    ghost: "text-gray-500 hover:bg-gray-100",
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} disabled={isLoading} {...props}>
      {isLoading ? (
        <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : children}
    </button>
  );
};

/**
 * GRILLE RESPONSIVE 
 * Gère automatiquement le passage de 1 à 3 colonnes.
 */
export const ResponsiveGrid: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 ${className}`}>
    {children}
  </div>
);

/**
 * CARD RESPONSIVE
 * Support standard HTML attributes like onClick.
 */
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div 
    className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md ${className}`}
    {...props}
  >
    {children}
  </div>
);

/**
 * FORMULAIRE RESPONSIVE (Input)
 * Enhanced to support an optional icon prop positioned absolutely inside the input.
 */
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; icon?: React.ReactNode }> = ({ label, error, icon, className, ...props }) => (
  <div className="w-full space-y-1">
    {label && <label className="block text-sm font-semibold text-gray-700">{label}</label>}
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {icon}
        </div>
      )}
      <input 
        className={`w-full ${icon ? 'pl-10' : 'px-4'} py-2.5 border rounded-lg focus:ring-4 focus:ring-opacity-10 outline-none transition-all text-base ${
          error ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200'
        } ${className}`} 
        {...props} 
      />
    </div>
    {error && <p className="text-xs font-medium text-red-500">{error}</p>}
  </div>
);

/**
 * BADGE
 */
export const Badge: React.FC<{ children: React.ReactNode; color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray' }> = ({ children, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border border-blue-100',
    green: 'bg-green-50 text-green-700 border border-green-100',
    red: 'bg-red-50 text-red-700 border border-red-100',
    yellow: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
    gray: 'bg-gray-50 text-gray-700 border border-gray-100',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${colors[color]}`}>{children}</span>;
};

/**
 * TABLE ADAPTATIVE
 * Invisible sur mobile, remplacée par une vue Card dans les composants parents.
 */
export const DesktopTable: React.FC<{ headers: string[]; children: React.ReactNode }> = ({ headers, children }) => (
  <div className="hidden md:block overflow-x-auto bg-white rounded-xl border border-gray-200">
    <table className="w-full text-left">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          {headers.map(h => (
            <th key={h} className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {children}
      </tbody>
    </table>
  </div>
);
