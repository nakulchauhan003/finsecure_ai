import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface EMIRecord {
  id: string;
  txHash: string;
  blockNumber: number;
  timestamp: string;
  loanId: string;
  borrower: string;
  amount: number;
  emiNumber: number;
  totalEMIs: number;
  status: 'confirmed' | 'pending' | 'failed';
  gasUsed: number;
  networkFee: number;
  smartContract: string;
  previousHash: string;
  merkleRoot: string;
  verified: boolean;
}

interface BlockchainStats {
  totalTransactions: number;
  totalValueLocked: number;
  averageConfirmTime: number;
  networkHealth: number;
  blocksProcessed: number;
  smartContractsDeployed: number;
}

// Simulated blockchain ledger
const MOCK_EMI_LEDGER: EMIRecord[] = [
  {
    id: 'EMI-001', txHash: '0x7a3f...8b2d', blockNumber: 48923156, timestamp: '2026-02-28T10:15:00Z',
    loanId: 'LOAN-2024-7832', borrower: 'Rajesh K. Sharma', amount: 24850, emiNumber: 24, totalEMIs: 120,
    status: 'confirmed', gasUsed: 42000, networkFee: 0.0012, smartContract: '0xFinScope...EMIv2',
    previousHash: '0x3d1a...c7ef', merkleRoot: '0xab12...ef34', verified: true
  },
  {
    id: 'EMI-002', txHash: '0x9c2e...4f1a', blockNumber: 48923201, timestamp: '2026-02-28T11:30:00Z',
    loanId: 'LOAN-2024-5621', borrower: 'Priya M. Desai', amount: 18500, emiNumber: 15, totalEMIs: 84,
    status: 'confirmed', gasUsed: 38000, networkFee: 0.0009, smartContract: '0xFinScope...EMIv2',
    previousHash: '0x7a3f...8b2d', merkleRoot: '0xcd56...gh78', verified: true
  },
  {
    id: 'EMI-003', txHash: '0x1b5d...7e3c', blockNumber: 48923245, timestamp: '2026-02-27T09:45:00Z',
    loanId: 'LOAN-2025-1204', borrower: 'Amit S. Patel', amount: 35200, emiNumber: 8, totalEMIs: 180,
    status: 'confirmed', gasUsed: 45000, networkFee: 0.0015, smartContract: '0xFinScope...EMIv2',
    previousHash: '0x9c2e...4f1a', merkleRoot: '0xef90...ij12', verified: true
  },
  {
    id: 'EMI-004', txHash: '0x6f8a...2d9b', blockNumber: 48923310, timestamp: '2026-02-27T14:20:00Z',
    loanId: 'LOAN-2024-9143', borrower: 'Sneha R. Rao', amount: 12600, emiNumber: 31, totalEMIs: 60,
    status: 'confirmed', gasUsed: 39000, networkFee: 0.0010, smartContract: '0xFinScope...EMIv2',
    previousHash: '0x1b5d...7e3c', merkleRoot: '0xkl34...mn56', verified: true
  },
  {
    id: 'EMI-005', txHash: '0x4e7c...1a6f', blockNumber: 48923378, timestamp: '2026-02-26T16:50:00Z',
    loanId: 'LOAN-2025-3456', borrower: 'Vikram T. Singh', amount: 42100, emiNumber: 5, totalEMIs: 240,
    status: 'confirmed', gasUsed: 48000, networkFee: 0.0018, smartContract: '0xFinScope...EMIv2',
    previousHash: '0x6f8a...2d9b', merkleRoot: '0xop78...qr90', verified: true
  },
  {
    id: 'EMI-006', txHash: '0x2d3e...5b8a', blockNumber: 48923412, timestamp: '2026-02-26T08:10:00Z',
    loanId: 'LOAN-2024-7832', borrower: 'Rajesh K. Sharma', amount: 24850, emiNumber: 23, totalEMIs: 120,
    status: 'confirmed', gasUsed: 41000, networkFee: 0.0011, smartContract: '0xFinScope...EMIv2',
    previousHash: '0x4e7c...1a6f', merkleRoot: '0xst12...uv34', verified: true
  },
  {
    id: 'EMI-007', txHash: '0x8a1b...3c4d', blockNumber: 48923465, timestamp: '2026-02-25T12:35:00Z',
    loanId: 'LOAN-2025-1204', borrower: 'Amit S. Patel', amount: 35200, emiNumber: 7, totalEMIs: 180,
    status: 'confirmed', gasUsed: 44000, networkFee: 0.0014, smartContract: '0xFinScope...EMIv2',
    previousHash: '0x2d3e...5b8a', merkleRoot: '0xwx56...yz78', verified: true
  },
  {
    id: 'EMI-008', txHash: 'pending...', blockNumber: 0, timestamp: '2026-03-01T09:00:00Z',
    loanId: 'LOAN-2024-5621', borrower: 'Priya M. Desai', amount: 18500, emiNumber: 16, totalEMIs: 84,
    status: 'pending', gasUsed: 0, networkFee: 0, smartContract: '0xFinScope...EMIv2',
    previousHash: '0x8a1b...3c4d', merkleRoot: 'pending', verified: false
  },
];

