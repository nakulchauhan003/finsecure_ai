import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

const RealTimeInterestOptimizer: React.FC = () => {
  const [creditScore, setCreditScore] = useState(700);
  const [income, setIncome] = useState(50000);
  const [loanAmount, setLoanAmount] = useState(100000);
  const [termYears, setTermYears] = useState(5);
  const [optimizedRate, setOptimizedRate] = useState<number | null>(null);
  const [emi, setEmi] = useState<number | null>(null);
  const [savings, setSavings] = useState<number | null>(null);
  const [emiData, setEmiData] = useState<{ term: number; emi: number }[]>([]);

  const calcEMI = (principal: number, rate: number, years: number) => {
    const monthlyRate = rate / 12 / 100;
    const months = years * 12;
    return (
      (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1)
    );
  };

  const optimizeRate = () => {
    let baseRate = 15 - (creditScore - 600) * 0.02 - income / 100000;
    baseRate = Math.max(5, Math.min(20, baseRate));
    const riskAdjustment = (creditScore - 650) * 0.005;
    const optimized = Math.max(3, baseRate - riskAdjustment);
    return parseFloat(optimized.toFixed(2));
  };

  useEffect(() => {
    const rate = optimizeRate();
    setOptimizedRate(rate);
    const calculatedEMI = parseFloat(calcEMI(loanAmount, rate, termYears).toFixed(2));
    setEmi(calculatedEMI);

    const standardEMI = calcEMI(loanAmount, 10, termYears);
    const totalStandard = standardEMI * termYears * 12;
    const totalOptimized = calculatedEMI * termYears * 12;
    setSavings(parseFloat((totalStandard - totalOptimized).toFixed(2)));

    const data = Array.from({ length: 10 }, (_, i) => {
      const y = i + 1;
      return {
        term: y,
        emi: parseFloat(calcEMI(loanAmount, rate, y).toFixed(2))
      };
    });
    setEmiData(data);
  }, [creditScore, income, loanAmount, termYears]);

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-white shadow-md rounded-2xl">
      <section className="mb-6 p-4 bg-gray-50 rounded-lg border">
        <h1 className="text-2xl font-semibold mb-2">Real-Time Interest Rate Optimizer</h1>
        <p><strong>Purpose:</strong> Instantly recommend better interest rates as the user updates inputs.</p>
        <p className="mt-2 italic text-sm">“Watch your interest rate improve live as you adjust your profile. Our AI works in real time to get you the best possible deal.”</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Credit Score: {creditScore}</label>
          <input
            type="range"
            min={300}
            max={850}
            step={10}
            value={creditScore}
            onChange={(e) => setCreditScore(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Annual Income ($)</label>
          <input
            type="number"
            value={income}
            onChange={(e) => setIncome(Number(e.target.value))}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Loan Amount ($)</label>
          <input
            type="number"
            value={loanAmount}
            onChange={(e) => setLoanAmount(Number(e.target.value))}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Term (Years): {termYears}</label>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={termYears}
            onChange={(e) => setTermYears(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {optimizedRate !== null && emi !== null && (
        <div className="mt-6 p-4 bg-green-50 border rounded-xl">
          <h2 className="text-xl font-semibold mb-2">Optimized Results</h2>
          <p><strong>Optimized Rate:</strong> {optimizedRate}%</p>
          <p><strong>EMI:</strong> ${emi}/month</p>
          <p><strong>Total Savings:</strong> ${savings} vs standard 10% rate</p>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Live EMI Comparison Chart</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={emiData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="term" label={{ value: "Term (Years)", position: "insideBottom", offset: -5 }} />
            <YAxis label={{ value: "EMI ($)", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Line type="monotone" dataKey="emi" stroke="#6366f1" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RealTimeInterestOptimizer;
