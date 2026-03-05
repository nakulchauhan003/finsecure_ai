import { useState, useRef, useEffect } from 'react';
import { 
  Send, Bot, User, Mic,
  Search, ShieldCheck, Percent, UserCheck,
  CheckCircle, XCircle, AlertCircle, ExternalLink
} from 'lucide-react';
import { chatWithAdvisor, askGeminiWithSearch, askGeminiJSON } from '../../utils/gemini';

// --- API Helper Functions ---

/**
 * Fetches structured bank data using Gemini API with Google Search.
 */
async function fetchCompetitorData(userQuery: string) {
  const systemPrompt = `You are a specialized banking assistant. The user is asking about a bank's product, interest rate, or other financial data.
Perform a Google Search to find the most current, publicly available information for the user's query.

Format your response as JSON with this structure:
{
  "bankName": "Bank Name",
  "products": [
    {
      "productName": "Product Name",
      "interestRate": "Rate %",
      "notes": "Optional notes"
    }
  ],
  "sourceURL": "URL where found",
  "sourceTitle": "Page title"
}

IMPORTANT: Return ONLY valid JSON. No markdown, no code fences.`;

  try {
    const responseText = await askGeminiWithSearch(userQuery, systemPrompt);
    // Try to parse JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsedData = JSON.parse(jsonMatch[0]);
        if (parsedData.products && parsedData.products.length > 0) {
          let summaryText = `Here's what I found for ${parsedData.bankName}:`;
          summaryText += `\n- ${parsedData.products[0].productName}: ${parsedData.products[0].interestRate}`;
          if (parsedData.products.length > 1) {
            summaryText += `\n- (and ${parsedData.products.length - 1} more... see card)`;
          }
          return { text: summaryText, card: { type: 'externalData', data: parsedData } };
        }
      } catch {
        console.warn('Could not parse JSON from response');
      }
    }
    return { text: responseText, card: null };
  } catch (error) {
    console.error('Error fetching competitor data:', error);
    return {
      text: "I'm sorry, I couldn't fetch that live data right now. Please try again.",
      card: null
    };
  }
}

// --- END API Helper Functions ---