function generateBlockchainStats(): BlockchainStats {
  return {
    totalTransactions: 8247,
    totalValueLocked: 4850000,
    averageConfirmTime: 2.3,
    networkHealth: 99.7,
    blocksProcessed: 48923465,
    smartContractsDeployed: 3,
  };
}

export default function BlockchainEMI() {
  const [ledger] = useState<EMIRecord[]>(MOCK_EMI_LEDGER);
  const [stats] = useState<BlockchainStats>(generateBlockchainStats());
  const [selectedRecord, setSelectedRecord] = useState<EMIRecord | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ledger' | 'explorer' | 'smart-contract'>('ledger');
  const [liveBlockHeight, setLiveBlockHeight] = useState(48923465);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveBlockHeight(prev => prev + Math.floor(Math.random() * 3));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleVerify = async (record: EMIRecord) => {
    setVerifying(record.id);
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
    setVerifying(null);
  };

  const monthlyVolume = [
    { month: 'Sep', volume: 680, amount: 16800000 },
    { month: 'Oct', volume: 720, amount: 17900000 },
    { month: 'Nov', volume: 695, amount: 17200000 },
    { month: 'Dec', volume: 745, amount: 18500000 },
    { month: 'Jan', volume: 810, amount: 20100000 },
    { month: 'Feb', volume: 780, amount: 19300000 },
  ];

  const renderLedger = () => (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Txns', value: stats.totalTransactions.toLocaleString(), icon: '📦' },
          { label: 'Value Locked', value: `₹${(stats.totalValueLocked / 100000).toFixed(0)}L`, icon: '🔒' },
          { label: 'Avg Confirm', value: `${stats.averageConfirmTime}s`, icon: '⏱️' },
          { label: 'Network Health', value: `${stats.networkHealth}%`, icon: '💚' },
          { label: 'Block Height', value: liveBlockHeight.toLocaleString(), icon: '⛓️' },
          { label: 'Smart Contracts', value: stats.smartContractsDeployed.toString(), icon: '📜' },
        ].map((s, i) => (
          <div key={i} className="bg-slate-800/40 border border-emerald-500/20 rounded-xl p-3 text-center">
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="text-lg font-bold text-white">{s.value}</div>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Transaction volume chart */}
      <div className="bg-slate-800/40 border border-emerald-500/20 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Monthly EMI Transaction Volume</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={monthlyVolume}>
            <defs>
              <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #10b981', borderRadius: '8px' }} />
            <Area type="monotone" dataKey="volume" stroke="#10b981" fill="url(#volumeGrad)" name="Transactions" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* EMI Ledger table */}
      <div className="bg-slate-800/40 border border-emerald-500/20 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-emerald-500/20">
          <h3 className="text-lg font-semibold text-white">EMI Payment Ledger (Blockchain-Verified)</h3>
          <p className="text-xs text-gray-400 mt-1">Polygon Mumbai Testnet • Tamper-proof repayment history</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60">
              <tr>
                <th className="text-left p-3 text-gray-400 font-medium">Tx Hash</th>
                <th className="text-left p-3 text-gray-400 font-medium">Borrower</th>
                <th className="text-left p-3 text-gray-400 font-medium">Loan ID</th>
                <th className="text-right p-3 text-gray-400 font-medium">Amount</th>
                <th className="text-center p-3 text-gray-400 font-medium">EMI #</th>
                <th className="text-center p-3 text-gray-400 font-medium">Status</th>
                <th className="text-center p-3 text-gray-400 font-medium">Block</th>
                <th className="text-center p-3 text-gray-400 font-medium">Verify</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((record) => (
                <tr key={record.id}
                  onClick={() => setSelectedRecord(record)}
                  className="border-t border-white/5 hover:bg-emerald-500/5 cursor-pointer transition">
                  <td className="p-3">
                    <span className="font-mono text-emerald-400 text-xs">{record.txHash}</span>
                  </td>
                  <td className="p-3 text-white">{record.borrower}</td>
                  <td className="p-3 text-gray-400 font-mono text-xs">{record.loanId}</td>
                  <td className="p-3 text-right text-white font-medium">₹{record.amount.toLocaleString()}</td>
                  <td className="p-3 text-center text-gray-300">{record.emiNumber}/{record.totalEMIs}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      record.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                      record.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 animate-pulse' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="p-3 text-center text-gray-400 font-mono text-xs">
                    {record.blockNumber > 0 ? `#${record.blockNumber}` : '—'}
                  </td>
                  <td className="p-3 text-center">
                    {record.status === 'confirmed' ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleVerify(record); }}
                        disabled={verifying === record.id}
                        className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition disabled:opacity-50">
                        {verifying === record.id ? '⏳' : record.verified ? '✓ Verified' : 'Verify'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected record detail */}
      {selectedRecord && (
        <div className="bg-gradient-to-r from-emerald-600/10 to-teal-600/10 border border-emerald-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Transaction Detail</h3>
            <button onClick={() => setSelectedRecord(null)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-400">Tx Hash:</span><br/><span className="text-emerald-400 font-mono">{selectedRecord.txHash}</span></div>
            <div><span className="text-gray-400">Block Number:</span><br/><span className="text-white">{selectedRecord.blockNumber > 0 ? `#${selectedRecord.blockNumber}` : 'Pending'}</span></div>
            <div><span className="text-gray-400">Timestamp:</span><br/><span className="text-white">{new Date(selectedRecord.timestamp).toLocaleString()}</span></div>
            <div><span className="text-gray-400">Borrower:</span><br/><span className="text-white">{selectedRecord.borrower}</span></div>
            <div><span className="text-gray-400">Loan ID:</span><br/><span className="text-white font-mono">{selectedRecord.loanId}</span></div>
            <div><span className="text-gray-400">Amount:</span><br/><span className="text-white font-bold">₹{selectedRecord.amount.toLocaleString()}</span></div>
            <div><span className="text-gray-400">EMI Progress:</span><br/><span className="text-white">{selectedRecord.emiNumber} of {selectedRecord.totalEMIs}</span></div>
            <div><span className="text-gray-400">Gas Used:</span><br/><span className="text-white">{selectedRecord.gasUsed.toLocaleString()}</span></div>
            <div><span className="text-gray-400">Network Fee:</span><br/><span className="text-white">{selectedRecord.networkFee} MATIC</span></div>
            <div><span className="text-gray-400">Smart Contract:</span><br/><span className="text-emerald-400 font-mono text-xs">{selectedRecord.smartContract}</span></div>
            <div><span className="text-gray-400">Previous Hash:</span><br/><span className="text-gray-300 font-mono text-xs">{selectedRecord.previousHash}</span></div>
            <div><span className="text-gray-400">Merkle Root:</span><br/><span className="text-gray-300 font-mono text-xs">{selectedRecord.merkleRoot}</span></div>
          </div>

          {/* Hash chain visualization */}
          <div className="mt-4 p-3 bg-slate-800/60 rounded-xl">
            <p className="text-xs text-gray-400 mb-2">Hash Chain Integrity</p>
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded font-mono whitespace-nowrap">{selectedRecord.previousHash}</span>
              <span className="text-emerald-400">→</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-mono whitespace-nowrap border border-emerald-500/30">{selectedRecord.txHash}</span>
              <span className="text-emerald-400">→</span>
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded font-mono whitespace-nowrap">next block...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderExplorer = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-1">Block Explorer</h2>
        <p className="text-sm text-emerald-300">Browse recent blocks and transactions on the EMI chain</p>
      </div>

      {/* Recent blocks */}
      <div className="space-y-3">
        {[
          { number: liveBlockHeight, txCount: 3, miner: '0xFinScope...Validator1', size: '2.4 KB', time: '2s ago' },
          { number: liveBlockHeight - 1, txCount: 5, miner: '0xFinScope...Validator2', size: '4.1 KB', time: '7s ago' },
          { number: liveBlockHeight - 2, txCount: 2, miner: '0xFinScope...Validator1', size: '1.8 KB', time: '12s ago' },
          { number: liveBlockHeight - 3, txCount: 4, miner: '0xFinScope...Validator3', size: '3.2 KB', time: '17s ago' },
          { number: liveBlockHeight - 4, txCount: 1, miner: '0xFinScope...Validator2', size: '1.1 KB', time: '22s ago' },
          { number: liveBlockHeight - 5, txCount: 6, miner: '0xFinScope...Validator1', size: '5.7 KB', time: '27s ago' },
        ].map((block, i) => (
          <div key={i} className="bg-slate-800/40 border border-emerald-500/15 rounded-xl p-4 flex items-center justify-between hover:border-emerald-400/30 transition">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 font-mono text-xs">
                ⛓️
              </div>
              <div>
                <p className="text-white font-mono font-medium">Block #{block.number.toLocaleString()}</p>
                <p className="text-xs text-gray-400">{block.time} • {block.txCount} transactions</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-emerald-400 font-mono">{block.miner}</p>
              <p className="text-xs text-gray-500">{block.size}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gas price tracker */}
      <div className="bg-slate-800/40 border border-emerald-500/20 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Gas Price Tracker</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={[
            { time: '12:00', gas: 25 }, { time: '12:05', gas: 32 }, { time: '12:10', gas: 28 },
            { time: '12:15', gas: 45 }, { time: '12:20', gas: 38 }, { time: '12:25', gas: 22 },
            { time: '12:30', gas: 30 }, { time: '12:35', gas: 35 }, { time: '12:40', gas: 27 },
            { time: '12:45', gas: 42 }, { time: '12:50', gas: 33 }, { time: '12:55', gas: 29 },
          ]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #10b981', borderRadius: '8px' }} />
            <Bar dataKey="gas" radius={[4, 4, 0, 0]} name="Gas (Gwei)">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((_, i) => (
                <Cell key={i} fill={i % 2 === 0 ? '#10b981' : '#06b6d4'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderSmartContract = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-1">Smart Contract</h2>
        <p className="text-sm text-emerald-300">EMI Payment Ledger Smart Contract (Solidity)</p>
      </div>

      <div className="bg-slate-800/60 border border-emerald-500/20 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold">FinScopeEMILedger.sol</h3>
            <p className="text-xs text-gray-400">Deployed on Polygon Mumbai • v2.1.0</p>
          </div>
          <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">Verified ✓</span>
        </div>
        <pre className="bg-slate-900/80 rounded-xl p-4 overflow-x-auto text-xs text-gray-300 font-mono leading-relaxed">
{`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract FinScopeEMILedger {
    struct EMIPayment {
        uint256 id;
        string loanId;
        address borrower;
        uint256 amount;
        uint256 emiNumber;
        uint256 totalEMIs;
        uint256 timestamp;
        bytes32 previousHash;
    }

    mapping(uint256 => EMIPayment) public payments;
    mapping(string => uint256[]) public loanPayments;
    uint256 public paymentCount;
    address public owner;
    
    event EMIPaid(
        uint256 indexed id, string loanId,
        address indexed borrower, uint256 amount,
        uint256 emiNumber, uint256 timestamp
    );
    
    event EMIVerified(uint256 indexed id, bool integrity);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() { owner = msg.sender; }

    function recordEMI(
        string memory _loanId, address _borrower,
        uint256 _amount, uint256 _emiNumber,
        uint256 _totalEMIs
    ) external onlyOwner returns (uint256) {
        paymentCount++;
        bytes32 prevHash = paymentCount > 1
            ? keccak256(abi.encodePacked(payments[paymentCount - 1].amount,
                payments[paymentCount - 1].timestamp))
            : bytes32(0);
            
        payments[paymentCount] = EMIPayment({
            id: paymentCount, loanId: _loanId,
            borrower: _borrower, amount: _amount,
            emiNumber: _emiNumber, totalEMIs: _totalEMIs,
            timestamp: block.timestamp, previousHash: prevHash
        });
        
        loanPayments[_loanId].push(paymentCount);
        emit EMIPaid(paymentCount, _loanId, _borrower,
            _amount, _emiNumber, block.timestamp);
        return paymentCount;
    }

    function verifyChain(uint256 _id) external view
        returns (bool) {
        if (_id <= 1) return true;
        EMIPayment memory prev = payments[_id - 1];
        bytes32 expected = keccak256(
            abi.encodePacked(prev.amount, prev.timestamp));
        return payments[_id].previousHash == expected;
    }
    
    function getLoanHistory(string memory _loanId)
        external view returns (uint256[] memory) {
        return loanPayments[_loanId];
    }
}`}
        </pre>
      </div>

      {/* Contract stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Contract Address', value: '0xFinScope...EMIv2', sub: 'Polygon Mumbai' },
          { label: 'Total Interactions', value: '8,247', sub: 'Since deployment' },
          { label: 'Unique Borrowers', value: '342', sub: 'Active wallets' },
          { label: 'Chain Integrity', value: '100%', sub: 'All blocks verified' },
        ].map((s, i) => (
          <div key={i} className="bg-slate-800/40 border border-emerald-500/20 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className="text-lg font-bold text-white">{s.value}</p>
            <p className="text-xs text-emerald-400">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Blockchain EMI Ledger
          </h1>
          <p className="text-gray-400 mt-1">Tamper-proof repayment history on Polygon • Smart contract verified</p>
        </div>

        {/* Network status bar */}
        <div className="flex items-center gap-4 mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-sm">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />Network: <span className="text-green-400 font-semibold">Active</span></span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-300">Block Height: <span className="text-emerald-400 font-mono">{liveBlockHeight.toLocaleString()}</span></span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-300">Chain: <span className="text-emerald-400">Polygon Mumbai</span></span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-300">Gas: <span className="text-emerald-400">~30 Gwei</span></span>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'ledger' as const, label: 'EMI Ledger', icon: '📒' },
            { id: 'explorer' as const, label: 'Block Explorer', icon: '🔍' },
            { id: 'smart-contract' as const, label: 'Smart Contract', icon: '📜' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                activeTab === tab.id ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-400 hover:text-white hover:bg-slate-800/40'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'ledger' && renderLedger()}
        {activeTab === 'explorer' && renderExplorer()}
        {activeTab === 'smart-contract' && renderSmartContract()}
      </div>
    </div>
  );
}
