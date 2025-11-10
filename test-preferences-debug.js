#!/usr/bin/env node

const BASE_URL = 'http://localhost:8080/api';

// Get token from environment
const AUTH_TOKEN = process.env.AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.error('❌ AUTH_TOKEN environment variable not set');
  process.exit(1);
}

async function checkKnowledgeSources() {
  console.log('\n📚 Checking Knowledge Sources\n');
  
  try {
    const response = await fetch(`${BASE_URL}/knowledge-sources`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Found ${data.sources?.length || 0} knowledge sources`);
      
      if (data.sources && data.sources.length > 0) {
        data.sources.forEach((source, idx) => {
          console.log(`\n${idx + 1}. Type: ${source.source_type}`);
          console.log(`   Status: ${source.processing_status}`);
          console.log(`   Created: ${source.created_at}`);
          if (source.source_identifier) {
            console.log(`   Identifier: ${source.source_identifier}`);
          }
        });
      } else {
        console.log('\n⚠️  No knowledge sources found. Add a resume or LinkedIn profile first.');
      }
    } else {
      console.log('❌ Failed to fetch knowledge sources:', data);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

async function testPreferencesPredict() {
  console.log('\n🧪 Testing Preferences Prediction\n');
  
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
        
        if (data.preferences.preferred_industries?.length > 0) {
          console.log('\nTop Industries:', data.preferences.preferred_industries.slice(0, 3).join(', '));
        }
        if (data.preferences.preferred_roles?.length > 0) {
          console.log('Top Roles:', data.preferences.preferred_roles.slice(0, 3).join(', '));
        }
      }
    } else {
      console.log('\n❌ Preferences prediction failed');
      if (data.message) {
        console.log(`\nError message: ${data.message}`);
      }
      if (data.stack) {
        console.log(`\nStack trace:\n${data.stack}`);
      }
      if (data.name) {
        console.log(`Error type: ${data.name}`);
      }
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
  }
}

async function main() {
  await checkKnowledgeSources();
  console.log('\n' + '='.repeat(60));
  await testPreferencesPredict();
}

main().catch(console.error);
