#!/usr/bin/env node

/**
 * LLM-Powered Endpoints Tester
 * Tests all endpoints that use OpenAI/LLM features
 */

const API_BASE = 'http://localhost:8080/api';

// Get auth token from environment
const AUTH_TOKEN = process.env.AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.error('❌ AUTH_TOKEN environment variable is required');
  console.log('\n💡 Get your token from browser console:');
  console.log('   JSON.parse(localStorage.getItem("sb-nvkdepbkmptnqwxupfrr-auth-token")).access_token');
  console.log('\nThen run:');
  console.log('   AUTH_TOKEN="your_token" node test-llm-endpoints.js');
  process.exit(1);
}

// Helper to make API calls
async function testEndpoint(method, path, description, body = null, options = {}) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`   ${method} ${path}`);
  
  const requestOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    }
  };
  
  if (body && (method === 'POST' || method === 'PUT')) {
    requestOptions.body = JSON.stringify(body);
  }
  
  try {
    const startTime = Date.now();
    const response = await fetch(`${API_BASE}${path}`, requestOptions);
    const duration = Date.now() - startTime;
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    if (response.ok) {
      console.log(`   ✅ Success (${response.status}) - ${duration}ms`);
      if (options.showFullResponse) {
        console.log('   Response:', JSON.stringify(data, null, 2));
      } else if (typeof data === 'object') {
        // Show structure without full content
        const preview = JSON.stringify(data, null, 2).substring(0, 300);
        console.log(`   Response preview: ${preview}${JSON.stringify(data).length > 300 ? '...' : ''}`);
      } else {
        console.log(`   Response: ${data}`);
      }
    } else {
      console.error(`   ❌ Failed (${response.status}) - ${duration}ms`);
      console.error('   Error:', data);
    }
    
    return { success: response.ok, status: response.status, data, duration };
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runLLMTests() {
  console.clear();
  console.log('🤖 Testing LLM-Powered Endpoints...\n');
  console.log('='.repeat(60));
  console.log('⚠️  Note: These tests may be slow and consume API credits');
  console.log('='.repeat(60));
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0,
    skipped: 0
  };
  
  const trackResult = (result) => {
    results.total++;
    if (result.success) {
      results.passed++;
    } else {
      results.failed++;
    }
  };
  
  // First, get a job ID for testing
  console.log('\n📋 Setup: Getting a job ID for testing');
  console.log('='.repeat(60));
  
  const jobsResult = await testEndpoint('GET', '/jobs?limit=1', 'Get First Job');
  let testJobId = null;
  
  if (jobsResult.success && jobsResult.data?.items?.[0]?.id) {
    testJobId = jobsResult.data.items[0].id;
    console.log(`   ℹ️  Using job ID: ${testJobId}`);
  } else {
    console.error('   ❌ Could not get a test job ID. Some tests will be skipped.');
  }
  
  // 1. Knowledge Base - Resume Upload (LLM parsing)
  console.log('\n📋 Section 1: Knowledge Base - LLM Resume Parsing');
  console.log('='.repeat(60));
  console.log('⏭️  Skipped (requires file upload, tested via UI)');
  results.skipped++;
  
  // 2. Preferences - LLM Prediction
  console.log('\n📋 Section 2: Preferences - LLM Prediction');
  console.log('='.repeat(60));
  
  console.log('\n⚠️  This endpoint uses LLM and may take 10-30 seconds...');
  const predictResult = await testEndpoint(
    'POST',
    '/preferences/predict',
    'Predict User Preferences (LLM)',
    null,
    { showFullResponse: true }
  );
  trackResult(predictResult);
  
  // 3. Job Analysis - Comprehensive LLM Scoring
  if (testJobId) {
    console.log('\n📋 Section 3: Job Analysis - LLM Scoring');
    console.log('='.repeat(60));
    
    console.log('\n⚠️  This endpoint uses LLM and may take 30-60 seconds...');
    const analyzeResult = await testEndpoint(
      'POST',
      `/jobs/${testJobId}/analyze`,
      'Analyze Job Fit (LLM with detailed breakdown)',
      null,
      { showFullResponse: false }
    );
    trackResult(analyzeResult);
    
    if (analyzeResult.success) {
      console.log('\n   📊 Analysis Details:');
      if (analyzeResult.data?.overall) {
        console.log(`      Overall Score: ${analyzeResult.data.overall.score}/100`);
        console.log(`      Verdict: ${analyzeResult.data.overall.verdict}`);
      }
      if (analyzeResult.data?.compass) {
        console.log(`      COMPASS Score: ${analyzeResult.data.compass}/100`);
      }
    }
  } else {
    console.log('\n📋 Section 3: Job Analysis - LLM Scoring');
    console.log('='.repeat(60));
    console.log('⏭️  Skipped (no test job ID)');
    results.skipped++;
  }
  
  // 4. COMPASS Assessment (Legacy)
  console.log('\n📋 Section 4: COMPASS Assessment - LLM Scoring');
  console.log('='.repeat(60));
  
  const compassPayload = {
    profile: {
      competencies: ['JavaScript', 'React', 'Node.js'],
      objectives: ['Software Engineer', 'Full Stack Developer'],
      motivations: ['Innovation', 'Learning', 'Impact'],
      preferences: {
        location: 'Singapore',
        workArrangement: 'Hybrid',
        companySize: 'Startup'
      },
      alignment: {
        values: ['Innovation', 'Collaboration'],
        culture: 'Fast-paced startup'
      },
      summary: 'Software engineer with 5 years of experience'
    },
    role: {
      title: 'Senior Software Engineer',
      description: 'We are looking for a senior software engineer to join our team...',
      requirements: ['5+ years experience', 'React expertise', 'Node.js'],
      location: 'Singapore',
      workArrangement: 'Hybrid'
    }
  };
  
  console.log('\n⚠️  This endpoint uses LLM and may take 20-40 seconds...');
  const compassResult = await testEndpoint(
    'POST',
    '/assessments/compass',
    'COMPASS Assessment (LLM)',
    compassPayload,
    { showFullResponse: false }
  );
  trackResult(compassResult);
  
  if (compassResult.success) {
    console.log('\n   📊 COMPASS Score:');
    console.log(`      Total: ${compassResult.data?.score || 'N/A'}/100`);
  }
  
  // 5. Material Generation - Resume (LLM)
  if (testJobId) {
    console.log('\n📋 Section 5: Material Generation - Resume (LLM)');
    console.log('='.repeat(60));
    
    console.log('\n⚠️  This endpoint uses LLM and may take 30-60 seconds...');
    const resumeResult = await testEndpoint(
      'POST',
      `/generate/resume/${testJobId}`,
      'Generate Tailored Resume (LLM)',
      null,
      { showFullResponse: false }
    );
    trackResult(resumeResult);
    
    if (resumeResult.success) {
      console.log('\n   📄 Generated Resume:');
      console.log(`      ID: ${resumeResult.data?.id}`);
      console.log(`      Content length: ${resumeResult.data?.content?.length || 0} chars`);
    }
  } else {
    console.log('\n📋 Section 5: Material Generation - Resume (LLM)');
    console.log('='.repeat(60));
    console.log('⏭️  Skipped (no test job ID)');
    results.skipped++;
  }
  
  // 6. Material Generation - Cover Letter (LLM)
  if (testJobId) {
    console.log('\n📋 Section 6: Material Generation - Cover Letter (LLM)');
    console.log('='.repeat(60));
    
    console.log('\n⚠️  This endpoint uses LLM and may take 30-60 seconds...');
    const coverLetterResult = await testEndpoint(
      'POST',
      `/generate/cover-letter/${testJobId}`,
      'Generate Cover Letter (LLM)',
      null,
      { showFullResponse: false }
    );
    trackResult(coverLetterResult);
    
    if (coverLetterResult.success) {
      console.log('\n   📝 Generated Cover Letter:');
      console.log(`      ID: ${coverLetterResult.data?.id}`);
      console.log(`      Content length: ${coverLetterResult.data?.content?.length || 0} chars`);
    }
  } else {
    console.log('\n📋 Section 6: Material Generation - Cover Letter (LLM)');
    console.log('='.repeat(60));
    console.log('⏭️  Skipped (no test job ID)');
    results.skipped++;
  }
  
  // 7. HR Search (External API)
  console.log('\n📋 Section 7: HR Search - External API (Apollo.io)');
  console.log('='.repeat(60));
  console.log('⏭️  Skipped (requires company name and makes external API calls)');
  console.log('   Manual test: POST /hr/search with {"companyName": "Google"}');
  results.skipped++;
  
  // 8. HR Outreach Generation (LLM)
  console.log('\n📋 Section 8: HR Outreach - LLM Message Generation');
  console.log('='.repeat(60));
  console.log('⏭️  Skipped (requires HR contact data from search)');
  console.log('   Manual test: POST /hr/outreach/generate with contact data');
  results.skipped++;
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 LLM Endpoints Test Summary');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  if (results.total > 0) {
    console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  }
  console.log('='.repeat(60));
  
  // Show total time and cost estimate
  console.log('\n💡 Note: LLM endpoints consume API credits');
  console.log('   Estimated cost: ~$0.01-0.05 per test run (using GPT-4 Mini)');
  
  return results;
}

// Run tests
runLLMTests().catch(console.error);
