#!/usr/bin/env node

/**
 * Diagnostic test for material generation
 */

const AUTH_TOKEN = process.env.AUTH_TOKEN || "eyJhbGciOiJIUzI1NiIsImtpZCI6InRpU2dTQ1FsOW1aSlA2U0siLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3VzYnV0b2NhbnNoaGlvenhldm9uLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI0ODRjYzM0Yi1mZGJlLTQwMDgtODdiNi05NmM3YmI1NTM2ZDYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYyNjM3NTg4LCJpYXQiOjE3NjI2MzM5ODgsImVtYWlsIjoiZWF6aXltOTE5QGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJhdmF0YXJfdXJsIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jSnVrdkJCWWV2eXVVVGZjamRxeEZPbGp4NkprdlU2SnZuMWJaUmNYaVQ4dmJvaEx3PXM5Ni1jIiwiZW1haWwiOiJlYXppeW05MTlAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6ImVheml5bSIsImlzcyI6Imh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbSIsIm5hbWUiOiJlYXppeW0iLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NKdWt2QkJZZXZ5dVVUZmNqZHF4Rk9sang2Smt2VTZKdm4xYlpSY1hpVDh2Ym9oTHc9czk2LWMiLCJwcm92aWRlcl9pZCI6IjEwNDE2OTE3Nzg0Nzk5MDQzMjM2OSIsInN1YiI6IjEwNDE2OTE3Nzg0Nzk5MDQzMjM2OSJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6Im9hdXRoIiwidGltZXN0YW1wIjoxNzYyNTI2MjkyfV0sInNlc3Npb25faWQiOiI3MThjMDJhOS0xNTQ4LTRmMmMtYTA1Ni00ZjUwMmQ3ZjgxNzQiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.pex2rhFna4e-7MLYelwCMwxZWpSlvYVQeyhA-ds2yPQ";

async function testResume() {
  console.log('🧪 Testing resume generation with verbose output...\n');
  
  const jobId = 'ext-cynapse-pte-ltd-2025-11-08-150';
  
  const response = await fetch(`http://localhost:8080/api/generate/resume/${jobId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    }
  });
  
  console.log(`Status: ${response.status}`);
  console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
  
  const text = await response.text();
  console.log(`\nRaw Response:\n${text}\n`);
  
  try {
    const json = JSON.parse(text);
    console.log('\nParsed JSON:');
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.log('(Not valid JSON)');
  }
}

testResume().catch(console.error);
