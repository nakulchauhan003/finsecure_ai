import React, { useState, useCallback, FC } from 'react';
import { format, addDays, differenceInDays, isValid, subMonths } from 'date-fns';
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Download,
  Info,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Activity,
  Target,
  FileText,
  CreditCard,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Types
interface Customer {
  id: string;
  name: string;
  code: string;
  email: string;
}

interface LoanDetails {
  id: string;
  principalAmount: number;
  startDate: string;
  endDate: string;
  term: number;
  interestRate: number;
  frequency: 'monthly' | 'quarterly' | 'weekly';
  status: 'active' | 'closed' | 'defaulted';
}

interface PaymentRecord {
  id: string;
  dueDate: string;
  paidDate: string | null;
  amount: number;
  principalPaid: number;
  interestPaid: number;
  status: 'on-time' | 'late' | 'waived' | 'pending';
  penaltyAmount: number;
  penaltyPaid: number;
}

interface PrepaymentRecord {
  id: string;
  date: string;
  amount: number;
  type: 'partial' | 'full';
}

interface RefundRecord {
  id: string;
  date: string;
  amount: number;
  reason: string;
  status: 'pending' | 'processed';
}

interface LoanLedger {
  loanDetails: LoanDetails;
  payments: PaymentRecord[];
  prepayments: PrepaymentRecord[];
  refunds: RefundRecord[];
}

interface CustomerDues {
  customer: Customer;
  loans: LoanLedger[];
}

interface PrepaymentSimulation {
  amount: number;
  date: string;
}

interface AuditEntry {
  action: string;
  timestamp: string;
}

// Mock Data
const today = new Date();
const mockCustomer: Customer = {
  id: 'cust_123',
  name: 'Rohan Sharma',
  code: 'CUST-RS-001',
  email: 'rohan.sharma@example.com',
};

const mockLoan1Payments: PaymentRecord[] = [
  {
    id: 'p1',
    dueDate: format(subMonths(today, 3), 'yyyy-MM-dd'),
    paidDate: format(subMonths(today, 3), 'yyyy-MM-dd'),
    amount: 5000,
    principalPaid: 4500,
    interestPaid: 500,
    status: 'on-time',
    penaltyAmount: 0,
    penaltyPaid: 0,
  },
  {
    id: 'p2',
    dueDate: format(subMonths(today, 2), 'yyyy-MM-dd'),
    paidDate: format(addDays(subMonths(today, 2), 5), 'yyyy-MM-dd'),
    amount: 5000,
    principalPaid: 4550,
    interestPaid: 450,
    status: 'late',
    penaltyAmount: 200,
    penaltyPaid: 200,
  },
  {
    id: 'p3',
    dueDate: format(subMonths(today, 1), 'yyyy-MM-dd'),
    paidDate: format(subMonths(today, 1), 'yyyy-MM-dd'),
    amount: 5000,
    principalPaid: 4600,
    interestPaid: 400,
    status: 'on-time',
    penaltyAmount: 0,
    penaltyPaid: 0,
  },
  {
    id: 'p4',
    dueDate: format(today, 'yyyy-MM-dd'),
    paidDate: null,
    amount: 5000,
    principalPaid: 0,
    interestPaid: 0,
    status: 'pending',
    penaltyAmount: 0,
    penaltyPaid: 0,
  },
];

const mockLoan1: LoanLedger = {
  loanDetails: {
    id: 'loan_abc',
    principalAmount: 50000,
    startDate: format(subMonths(today, 3), 'yyyy-MM-dd'),
    endDate: format(addDays(subMonths(today, 3), 365), 'yyyy-MM-dd'),
    term: 12,
    interestRate: 12,
    frequency: 'monthly',
    status: 'active',
  },
  payments: mockLoan1Payments,
  prepayments: [],
  refunds: [
    {
      id: 'ref1',
      date: format(subMonths(today, 2), 'yyyy-MM-dd'),
      amount: 100,
      reason: 'Overcharge correction',
      status: 'processed',
    },
  ],
};

