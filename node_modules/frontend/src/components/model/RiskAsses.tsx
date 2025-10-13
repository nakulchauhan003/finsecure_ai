import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const logisticWeights = {
  creditScore: 0.005,
  income: 0.00001,
  age: -0.01,
  existingEmis: -0.00002,
  pastDefault: -0.5,
};
const logisticIntercept = -1.2;

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const computeLocalRisk = (inp: any) => {
  let z = logisticIntercept;
  (Object.keys(logisticWeights) as (keyof typeof logisticWeights)[]).forEach((key) => {
    z += logisticWeights[key] * (inp[key] || 0);
  });
  return sigmoid(z);
};

const numericKeys = ["creditScore", "income", "age", "existingEmis"] as const;
type NumericKey = typeof numericKeys[number];

const RiskAssessment: React.FC = () => {
  const [input, setInput] = useState({
    creditScore: 700,
    income: 50000,
    age: 30,
    employment: "Salaried",
    loanAmount: 300000,
    existingEmis: 10000,
    pastDefault: false,
  });

  const [simulateParam, setSimulateParam] = useState<NumericKey>("creditScore");
  const [simulationData, setSimulationData] = useState<{ x: number; risk: number }[]>([]);

  useEffect(() => {
    const base = { ...input };
    const range = simulateParam === "creditScore"
      ? [300, 850]
      : simulateParam === "income"
      ? [10000, 200000]
      : simulateParam === "age"
      ? [18, 80]
      : [0, 50000];
    const step = Math.max(1, Math.round((range[1] - range[0]) / 10));
    const data: { x: number; risk: number }[] = [];
    for (let v = range[0]; v <= range[1]; v += step) {
      base[simulateParam] = v;
      const prob = computeLocalRisk(base);
      data.push({ x: v, risk: parseFloat((prob * 100).toFixed(1)) });
    }
    setSimulationData(data);
  }, [simulateParam, input]);

  const handleParamChange = (field: string, value: any) => {
    setInput((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-lg mt-10">
      <h3 className="text-lg font-semibold mb-4">🔄 What-If Simulator</h3>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <label className="flex flex-col">
          Credit Score: {input.creditScore}
          <input
            type="range"
            min={300}
            max={850}
            step={10}
            value={input.creditScore}
            onChange={(e) => handleParamChange("creditScore", Number(e.target.value))}
            className="w-full"
          />
        </label>
        <label className="flex flex-col">
          Income: {input.income}
          <input
            type="range"
            min={10000}
            max={200000}
            step={1000}
            value={input.income}
            onChange={(e) => handleParamChange("income", Number(e.target.value))}
            className="w-full"
          />
        </label>
        <label className="flex flex-col">
          Age: {input.age}
          <input
            type="range"
            min={18}
            max={80}
            step={1}
            value={input.age}
            onChange={(e) => handleParamChange("age", Number(e.target.value))}
            className="w-full"
          />
        </label>
        <label className="flex flex-col">
          Existing EMIs: {input.existingEmis}
          <input
            type="range"
            min={0}
            max={50000}
            step={1000}
            value={input.existingEmis}
            onChange={(e) => handleParamChange("existingEmis", Number(e.target.value))}
            className="w-full"
          />
        </label>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm">Parameter to simulate:</label>
        <select
          value={simulateParam}
          onChange={(e) => setSimulateParam(e.target.value as NumericKey)}
          className="border rounded px-2 py-1"
        >
          {numericKeys.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={simulationData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" label={{ value: simulateParam, position: "insideBottomRight", offset: 0 }} />
          <YAxis label={{ value: "Risk %", angle: -90, position: "insideLeft" }} />
          <Tooltip />
          <Line type="monotone" dataKey="risk" stroke="#f97316" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-2 text-sm text-gray-600">
        Adjust sliders above to see how changes impact risk probability.
      </p>
    </div>
  );
};

export default RiskAssessment;
