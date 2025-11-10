// Test LLM Profile Aggregation

const AUTH_TOKEN = process.env.AUTH_TOKEN;
const API_URL = 'http://localhost:8080/api';

async function testProfileAggregation() {
  console.log('🧪 Testing LLM Profile Aggregation\n');
  
  try {
    // 1. Check knowledge sources
    console.log('1️⃣ Fetching knowledge sources...');
    const sourcesRes = await fetch(`${API_URL}/knowledge-sources`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
    });
    
    const sourcesData = await sourcesRes.json();
    const sources = sourcesData.sources;
    console.log(`   Found ${sources.length} sources:`);
    sources.forEach(s => {
      console.log(`   - ${s.source_type}: ${s.source_identifier || 'N/A'} (${s.processing_status})`);
    });
    
    const completedSources = sources.filter(s => s.processing_status === 'completed');
    console.log(`   ✅ ${completedSources.length} completed sources\n`);
    
    if (completedSources.length === 0) {
      console.log('⚠️  No completed sources to aggregate. Upload a resume or add LinkedIn/GitHub first.');
      return;
    }
    
    // 2. Get aggregated profile
    console.log('2️⃣ Fetching aggregated profile...');
    const aggregatedRes = await fetch(`${API_URL}/knowledge-sources/aggregate`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
    });
    
    const aggregatedData = await aggregatedRes.json();
    const profile = aggregatedData.aggregated_profile;
    
    if (!profile) {
      console.log('   ⚠️  No aggregated profile yet\n');
      return;
    }
    
    console.log('\n📊 AGGREGATED PROFILE:\n');
    console.log('👤 Contact Info:');
    console.log(`   Name: ${profile.name || 'N/A'}`);
    console.log(`   Email: ${profile.email || 'N/A'}`);
    console.log(`   Phone: ${profile.phone || 'N/A'}`);
    console.log(`   Location: ${profile.location || 'N/A'}`);
    
    if (profile.summary) {
      console.log(`\n📝 Summary:\n   ${profile.summary}`);
    }
    
    if (profile.skills && profile.skills.length > 0) {
      console.log(`\n🛠️  Skills (${profile.skills.length}):
      ${profile.skills.slice(0, 20).join(', ')}${profile.skills.length > 20 ? '...' : ''}`);
    }
    
    if (profile.experience && profile.experience.length > 0) {
      console.log(`\n💼 Experience (${profile.experience.length} positions):`);
      profile.experience.slice(0, 3).forEach(exp => {
        console.log(`   - ${exp.job_title || exp.title} at ${exp.company} (${exp.duration})`);
        if (exp.source) console.log(`     Source: ${exp.source}`);
      });
      if (profile.experience.length > 3) {
        console.log(`   ... and ${profile.experience.length - 3} more`);
      }
    }
    
    if (profile.education && profile.education.length > 0) {
      console.log(`\n🎓 Education (${profile.education.length}):`);
      profile.education.forEach(edu => {
        console.log(`   - ${edu.degree} in ${edu.field_of_study} from ${edu.institution}`);
        if (edu.source) console.log(`     Source: ${edu.source}`);
      });
    }
    
    if (profile.sources && profile.sources.length > 0) {
      console.log(`\n📚 Sources Used (${profile.sources.length}):`);
      profile.sources.forEach(s => {
        console.log(`   - ${s.type}${s.identifier ? ': ' + s.identifier : ''}`);
      });
    }
    
    console.log('\n✅ Profile aggregation complete!');
    
    // Check if it used LLM or fallback
    if (completedSources.length > 1) {
      console.log('\n💡 Multiple sources detected - LLM intelligently merged the data');
    } else {
      console.log('\n💡 Single source - direct conversion (no LLM needed)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', await error.response.text());
    }
  }
}

testProfileAggregation();
