#!/usr/bin/env node

/**
 * API Endpoint Tester - CLI Version
 * Tests all public endpoints without requiring browser auth
 */

const API_BASE = 'http://localhost:8080/api';

// Helper to make API calls
async function testEndpoint(method, path, description, body = null, token = null) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`   ${method} ${path}`);
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  };
  
  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_BASE}${path}`, options);
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    if (response.ok) {
      console.log(`   ✅ Success (${response.status})`);
      if (typeof data === 'object') {
        // Show truncated response for objects
        const preview = JSON.stringify(data).substring(0, 200);
        console.log(`   Response: ${preview}${JSON.stringify(data).length > 200 ? '...' : ''}`);
      } else {
        console.log(`   Response: ${data}`);
      }
    } else {
      console.error(`   ❌ Failed (${response.status})`);
      console.error(`   Error:`, data);
    }
    
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.clear();
  console.log('🚀 Starting API Endpoint Tests (CLI)...\n');
  console.log('='.repeat(60));
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  // Track results
  const trackResult = (result) => {
    results.total++;
    if (result.success) {
      results.passed++;
    } else {
      results.failed++;
    }
  };
  
  // 1. Public Endpoints
  console.log('\n📋 Section 1: Public Endpoints');
  console.log('='.repeat(60));
  
  trackResult(await testEndpoint('GET', '/health', 'Health Check'));
  trackResult(await testEndpoint('GET', '/plans', 'Get Plans'));
  trackResult(await testEndpoint('GET', '/jobs/meta/filters', 'Get Job Filters'));
  
  // 2. Jobs
  console.log('\n📋 Section 2: Jobs Endpoints');
  console.log('='.repeat(60));
  
  trackResult(await testEndpoint('GET', '/jobs?limit=5', 'List Jobs (5 items)'));
  trackResult(await testEndpoint('GET', '/jobs?search=software&limit=3', 'Search Jobs (software)'));
  trackResult(await testEndpoint('GET', '/jobs?search=data&limit=3', 'Search Jobs (data)'));
  
  // Get a job ID from the list for detail test
  const jobsResult = await testEndpoint('GET', '/jobs?limit=1', 'Get First Job for Detail Test');
  trackResult(jobsResult);
  
  if (jobsResult.success && jobsResult.data?.items?.[0]?.id) {
    const jobId = jobsResult.data.items[0].id;
    trackResult(await testEndpoint('GET', `/jobs/${jobId}`, 'Get Job Detail'));
  }
  
  // 3. Test a few more variations
  console.log('\n📋 Section 3: Jobs with Filters');
  console.log('='.repeat(60));
  
  trackResult(await testEndpoint('GET', '/jobs?tags=JavaScript&limit=3', 'Filter by Tag (JavaScript)'));
  trackResult(await testEndpoint('GET', '/jobs?company=Google&limit=3', 'Filter by Company (Google)'));
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));
  
  console.log('\n💡 Note: Authenticated endpoints require a valid auth token.');
  console.log('   To test authenticated endpoints, get a token from the browser and run:');
  console.log('   AUTH_TOKEN=your_token node test-api-cli.js auth');
  
  return results;
}

async function runAuthTests(token) {
  console.clear();
  console.log('🚀 Starting Authenticated API Tests...\n');
  console.log('='.repeat(60));
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  const trackResult = (result) => {
    results.total++;
    if (result.success) {
      results.passed++;
    } else {
      results.failed++;
    }
  };
  
  console.log('\n📋 Profile Endpoints');
  console.log('='.repeat(60));
  trackResult(await testEndpoint('GET', '/profile', 'Get Profile', null, token));
  
  console.log('\n📋 Knowledge Sources');
  console.log('='.repeat(60));
  trackResult(await testEndpoint('GET', '/knowledge-sources', 'List Knowledge Sources', null, token));
  
  console.log('\n📋 Preferences');
  console.log('='.repeat(60));
  trackResult(await testEndpoint('GET', '/preferences', 'Get Preferences', null, token));
  
  console.log('\n📋 Applications');
  console.log('='.repeat(60));
  trackResult(await testEndpoint('GET', '/applications', 'List Applications', null, token));
  
  console.log('\n📋 Resume Analyses');
  console.log('='.repeat(60));
  trackResult(await testEndpoint('GET', '/resume/analyses', 'List Resume Analyses', null, token));
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));
  
  return results;
}

// Extract token from Supabase storage file
function getTokenFromStorage() {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  
  try {
    // Try to find browser storage (Chrome on macOS)
    const possiblePaths = [
      path.join(os.homedir(), 'Library/Application Support/Google/Chrome/Default/Local Storage/leveldb'),
      path.join(os.homedir(), 'Library/Application Support/BraveSoftware/Brave-Browser/Default/Local Storage/leveldb'),
    ];
    
    console.log('💡 Tip: Get your auth token from the browser:');
    console.log('   1. Open http://localhost:5173 and log in');
    console.log('   2. Open DevTools Console (F12)');
    console.log('   3. Run: JSON.parse(localStorage.getItem("sb-nvkdepbkmptnqwxupfrr-auth-token")).access_token');
    console.log('   4. Copy the token and run:');
    console.log('      AUTH_TOKEN=your_token node test-api-cli.js auth\n');
    
    return null;
  } catch (error) {
    return null;
  }
}

// Main
const mode = process.argv[2];
let token = process.env.AUTH_TOKEN;

if (mode === 'auth') {
  if (!token) {
    token = getTokenFromStorage();
    if (!token) {
      console.error('❌ AUTH_TOKEN environment variable is required for authenticated tests\n');
      process.exit(1);
    }
  }
  runAuthTests(token).catch(console.error);
} else {
  runAllTests().catch(console.error);
}
