import { User, Shield, Activity, BarChart3, Brain, Target, FileCheck, CheckCircle } from 'lucide-react';

interface Props {
  currentStep: number;
}

const processingSteps = [
  { icon: User, text: 'Verifying customer identity...', color: 'text-blue-400' },
  { icon: Shield, text: 'Running fraud detection...', color: 'text-purple-400' },
  { icon: Activity, text: 'Analyzing transaction patterns...', color: 'text-cyan-400' },
  { icon: BarChart3, text: 'Computing financial ratios...', color: 'text-green-400' },
  { icon: Brain, text: 'Running XGBoost risk model...', color: 'text-pink-400' },
  { icon: Target, text: 'Computing SHAP explanations...', color: 'text-orange-400' },
  { icon: FileCheck, text: 'Generating recommendations...', color: 'text-emerald-400' },
];

export default function ProcessingStep({ currentStep }: Props) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-indigo-400"></div>
            <Brain className="w-12 h-12 text-indigo-400 absolute top-6 left-6 animate-pulse" />
          </div>
          <h2 className="text-3xl font-bold text-white mt-6 mb-2">Analyzing Customer Profile</h2>
          <p className="text-indigo-300">Real ML models are evaluating risk factors...</p>
        </div>

        <div className="space-y-4">
          {processingSteps.map((step, index) => {
            const StepIcon = step.icon;
            const isComplete = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <div key={index}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                  isComplete ? 'bg-green-500/20 border-green-400/50'
                    : isCurrent ? 'bg-white/20 border-white/40 animate-pulse'
                    : 'bg-white/5 border-white/10'
                }`}>
                <StepIcon className={`w-6 h-6 ${isComplete ? 'text-green-400' : isCurrent ? 'text-white' : step.color}`} />
                <span className={`flex-1 ${isComplete || isCurrent ? 'text-white font-medium' : 'text-indigo-300'}`}>
                  {step.text}
                </span>
                {isComplete && <CheckCircle className="w-5 h-5 text-green-400" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
