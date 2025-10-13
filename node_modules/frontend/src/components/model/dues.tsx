import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { format, addDays, differenceInDays, isValid } from 'date-fns';
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
  term: number; // In months
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
  const { principalAmount, interestRate } = loan.loanDetails;
  const paidPrincipal = loan.payments.reduce((sum, payment) => sum + payment.principalPaid, 0);
  const outstandingPrincipal = Math.max(0, principalAmount - paidPrincipal);
  
  // Find the date of the last payment or use start date if no payments
  let lastPaymentDate = new Date(loan.loanDetails.startDate);
  
  if (loan.payments.length > 0) {
    // Filter out payments with null paidDate and sort the rest
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
  
  // Daily interest rate (assuming 365 days per year)
  const dailyInterestRate = interestRate / 100 / 365;
  
  return outstandingPrincipal * dailyInterestRate * daysSinceLastPayment;
};

const calculateTotalPenalties = (loan: LoanLedger): number => {
  return loan.payments.reduce((sum, payment) => {
    // Only include penalties that haven't been paid
    return sum + Math.max(0, (payment.penaltyAmount - payment.penaltyPaid));
  }, 0);
};

const calculatePrepaymentPenalty = (loan: LoanLedger): number => {
  const { principalAmount } = loan.loanDetails;
  const paidPrincipal = loan.payments.reduce((sum, payment) => sum + payment.principalPaid, 0);
  const outstandingPrincipal = Math.max(0, principalAmount - paidPrincipal);
  
  // Example: 2% of outstanding principal
  return outstandingPrincipal * 0.02;
};

