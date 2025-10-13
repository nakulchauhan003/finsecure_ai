import { StatItem } from './types';

export const mockStats: StatItem[] = [
  {
    title: 'Total Revenue',
    value: '$1,234,567',
    change: '+12.5%',
    trend: 'up',
    icon: 'TrendingUp',
  },
  {
    title: 'Monthly Growth',
    value: '23.5%',
    change: '+5.2%',
    trend: 'up',
    icon: 'TrendingUp',
  },
  {
    title: 'Active Accounts',
    value: '8,642',
    change: '+3.1%',
    trend: 'up',
    icon: 'Users',
  },
  {
    title: 'Average Transaction',
    value: '$142.50',
    change: '-2.3%',
    trend: 'down',
    icon: 'TrendingDown',
  },
];

export const areaChartData = [
  { name: 'Jan', revenue: 4000 },
  { name: 'Feb', revenue: 3000 },
  { name: 'Mar', revenue: 5000 },
  { name: 'Apr', revenue: 4500 },
  { name: 'May', revenue: 6000 },
  { name: 'Jun', revenue: 5500 },
  { name: 'Jul', revenue: 7000 },
  { name: 'Aug', revenue: 6500 },
  { name: 'Sep', revenue: 7500 },
  { name: 'Oct', revenue: 7000 },
  { name: 'Nov', revenue: 8000 },
  { name: 'Dec', revenue: 9000 },
];

export const barChartData = [
  { name: 'Week 1', revenue: 1200 },
  { name: 'Week 2', revenue: 1500 },
  { name: 'Week 3', revenue: 1300 },
  { name: 'Week 4', revenue: 1800 },
];

export const pieChartData = [
  { name: 'Loans', value: 400 },
  { name: 'Credit Cards', value: 300 },
  { name: 'Investments', value: 300 },
  { name: 'Other', value: 200 },
];

export const lineChartData = [
  { name: 'Q1', revenue: 2000, goal: 2400 },
  { name: 'Q2', revenue: 2200, goal: 2500 },
  { name: 'Q3', revenue: 3000, goal: 2800 },
  { name: 'Q4', revenue: 3500, goal: 3200 },
];