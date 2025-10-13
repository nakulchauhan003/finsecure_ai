import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useRevenueData = () => {
  const [data, setData] = useState({
    subscriptions: [],
    billingAnomalies: [],
    churnRisks: [],
    paymentFailures: [],
    usagePatterns: [],
    revenueMetrics: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // If no user, use mock data
        const mockData = await import('../data/revenueData');
        setData({
          subscriptions: [],
          billingAnomalies: mockData.billingAnomalies,
          churnRisks: mockData.churnRiskCustomers,
          paymentFailures: mockData.paymentFailures,
          usagePatterns: mockData.usagePatterns,
          revenueMetrics: mockData.revenueMetrics,
          monthlyRevenueData: mockData.monthlyRevenueData,
          churnPredictionData: mockData.churnPredictionData,
          recoveryOpportunities: mockData.recoveryOpportunities,
          loading: false,
          error: null
        });
        return;
      }

      // Fetch data from Supabase
      const [
        subscriptionsResult,
        anomaliesResult,
        churnRisksResult,
        paymentFailuresResult,
        usagePatternsResult,
        revenueMetricsResult
      ] = await Promise.all([
        supabase.from('app_64f1f5809f_subscriptions').select('*').order('created_at', { ascending: false }),
        supabase.from('app_64f1f5809f_billing_anomalies').select('*').order('detected_at', { ascending: false }),
        supabase.from('app_64f1f5809f_churn_risks').select('*').order('risk_score', { ascending: false }),
        supabase.from('app_64f1f5809f_payment_failures').select('*').order('failed_at', { ascending: false }),
        supabase.from('app_64f1f5809f_usage_patterns').select('*').order('recorded_at', { ascending: false }),
        supabase.from('app_64f1f5809f_revenue_metrics').select('*').order('metric_date', { ascending: false })
      ]);

      // Check for errors
      const errors = [subscriptionsResult, anomaliesResult, churnRisksResult, paymentFailuresResult, usagePatternsResult, revenueMetricsResult]
        .filter(result => result.error);

      if (errors.length > 0) {
        console.error('Database errors:', errors);
        // Fall back to mock data if there are database errors
        const mockData = await import('../data/revenueData');
        setData({
          subscriptions: [],
          billingAnomalies: mockData.billingAnomalies,
          churnRisks: mockData.churnRiskCustomers,
          paymentFailures: mockData.paymentFailures,
          usagePatterns: mockData.usagePatterns,
          revenueMetrics: mockData.revenueMetrics,
          monthlyRevenueData: mockData.monthlyRevenueData,
          churnPredictionData: mockData.churnPredictionData,
          recoveryOpportunities: mockData.recoveryOpportunities,
          loading: false,
          error: 'Using demo data - database connection issues'
        });
        return;
      }

      // If database is empty, populate with sample data
      if (subscriptionsResult.data.length === 0) {
        await populateSampleData(user.id);
        // Refetch after populating
        return fetchAllData();
      }

      // Process and set the data
      const mockData = await import('../data/revenueData');
      setData({
        subscriptions: subscriptionsResult.data || [],
        billingAnomalies: anomaliesResult.data || mockData.billingAnomalies,
        churnRisks: churnRisksResult.data || mockData.churnRiskCustomers,
        paymentFailures: paymentFailuresResult.data || mockData.paymentFailures,
        usagePatterns: usagePatternsResult.data || mockData.usagePatterns,
        revenueMetrics: revenueMetricsResult.data || mockData.revenueMetrics,
        monthlyRevenueData: mockData.monthlyRevenueData,
        churnPredictionData: mockData.churnPredictionData,
        recoveryOpportunities: mockData.recoveryOpportunities,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      // Fall back to mock data on error
      const mockData = await import('../data/revenueData');
      setData({
        subscriptions: [],
        billingAnomalies: mockData.billingAnomalies,
        churnRisks: mockData.churnRiskCustomers,
        paymentFailures: mockData.paymentFailures,
        usagePatterns: mockData.usagePatterns,
        revenueMetrics: mockData.revenueMetrics,
        monthlyRevenueData: mockData.monthlyRevenueData,
        churnPredictionData: mockData.churnPredictionData,
        recoveryOpportunities: mockData.recoveryOpportunities,
        loading: false,
        error: 'Using demo data - ' + error.message
      });
    }
  };

  const populateSampleData = async (userId) => {
    try {
      // Insert sample subscriptions
      const subscriptions = [
        { user_id: userId, customer_name: 'TechCorp Inc', plan_type: 'Enterprise', mrr: 5500, status: 'active' },
        { user_id: userId, customer_name: 'StartupXYZ', plan_type: 'Professional', mrr: 2200, status: 'active' },
        { user_id: userId, customer_name: 'Enterprise Ltd', plan_type: 'Enterprise Plus', mrr: 12000, status: 'active' },
        { user_id: userId, customer_name: 'GrowthCo', plan_type: 'Professional', mrr: 3400, status: 'active' },
        { user_id: userId, customer_name: 'ScaleTech', plan_type: 'Enterprise', mrr: 7800, status: 'active' }
      ];

      await supabase.from('app_64f1f5809f_subscriptions').insert(subscriptions);

      // Insert sample billing anomalies
      const anomalies = [
        { user_id: userId, anomaly_type: 'Duplicate Charge', customer_name: 'TechCorp Inc', amount: 5500, severity: 'High' },
        { user_id: userId, anomaly_type: 'Pricing Mismatch', customer_name: 'StartupXYZ', amount: 2200, severity: 'Medium' },
        { user_id: userId, anomaly_type: 'Failed Proration', customer_name: 'Enterprise Ltd', amount: 1200, severity: 'Low' },
        { user_id: userId, anomaly_type: 'Currency Error', customer_name: 'GrowthCo', amount: 3400, severity: 'High' },
        { user_id: userId, anomaly_type: 'Tax Calculation', customer_name: 'ScaleTech', amount: 780, severity: 'Medium' }
      ];

      await supabase.from('app_64f1f5809f_billing_anomalies').insert(anomalies);

      // Insert sample churn risks
      const churnRisks = [
        { user_id: userId, customer_name: 'TechCorp Inc', risk_score: 85, risk_factors: ['Declining usage'], days_to_churn: 15 },
        { user_id: userId, customer_name: 'StartupXYZ', risk_score: 78, risk_factors: ['Payment issues'], days_to_churn: 8 },
        { user_id: userId, customer_name: 'Enterprise Ltd', risk_score: 72, risk_factors: ['Support tickets'], days_to_churn: 22 },
        { user_id: userId, customer_name: 'GrowthCo', risk_score: 69, risk_factors: ['Feature requests'], days_to_churn: 30 },
        { user_id: userId, customer_name: 'ScaleTech', risk_score: 65, risk_factors: ['Usage plateau'], days_to_churn: 45 }
      ];

      await supabase.from('app_64f1f5809f_churn_risks').insert(churnRisks);

      // Insert sample payment failures
      const paymentFailures = [
        { user_id: userId, customer_name: 'TechCorp Inc', amount: 5500, failure_reason: 'Expired card', status: 'pending' },
        { user_id: userId, customer_name: 'DataFlow LLC', amount: 3200, failure_reason: 'Insufficient funds', status: 'recovered' },
        { user_id: userId, customer_name: 'CloudSync Pro', amount: 1800, failure_reason: 'Declined', status: 'failed' },
        { user_id: userId, customer_name: 'AutoScale Inc', amount: 4500, failure_reason: 'Bank error', status: 'recovered' },
        { user_id: userId, customer_name: 'DevTools Co', amount: 2700, failure_reason: 'Expired card', status: 'pending' }
      ];

      await supabase.from('app_64f1f5809f_payment_failures').insert(paymentFailures);

      // Insert sample usage patterns
      const usagePatterns = [
        { user_id: userId, customer_name: 'TechCorp Inc', current_usage: 45, previous_usage: 78, usage_trend: -42.3 },
        { user_id: userId, customer_name: 'StartupXYZ', current_usage: 23, previous_usage: 25, usage_trend: -8.0 },
        { user_id: userId, customer_name: 'Enterprise Ltd', current_usage: 156, previous_usage: 145, usage_trend: 7.6 },
        { user_id: userId, customer_name: 'GrowthCo', current_usage: 67, previous_usage: 89, usage_trend: -24.7 },
        { user_id: userId, customer_name: 'ScaleTech', current_usage: 98, previous_usage: 102, usage_trend: -3.9 }
      ];

      await supabase.from('app_64f1f5809f_usage_patterns').insert(usagePatterns);

      // Insert sample revenue metrics
      const today = new Date();
      const revenueMetrics = [
        { user_id: userId, metric_name: 'MRR', metric_value: 485000, metric_date: today.toISOString().split('T')[0] },
        { user_id: userId, metric_name: 'Revenue Leakage', metric_value: 32500, metric_date: today.toISOString().split('T')[0] },
        { user_id: userId, metric_name: 'Churn Rate', metric_value: 4.2, metric_date: today.toISOString().split('T')[0] },
        { user_id: userId, metric_name: 'Customer LTV', metric_value: 12500, metric_date: today.toISOString().split('T')[0] }
      ];

      await supabase.from('app_64f1f5809f_revenue_metrics').insert(revenueMetrics);

    } catch (error) {
      console.error('Error populating sample data:', error);
    }
  };

  const addSubscription = async (subscriptionData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('app_64f1f5809f_subscriptions')
        .insert([{ ...subscriptionData, user_id: user.id }])
        .select();

      if (error) throw error;
      
      // Refresh data
      fetchAllData();
      return data;
    } catch (error) {
      console.error('Error adding subscription:', error);
      throw error;
    }
  };

  const updateBillingAnomaly = async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('app_64f1f5809f_billing_anomalies')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      
      // Refresh data
      fetchAllData();
      return data;
    } catch (error) {
      console.error('Error updating billing anomaly:', error);
      throw error;
    }
  };

  const updatePaymentFailure = async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('app_64f1f5809f_payment_failures')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      
      // Refresh data
      fetchAllData();
      return data;
    } catch (error) {
      console.error('Error updating payment failure:', error);
      throw error;
    }
  };

  return {
    ...data,
    refetch: fetchAllData,
    addSubscription,
    updateBillingAnomaly,
    updatePaymentFailure
  };
};