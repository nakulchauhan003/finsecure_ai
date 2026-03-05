import { User, Building, Briefcase } from 'lucide-react';
import type { EmploymentType } from '../types';

interface Props {
  onSelect: (type: EmploymentType) => void;
}

export default function EmploymentStep({ onSelect }: Props) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-8">
      <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
        <Briefcase className="w-6 h-6 text-indigo-400" />
        Select Employment Type
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => onSelect('salaried')}
          className="bg-gradient-to-r from-blue-500 to-indigo-500 p-8 rounded-xl border border-white/20 hover:from-blue-600 hover:to-indigo-600 transition-all flex flex-col items-center gap-4"
        >
          <User className="w-12 h-12 text-white" />
          <h3 className="text-2xl font-bold text-white">Salaried Individual</h3>
          <p className="text-indigo-200 text-center">Employed with regular monthly salary</p>
        </button>
        <button
          onClick={() => onSelect('self_employed')}
          className="bg-gradient-to-r from-purple-500 to-pink-500 p-8 rounded-xl border border-white/20 hover:from-purple-600 hover:to-pink-600 transition-all flex flex-col items-center gap-4"
        >
          <Building className="w-12 h-12 text-white" />
          <h3 className="text-2xl font-bold text-white">Self-Employed</h3>
          <p className="text-indigo-200 text-center">Business owner or freelancer</p>
        </button>
      </div>
    </div>
  );
}
