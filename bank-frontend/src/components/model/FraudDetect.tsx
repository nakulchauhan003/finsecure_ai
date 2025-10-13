import React, { useState, useEffect } from "react";

interface LoanForm {
  name: string;
  age: number;
  email: string;
  income: number;
  loanAmount: number;
  creditScore: number;
  ipAddress: string;
  retries: number;
}

const FraudDetectionModule: React.FC = () => {
  const [formData, setFormData] = useState<LoanForm>({
    name: "",
    age: 30,
    email: "",
    income: 50000,
    loanAmount: 100000,
    creditScore: 700,
    ipAddress: "192.168.0.1",
    retries: 1
  });

  const [fraudRisk, setFraudRisk] = useState<number | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    detectFraud();
  }, [formData]);

  const detectFraud = () => {
    let riskScore = 0;
    let messages: string[] = [];

    if (formData.income < 10000 && formData.loanAmount > 1000000) {
      riskScore += 0.4;
      messages.push("Income too low for high loan amount");
    }

    if (formData.age < 18 || formData.age > 80) {
      riskScore += 0.2;
      messages.push("Suspicious age range");
    }

    if (formData.creditScore < 300 || formData.creditScore > 850) {
      riskScore += 0.2;
      messages.push("Invalid credit score range");
    }

    if (formData.retries > 5) {
      riskScore += 0.2;
      messages.push("Too many attempts from same user/IP");
    }

    if (formData.email.includes("test") || formData.email.includes("fake")) {
      riskScore += 0.3;
      messages.push("Suspicious email pattern");
    }

    if (riskScore >= 0.5) {
      setWarning(`⚠️ Potential fraud detected. ${messages.join(". ")}`);
    } else {
      setWarning(null);
    }
    setFraudRisk(riskScore);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === "email" || name === "name" ? value : Number(value) }));
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white shadow-lg rounded-xl">
      <h2 className="text-2xl font-bold mb-4">Fraud Detection System</h2>
      <p className="mb-4 text-sm text-gray-500 italic">
        “Our system uses intelligent fraud detection to keep your data safe and loan advice accurate.”
      </p>

      <div className="grid grid-cols-1 gap-4">
        {Object.entries(formData).map(([key, val]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700">
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
            <input
              type={typeof val === "number" ? "number" : "text"}
              name={key}
              value={val}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2"
            />
          </div>
        ))}
      </div>

      {fraudRisk !== null && (
        <div className={`mt-6 p-4 rounded-md ${fraudRisk >= 0.5 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
          <h3 className="font-semibold">Fraud Risk Score: {(fraudRisk * 100).toFixed(0)}%</h3>
          {warning && <p>{warning}</p>}
        </div>
      )}
    </div>
  );
};

export default FraudDetectionModule;
