import React, { useState } from "react";

interface Competitor {
  name: string;
  rate: number;
}

const RateComparison: React.FC = () => {
  const [creditScore, setCreditScore] = useState(700);
  const [income, setIncome] = useState(50000);
  const [loanAmount, setLoanAmount] = useState(100000);
  const [termYears, setTermYears] = useState(5);
  const [competitors, setCompetitors] = useState<Competitor[]>([
    { name: "", rate: 0 }
  ]);
  const [offers, setOffers] = useState<{ name: string; competitorRate: number; ourOffer: number; saving: number }[]>([]);

  // Model rate calculation (simulated)
  const calculateModelRate = () => {
    let baseRate = 15 - (creditScore - 600) * 0.02 - income / 100000;
    return parseFloat(Math.max(5, Math.min(20, baseRate)).toFixed(2));
  };

  // Optimize rate relative to competitor (margin: 0.1%)
  const optimizeAgainst = (compRate: number, optRate: number) => {
    const offer = Math.min(optRate, parseFloat((compRate - 0.1).toFixed(2)));
    return offer;
  };

  const handleCompetitorChange = (index: number, field: keyof Competitor, value: string) => {
    const updated = [...competitors];
    if (field === "name") updated[index].name = value;
    else updated[index].rate = Number(value);
    setCompetitors(updated);
  };

  const addCompetitor = () => {
    setCompetitors((prev) => [...prev, { name: "", rate: 0 }]);
  };

  const generateOffers = () => {
    const optRate = calculateModelRate();
    const newOffers = competitors
      .filter((c) => c.name.trim() && c.rate > 0)
      .map((c) => {
        const ourOffer = optimizeAgainst(c.rate, optRate);
        const saving = parseFloat((c.rate - ourOffer).toFixed(2));
        return { name: c.name, competitorRate: c.rate, ourOffer, saving };
      });
    setOffers(newOffers);
  };

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-white shadow-md rounded-xl">
      <h1 className="text-2xl font-semibold mb-4">Personalized Rate Comparison</h1>
      <p className="mb-6 text-gray-600">Enter your details and competitor rates to see our best offer.</p>

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

      <div className="mt-6">
        <h2 className="text-lg font-medium mb-2">Competitor Rates</h2>
        {competitors.map((comp, idx) => (
          <div key={idx} className="flex items-center gap-2 mb-2">
            <input
              type="text"
              placeholder="Bank name"
              value={comp.name}
              onChange={(e) => handleCompetitorChange(idx, "name", e.target.value)}
              className="flex-1 border rounded px-3 py-2"
            />
            <input
              type="number"
              placeholder="Rate %"
              value={comp.rate}
              onChange={(e) => handleCompetitorChange(idx, "rate", e.target.value)}
              className="w-24 border rounded px-3 py-2"
            />
          </div>
        ))}
        <button
          onClick={addCompetitor}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          + Add another bank
        </button>
      </div>

      <button
        onClick={generateOffers}
        className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        Compare & Get Offer
      </button>

      {offers.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Comparison Results</h2>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-2 border">Bank</th>
                <th className="p-2 border">Competitor Rate</th>
                <th className="p-2 border">Our Offer</th>
                <th className="p-2 border">You Save</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="p-2 border">{o.name}</td>
                  <td className="p-2 border">{o.competitorRate}%</td>
                  <td className="p-2 border text-green-600 font-medium">{o.ourOffer}%</td>
                  <td className="p-2 border">{o.saving}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RateComparison;