const AIChatbot = () => {
  const [messages, setMessages] = useState<Array<{ type: string; text: string; timestamp: Date; card?: { type: string; data: unknown } | null }>>([
    {
      type: 'bot',
      text: "Hello! I'm your Internal Banking Assistant. I can help you with customer lookups, risk analysis, product information, and competitive rates. How can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const processMessage = async (userMessage: string) => {
    setIsTyping(true);
    const lowerMsg = userMessage.toLowerCase();
    
    const response: { type: string; text: string; timestamp: Date; card: { type: string; data: unknown } | null } = {
      type: 'bot',
      text: '',
      timestamp: new Date(),
      card: null
    };

    try {
      if (lowerMsg.includes('profile') || lowerMsg.includes('customer') || lowerMsg.includes('account')) {
        const customerId = lowerMsg.match(/\d{6,}/)?.[0] || '987654';
        // Use Gemini to generate a realistic customer profile
        const profileData = await askGeminiJSON(`Generate a realistic Indian bank customer profile for customer ID ${customerId}. Return JSON:
{ "id": "${customerId}", "name": "...", "kycStatus": "Verified|Pending", "memberSince": "Mon DD, YYYY", "contact": "+91-...", "email": "...", "products": ["Savings Account", ...] }`,
          'You are an Indian banking system. Generate realistic but fictional customer data.');
        response.text = `Fetching profile for customer ID ${customerId}...`;
        response.card = { type: 'customerProfile', data: profileData };
      } 
      else if (lowerMsg.includes('risk') || lowerMsg.includes('analyze') || lowerMsg.includes('underwrite')) {
        const appId = lowerMsg.match(/[A-Z0-9-]{5,}/i)?.[0] || 'APP-456-B';
        const riskData = await askGeminiJSON(`Run a risk assessment for loan application ${appId}. Return JSON:
{ "appId": "${appId}", "applicantScore": <600-850>, "dtiRatio": <0.1-0.6>, "collateral": "Sufficient|Insufficient", "recommendation": "Approve|Reject|Review", "keyFactors": [{"name": "...", "status": "positive|negative|neutral"}] }`,
          'You are an Indian bank risk analysis AI.');
        response.text = `Running AI risk assessment for application ${appId}...`;
        response.card = { type: 'riskAnalysis', data: riskData };
      } 
      else if ((lowerMsg.includes('our') || lowerMsg.includes('internal')) && (lowerMsg.includes('rate') || lowerMsg.includes('loan'))) {
        response.text = "Here are our current internal rates for loan products:";
        response.card = {
          type: 'productInfo',
          data: [
            { name: 'Fixed Home Loan (5yr)', rate: '8.45%', ltv: 80, criteria: 'Credit > 750' },
            { name: 'Variable Home Loan', rate: '8.75% (EBR-L)', ltv: 85, criteria: 'Credit > 720' },
            { name: 'Personal Loan', rate: '10.50% - 14.00%', ltv: null, criteria: 'Salary > ₹30k/mo' },
            { name: 'Business Pro Loan', rate: '11.25%', ltv: null, criteria: '3+ yrs ITR' }
          ]
        };
      } 
      else if (
        lowerMsg.includes('rate') || lowerMsg.includes('loan') || lowerMsg.includes('interest') || 
        lowerMsg.includes('credit card') || lowerMsg.includes('mortgage') || lowerMsg.includes('deposit') ||
        lowerMsg.includes('bank') || lowerMsg.includes('sbi') || lowerMsg.includes('hdfc') || lowerMsg.includes('icici')
      ) {
        const apiResponse = await fetchCompetitorData(userMessage);
        response.text = apiResponse.text;
        response.card = apiResponse.card;
      } 
      else if (lowerMsg.includes('help') || lowerMsg.includes('what can you')) {
        response.text = "As an internal assistant powered by Gemini AI, I can help you with:\n\n✓ Look up Customer Profiles (e.g., 'profile for 123456')\n✓ Analyze Risk for Applications (e.g., 'analyze risk for APP-101')\n✓ Check Internal Product Rates (e.g., 'our home loan rates')\n✓ Fetch Competitor Rates via Google Search (e.g., 'SBI personal loan rate')\n✓ Ask me anything about banking, compliance, or finance!";
      } 
      else {
        // General AI chat — use Gemini for any banking question
        const aiResponse = await chatWithAdvisor(userMessage);
        response.text = aiResponse;
      }
    
    } catch (error) {
      console.error("Error in processMessage:", error);
      response.text = "An unexpected error occurred. Please try again.";
      response.card = null;
    }

    setMessages(prev => [...prev, response]);
    setIsTyping(false);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMessage = { type: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    processMessage(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoice = () => {
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => {
        const query = "What is the HDFC personal loan rate?";
        setInput(query);
        setIsListening(false);
      }, 2000);
    }
  };

  const QuickAction = ({ icon: Icon, text, query }: { icon: React.ElementType; text: string; query: string }) => (
    <button
      onClick={() => {
        const userMessage = { type: 'user', text: query, timestamp: new Date() };
        setMessages(prev => [...prev, userMessage]);
        processMessage(query);
        setInput('');
      }}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-lg transition-all duration-300 border border-gray-600 hover:border-gray-500 shadow-sm hover:shadow"
    >
      <Icon className="w-4 h-4 text-emerald-400" />
      <span className="text-sm font-medium text-gray-200">{text}</span>
    </button>
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderCard = (card: { type: string; data: any }) => {
    if (!card) return null;

    switch (card.type) {
      case 'customerProfile':
        return (
          <div className="mt-3 p-4 bg-gray-800 rounded-xl border border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <h4 className="font-semibold text-emerald-300">Customer Profile</h4>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                card.data.kycStatus === 'Verified' 
                ? 'bg-green-900 text-green-300' 
                : 'bg-red-900 text-red-300'
              }`}>
                KYC: {card.data.kycStatus}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Name:</span> <span className="font-semibold text-white">{card.data.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Customer ID:</span> <span className="font-semibold text-white">{card.data.id}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Contact:</span> <span className="font-semibold text-white">{card.data.contact}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Member Since:</span> <span className="font-semibold text-white">{card.data.memberSince}</span></div>
              <div className="mt-3 pt-3 border-t border-gray-600">
                <span className="text-gray-400">Active Products:</span>
                <p className="font-semibold text-white">{card.data.products.join(', ')}</p>
              </div>
            </div>
          </div>
        );

      case 'riskAnalysis':
        return (
          <div className="mt-3 p-4 bg-gray-800 rounded-xl border border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-yellow-400" />
                <h4 className="font-semibold text-yellow-300">Risk Assessment</h4>
              </div>
              <span className="text-lg font-bold text-yellow-300">App ID: {card.data.appId}</span>
            </div>
            <div className="text-center p-3 bg-gray-900 rounded-lg mb-3">
              <span className="text-sm text-gray-400">Recommendation</span>
              <h3 className={`text-2xl font-bold ${card.data.recommendation === 'Approve' ? 'text-green-400' : 'text-red-400'}`}>
                {card.data.recommendation}
              </h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Applicant Score:</span> <span className="font-semibold text-white">{card.data.applicantScore}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">DTI Ratio:</span> <span className="font-semibold text-white">{(card.data.dtiRatio * 100).toFixed(0)}%</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Collateral:</span> <span className="font-semibold text-white">{card.data.collateral}</span></div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-600">
              <h5 className="text-xs text-gray-400 mb-1">Key Factors:</h5>
              <ul className="space-y-1">
                {card.data.keyFactors.map((factor: { name: string; status: string }, idx: number) => (
                  <li key={idx} className={`flex items-center gap-2 text-xs ${
                    factor.status === 'positive' ? 'text-green-400' : (factor.status === 'neutral' ? 'text-gray-300' : 'text-red-400')
                  }`}>
                    {factor.status === 'positive' ? <CheckCircle className="w-3 h-3" /> : (factor.status === 'neutral' ? <AlertCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />)}
                    {factor.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 'productInfo':
        return (
          <div className="mt-3 space-y-2">
            {card.data.map((product: { name: string; rate: string; criteria: string; ltv?: number }, idx: number) => (
              <div key={idx} className="p-3 bg-gray-800 rounded-lg border border-gray-700 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-semibold text-emerald-300">{product.name}</h5>
                  <span className="text-sm font-bold text-emerald-300">{product.rate}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Criteria: <strong className="text-white">{product.criteria}</strong></span>
                  {product.ltv && <span>LTV: <strong className="text-white">{product.ltv}%</strong></span>}
                </div>
              </div>
            ))}
          </div>
        );
      
      case 'externalData': {
        const { bankName, products, sourceURL, sourceTitle } = card.data;
        return (
          <div className="mt-3 p-4 bg-gray-800 rounded-xl border border-gray-700 shadow-sm">
             <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-2">
                 <Search className="w-5 h-5 text-gray-400" />
                 <h4 className="font-semibold text-white">{bankName}</h4>
               </div>
               <a 
                 href={sourceURL} 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className="flex items-center gap-1 text-xs text-emerald-400 hover:underline"
               >
                 View Source <ExternalLink className="w-3 h-3" />
               </a>
             </div>
             
             <div className="overflow-x-auto rounded-lg border border-gray-700">
               <table className="w-full text-sm text-left">
                 <thead className="bg-gray-900 text-xs text-gray-400 uppercase">
                   <tr>
                     <th scope="col" className="px-4 py-2">Product</th>
                     <th scope="col" className="px-4 py-2">Rate</th>
                   </tr>
                 </thead>
                 <tbody className="bg-gray-800">
                   {products && products.length > 0 ? products.map((product: { productName: string; interestRate: string; notes?: string }, idx: number) => (
                     <tr key={idx} className="border-b border-gray-700 last:border-b-0">
                       <td className="px-4 py-3 font-medium text-white">{product.productName}</td>
                       <td className="px-4 py-3 text-emerald-300 font-semibold">{product.interestRate}</td>
                     </tr>
                   )) : (
                     <tr>
                       <td colSpan={2} className="px-4 py-3 text-center text-gray-400">No specific products found.</td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
             
             {products && products.some((p: { notes?: string }) => p.notes) && (
                <div className="mt-3">
                  <h5 className="text-xs text-gray-400 mb-1">Notes:</h5>
                  <ul className="space-y-1 list-disc list-inside text-xs text-gray-300">
                    {products.filter((p: { notes?: string }) => p.notes).map((p: { productName: string; notes?: string }, idx: number) => (
                      <li key={idx}><strong>{p.productName}:</strong> {p.notes}</li>
                    ))}
                  </ul>
                </div>
             )}

             <p className="text-xs text-gray-500 pt-2 border-t border-gray-600 mt-3">
               Source: {sourceTitle} (Grounded search)
             </p>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto bg-gradient-to-br from-gray-900 via-emerald-900 to-gray-900 text-white">
      <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Internal Banking Assistant</h1>
            <p className="text-emerald-100 text-sm">Customer & Risk Management Copilot</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-800 border-b border-gray-700 shadow-sm">
        <p className="text-xs text-gray-400 mb-2 font-medium">Employee Quick Actions:</p>
        <div className="flex flex-wrap gap-2">
          <QuickAction icon={UserCheck} text="Find Customer" query="Profile for customer 123456" />
          <QuickAction icon={ShieldCheck} text="Analyze Risk" query="Analyze risk for application 789-L" />
          <QuickAction icon={Percent} text="Our Product Rates" query="What are our personal loan rates?" />
          <QuickAction icon={Search} text="SBI Rate" query="What is the SBI personal loan rate?" />
          <QuickAction icon={Search} text="HDFC Rate" query="What is the HDFC home loan rate?" />
          <QuickAction icon={Search} text="ICICI Rate" query="What is the ICICI car loan rate?" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
            <div className={`flex gap-3 max-w-3xl ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
                msg.type === 'user' 
                  ? 'bg-gradient-to-br from-blue-500 to-cyan-600'
                  : 'bg-gradient-to-br from-emerald-600 to-teal-700'
              }`}>
                {msg.type === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div className={`rounded-2xl p-4 shadow-md ${
                msg.type === 'user' 
                  ? 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white' 
                  : 'bg-gray-700 border border-gray-600 text-white'
              }`}>
                <p className="text-sm whitespace-pre-line">
                  {msg.text}
                </p>
                {msg.card && renderCard(msg.card)}
                <p className={`text-xs mt-2 ${msg.type === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start animate-fadeIn">
            <div className="flex gap-3 max-w-3xl">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-700 shadow-md">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-gray-700 border border-gray-600 rounded-2xl p-4 shadow-md">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-gray-800 border-t border-gray-700 shadow-lg">
        <div className="flex gap-2">
          <button
            onClick={toggleVoice}
            className={`p-3 rounded-full transition-all duration-300 ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <Mic className={`w-5 h-5 ${isListening ? 'text-white' : 'text-gray-300'}`} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about customers, risk, or products..."
            className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-full hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-bounce {
          animation: bounce 1s infinite;
        }
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
      `}</style>
    </div>
  );
};

export default AIChatbot;