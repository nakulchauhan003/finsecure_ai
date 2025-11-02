import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "../../contexts/AuthContext";
import { MessageCircle, Shield, TrendingUp, Gauge, BarChart3, Tag, DollarSign, Send, PiggyBank, User } from "lucide-react";

const DashBoardMainComponent:React.FC=()=>{
  const { user, loading: authLoading } = useAuthContext();
  
  type UserProfile = {
    name: string;
    email: string;
    username: string;
    role: string;
  };
  const [userProfileData,setUserProfileData]=useState< UserProfile | null >(null);
    
    useEffect(() => {
      if (user) {
        setUserProfileData({
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
          role: user.user_metadata?.role || 'User'
        });
      }
    }, [user]);
      
      const features = [
        {
          icon: MessageCircle,
          title: "Chatbot Assistant",
          description: "AI-powered assistant for instant support and queries.",
          action: "Launch Chat",
          route: "/dashboard/CA",
          gradient: "from-blue-500 to-cyan-500",
          bgGradient: "from-blue-500/10 to-cyan-500/10",
        },
        {
          icon: Shield,
          title: "Fraud Detection",
          description: "Real-time anomaly detection and fraud prevention.",
          action: "Start Scan",
          route: "/dashboard/FD",
          gradient: "from-red-500 to-orange-500",
          bgGradient: "from-red-500/10 to-orange-500/10",
        },
        {
          icon: User,
          title: "Risk Assessment",
          description: "Comprehensive risk analysis and evaluation.",
          action: "Analyze Risk",
          route: "/dashboard/RA",
          gradient: "from-purple-500 to-pink-500",
          bgGradient: "from-purple-500/10 to-pink-500/10",
        },
        {
          icon: Gauge,
          title: "Real-Time Optimization",
          description: "Optimize processes with live analytics.",
          action: "Optimize Now",
          route: "/dashboard/RTO",
          gradient: "from-green-500 to-emerald-500",
          bgGradient: "from-green-500/10 to-emerald-500/10",
        },
        {
          icon: BarChart3,
          title: "Interest & Term Prediction",
          description: "Predict optimal interest rates and loan terms.",
          action: "View Predictions",
          route: "/dashboard/ITP",
          gradient: "from-indigo-500 to-blue-500",
          bgGradient: "from-indigo-500/10 to-blue-500/10",
        },
        {
          icon: Tag,
          title: "Explainable AI",
          description: "Understand AI decisions with transparent insights.",
          action: "Explore",
          route: "/dashboard/ELR",
          gradient: "from-yellow-500 to-orange-500",
          bgGradient: "from-yellow-500/10 to-orange-500/10",
        },
        {
          icon: Send,
          title: "Personalized Suggestions",
          description: "Get AI-driven personalized recommendations.",
          action: "Get Suggestions",
          route: "/dashboard/PS",
          gradient: "from-pink-500 to-rose-500",
          bgGradient: "from-pink-500/10 to-rose-500/10",
        },
        {
          icon: PiggyBank,
          title: "Investment Plans",
          description: "Explore and manage investment opportunities.",
          action: "View Plans",
          route: "/dashboard/investmentplans",
          gradient: "from-teal-500 to-cyan-500",
          bgGradient: "from-teal-500/10 to-cyan-500/10",
        },
        {
          icon: DollarSign,
          title: "Dues Management",
          description: "Track and manage outstanding payments.",
          action: "View Dues",
          route: "/dashboard/Dues",
          gradient: "from-amber-500 to-yellow-500",
          bgGradient: "from-amber-500/10 to-yellow-500/10",
        },
        {
          icon: TrendingUp,
          title: "Revenue Dashboard",
          description: "Analytics for revenue, churn, and growth metrics.",
          action: "View Revenue",
          route: "http://localhost:3001/dashboard/revenue",
          gradient: "from-violet-500 to-purple-500",
          bgGradient: "from-violet-500/10 to-purple-500/10",
          isExternal: true,
        },
      ];
      
    return(
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-3 flex items-center gap-3">
            <BarChart3 className="w-12 h-12 text-purple-400" />
            Dashboard Overview
          </h1>
          <p className="text-purple-300 text-lg">Access all your financial AI tools in one place</p>
        </div>

        {/* Loading State */}
        {authLoading && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 mb-10 shadow-2xl">
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-purple-300 ml-4">Loading profile...</p>
            </div>
          </div>
        )}

        {/* User Info Card */}
        {!authLoading && userProfileData && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 mb-10 shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                {userProfileData.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-1">
                  Welcome back, {userProfileData.name}!
                </h2>
                <p className="text-purple-300">Ready to explore your financial insights</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
              <div>
                <p className="text-purple-300 text-sm mb-1">Username</p>
                <p className="text-white font-semibold text-lg">{userProfileData.username}</p>
              </div>
              <div>
                <p className="text-purple-300 text-sm mb-1">Email</p>
                <p className="text-white font-semibold text-lg">{userProfileData.email}</p>
              </div>
              <div>
                <p className="text-purple-300 text-sm mb-1">Role</p>
                <p className="text-white font-semibold text-lg capitalize">{userProfileData.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            const cardContent = (
              <div
                className={`bg-gradient-to-br ${feature.bgGradient} backdrop-blur-lg border border-white/20 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-white/40 cursor-pointer h-full flex flex-col`}
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-purple-200 mb-6 flex-grow">{feature.description}</p>
                <button
                  type="button"
                  className={`w-full bg-gradient-to-r ${feature.gradient} text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 group`}
                >
                  {feature.action}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>
            );

            return feature.isExternal ? (
              <a
                key={index}
                href={feature.route}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {cardContent}
              </a>
            ) : (
              <Link key={index} to={feature.route} className="block">
                {cardContent}
              </Link>
            );
          })}
        </div>

        {/* Quick Stats Section */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
            <p className="text-purple-300 text-sm mb-2">Total Features</p>
            <p className="text-4xl font-bold text-white">{features.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
            <p className="text-purple-300 text-sm mb-2">AI Models Active</p>
            <p className="text-4xl font-bold text-white">8</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
            <p className="text-purple-300 text-sm mb-2">System Status</p>
            <p className="text-4xl font-bold text-green-400">Online</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
            <p className="text-purple-300 text-sm mb-2">Uptime</p>
            <p className="text-4xl font-bold text-white">99.9%</p>
          </div>
        </div>
      </div>
    </div>

    )
}
export default DashBoardMainComponent;
