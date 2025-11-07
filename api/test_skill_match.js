// Test skill matching calculation

function normalise(text) {
  return text?.trim().toLowerCase();
}

function calculateSkillMatch(userSkills = [], jobRequirements = []) {
  if (jobRequirements.length === 0 || userSkills.length === 0) {
    return 0;
  }

  const normalizedUserSkills = userSkills.map(s => normalise(s) || '').filter(Boolean);
  const normalizedJobReqs = jobRequirements.map(r => normalise(r) || '').filter(Boolean);

  console.log('\n📊 SKILL MATCHING CALCULATION');
  console.log('='.repeat(60));
  console.log('\nUser Skills:', normalizedUserSkills);
  console.log('Job Requirements:', normalizedJobReqs);
  
  // Count how many job requirements are matched by user skills
  const matchedRequirements = normalizedJobReqs.filter(req => {
    const isMatch = normalizedUserSkills.some(skill => 
      skill === req || skill.includes(req) || req.includes(skill)
    );
    if (isMatch) {
      console.log(`✅ Matched: "${req}"`);
    } else {
      console.log(`❌ Not matched: "${req}"`);
    }
    return isMatch;
  });

  // Calculate match percentage
  const matchPercentage = (matchedRequirements.length / normalizedJobReqs.length) * 100;
  
  console.log('\n' + '='.repeat(60));
  console.log(`RESULT: ${matchedRequirements.length}/${normalizedJobReqs.length} = ${Math.round(matchPercentage)}%`);
  console.log('='.repeat(60));
  
  return Math.round(matchPercentage);
}

// Example from the Data & AI Engineer job
const userSkills = [
  "Python", "Java", "JavaScript", "React", "Node.js", 
  "SQL", "MongoDB", "Git", "Docker", "AWS"
];

const jobRequirements = [
  "SQL",
  "Python", 
  "REST APIs",
  "AI Agent Workflow",
  "Database",
  "Cloud Computing",
  "AWS",
  "Azure",
  "Google Cloud",
  "Snowflake",
  "Tableau",
  "ETL tools",
  "Github"
];

const skillMatch = calculateSkillMatch(userSkills, jobRequirements);

console.log('\n\n📈 INTERPRETATION:');
console.log(`The candidate has ${skillMatch}% skill match because:`);
console.log(`- They match ${Math.round(jobRequirements.length * skillMatch / 100)} out of ${jobRequirements.length} required skills`);

