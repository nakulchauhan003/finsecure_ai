import { useState, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Investment {
  id: string;
  name: string;
  type: 'mutual_fund' | 'stock' | 'gold' | 'fd' | 'bond' | 'crypto';
  risk: 'low' | 'medium' | 'high';
  expectedReturn: number; // annual %
  volatility: number; // 0-1
  minInvestment: number;
  icon: string;
}

interface PortfolioItem {
  investment: Investment;
  amount: number;
}

interface GameState {
  year: number;
  month: number;
  balance: number;
  portfolio: PortfolioItem[];
  history: { period: string; portfolio: number; savings: number; inflation: number }[];
  events: { period: string; message: string; impact: string; type: 'positive' | 'negative' | 'neutral' }[];
  score: number;
  totalInvested: number;
  gameOver: boolean;
  startingAmount: number;
}

const INVESTMENTS: Investment[] = [
  { id: 'hdfc_mf', name: 'HDFC Balanced Fund', type: 'mutual_fund', risk: 'medium', expectedReturn: 12, volatility: 0.15, minInvestment: 500, icon: '📊' },
  { id: 'sbi_bluechip', name: 'SBI Blue Chip Fund', type: 'mutual_fund', risk: 'medium', expectedReturn: 14, volatility: 0.20, minInvestment: 500, icon: '📈' },
  { id: 'reliance', name: 'Reliance Industries', type: 'stock', risk: 'high', expectedReturn: 18, volatility: 0.35, minInvestment: 2500, icon: '🏭' },
  { id: 'tcs', name: 'TCS', type: 'stock', risk: 'medium', expectedReturn: 15, volatility: 0.25, minInvestment: 3500, icon: '💻' },
  { id: 'sgb', name: 'Sovereign Gold Bond', type: 'gold', risk: 'low', expectedReturn: 8, volatility: 0.08, minInvestment: 4000, icon: '🥇' },
  { id: 'sbi_fd', name: 'SBI Fixed Deposit', type: 'fd', risk: 'low', expectedReturn: 7.1, volatility: 0, minInvestment: 1000, icon: '🏦' },
  { id: 'ppf', name: 'PPF (Public Provident)', type: 'bond', risk: 'low', expectedReturn: 7.1, volatility: 0, minInvestment: 500, icon: '🔒' },
  { id: 'nifty_etf', name: 'Nifty 50 ETF', type: 'mutual_fund', risk: 'medium', expectedReturn: 13, volatility: 0.18, minInvestment: 1000, icon: '🎯' },
  { id: 'small_cap', name: 'Small Cap Fund', type: 'mutual_fund', risk: 'high', expectedReturn: 20, volatility: 0.40, minInvestment: 500, icon: '🚀' },
  { id: 'govt_bond', name: 'RBI Gov Bond 7.75%', type: 'bond', risk: 'low', expectedReturn: 7.75, volatility: 0.02, minInvestment: 1000, icon: '🏛️' },
];

const RANDOM_EVENTS = [
  { message: 'RBI cuts repo rate by 25bps — boost to equity markets!', impact: '+5% to equity', type: 'positive' as const, equityBoost: 0.05, fdImpact: -0.005 },
  { message: 'Global recession fears — markets drop 8%', impact: '-8% to stocks', type: 'negative' as const, equityBoost: -0.08, fdImpact: 0 },
  { message: 'Gold prices surge due to geopolitical tensions', impact: '+12% to gold', type: 'positive' as const, goldBoost: 0.12 },
  { message: 'IT sector reports strong earnings — tech stocks rally', impact: '+10% to IT stocks', type: 'positive' as const, equityBoost: 0.06 },
  { message: 'Inflation rises to 6.2% — FD rates may increase', impact: '+0.5% to FD rates', type: 'neutral' as const, fdImpact: 0.005 },
  { message: 'Budget 2026: Tax benefits for ELSS investments', impact: 'Tax saving boost', type: 'positive' as const, equityBoost: 0.03 },
  { message: 'Monsoon below average — agri stocks fall', impact: '-4% to select stocks', type: 'negative' as const, equityBoost: -0.04 },
  { message: 'FII outflows — market correction expected', impact: '-6% to equity', type: 'negative' as const, equityBoost: -0.06 },
  { message: 'New Government policy boosts manufacturing sector', impact: '+7% to industrial stocks', type: 'positive' as const, equityBoost: 0.04 },
  { message: 'Crypto market volatility — BTC drops 15%', impact: 'Crypto impacted', type: 'negative' as const },
];

function calculateDiversificationScore(portfolio: PortfolioItem[]): number {
  if (portfolio.length === 0) return 0;
  const totalValue = portfolio.reduce((s, p) => s + p.amount, 0);
  if (totalValue === 0) return 0;

  const typeAllocations: Record<string, number> = {};
  portfolio.forEach(p => {
    const type = p.investment.type;
    typeAllocations[type] = (typeAllocations[type] || 0) + p.amount / totalValue;
  });

  const types = Object.keys(typeAllocations);
  if (types.length <= 1) return 20;
  if (types.length === 2) return 40;

  // Shannon entropy-based diversification
  let entropy = 0;
  Object.values(typeAllocations).forEach(w => {
    if (w > 0) entropy -= w * Math.log2(w);
  });
  const maxEntropy = Math.log2(Math.max(types.length, 1));
  return Math.min(100, Math.round((entropy / Math.max(maxEntropy, 0.01)) * 100));
}

function calculateRiskScore(portfolio: PortfolioItem[]): number {
  const total = portfolio.reduce((s, p) => s + p.amount, 0);
  if (total === 0) return 0;
  const weightedRisk = portfolio.reduce((s, p) => s + (p.amount / total) * p.investment.volatility, 0);
  return Math.round(weightedRisk * 100);
}

export default function FinancialGame() {
  const [gameStarted, setGameStarted] = useState(false);
  const [startAmount, setStartAmount] = useState(100000);
  const [game, setGame] = useState<GameState | null>(null);
  const [selectedInvestment, setSelectedInvestment] = useState<string | null>(null);
  const [investAmount, setInvestAmount] = useState(10000);


  const startGame = () => {
    setGame({
      year: 1,
      month: 1,
      balance: startAmount,
      portfolio: [],
      history: [{ period: 'Start', portfolio: startAmount, savings: startAmount, inflation: startAmount }],
      events: [],
      score: 0,
      totalInvested: 0,
      gameOver: false,
      startingAmount: startAmount,
    });
    setGameStarted(true);
  };

  const invest = () => {
    if (!game || !selectedInvestment || investAmount <= 0 || investAmount > game.balance) return;
    const inv = INVESTMENTS.find(i => i.id === selectedInvestment);
    if (!inv || investAmount < inv.minInvestment) return;

    setGame(prev => {
      if (!prev) return prev;
      const existing = prev.portfolio.find(p => p.investment.id === selectedInvestment);
      let newPortfolio: PortfolioItem[];
      if (existing) {
        newPortfolio = prev.portfolio.map(p =>
          p.investment.id === selectedInvestment ? { ...p, amount: p.amount + investAmount } : p
        );
      } else {
        newPortfolio = [...prev.portfolio, { investment: inv, amount: investAmount }];
      }
      return {
        ...prev,
        balance: prev.balance - investAmount,
        portfolio: newPortfolio,
        totalInvested: prev.totalInvested + investAmount,
      };
    });
    setSelectedInvestment(null);
  };

  const sellInvestment = (id: string) => {
    if (!game) return;
    const item = game.portfolio.find(p => p.investment.id === id);
    if (!item) return;

    setGame(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        balance: prev.balance + item.amount,
        portfolio: prev.portfolio.filter(p => p.investment.id !== id),
      };
    });
  };

  const advanceMonth = useCallback(() => {
    if (!game || game.gameOver) return;

    setGame(prev => {
      if (!prev) return prev;

      let newMonth = prev.month + 1;
      let newYear = prev.year;
      if (newMonth > 12) { newMonth = 1; newYear++; }
      if (newYear > 5) {
        return { ...prev, gameOver: true };
      }

      // Apply returns with randomness
      const event = Math.random() < 0.3 ? RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)] : null;

      const newPortfolio = prev.portfolio.map(p => {
        const monthlyReturn = p.investment.expectedReturn / 100 / 12;
        const noise = (Math.random() - 0.5) * 2 * p.investment.volatility / Math.sqrt(12);
        let extraBoost = 0;

        if (event) {
          if ('equityBoost' in event && ['stock', 'mutual_fund'].includes(p.investment.type)) {
            extraBoost = (event as typeof RANDOM_EVENTS[number] & { equityBoost: number }).equityBoost / 12;
          }
          if ('goldBoost' in event && p.investment.type === 'gold') {
            extraBoost = (event as typeof RANDOM_EVENTS[number] & { goldBoost: number }).goldBoost / 12;
          }
          if ('fdImpact' in event && p.investment.type === 'fd') {
            extraBoost = (event as typeof RANDOM_EVENTS[number] & { fdImpact: number }).fdImpact;
          }
        }

        const totalReturn = monthlyReturn + noise + extraBoost;
        return { ...p, amount: Math.max(0, p.amount * (1 + totalReturn)) };
      });

      const portfolioValue = newPortfolio.reduce((s, p) => s + p.amount, 0) + prev.balance;
      const inflationAdjusted = prev.startingAmount * Math.pow(1.06, (newYear - 1 + (newMonth - 1) / 12)); // 6% inflation
      const savingsValue = prev.startingAmount * Math.pow(1 + 0.04 / 12, ((newYear - 1) * 12 + newMonth - 1)); // 4% savings

      const period = `Y${newYear}M${newMonth}`;
      const newHistory = [...prev.history, { period, portfolio: Math.round(portfolioValue), savings: Math.round(savingsValue), inflation: Math.round(inflationAdjusted) }];

      const newEvents = event ? [...prev.events, { period, message: event.message, impact: event.impact, type: event.type }] : prev.events;

      // Calculate score
      const returnPercent = ((portfolioValue - prev.startingAmount) / prev.startingAmount) * 100;
      const diversification = calculateDiversificationScore(newPortfolio);
      const riskManagement = Math.max(0, 100 - calculateRiskScore(newPortfolio) * 2);
      const beatSavings = portfolioValue > savingsValue ? 20 : 0;
      const beatInflation = portfolioValue > inflationAdjusted ? 20 : 0;
      const score = Math.round(returnPercent * 2 + diversification * 0.3 + riskManagement * 0.2 + beatSavings + beatInflation);

      return {
        ...prev,
        year: newYear,
        month: newMonth,
        portfolio: newPortfolio,
        history: newHistory,
        events: newEvents,
        score: Math.max(0, score),
        gameOver: newYear >= 5 && newMonth >= 12,
      };
    });
  }, [game]);

  const skipMonths = (months: number) => {
    for (let i = 0; i < months; i++) {
      setTimeout(() => advanceMonth(), i * 200);
    }
  };

  const portfolioValue = game ? game.portfolio.reduce((s, p) => s + p.amount, 0) : 0;
  const totalValue = game ? portfolioValue + game.balance : 0;
  const returnPercent = game ? ((totalValue - game.startingAmount) / game.startingAmount * 100) : 0;

  const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16'];

  const pieData = game?.portfolio.map((p, i) => ({
    name: p.investment.name,
    value: Math.round(p.amount),
    color: COLORS[i % COLORS.length],
  })) || [];

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎮</div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent mb-2">
              Investment Simulator
            </h1>
            <p className="text-gray-400">Grow your money wisely over 5 years!</p>
            <p className="text-sm text-purple-300 mt-2">Score based on returns, diversification & risk management</p>
          </div>

          <div className="bg-slate-800/60 border border-purple-500/30 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-sm text-purple-300 mb-2">Starting Amount</label>
              <div className="flex gap-2">
                {[50000, 100000, 200000, 500000].map(amt => (
                  <button key={amt} onClick={() => setStartAmount(amt)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                      startAmount === amt ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-slate-700 text-gray-400 hover:text-white'
                    }`}>
                    ₹{(amt / 1000)}K
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-700/50 rounded-xl p-4 text-sm">
              <h3 className="text-white font-semibold mb-2">How to Play</h3>
              <ul className="space-y-1 text-gray-400">
                <li>• Invest in stocks, mutual funds, gold, FDs & bonds</li>
                <li>• Advance time month by month (60 months total)</li>
                <li>• React to market events & rebalance your portfolio</li>
                <li>• Beat savings account returns & inflation</li>
                <li>• Score points for diversification & smart risk management</li>
              </ul>
            </div>

            <button onClick={startGame}
              className="w-full py-4 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-amber-500/25">
              Start Game 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!game) return null;

  if (game.gameOver) {
    const finalDiversification = calculateDiversificationScore(game.portfolio);
    const finalRisk = calculateRiskScore(game.portfolio);
    const leaderboard = [
      { name: 'FinScope AI', score: 420, returns: '+38.2%', strategy: 'Balanced Portfolio' },
      { name: 'You', score: game.score, returns: `${returnPercent >= 0 ? '+' : ''}${returnPercent.toFixed(1)}%`, strategy: game.portfolio.length > 3 ? 'Diversified' : game.portfolio.length > 0 ? 'Concentrated' : 'Cash Heavy' },
      { name: 'Risk Taker Bot', score: 380, returns: '+42.1%', strategy: 'All Equity' },
      { name: 'Safe Player Bot', score: 280, returns: '+18.5%', strategy: 'FD + Bonds' },
      { name: 'Bank Savings', score: 120, returns: '+22.0%', strategy: 'Savings Account' },
    ].sort((a, b) => b.score - a.score);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="text-4xl font-bold text-white mb-2">Game Over!</h1>
            <p className="text-xl text-purple-300">5 Years Completed</p>
          </div>

          {/* Score card */}
          <div className="bg-gradient-to-r from-yellow-600/20 to-amber-600/20 border border-yellow-500/30 rounded-2xl p-6 mb-6 text-center">
            <div className="text-5xl font-bold text-yellow-400 mb-2">{game.score}</div>
            <p className="text-gray-300">Final Score</p>
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div><div className="text-lg font-bold text-white">₹{Math.round(totalValue).toLocaleString()}</div><p className="text-xs text-gray-400">Final Value</p></div>
              <div><div className={`text-lg font-bold ${returnPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>{returnPercent >= 0 ? '+' : ''}{returnPercent.toFixed(1)}%</div><p className="text-xs text-gray-400">Total Returns</p></div>
              <div><div className="text-lg font-bold text-cyan-400">{finalDiversification}/100</div><p className="text-xs text-gray-400">Diversification</p></div>
              <div><div className="text-lg font-bold text-purple-400">{finalRisk}/100</div><p className="text-xs text-gray-400">Risk Level</p></div>
            </div>
          </div>

          {/* Growth chart */}
          <div className="bg-slate-800/40 border border-purple-500/20 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Your Investment Journey</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={game.history.filter((_, i) => i % 3 === 0 || i === game.history.length - 1)}>
                <defs>
                  <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="period" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #8b5cf6', borderRadius: '8px' }} formatter={(v: number) => [`₹${v.toLocaleString()}`, '']} />
                <Area type="monotone" dataKey="portfolio" stroke="#8b5cf6" fill="url(#portfolioGrad)" name="Your Portfolio" />
                <Area type="monotone" dataKey="savings" stroke="#6b7280" fill="none" strokeDasharray="5 5" name="Bank Savings" />
                <Area type="monotone" dataKey="inflation" stroke="#ef4444" fill="none" strokeDasharray="3 3" name="Inflation" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Leaderboard */}
          <div className="bg-slate-800/40 border border-yellow-500/20 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">🏅 Leaderboard</h3>
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${entry.name === 'You' ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-slate-800/30'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-400 w-6">#{i + 1}</span>
                    <span className={`font-medium ${entry.name === 'You' ? 'text-yellow-400' : 'text-white'}`}>{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-400">{entry.strategy}</span>
                    <span className="text-green-400">{entry.returns}</span>
                    <span className="font-bold text-white">{entry.score} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => { setGameStarted(false); setGame(null); }}
            className="w-full py-3 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-semibold rounded-xl transition-all">
            Play Again 🔄
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
              🎮 Investment Simulator
            </h1>
            <p className="text-xs text-gray-400">Year {game.year} • Month {game.month} • {60 - ((game.year - 1) * 12 + game.month - 1)} months remaining</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-sm font-bold text-yellow-400">{game.score}</div>
              <p className="text-xs text-gray-500">Score</p>
            </div>
            <div className="flex gap-2">
              <button onClick={advanceMonth} className="px-3 py-1.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm hover:bg-purple-500/30 transition">
                +1 Month
              </button>
              <button onClick={() => skipMonths(6)} className="px-3 py-1.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm hover:bg-purple-500/30 transition">
                +6 Months
              </button>
              <button onClick={() => skipMonths(12)} className="px-3 py-1.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm hover:bg-purple-500/30 transition">
                +1 Year
              </button>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div className="bg-slate-800/40 border border-green-500/20 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-green-400">₹{Math.round(game.balance).toLocaleString()}</div>
            <p className="text-xs text-gray-400">Cash Balance</p>
          </div>
          <div className="bg-slate-800/40 border border-purple-500/20 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-purple-400">₹{Math.round(portfolioValue).toLocaleString()}</div>
            <p className="text-xs text-gray-400">Portfolio Value</p>
          </div>
          <div className="bg-slate-800/40 border border-cyan-500/20 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-white">₹{Math.round(totalValue).toLocaleString()}</div>
            <p className="text-xs text-gray-400">Total Value</p>
          </div>
          <div className="bg-slate-800/40 border border-yellow-500/20 rounded-xl p-3 text-center">
            <div className={`text-lg font-bold ${returnPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {returnPercent >= 0 ? '+' : ''}{returnPercent.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-400">Returns</p>
          </div>
          <div className="bg-slate-800/40 border border-pink-500/20 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-pink-400">{calculateDiversificationScore(game.portfolio)}</div>
            <p className="text-xs text-gray-400">Diversification</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Available investments */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Available Investments</h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {INVESTMENTS.map(inv => (
                <div key={inv.id}
                  onClick={() => setSelectedInvestment(inv.id)}
                  className={`cursor-pointer border rounded-xl p-3 transition hover:scale-[1.01] ${
                    selectedInvestment === inv.id ? 'border-yellow-400/60 bg-yellow-500/10' : 'border-purple-500/15 bg-slate-800/30 hover:border-purple-400/30'
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{inv.icon}</span>
                      <span className="text-white text-sm font-medium">{inv.name}</span>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      inv.risk === 'low' ? 'bg-green-500/20 text-green-400' :
                      inv.risk === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>{inv.risk}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Return: ~{inv.expectedReturn}%/yr</span>
                    <span>Min: ₹{inv.minInvestment.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {selectedInvestment && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                <div className="flex gap-2 mb-2">
                  <input type="number" value={investAmount} onChange={e => setInvestAmount(+e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-800/60 border border-yellow-500/30 rounded-lg text-white text-sm focus:outline-none"
                    placeholder="Amount" />
                  <button onClick={invest}
                    disabled={investAmount > game.balance || investAmount < (INVESTMENTS.find(i => i.id === selectedInvestment)?.minInvestment || 0)}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 text-white text-sm font-semibold rounded-lg transition">
                    Invest
                  </button>
                </div>
                <div className="flex gap-1">
                  {[10, 25, 50, 100].map(pct => (
                    <button key={pct} onClick={() => setInvestAmount(Math.round(game.balance * pct / 100))}
                      className="flex-1 py-1 text-xs bg-slate-700 text-gray-300 rounded hover:bg-slate-600 transition">{pct}%</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Middle: Charts & Portfolio */}
          <div className="lg:col-span-2 space-y-4">
            {/* Portfolio chart */}
            {game.history.length > 1 && (
              <div className="bg-slate-800/40 border border-purple-500/20 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Growth Tracker</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={game.history.slice(-24)}>
                    <defs>
                      <linearGradient id="gameGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="period" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #8b5cf6', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number) => [`₹${v.toLocaleString()}`]} />
                    <Area type="monotone" dataKey="portfolio" stroke="#8b5cf6" fill="url(#gameGrad)" name="Portfolio" />
                    <Area type="monotone" dataKey="savings" stroke="#6b7280" fill="none" strokeDasharray="5 5" name="Savings" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Current portfolio + pie */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/40 border border-purple-500/20 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Your Portfolio</h3>
                {game.portfolio.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No investments yet — pick one from the left!</p>
                ) : (
                  <div className="space-y-2">
                    {game.portfolio.map(p => (
                      <div key={p.investment.id} className="flex items-center justify-between bg-slate-800/30 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <span>{p.investment.icon}</span>
                          <div>
                            <p className="text-white text-xs font-medium">{p.investment.name}</p>
                            <p className="text-xs text-gray-400">₹{Math.round(p.amount).toLocaleString()}</p>
                          </div>
                        </div>
                        <button onClick={() => sellInvestment(p.investment.id)}
                          className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition">Sell</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {pieData.length > 0 && (
                <div className="bg-slate-800/40 border border-purple-500/20 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-2 text-center">Allocation</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Events feed */}
            {game.events.length > 0 && (
              <div className="bg-slate-800/40 border border-purple-500/20 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Market Events</h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {game.events.slice(-5).reverse().map((evt, i) => (
                    <div key={i} className={`flex items-center gap-2 text-xs p-1.5 rounded ${
                      evt.type === 'positive' ? 'bg-green-500/5 text-green-300' :
                      evt.type === 'negative' ? 'bg-red-500/5 text-red-300' :
                      'bg-gray-500/5 text-gray-300'
                    }`}>
                      <span>{evt.type === 'positive' ? '📈' : evt.type === 'negative' ? '📉' : 'ℹ️'}</span>
                      <span className="text-gray-500">[{evt.period}]</span>
                      <span>{evt.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
