
import React from 'react';
import { Card, Button } from '../../components/UI';
import { useUIStore } from '../../store/useStore';
import { THEME_COLORS } from '../../constants';
import { Check } from 'lucide-react';

export const ThemeSettings: React.FC = () => {
  const { themeColor, setThemeColor } = useUIStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Thème & Personnalisation</h2>
        <p className="text-gray-500">Adaptez l'interface de Fabrikti aux couleurs de votre entreprise.</p>
      </div>

      <Card className="p-8">
        <h3 className="text-lg font-bold mb-6">Couleurs Primaires</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {THEME_COLORS.map((color) => (
            <button
              key={color.primary}
              onClick={() => setThemeColor(color.primary)}
              className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left group relative overflow-hidden ${
                themeColor === color.primary 
                ? `border-${color.primary}-600 bg-${color.primary}-50 shadow-lg scale-105` 
                : 'border-transparent bg-white hover:border-gray-200'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl ${color.class} mb-4 flex items-center justify-center text-white shadow-md`}>
                {themeColor === color.primary && <Check size={24} />}
              </div>
              <p className={`font-bold ${themeColor === color.primary ? `text-${color.primary}-900` : 'text-gray-900'}`}>
                {color.name}
              </p>
              <p className="text-sm text-gray-500 mt-1">Palette {color.primary}</p>
              
              {/* Decorative circle */}
              <div className={`absolute -right-4 -bottom-4 w-16 h-16 rounded-full opacity-10 ${color.class}`}></div>
            </button>
          ))}
        </div>

        <div className="mt-12 p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <h4 className="font-bold text-gray-900 mb-2">Aperçu du rendu</h4>
          <div className="flex flex-wrap gap-4">
            <Button>Bouton Principal</Button>
            <Button variant="secondary">Bouton Secondaire</Button>
            <div className={`px-4 py-2 rounded-lg bg-${themeColor}-100 text-${themeColor}-700 font-medium`}>
              Badge d'information
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
