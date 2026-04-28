#!/usr/bin/env node
/**
 * Quick script to seed one fraud demo alert via the scoring endpoint.
 * Run: node seed_fraud_demo.js
 */

const BACKEND_URL = 'http://localhost:3002/api';

const sampleTransaction = {
  user_id: 'demo-user-001',
  transaction_id: 'TXN-DEMO-' + Date.now(),
  amount: 45000,
  channel: 'UPI',
  merchant: 'Amazon Pay',
  device_id: 'device-xyz-unusual',
  ip_address: '203.12.100.45',
  geo_location: { city: 'Singapore', country: 'SG' },
  transaction_type: 'TRANSFER',
  previous_amounts: [1000, 2000, 1500],
  previous_locations: ['Mumbai', 'Mumbai', 'Bangalore'],
};

async function seedFraudDemo() {
  try {
    console.log('🔄 Seeding fraud demo alert...\n');
    console.log('📤 Posting sample transaction:', JSON.stringify(sampleTransaction, null, 2));

    const response = await fetch(`${BACKEND_URL}/fraud/score-transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleTransaction),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('\n❌ Error response:', data);
      process.exit(1);
    }

    console.log('\n✅ Success! Response:');
    console.log(JSON.stringify(data, null, 2));

    if (data.alert) {
      console.log('\n🎯 Demo fraud alert created:');
      console.log(`   ID: ${data.alert.id}`);
      console.log(`   Fraud Score: ${(data.alert.fraud_score * 100).toFixed(1)}%`);
      console.log(`   Type: ${data.alert.fraud_type}`);
      console.log(`   Status: ${data.alert.status}`);
    } else {
      console.log('\n⚠️  No alert was created (fraud score may have been < 0.3).');
    }

    console.log('\n💡 Refresh http://localhost:3000/dashboard/FD to see it!');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error('\n💡 Make sure npm run dev is running and backend is at http://localhost:3002');
    process.exit(1);
  }
}

seedFraudDemo();
