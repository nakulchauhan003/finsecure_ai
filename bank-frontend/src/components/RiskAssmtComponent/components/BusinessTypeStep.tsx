import { ShoppingCart, Wrench, Briefcase, Building } from 'lucide-react';
import type { BusinessType } from '../types';

interface Props {
  onSelect: (type: BusinessType) => void;
}

export default function BusinessTypeStep({ onSelect }: Props) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-8">
      <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
        <Building className="w-6 h-6 text-indigo-400" />
        Select Business Type
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => onSelect('trading')}
          className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 rounded-xl border border-white/20 hover:from-blue-600 hover:to-indigo-600 transition-all flex flex-col items-center gap-4"
        >
          <ShoppingCart className="w-10 h-10 text-white" />
          <h3 className="text-xl font-bold text-white">Trading</h3>
          <p className="text-indigo-200 text-center">Buying and selling goods</p>
        </button>
        <button
          onClick={() => onSelect('manufacturing')}
          className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 rounded-xl border border-white/20 hover:from-green-600 hover:to-emerald-600 transition-all flex flex-col items-center gap-4"
        >
          <Wrench className="w-10 h-10 text-white" />
          <h3 className="text-xl font-bold text-white">Manufacturing</h3>
          <p className="text-indigo-200 text-center">Production of goods</p>
        </button>
        <button
          onClick={() => onSelect('service')}
          className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-xl border border-white/20 hover:from-purple-600 hover:to-pink-600 transition-all flex flex-col items-center gap-4"
        >
          <Briefcase className="w-10 h-10 text-white" />
          <h3 className="text-xl font-bold text-white">Service</h3>
          <p className="text-indigo-200 text-center">Providing professional services</p>
        </button>
      </div>
    </div>
  );
}
