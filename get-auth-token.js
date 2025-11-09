/**
 * Get Auth Token Helper
 * 
 * Run this in your browser console while logged in to get your auth token.
 * Copy the output and use it to run authenticated tests.
 */

(function() {
  try {
    // Try localStorage first
    const authData = localStorage.getItem('sb-nvkdepbkmptnqwxupfrr-auth-token');
    if (authData) {
      const parsed = JSON.parse(authData);
      if (parsed?.access_token) {
        console.log('\n✅ Auth Token Found!\n');
        console.log('Copy this command and run it in your terminal:\n');
        console.log(`AUTH_TOKEN="${parsed.access_token}" node test-api-cli.js auth\n`);
        console.log('Or export it first:\n');
        console.log(`export AUTH_TOKEN="${parsed.access_token}"`);
        console.log('node test-api-cli.js auth\n');
        return;
      }
    }
    
    console.error('❌ No auth token found. Please make sure you are logged in.');
    console.log('   1. Go to http://localhost:5173');
    console.log('   2. Log in to your account');
    console.log('   3. Run this script again in the browser console');
  } catch (error) {
    console.error('❌ Error getting auth token:', error.message);
  }
})();
