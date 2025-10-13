import React from 'react';
import { TrendingUp, TrendingDown, Users } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: string;
}

const iconMap: { [key: string]: React.ElementType } = {
  TrendingUp,
  TrendingDown,
  Users,
};

const StatsCard: React.FC<StatsCardProps> = ({ title, value, change, trend, icon }) => {
  const Icon = iconMap[icon];
  const trendColor = trend === 'up' ? 'text-green-500' : 'text-red-500';

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        {Icon && <Icon className={`w-8 h-8 ${trendColor}`} />}
      </div>
      <div className={`mt-2 flex items-center text-sm ${trendColor}`}>
        {trend === 'up' ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
        <span>{change} vs last month</span>
      </div>
    </div>
  );
};

export default StatsCard;