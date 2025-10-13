import React, { useState } from "react";

const InterestPrediction: React.FC = () => {
  const [creditScore, setCreditScore] = useState(700);
  const [income, setIncome] = useState(50000);
  const [loanAmount, setLoanAmount] = useState(10000);
  const [preference, setPreference] = useState("Low Interest");
  const [prediction, setPrediction] = useState<{ interestRate: number; duration: number } | null>(null);

  const predictLoan = () => {
    let baseRate = 15 - (creditScore - 600) * 0.02 - income / 100000;
    baseRate = Math.max(5, Math.min(20, baseRate));

    let duration = 24;
    if (preference === "Short Term") duration = 12;
    else if (preference === "Low Interest") duration = 36;

    setPrediction({
      interestRate: parseFloat(baseRate.toFixed(2)),
      duration,
    });
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 border rounded-xl shadow-md bg-white">
      <h2 className="text-2xl font-semibold mb-4 text-center">Loan Prediction</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Credit Score: {creditScore}</label>
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

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Annual Income ($)</label>
        <input
          type="number"
          value={income}
          onChange={(e) => setIncome(Number(e.target.value))}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Loan Amount ($)</label>
        <input
          type="number"
          value={loanAmount}
          onChange={(e) => setLoanAmount(Number(e.target.value))}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Customer Preference</label>
        <select
          value={preference}
          onChange={(e) => setPreference(e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          <option>Low Interest</option>
          <option>Short Term</option>
          <option>Balanced</option>
        </select>
      </div>

      <button
        onClick={predictLoan}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        Predict
      </button>

      {prediction && (
        <div className="mt-6 p-4 border bg-gray-50 rounded">
          <p><strong>Interest Rate:</strong> {prediction.interestRate}%</p>
          <p><strong>Loan Duration:</strong> {prediction.duration} months</p>
        </div>
      )}
    </div>
  );
};

export default InterestPrediction;
