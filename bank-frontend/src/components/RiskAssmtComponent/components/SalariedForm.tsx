import { User, Briefcase, DollarSign, Home, TrendingUp, Zap, Shield } from 'lucide-react';
import type { SalariedFormData } from '../types';

interface Props {
  formData: SalariedFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: () => void;
  errors?: Record<string, string>;
}

export default function SalariedForm({ formData, onChange, onSubmit, errors }: Props) {
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
              <DollarSign className="w-4 h-4" /> Monthly Salary (₹)
            </label>
            <input type="number" name="monthlySalary" value={formData.monthlySalary} onChange={onChange}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g., 75000" />
            {errors?.monthlySalary && <p className="text-red-400 text-xs mt-1">{errors.monthlySalary}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-2">Housing Type</label>
            <select name="housingType" value={formData.housingType} onChange={onChange}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="rent" className="bg-slate-800">On Rent</option>
              <option value="owned" className="bg-slate-800">Owned</option>
            </select>
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

      {/* Financial Details */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
        <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-indigo-400" />
          Financial Details
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-2 flex items-center gap-2">
              <Home className="w-4 h-4" /> Office Rent (₹)
            </label>
            <input type="number" name="officeRent" value={formData.officeRent} onChange={onChange}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g., 15000" />
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Other Fixed Expenses (₹)
            </label>
            <input type="number" name="otherFixedExpenses" value={formData.otherFixedExpenses} onChange={onChange}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g., 20000" />
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Total Expenditure Estimate (₹)
            </label>
            <input type="number" name="totalExpenditure" value={formData.totalExpenditure} onChange={onChange}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g., 45000" />
            {errors?.totalExpenditure && <p className="text-red-400 text-xs mt-1">{errors.totalExpenditure}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-2">Loan Enquiries (Last 3 Months)</label>
            <input type="number" name="loanEnquiries" value={formData.loanEnquiries} onChange={onChange}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g., 2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-2">Loan Purpose</label>
            <select name="loanPurpose" value={formData.loanPurpose} onChange={onChange}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="personal" className="bg-slate-800">Personal</option>
              <option value="education" className="bg-slate-800">Education</option>
              <option value="home" className="bg-slate-800">Home Improvement</option>
              <option value="vehicle" className="bg-slate-800">Vehicle</option>
              <option value="medical" className="bg-slate-800">Medical</option>
              <option value="business" className="bg-slate-800">Business / Venture</option>
            </select>
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

      {/* Submit Button */}
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
