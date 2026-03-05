import { User, Briefcase, DollarSign, Building, TrendingUp, Zap, Shield } from 'lucide-react';
import type { SelfEmployedFormData, BusinessType } from '../types';

interface Props {
  formData: SelfEmployedFormData;
  businessType: BusinessType;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: () => void;
  errors?: Record<string, string>;
}

export default function SelfEmployedForm({ formData, businessType, onChange, onSubmit, errors }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Personal Information */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
        <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
          <User className="w-6 h-6 text-indigo-400" />
          Customer Profile
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-2">Full Name</label>
            <input type="text" name="name" value={formData.name} onChange={onChange}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Enter customer name" />
            {errors?.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-indigo-200 mb-2">Age</label>
              <input type="number" name="age" value={formData.age} onChange={onChange}
                className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="e.g., 32" />
              {errors?.age && <p className="text-red-400 text-xs mt-1">{errors.age}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-indigo-200 mb-2">Credit Score</label>
              <input type="range" name="creditScore" min="300" max="900" step="10" value={formData.creditScore} onChange={onChange}
                className="w-full h-2 bg-indigo-300 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-3" />
              <div className="text-center text-2xl font-bold text-white mt-2">{formData.creditScore}</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Gross Monthly Revenue (₹)
            </label>
            <input type="number" name="grossRevenue" value={formData.grossRevenue} onChange={onChange}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g., 200000" />
            {errors?.grossRevenue && <p className="text-red-400 text-xs mt-1">{errors.grossRevenue}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-2">Expected Margin</label>
            <div className="flex items-center gap-3">
              <input type="range" name="expectedMargin" min="5" max="40" step="1" value={formData.expectedMargin} onChange={onChange}
                className="flex-1 h-2 bg-indigo-300 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
              <div className="text-2xl font-bold text-white w-16">{formData.expectedMargin}%</div>
            </div>
            <p className="text-indigo-300 text-sm mt-2">
              {businessType === 'trading' ? 'Typical range: 8-12%' : businessType === 'manufacturing' ? 'Typical range: 15-25%' : 'Typical range: 20-35%'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-2">Account Age (Years)</label>
            <input type="number" name="accountAge" value={formData.accountAge} onChange={onChange}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g., 5" />
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-2">Previous Defaults</label>
            <input type="number" name="previousDefaults" value={formData.previousDefaults} onChange={onChange} min="0"
              className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="0" />
          </div>
        </div>
      </div>

      {/* Business Financials */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
        <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-indigo-400" />
          Business Financials
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-2 flex items-center gap-2">
              <Building className="w-4 h-4" /> Business Rent (₹)
            </label>
            <input type="number" name="businessRent" value={formData.businessRent} onChange={onChange}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g., 25000" />
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Utilities + Salaries Paid (₹)
            </label>
            <input type="number" name="utilitiesSalaries" value={formData.utilitiesSalaries} onChange={onChange}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g., 50000" />
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-2">Business Age (Years)</label>
            <input type="number" name="businessAge" value={formData.businessAge} onChange={onChange}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g., 3" />
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-2">GST Registered</label>
            <select name="gstRegistered" value={formData.gstRegistered} onChange={onChange}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="yes" className="bg-slate-800">Yes</option>
              <option value="no" className="bg-slate-800">No</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-2">Loan Enquiries (Last 3 Months)</label>
            <input type="number" name="loanEnquiries" value={formData.loanEnquiries} onChange={onChange}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g., 1" />
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Requested Loan Amount (₹)
            </label>
            <input type="number" name="loanAmount" value={formData.loanAmount} onChange={onChange}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g., 500000" />
            {errors?.loanAmount && <p className="text-red-400 text-xs mt-1">{errors.loanAmount}</p>}
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="lg:col-span-2">
        <button onClick={onSubmit}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-5 rounded-xl font-semibold text-lg hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg flex items-center justify-center gap-3 group">
          <Zap className="w-6 h-6 group-hover:scale-110 transition-transform" />
          Run AI Risk Assessment
          <Shield className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </div>
  );
}
