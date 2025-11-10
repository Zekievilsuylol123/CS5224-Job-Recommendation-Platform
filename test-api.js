/**
 * API Endpoint Tester
 * 
 * Run this in the browser console while logged in to test all endpoints.
 * It will use your current session token automatically.
 */

const API_BASE = 'http://localhost:8080/api';

// Get auth token from supabase session
async function getAuthToken() {
  try {
    // Try to get from local storage first (faster)
    const authData = localStorage.getItem('sb-nvkdepbkmptnqwxupfrr-auth-token');
    if (authData) {
      const parsed = JSON.parse(authData);
      if (parsed?.access_token) {
        return parsed.access_token;
      }
    }
    
    // Fallback: try window.__supabase or any global supabase instance
    if (typeof window !== 'undefined') {
      // Check for supabase in window
      const supabase = window.__supabase || 
                       window.supabase || 
                       (window.App && window.App.supabase);
      
      if (supabase?.auth?.getSession) {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || null;
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Could not get auth token:', error.message);
    return null;
  }
}

// Helper to make API calls
async function testEndpoint(method, path, description, body = null) {
  const token = await getAuthToken();
  
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
    const data = await response.json();
    
    if (response.ok) {
      console.log(`   ✅ Success (${response.status})`);
      console.log('   Response:', data);
    } else {
      console.error(`   ❌ Failed (${response.status})`);
      console.error('   Error:', data);
    }
    
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    console.error(`   ❌ Error:`, error);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.clear();
  console.log('🚀 Starting API Endpoint Tests...\n');
  console.log('=' .repeat(60));
  
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
  console.log('=' .repeat(60));
  
  trackResult(await testEndpoint('GET', '/health', 'Health Check'));
  trackResult(await testEndpoint('GET', '/plans', 'Get Plans'));
  trackResult(await testEndpoint('GET', '/jobs/meta/filters', 'Get Job Filters'));
  
  // 2. Jobs
  console.log('\n📋 Section 2: Jobs Endpoints');
  console.log('=' .repeat(60));
  
  trackResult(await testEndpoint('GET', '/jobs?limit=5', 'List Jobs (5 items)'));
  trackResult(await testEndpoint('GET', '/jobs?search=software&limit=3', 'Search Jobs'));
  
  // Get a job ID from the list for detail test
  const jobsResult = await testEndpoint('GET', '/jobs?limit=1', 'Get First Job');
  if (jobsResult.success && jobsResult.data?.items?.[0]?.id) {
    const jobId = jobsResult.data.items[0].id;
    trackResult(await testEndpoint('GET', `/jobs/${jobId}`, 'Get Job Detail'));
  }
  
  // 3. Profile (requires auth)
  console.log('\n📋 Section 3: Profile Endpoints (Auth Required)');
  console.log('=' .repeat(60));
  
  const token = await getAuthToken();
  if (!token) {
    console.warn('⚠️  No auth token found. Please login first.');
    console.log('   Skipping authenticated endpoints...');
  } else {
    trackResult(await testEndpoint('GET', '/profile', 'Get Profile'));
    trackResult(await testEndpoint('PUT', '/profile', 'Update Profile', {
      name: 'Test User',
      skills: ['JavaScript', 'TypeScript']
    }));
  }
  
  // 4. Knowledge Sources (requires auth)
  if (token) {
    console.log('\n📋 Section 4: Knowledge Sources');
    console.log('=' .repeat(60));
    
    trackResult(await testEndpoint('GET', '/knowledge-sources', 'List Knowledge Sources'));
    
    // Try to add a text source
    const addSourceResult = await testEndpoint('POST', '/knowledge-sources/text', 'Add Text Source', {
      content: 'I am a software engineer with 5 years of experience in React, Node.js, and TypeScript. I have worked on large-scale web applications.'
    });
    trackResult(addSourceResult);
    
    // If successful, try to delete it
    if (addSourceResult.success && addSourceResult.data?.source?.id) {
      trackResult(await testEndpoint('DELETE', `/knowledge-sources/${addSourceResult.data.source.id}`, 'Delete Test Source'));
    }
  }
  
  // 5. Preferences (requires auth and knowledge sources)
  if (token) {
    console.log('\n📋 Section 5: Preferences');
    console.log('=' .repeat(60));
    
    trackResult(await testEndpoint('GET', '/preferences', 'Get Preferences'));
    
    // Don't auto-run predict to avoid API costs
    console.log('\n⏭️  Skipping POST /preferences/predict (LLM API call)');
    console.log('   Run manually: testEndpoint("POST", "/preferences/predict", "Predict Preferences")');
  }
  
  // 6. Applications (requires auth)
  if (token) {
    console.log('\n📋 Section 6: Applications');
    console.log('=' .repeat(60));
    
    trackResult(await testEndpoint('GET', '/applications', 'List Applications'));
  }
  
  // 7. Resume Analysis (requires auth)
  if (token) {
    console.log('\n📋 Section 7: Resume Analysis');
    console.log('=' .repeat(60));
    
    trackResult(await testEndpoint('GET', '/resume/analyses', 'List Resume Analyses'));
  }
  
  // 8. Materials Generation (requires auth) - Skip to avoid API costs
  console.log('\n📋 Section 8: Material Generation');
  console.log('=' .repeat(60));
  console.log('⏭️  Skipped (requires job IDs and makes LLM API calls)');
  
  // 9. HR Search (requires auth) - Skip to avoid API costs
  console.log('\n📋 Section 9: HR Search');
  console.log('=' .repeat(60));
  console.log('⏭️  Skipped (makes external API calls)');
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Summary');
  console.log('=' .repeat(60));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('=' .repeat(60));
  
  return results;
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  console.log('💡 API Tester loaded!');
  console.log('   Run: runAllTests()');
  console.log('   Or test individual endpoints: testEndpoint("GET", "/health", "Health Check")');
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testEndpoint, runAllTests, getAuthToken };
}