const mockLoan2Payments: PaymentRecord[] = [
  {
    id: 'p5',
    dueDate: format(subMonths(today, 6), 'yyyy-MM-dd'),
    paidDate: format(subMonths(today, 6), 'yyyy-MM-dd'),
    amount: 10000,
    principalPaid: 9000,
    interestPaid: 1000,
    status: 'on-time',
    penaltyAmount: 0,
    penaltyPaid: 0,
  },
  {
    id: 'p6',
    dueDate: format(subMonths(today, 3), 'yyyy-MM-dd'),
    paidDate: format(subMonths(today, 3), 'yyyy-MM-dd'),
    amount: 10000,
    principalPaid: 9100,
    interestPaid: 900,
    status: 'on-time',
    penaltyAmount: 0,
    penaltyPaid: 0,
  },
];

const mockLoan2: LoanLedger = {
  loanDetails: {
    id: 'loan_xyz',
    principalAmount: 20000,
    startDate: format(subMonths(today, 6), 'yyyy-MM-dd'),
    endDate: format(subMonths(today, 3), 'yyyy-MM-dd'),
    term: 2,
    interestRate: 10,
    frequency: 'quarterly',
    status: 'closed',
  },
  payments: mockLoan2Payments,
  prepayments: [
    {
      id: 'pp1',
      date: format(subMonths(today, 4), 'yyyy-MM-dd'),
      amount: 1900,
      type: 'partial',
    },
  ],
  refunds: [],
};

const mockData: CustomerDues = {
  customer: mockCustomer,
  loans: [mockLoan1, mockLoan2],
};

// Helper functions
const calculateDaysRemaining = (installmentsLeft: number, frequency: 'monthly' | 'quarterly' | 'weekly'): number => {
  const daysPerFrequency = {
    weekly: 7,
    monthly: 30,
    quarterly: 90,
  };

  return installmentsLeft * daysPerFrequency[frequency];
};

const calculateInstallmentsLeft = (loan: LoanLedger): number => {
  const successfulPayments = loan.payments.filter(
    payment => payment.status === 'on-time' || payment.status === 'late'
  ).length;

  return Math.max(0, loan.loanDetails.term - successfulPayments);
};

const calculateAccruedInterest = (loan: LoanLedger): number => {
  if (loan.loanDetails.status !== 'active') return 0;

  const { principalAmount, interestRate } = loan.loanDetails;
  const paidPrincipal = loan.payments.reduce((sum, payment) => sum + payment.principalPaid, 0);
  const outstandingPrincipal = Math.max(0, principalAmount - paidPrincipal);

  let lastPaymentDate = new Date(loan.loanDetails.startDate);

  if (loan.payments.length > 0) {
    const validPayments = loan.payments
      .filter(payment => payment.paidDate !== null)
      .sort((a, b) => {
        const dateA = a.paidDate ? new Date(a.paidDate).getTime() : 0;
        const dateB = b.paidDate ? new Date(b.paidDate).getTime() : 0;
        return dateB - dateA;
      });

    if (validPayments.length > 0 && validPayments[0].paidDate) {
      lastPaymentDate = new Date(validPayments[0].paidDate);
    }
  }

  const today = new Date();
  const daysSinceLastPayment = Math.max(0, differenceInDays(today, lastPaymentDate));

  const dailyInterestRate = interestRate / 100 / 365;

  return outstandingPrincipal * dailyInterestRate * daysSinceLastPayment;
};

const calculateTotalPenalties = (loan: LoanLedger): number => {
  return loan.payments.reduce((sum, payment) => {
    return sum + Math.max(0, (payment.penaltyAmount - payment.penaltyPaid));
  }, 0);
};

const calculatePrepaymentPenalty = (loan: LoanLedger): number => {
  const { principalAmount } = loan.loanDetails;
  const paidPrincipal = loan.payments.reduce((sum, payment) => sum + payment.principalPaid, 0);
  const outstandingPrincipal = Math.max(0, principalAmount - paidPrincipal);

  return outstandingPrincipal * 0.02;
};