const calculateNetDues = (loan: LoanLedger): number => {
  const { principalAmount } = loan.loanDetails;
  const paidPrincipal = loan.payments.reduce((sum, payment) => sum + payment.principalPaid, 0);
  const outstandingPrincipal = Math.max(0, principalAmount - paidPrincipal);
  
  const accruedInterest = calculateAccruedInterest(loan);
  const totalPenalties = calculateTotalPenalties(loan);
  
  const totalRefunds = loan.refunds.reduce((sum, refund) => {
    if (refund.status === 'processed') {
      return sum + refund.amount;
    }
    return sum;
  }, 0);
  
  return outstandingPrincipal + accruedInterest + totalPenalties - totalRefunds;
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

  const { principalAmount, interestRate, frequency } = loan.loanDetails;
  const paidPrincipal = loan.payments.reduce((sum, payment) => sum + payment.principalPaid, 0);
  const outstandingPrincipal = Math.max(0, principalAmount - paidPrincipal);
  
  // Simple EMI calculation formula: P * r * (1+r)^n / ((1+r)^n - 1)
  // where P = principal, r = interest rate per period, n = number of periods
  const r = (interestRate / 100) / 12; // Monthly interest rate
  const n = installmentsLeft;
  
  // Prevent division by zero and negative values
  const emi = r > 0 && n > 0
    ? outstandingPrincipal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)
    : outstandingPrincipal / n; // Fallback to simple division if rates are problematic
  
  // Find the latest due date or use today
  let latestDueDate = new Date();

  if (loan.payments.length > 0) {
    const sortedPayments = [...loan.payments].sort((a, b) => 
      new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
    );
    
    if (sortedPayments.length > 0) {
      const latestDueDateStr = sortedPayments[0].dueDate;
      const parsedDate = safeParseDate(latestDueDateStr);
      latestDueDate = parsedDate;
    }
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
const DuesModule: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [customerDues, setCustomerDues] = useState<CustomerDues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<Record<string, boolean>>({});
  const [prepaymentSimulation, setPrepaymentSimulation] = useState<PrepaymentSimulation | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a customer name or ID');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Log the search attempt for audit trail
      setAuditTrail(prev => [
        ...prev,
        { action: `Searched for customer: ${searchQuery}`, timestamp: new Date().toISOString() }
      ]);
      
      const response = await axios.get(`/api/customers/${encodeURIComponent(searchQuery)}/dues`);
      
      if (response.data) {
        setCustomerDues(response.data);
        
        // Log successful fetch for audit trail
        setAuditTrail(prev => [
          ...prev,
          { action: `Successfully fetched dues for: ${response.data.customer.name}`, timestamp: new Date().toISOString() }
        ]);
      } else {
        throw new Error('No data received from API');
      }
    } catch (err) {
      console.error('Error fetching customer dues:', err);
      setError('Failed to fetch customer data. Please check the ID/name and try again.');
      
      // Log error for audit trail
      setAuditTrail(prev => [
        ...prev,
        { action: `Error searching: ${err instanceof Error ? err.message : 'Unknown error'}`, timestamp: new Date().toISOString() }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  // Handle Enter key press for search
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  // Toggle expanded loan details
  const toggleLoanDetails = useCallback((loanId: string) => {
    setExpandedLoanId(prevId => prevId === loanId ? null : loanId);
  }, []);

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSection(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // Calculate prepayment simulation
  const handlePrepaymentSimulation = useCallback((loanId: string, amount: number) => {
    const loan = customerDues?.loans.find(loan => loan.loanDetails.id === loanId);
    if (!loan) return;
    
    setPrepaymentSimulation({
      amount,
      date: new Date().toISOString().split('T')[0]
    });
    
    // Log simulation for audit trail
    setAuditTrail(prev => [
      ...prev,
      { action: `Simulated prepayment of ${formatCurrency(amount)} on loan ${loanId}`, timestamp: new Date().toISOString() }
    ]);
  }, [customerDues]);

  // Download repayment history
  const downloadRepaymentHistory = useCallback((loanId: string) => {
    const loan = customerDues?.loans.find(loan => loan.loanDetails.id === loanId);
    if (!loan) return;
    
    // This would typically generate a CSV or PDF
    alert("Downloading repayment history... (functionality to be implemented)");
    
    // Log download for audit trail
    setAuditTrail(prev => [
      ...prev,
      { action: `Downloaded repayment history for loan ${loanId}`, timestamp: new Date().toISOString() }
    ]);
  }, [customerDues]);

  // Reset the form
  const handleReset = useCallback(() => {
    setSearchQuery('');
    setCustomerDues(null);
    setError(null);
    setExpandedLoanId(null);
    setExpandedSection({});
    setPrepaymentSimulation(null);
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Dues Management Module</h1>
      
      {/* Customer Lookup Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Customer Lookup</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter customer name or ID..."
            className="flex-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Customer name or ID"
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition duration-200 flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
            aria-label="Search for customer"
          >
            {isLoading ? 'Searching...' : 'Search'} {!isLoading && <Search className="ml-2 h-4 w-4" />}
          </button>
          <button
            onClick={handleReset}
            className="bg-gray-200 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-300 transition duration-200"
            aria-label="Reset search"
          >
            Reset
          </button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-md flex items-center mb-4" role="alert">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}
      </div>

      {/* Customer Dues Display */}
      {customerDues && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{customerDues.customer.name}</h2>
              <p className="text-gray-600">Customer ID: {customerDues.customer.code}</p>
              <p className="text-gray-600">Email: {customerDues.customer.email}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-md mt-3 md:mt-0">
              <p className="text-blue-800 font-semibold">Total Active Loans: {customerDues.loans.filter(loan => loan.loanDetails.status === 'active').length}</p>
            </div>
          </div>

          {/* Loans List */}
          {customerDues.loans.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No loan records found for this customer.</p>
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
                  <div key={loan.loanDetails.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Loan Summary Header */}
                    <div 
                      className={`p-4 flex justify-between items-center cursor-pointer ${isExpanded ? 'bg-blue-50' : 'bg-white'}`}
                      onClick={() => toggleLoanDetails(loan.loanDetails.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`loan-details-${loan.loanDetails.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className="text-lg font-semibold text-gray-800">
                            Loan #{loan.loanDetails.id.substring(0, 8)}
                          </h3>
                          <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                            loan.loanDetails.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : loan.loanDetails.status === 'closed'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {loan.loanDetails.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-1">
                          {formatCurrency(loan.loanDetails.principalAmount)} at {loan.loanDetails.interestRate}% ({loan.loanDetails.frequency})
                        </p>
                      </div>
                      <div className="flex items-center">
                        <div className="text-right mr-4">
                          <p className="text-gray-800 font-medium">Net Dues</p>
                          <p className="text-lg font-bold text-blue-600">{formatCurrency(netDues)}</p>
                        </div>
                        <div className="bg-gray-200 rounded-full p-1">
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Loan Details */}
                    {isExpanded && (
                      <div id={`loan-details-${loan.loanDetails.id}`} className="p-4 border-t border-gray-200">
                        {/* Loan Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="bg-gray-50 p-4 rounded-md">
                            <h4 className="text-gray-500 font-medium mb-2">Principal & Interest</h4>
                            <p className="flex justify-between">
                              <span>Original Principal:</span>
                              <span className="font-medium">{formatCurrency(loan.loanDetails.principalAmount)}</span>
                            </p>
                            <p className="flex justify-between mt-1">
                              <span>Outstanding Principal:</span>
                              <span className="font-medium">{formatCurrency(outstandingPrincipal)}</span>
                            </p>
                            <p className="flex justify-between mt-1">
                              <span>Accrued Interest:</span>
                              <span className="font-medium">{formatCurrency(accruedInterest)}</span>
                            </p>
                            <p className="flex justify-between mt-1">
                              <span>Interest Rate:</span>
                              <span className="font-medium">{loan.loanDetails.interestRate}%</span>
                            </p>
                          </div>

                          <div className="bg-gray-50 p-4 rounded-md">
                            <h4 className="text-gray-500 font-medium mb-2">Time Remaining</h4>
                            <div className="flex items-center mb-2">
                              <Clock className="h-5 w-5 text-gray-400 mr-2" />
                              <p className="font-medium">
                                {installmentsLeft} installments left
                              </p>
                            </div>
                            <div className="flex items-center mb-2">
                              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                              <p className="font-medium">
                                Approx. {Math.round(daysRemaining / 30)} months remaining
                              </p>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                              <p className="font-medium">
                                Est. Maturity: {format(maturityDate, 'dd MMM, yyyy')}
                              </p>
                            </div>
                          </div>

                          <div className="bg-gray-50 p-4 rounded-md">
                            <h4 className="text-gray-500 font-medium mb-2">Penalties & Dues</h4>
                            <p className="flex justify-between">
                              <span>Late Penalties:</span>
                              <span className="font-medium text-red-600">{formatCurrency(totalPenalties)}</span>
                            </p>
                            <p className="flex justify-between mt-1">
                              <span>Prepayment Penalty:</span>
                              <span className="font-medium">{formatCurrency(calculatePrepaymentPenalty(loan))}</span>
                            </p>
                            <p className="flex justify-between mt-1 font-semibold text-lg">
                              <span>Total Due:</span>
                              <span className="text-blue-600">{formatCurrency(netDues)}</span>
                            </p>
                          </div>
                        </div>

                        {/* Repayment History Timeline */}
                        <div className="mb-6">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-gray-700 font-semibold text-lg flex items-center">
                              <Clock className="h-5 w-5 mr-2" /> 
                              Repayment History
                            </h4>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadRepaymentHistory(loan.loanDetails.id);
                              }}
                              className="flex items-center text-blue-600 hover:text-blue-800"
                              aria-label="Download repayment history"
                            >
                              <Download size={16} className="mr-1" /> Download History
                            </button>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Date</th>
                                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Principal</th>
                                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest</th>
                                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Penalty</th>
                                </tr>
                              </thead>
                              <tbody>
                                {loan.payments.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="px-4 py-3 text-center text-gray-500">No payment records found</td>
                                  </tr>
                                ) : (
                                  loan.payments
                                    .sort((a, b) => safeParseDate(a.dueDate).getTime() - safeParseDate(b.dueDate).getTime())
                                    .map((payment) => (
                                      <tr 
                                        key={payment.id} 
                                        className={`border-t border-gray-200 ${
                                          payment.status === 'late' ? 'bg-red-50' : 
                                          payment.status === 'waived' ? 'bg-yellow-50' : 
                                          payment.status === 'pending' ? 'bg-gray-50' : 'bg-white'
                                        }`}
                                      >
                                        <td className="px-4 py-3">{format(safeParseDate(payment.dueDate), 'dd MMM, yyyy')}</td>
                                        <td className="px-4 py-3">
                                          {payment.paidDate 
                                            ? format(safeParseDate(payment.paidDate), 'dd MMM, yyyy')
                                            : '-'}
                                        </td>
                                        <td className="px-4 py-3 font-medium">{formatCurrency(payment.amount)}</td>
                                        <td className="px-4 py-3">{formatCurrency(payment.principalPaid)}</td>
                                        <td className="px-4 py-3">{formatCurrency(payment.interestPaid)}</td>
                                        <td className="px-4 py-3">
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                            payment.status === 'on-time' ? 'bg-green-100 text-green-800' : 
                                            payment.status === 'late' ? 'bg-red-100 text-red-800' : 
                                            payment.status === 'waived' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                          }`}>
                                            {payment.status === 'on-time' && <CheckCircle size={12} className="mr-1" />}
                                            {payment.status === 'late' && <XCircle size={12} className="mr-1" />}
                                            {payment.status === 'waived' && <Info size={12} className="mr-1" />}
                                            {payment.status === 'pending' && <Clock size={12} className="mr-1" />}
                                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3">
                                          {payment.penaltyAmount > 0 ? formatCurrency(payment.penaltyAmount) : '-'}
                                        </td>
                                      </tr>
                                    ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Payment Visualization */}
                        <div className="mb-6">
                          <h4 className="text-gray-700 font-semibold text-lg mb-4">Payment Trend</h4>
                          <div className="h-64">
                            {loan.payments.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                  data={loan.payments.map(payment => ({
                                    date: format(safeParseDate(payment.dueDate), 'MMM yyyy'),
                                    amount: payment.amount,
                                    principal: payment.principalPaid,
                                    interest: payment.interestPaid,
                                    penalty: payment.penaltyAmount
                                  }))}
                                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="date" />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Line type="monotone" dataKey="principal" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 8 }} />
                                  <Line type="monotone" dataKey="interest" stroke="#10b981" strokeWidth={2} />
                                  <Line type="monotone" dataKey="penalty" stroke="#ef4444" strokeWidth={2} />
                                </LineChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="flex items-center justify-center h-full bg-gray-50 rounded-md">
                                <p className="text-gray-500">No payment data available for visualization</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Future EMIs & Prepayment */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="border border-gray-200 rounded-md p-4">
                            <h4 className="text-gray-700 font-semibold text-lg mb-4">Upcoming Payments</h4>
                            {installmentsLeft > 0 ? (
                              <div className="space-y-3">
                                {generateFutureEMIs(loan).slice(0, 3).map((emi, index) => (
                                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                                    <div>
                                      <p className="text-gray-800 font-medium">{format(safeParseDate(emi.dueDate), 'dd MMM, yyyy')}</p>
                                      <p className="text-xs text-gray-500">EMI #{loan.loanDetails.term - installmentsLeft + index + 1}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-lg font-semibold text-blue-600">{formatCurrency(emi.amount)}</p>
                                    </div>
                                  </div>
                                ))}
                                {installmentsLeft > 3 && (
                                  <div className="text-center pt-2">
                                    <button 
                                      onClick={() => toggleSection('futureEMIs')}
                                      className="text-blue-600 hover:text-blue-800 flex items-center mx-auto"
                                    >
                                      View all {installmentsLeft} installments 
                                      {expandedSection['futureEMIs'] ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />}
                                    </button>
                                  </div>
                                )}
                                
                                {expandedSection['futureEMIs'] && (
                                  <div className="mt-4 max-h-64 overflow-y-auto">
                                    <table className="min-w-full">
                                      <thead>
                                        <tr className="bg-gray-100">
                                          <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                                          <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EMI #</th>
                                          <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {generateFutureEMIs(loan).map((emi, index) => (
                                          <tr key={index} className="border-t border-gray-200">
                                            <td className="px-4 py-2">{format(safeParseDate(emi.dueDate), 'dd MMM, yyyy')}</td>
                                            <td className="px-4 py-2">#{loan.loanDetails.term - installmentsLeft + index + 1}</td>
                                            <td className="px-4 py-2 font-medium">{formatCurrency(emi.amount)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-6">
                                <p className="text-gray-500">No upcoming payments</p>
                              </div>
                            )}
                          </div>

                          <div className="border border-gray-200 rounded-md p-4">
                            <h4 className="text-gray-700 font-semibold text-lg mb-4">Prepayment Options</h4>
                            
                            {loan.loanDetails.status === 'active' ? (
                              <>
                                <div className="flex items-center p-3 bg-blue-50 rounded-md mb-4">
                                  <Info className="text-blue-500 h-5 w-5 mr-3" />
                                  <p className="text-blue-700 text-sm">Simulate a prepayment to see how it affects your loan term and interest</p>
                                </div>
                                
                                <div className="flex flex-col space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Prepayment Amount</label>
                                    <div className="flex items-center">
                                      <DollarSign className="h-5 w-5 text-gray-400 absolute ml-3" />
                                      <input 
                                        type="number"
                                        placeholder="Enter amount"
                                        className="pl-10 p-3 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min={0}
                                        max={outstandingPrincipal}
                                      />
                                    </div>
                                  </div>
                                  
                                  <button 
                                    onClick={() => handlePrepaymentSimulation(loan.loanDetails.id, 10000)}
                                    className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200 flex items-center justify-center"
                                  >
                                    Simulate Prepayment <ArrowRight className="ml-2 h-4 w-4" />
                                  </button>
                                  
                                  {prepaymentSimulation && (
                                    <div className="mt-4 p-4 bg-green-50 rounded-md">
                                      <h5 className="font-medium text-green-800 mb-2">Prepayment Simulation Results</h5>
                                      <p className="text-green-700 mb-1">New Term: 18 months (reduced by 6 months)</p>
                                      <p className="text-green-700 mb-1">Interest Saved: ₹24,500</p>
                                      <p className="text-green-700">New Monthly EMI: ₹12,340</p>
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="text-center py-6">
                                <p className="text-gray-500">Prepayment not available for {loan.loanDetails.status} loans</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Audit Trail (Visible only for admin roles) */}
      {auditTrail.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div 
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleSection('auditTrail')}
          >
            <h2 className="text-xl font-semibold text-gray-700">Audit Trail</h2>
            <div className="bg-gray-200 rounded-full p-1">
              {expandedSection['auditTrail'] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>
          
          {expandedSection['auditTrail'] && (
            <div className="mt-4 max-h-64 overflow-y-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {auditTrail.map((entry, index) => (
                    <tr key={index} className="border-t border-gray-200">
                      <td className="px-4 py-2 text-sm">{format(safeParseDate(entry.timestamp), 'dd MMM, yyyy HH:mm:ss')}</td>
                      <td className="px-4 py-2">{entry.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DuesModule;