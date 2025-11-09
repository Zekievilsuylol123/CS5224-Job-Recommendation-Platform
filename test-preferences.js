#!/usr/bin/env node

const BASE_URL = 'http://localhost:8080/api';

// Get token from environment
const AUTH_TOKEN = process.env.AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.error('❌ AUTH_TOKEN environment variable not set');
  process.exit(1);
}

async function testPreferencesPredict() {
  console.log('\n🧪 Testing Preferences Prediction Endpoint\n');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/preferences/predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    
    const duration = Date.now() - startTime;
    const data = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log(`Duration: ${duration}ms`);
    console.log('\nResponse:');
    console.log(JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Preferences prediction succeeded!');
      if (data.preferences) {
        console.log(`\nPredicted Industries: ${data.preferences.preferred_industries?.length || 0}`);
        console.log(`Predicted Roles: ${data.preferences.preferred_roles?.length || 0}`);
        console.log(`Predicted Companies: ${data.preferences.preferred_companies?.length || 0}`);
      }
    } else {
      console.log('\n❌ Preferences prediction failed');
      if (data.message) {
        console.log(`Error message: ${data.message}`);
      }
      if (data.stack) {
        console.log(`\nStack trace:\n${data.stack}`);
      }
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  }
}

// Run the test
testPreferencesPredict().catch(console.error);