const calculateNetDues = (loan: LoanLedger): number => {
  if (loan.loanDetails.status !== 'active') return 0;

  const { principalAmount } = loan.loanDetails;
  const paidPrincipal = loan.payments.reduce((sum, payment) => sum + payment.principalPaid, 0);
  const outstandingPrincipal = Math.max(0, principalAmount - paidPrincipal);

  const accruedInterest = calculateAccruedInterest(loan);
  const totalPenalties = calculateTotalPenalties(loan);

  const pendingPayment = loan.payments.find(p => p.status === 'pending');
  const pendingAmount = pendingPayment ? pendingPayment.amount : 0;

  const totalRefunds = loan.refunds.reduce((sum, refund) => {
    if (refund.status === 'processed') {
      return sum + refund.amount;
    }
    return sum;
  }, 0);

  return outstandingPrincipal + accruedInterest + totalPenalties + pendingAmount - totalRefunds;
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

const safeParseDate = (dateStr: string): Date => {
  try {
    const parsedDate = new Date(dateStr);
    return isValid(parsedDate) ? parsedDate : new Date();
  } catch (error) {
    return new Date();
  }
};

const generateFutureEMIs = (loan: LoanLedger): { dueDate: string; amount: number }[] => {
  const installmentsLeft = calculateInstallmentsLeft(loan);
  if (installmentsLeft <= 0) return [];

  const { principalAmount, interestRate, frequency, term } = loan.loanDetails;

  const r = (interestRate / 100) / (frequency === 'monthly' ? 12 : frequency === 'quarterly' ? 4 : 52);
  const n = term;  

  const emi = r > 0 && n > 0
    ? principalAmount * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)
    : principalAmount / n;

  let latestDueDate = new Date();
  if (loan.payments.length > 0) {
    const sortedPayments = [...loan.payments].sort((a, b) => 
      new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
    );
    latestDueDate = safeParseDate(sortedPayments[0].dueDate);
  } else {
    latestDueDate = safeParseDate(loan.loanDetails.startDate);
  }

  const interval = frequency === 'monthly' ? 30 : frequency === 'quarterly' ? 90 : 7;

  return Array.from({ length: installmentsLeft }, (_, i) => {
    const dueDate = addDays(latestDueDate, (i + 1) * interval);
    return {
      dueDate: format(dueDate, 'yyyy-MM-dd'),
      amount: emi,
    };
  });
};

// Main component
const App: FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [customerDues, setCustomerDues] = useState<CustomerDues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<Record<string, boolean>>({});
  const [prepaymentSimulation, setPrepaymentSimulation] = useState<PrepaymentSimulation | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [prepaymentAmount, setPrepaymentAmount] = useState<number | string>('');

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a customer name or ID');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCustomerDues(null);

    setAuditTrail(prev => [
      ...prev,
      { action: `Searched for customer: ${searchQuery}`, timestamp: new Date().toISOString() }
    ]);

    setTimeout(() => {
      if (searchQuery.toLowerCase().includes('error')) {
        setError('Failed to fetch customer data (mock error).');
        setAuditTrail(prev => [
          ...prev,
          { action: `Error searching: Mock error`, timestamp: new Date().toISOString() }
        ]);
      } else {
        setCustomerDues(mockData);
        setAuditTrail(prev => [
          ...prev,
          { action: `Successfully fetched dues for: ${mockData.customer.name}`, timestamp: new Date().toISOString() }
        ]);
      }
      setIsLoading(false);
    }, 1000);

  }, [searchQuery]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const toggleLoanDetails = useCallback((loanId: string) => {
    setExpandedLoanId(prevId => (prevId === loanId ? null : loanId));
    setPrepaymentSimulation(null);
    setPrepaymentAmount('');
  }, []);

  const toggleSection = useCallback((section: string) => {
    setExpandedSection(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  const handlePrepaymentSimulation = useCallback((loanId: string) => {
    const loan = customerDues?.loans.find(loan => loan.loanDetails.id === loanId);
    if (!loan || !prepaymentAmount || +prepaymentAmount <= 0) {
      setPrepaymentSimulation(null);
      return;
    };

    const amount = +prepaymentAmount;

    setPrepaymentSimulation({
      amount,
      date: new Date().toISOString().split('T')[0]
    });

    setAuditTrail(prev => [
      ...prev,
      { action: `Simulated prepayment of ${formatCurrency(amount)} on loan ${loanId}`, timestamp: new Date().toISOString() }
    ]);
  }, [customerDues, prepaymentAmount]);

  const downloadRepaymentHistory = useCallback((loanId: string) => {
    const loan = customerDues?.loans.find(loan => loan.loanDetails.id === loanId);
    if (!loan) return;

    console.log("Downloading repayment history for loan: ", loanId, loan.payments);
    alert("Downloading repayment history... (Check console for data)");

    setAuditTrail(prev => [
      ...prev,
      { action: `Downloaded repayment history for loan ${loanId}`, timestamp: new Date().toISOString() }
    ]);
  }, [customerDues]);

  const handleReset = useCallback(() => {
    setSearchQuery('');
    setCustomerDues(null);
    setError(null);
    setExpandedLoanId(null);
    setExpandedSection({});
    setPrepaymentSimulation(null);
    setPrepaymentAmount('');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Dues Management</h1>
              <p className="text-blue-300">Track and manage customer loan payments</p>
            </div>
          </div>
        </div>

        {/* Customer Lookup Section */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
            <Search className="w-6 h-6 text-blue-400" />
            Customer Lookup
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter customer name or ID (e.g., 'Rohan' or 'error')"
              className="flex-1 p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-3 rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </>
              ) : (
                <>Search <Search className="ml-2 h-5 w-5" /></>
              )}
            </button>
            <button
              onClick={handleReset}
              className="bg-white/10 text-white px-8 py-3 rounded-xl hover:bg-white/20 transition-all font-semibold"
            >
              Reset
            </button>
          </div>

          {error && (
            <div className="bg-red-500/20 text-red-300 p-4 rounded-xl flex items-center mt-4 border border-red-500/50">
              <AlertTriangle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}
        </div>

        {/* Customer Dues Display */}
        {customerDues && (
          <div className="space-y-6">
            {/* Customer Info Card */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{customerDues.customer.name}</h2>
                  <div className="space-y-1">
                    <p className="text-blue-300 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Customer ID: {customerDues.customer.code}
                    </p>
                    <p className="text-blue-300 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Email: {customerDues.customer.email}
                    </p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-lg rounded-xl p-4 border border-blue-500/30">
                  <p className="text-blue-300 text-sm mb-1">Total Active Loans</p>
                  <p className="text-4xl font-bold text-white">
                    {customerDues.loans.filter(loan => loan.loanDetails.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>

            {/* Loans List */}
            {customerDues.loans.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-12 border border-white/10 text-center">
                <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No loan records found for this customer.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {customerDues.loans.map((loan) => {
                  const isExpanded = expandedLoanId === loan.loanDetails.id;
                  const installmentsLeft = calculateInstallmentsLeft(loan);
                  const daysRemaining = calculateDaysRemaining(installmentsLeft, loan.loanDetails.frequency);
                  const maturityDate = addDays(new Date(), daysRemaining);
                  const netDues = calculateNetDues(loan);
                  const totalPenalties = calculateTotalPenalties(loan);
                  const accruedInterest = calculateAccruedInterest(loan);
                  const { principalAmount } = loan.loanDetails;
                  const paidPrincipal = loan.payments.reduce((sum, payment) => sum + payment.principalPaid, 0);
                  const outstandingPrincipal = Math.max(0, principalAmount - paidPrincipal);

                  return (
                    <div key={loan.loanDetails.id} className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden transition-all duration-300">
                      {/* Loan Summary Header */}
                      <div 
                        className={`p-6 flex justify-between items-center cursor-pointer transition-all ${isExpanded ? 'bg-blue-500/10 border-b border-blue-500/30' : 'hover:bg-white/5'}`}
                        onClick={() => toggleLoanDetails(loan.loanDetails.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CreditCard className="w-6 h-6 text-blue-400" />
                            <h3 className="text-xl font-bold text-white">
                              Loan #{loan.loanDetails.id.substring(0, 8).toUpperCase()}
                            </h3>
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              loan.loanDetails.status === 'active' 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                                : loan.loanDetails.status === 'closed'
                                ? 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                                : 'bg-red-500/20 text-red-400 border border-red-500/50'
                            }`}>
                              {loan.loanDetails.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-blue-300">
                            {formatCurrency(loan.loanDetails.principalAmount)} at {loan.loanDetails.interestRate}% • {loan.loanDetails.frequency.charAt(0).toUpperCase() + loan.loanDetails.frequency.slice(1)} payments
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-gray-400 text-sm mb-1">Net Dues</p>
                            <p className={`text-2xl font-bold ${loan.loanDetails.status === 'active' ? 'text-cyan-400' : 'text-gray-500'}`}>
                              {loan.loanDetails.status === 'active' ? formatCurrency(netDues) : 'N/A'}
                            </p>
                          </div>
                          <div className="bg-white/10 rounded-full p-2">
                            {isExpanded ? <ChevronUp size={24} className="text-white" /> : <ChevronDown size={24} className="text-white" />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Loan Details */}
                      {isExpanded && (
                        <div className="p-6">
                          {/* Stats Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-xl p-5 border border-purple-500/30">
                              <div className="flex items-center gap-3 mb-3">
                                <DollarSign className="w-6 h-6 text-purple-400" />
                                <h4 className="text-white font-semibold">Principal & Interest</h4>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-300">Original Principal:</span>
                                  <span className="text-white font-semibold">{formatCurrency(loan.loanDetails.principalAmount)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-300">Outstanding:</span>
                                  <span className="text-white font-semibold">{formatCurrency(outstandingPrincipal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-300">Accrued Interest:</span>
                                  <span className="text-white font-semibold">{formatCurrency(accruedInterest)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-300">Interest Rate:</span>
                                  <span className="text-white font-semibold">{loan.loanDetails.interestRate}%</span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-lg rounded-xl p-5 border border-blue-500/30">
                              <div className="flex items-center gap-3 mb-3">
                                <Clock className="w-6 h-6 text-blue-400" />
                                <h4 className="text-white font-semibold">Time Remaining</h4>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <Activity className="w-4 h-4 text-blue-300" />
                                  <span className="text-white font-semibold">{installmentsLeft} installments left</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="w-4 h-4 text-blue-300" />
                                  <span className="text-white font-semibold">~{Math.round(daysRemaining / 30)} months</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Target className="w-4 h-4 text-blue-300" />
                                  <span className="text-gray-300">Maturity: {format(maturityDate, 'MMM dd, yyyy')}</span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-lg rounded-xl p-5 border border-orange-500/30">
                              <div className="flex items-center gap-3 mb-3">
                                <AlertTriangle className="w-6 h-6 text-orange-400" />
                                <h4 className="text-white font-semibold">Penalties & Charges</h4>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-300">Outstanding Penalties:</span>
                                  <span className="text-white font-semibold">{formatCurrency(totalPenalties)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-300">Prepayment Penalty:</span>
                                  <span className="text-white font-semibold">{formatCurrency(calculatePrepaymentPenalty(loan))}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Net Dues Breakdown */}
                          {loan.loanDetails.status === 'active' && (
                            <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-lg rounded-xl p-5 border border-cyan-500/30 mb-6">
                              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-cyan-400" />
                                Net Dues Breakdown
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-gray-300 text-sm">Outstanding Principal</p>
                                  <p className="text-white font-bold text-lg">{formatCurrency(outstandingPrincipal)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-300 text-sm">Accrued Interest</p>
                                  <p className="text-white font-bold text-lg">{formatCurrency(accruedInterest)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-300 text-sm">Penalties</p>
                                  <p className="text-white font-bold text-lg">{formatCurrency(totalPenalties)}</p>
                                </div>
                                <div className="bg-cyan-500/30 rounded-lg p-3">
                                  <p className="text-cyan-200 text-sm font-semibold">Total Net Dues</p>
                                  <p className="text-white font-bold text-xl">{formatCurrency(netDues)}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Payment History Section */}
                          <div className="mb-6">
                            <button
                              onClick={() => toggleSection(`payments-${loan.loanDetails.id}`)}
                              className="w-full bg-white/5 hover:bg-white/10 transition-all rounded-xl p-4 flex justify-between items-center border border-white/10"
                            >
                              <h4 className="text-white font-semibold flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-400" />
                                Payment History ({loan.payments.length})
                              </h4>
                              {expandedSection[`payments-${loan.loanDetails.id}`] ? 
                                <ChevronUp className="text-white" /> : 
                                <ChevronDown className="text-white" />
                              }
                            </button>
                            
                            {expandedSection[`payments-${loan.loanDetails.id}`] && (
                              <div className="mt-4 bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="flex justify-end mb-3">
                                  <button
                                    onClick={() => downloadRepaymentHistory(loan.loanDetails.id)}
                                    className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-4 py-2 rounded-lg flex items-center gap-2 transition-all border border-blue-500/30"
                                  >
                                    <Download className="w-4 h-4" />
                                    Download History
                                  </button>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-white/10">
                                        <th className="text-left p-3 text-gray-300 font-semibold">Due Date</th>
                                        <th className="text-left p-3 text-gray-300 font-semibold">Paid Date</th>
                                        <th className="text-right p-3 text-gray-300 font-semibold">Amount</th>
                                        <th className="text-right p-3 text-gray-300 font-semibold">Principal</th>
                                        <th className="text-right p-3 text-gray-300 font-semibold">Interest</th>
                                        <th className="text-right p-3 text-gray-300 font-semibold">Penalty</th>
                                        <th className="text-center p-3 text-gray-300 font-semibold">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {loan.payments.map((payment) => (
                                        <tr key={payment.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                                          <td className="p-3 text-white">{format(safeParseDate(payment.dueDate), 'MMM dd, yyyy')}</td>
                                          <td className="p-3 text-white">
                                            {payment.paidDate ? format(safeParseDate(payment.paidDate), 'MMM dd, yyyy') : '-'}
                                          </td>
                                          <td className="p-3 text-right text-white font-semibold">{formatCurrency(payment.amount)}</td>
                                          <td className="p-3 text-right text-gray-300">{formatCurrency(payment.principalPaid)}</td>
                                          <td className="p-3 text-right text-gray-300">{formatCurrency(payment.interestPaid)}</td>
                                          <td className="p-3 text-right text-orange-300">{formatCurrency(payment.penaltyAmount)}</td>
                                          <td className="p-3 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                              payment.status === 'on-time' 
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                                                : payment.status === 'late'
                                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                                                : payment.status === 'pending'
                                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                                            }`}>
                                              {payment.status}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Future EMIs Section */}
                          {loan.loanDetails.status === 'active' && (
                            <div className="mb-6">
                              <button
                                onClick={() => toggleSection(`future-${loan.loanDetails.id}`)}
                                className="w-full bg-white/5 hover:bg-white/10 transition-all rounded-xl p-4 flex justify-between items-center border border-white/10"
                              >
                                <h4 className="text-white font-semibold flex items-center gap-2">
                                  <Calendar className="w-5 h-5 text-blue-400" />
                                  Future EMI Schedule ({installmentsLeft} remaining)
                                </h4>
                                {expandedSection[`future-${loan.loanDetails.id}`] ? 
                                  <ChevronUp className="text-white" /> : 
                                  <ChevronDown className="text-white" />
                                }
                              </button>
                              
                              {expandedSection[`future-${loan.loanDetails.id}`] && (
                                <div className="mt-4 bg-white/5 rounded-xl p-4 border border-white/10">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b border-white/10">
                                          <th className="text-left p-3 text-gray-300 font-semibold">Due Date</th>
                                          <th className="text-right p-3 text-gray-300 font-semibold">EMI Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {generateFutureEMIs(loan).map((emi, idx) => (
                                          <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-all">
                                            <td className="p-3 text-white">{format(safeParseDate(emi.dueDate), 'MMM dd, yyyy')}</td>
                                            <td className="p-3 text-right text-white font-semibold">{formatCurrency(emi.amount)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Prepayments Section */}
                          {loan.prepayments.length > 0 && (
                            <div className="mb-6">
                              <button
                                onClick={() => toggleSection(`prepayments-${loan.loanDetails.id}`)}
                                className="w-full bg-white/5 hover:bg-white/10 transition-all rounded-xl p-4 flex justify-between items-center border border-white/10"
                              >
                                <h4 className="text-white font-semibold flex items-center gap-2">
                                  <CheckCircle className="w-5 h-5 text-green-400" />
                                  Prepayments ({loan.prepayments.length})
                                </h4>
                                {expandedSection[`prepayments-${loan.loanDetails.id}`] ? 
                                  <ChevronUp className="text-white" /> : 
                                  <ChevronDown className="text-white" />
                                }
                              </button>
                              
                              {expandedSection[`prepayments-${loan.loanDetails.id}`] && (
                                <div className="mt-4 bg-white/5 rounded-xl p-4 border border-white/10">
                                  <div className="space-y-3">
                                    {loan.prepayments.map((prepayment) => (
                                      <div key={prepayment.id} className="flex justify-between items-center bg-green-500/10 p-3 rounded-lg border border-green-500/30">
                                        <div>
                                          <p className="text-white font-semibold">{formatCurrency(prepayment.amount)}</p>
                                          <p className="text-gray-300 text-sm">{format(safeParseDate(prepayment.date), 'MMM dd, yyyy')}</p>
                                        </div>
                                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold border border-green-500/50">
                                          {prepayment.type}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Refunds Section */}
                          {loan.refunds.length > 0 && (
                            <div className="mb-6">
                              <button
                                onClick={() => toggleSection(`refunds-${loan.loanDetails.id}`)}
                                className="w-full bg-white/5 hover:bg-white/10 transition-all rounded-xl p-4 flex justify-between items-center border border-white/10"
                              >
                                <h4 className="text-white font-semibold flex items-center gap-2">
                                  <Info className="w-5 h-5 text-blue-400" />
                                  Refunds ({loan.refunds.length})
                                </h4>
                                {expandedSection[`refunds-${loan.loanDetails.id}`] ? 
                                  <ChevronUp className="text-white" /> : 
                                  <ChevronDown className="text-white" />
                                }
                              </button>
                              
                              {expandedSection[`refunds-${loan.loanDetails.id}`] && (
                                <div className="mt-4 bg-white/5 rounded-xl p-4 border border-white/10">
                                  <div className="space-y-3">
                                    {loan.refunds.map((refund) => (
                                      <div key={refund.id} className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/30">
                                        <div className="flex justify-between items-start mb-2">
                                          <div>
                                            <p className="text-white font-semibold">{formatCurrency(refund.amount)}</p>
                                            <p className="text-gray-300 text-sm">{format(safeParseDate(refund.date), 'MMM dd, yyyy')}</p>
                                          </div>
                                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                            refund.status === 'processed' 
                                              ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                                              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                                          }`}>
                                            {refund.status}
                                          </span>
                                        </div>
                                        <p className="text-gray-300 text-sm">{refund.reason}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Prepayment Simulation */}
                          {loan.loanDetails.status === 'active' && (
                            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-xl p-5 border border-purple-500/30">
                              <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-purple-400" />
                                Prepayment Simulation
                              </h4>
                              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                                <input
                                  type="number"
                                  value={prepaymentAmount}
                                  onChange={(e) => setPrepaymentAmount(e.target.value)}
                                  placeholder="Enter prepayment amount"
                                  className="flex-1 p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                                <button
                                  onClick={() => handlePrepaymentSimulation(loan.loanDetails.id)}
                                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all font-semibold"
                                >
                                  Simulate
                                </button>
                              </div>
                              
                              {prepaymentSimulation && (
                                <div className="bg-white/10 rounded-lg p-4 space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-gray-300">Prepayment Amount:</span>
                                    <span className="text-white font-semibold">{formatCurrency(prepaymentSimulation.amount)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-300">Prepayment Penalty (2%):</span>
                                    <span className="text-orange-300 font-semibold">{formatCurrency(calculatePrepaymentPenalty(loan))}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-300">New Outstanding Principal:</span>
                                    <span className="text-white font-semibold">
                                      {formatCurrency(Math.max(0, outstandingPrincipal - prepaymentSimulation.amount))}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-green-300 mt-3">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>This would reduce your principal by {formatCurrency(Math.min(prepaymentSimulation.amount, outstandingPrincipal))}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Audit Trail */}
            {auditTrail.length > 0 && (
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                <button
                  onClick={() => toggleSection('audit')}
                  className="w-full flex justify-between items-center"
                >
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <FileText className="w-6 h-6 text-blue-400" />
                    Audit Trail ({auditTrail.length})
                  </h3>
                  {expandedSection['audit'] ? 
                    <ChevronUp className="text-white" /> : 
                    <ChevronDown className="text-white" />
                  }
                </button>
                
                {expandedSection['audit'] && (
                  <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                    {auditTrail.slice().reverse().map((entry, idx) => (
                      <div key={idx} className="bg-white/5 p-3 rounded-lg border border-white/10">
                        <p className="text-white text-sm">{entry.action}</p>
                        <p className="text-gray-400 text-xs mt-1">
                          {format(safeParseDate(entry.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;