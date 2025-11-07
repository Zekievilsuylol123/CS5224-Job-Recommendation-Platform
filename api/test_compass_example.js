// Example COMPASS scoring walkthrough

const exampleUser = {
  name: "Sarah Chen",
  nationality: "Singapore",
  educationLevel: "Masters",
  educationInstitution: "National University of Singapore",
  certifications: ["AWS Certified Solutions Architect"],
  yearsExperience: 5,
  skills: ["Python", "TensorFlow", "Machine Learning", "AWS", "Docker", "Kubernetes"],
  expectedSalarySGD: 7500
};

const exampleJob = {
  title: "Senior Machine Learning Engineer",
  company: "ByteDance",
  location: "Singapore",
  industry: "technology",
  requirements: ["Python", "TensorFlow", "Machine Learning", "Deep Learning", "AI"]
};

console.log("=".repeat(80));
console.log("COMPASS SCORING EXAMPLE WALKTHROUGH");
console.log("=".repeat(80));

console.log("\n📋 CANDIDATE PROFILE:");
console.log(JSON.stringify(exampleUser, null, 2));

console.log("\n💼 JOB POSTING:");
console.log(JSON.stringify(exampleJob, null, 2));

console.log("\n" + "=".repeat(80));
console.log("SCORING BREAKDOWN");
console.log("=".repeat(80));

// C1: Salary (Max 20 points)
console.log("\n🏦 C1: SALARY CRITERION");
console.log("Expected Salary: SGD $7,500/month");
console.log("Sector: Technology");
console.log("Experience: 5 years (< 8 years = early career)");
console.log("Benchmark: SGD $5,600 (early career tech)");
console.log("Ratio: $7,500 / $5,600 = 1.34 (133%)");
console.log("✅ Exceeds benchmark → 20 points");
const salaryScore = 20;

// C2: Qualifications (Max 20 points)
console.log("\n🎓 C2: QUALIFICATIONS CRITERION");
console.log("Education: Masters from NUS");
console.log("NUS is in TOP_TIER_INSTITUTIONS list");
console.log("✅ Top-tier institution → 20 points");
const qualificationsScore = 20;

// C3: Diversity (Max 20 points)
console.log("\n🌍 C3: DIVERSITY CRITERION");
console.log("No employer mix data available");
console.log("⚠️ Conservative baseline → 5 points");
const diversityScore = 5;

// C4: Support (Max 20 points)
console.log("\n🤝 C4: SUPPORT CRITERION");
console.log("No local PMET data available");
console.log("⚠️ Conservative baseline → 5 points");
const supportScore = 5;

// C5: Skills Bonus (Max 20 points)
console.log("\n💡 C5: SKILLS BONUS CRITERION");
console.log("Job Title: 'Senior Machine Learning Engineer'");
console.log("Checking against SHORTAGE_OCCUPATIONS:");
console.log("  - Contains 'machine learning engineer' → MATCH!");
console.log("✅ Shortage occupation → 20 points");
const skillsScore = 20;

// C6: Strategic Bonus (Max 10 points)
console.log("\n🎯 C6: STRATEGIC BONUS CRITERION");
console.log("No SEP participation data");
console.log("❌ No bonus → 0 points");
const strategicScore = 0;

// Total
console.log("\n" + "=".repeat(80));
console.log("FINAL SCORE");
console.log("=".repeat(80));

const totalRaw = salaryScore + qualificationsScore + diversityScore + supportScore + skillsScore + strategicScore;
const totalPercent = Math.round((totalRaw / 110) * 100);

console.log(`
C1 Salary:        ${salaryScore}/20
C2 Qualifications: ${qualificationsScore}/20
C3 Diversity:     ${diversityScore}/20
C4 Support:       ${supportScore}/20
C5 Skills Bonus:  ${skillsScore}/20
C6 Strategic:     ${strategicScore}/10
─────────────────────
RAW TOTAL:        ${totalRaw}/110 points
PERCENTAGE:       ${totalPercent}%

Verdict: ${totalPercent >= 40 ? '✅ LIKELY' : totalPercent >= 20 ? '⚠️ BORDERLINE' : '❌ UNLIKELY'}
`);

console.log("=".repeat(80));
console.log("SKILL MATCHING (Currently NOT factored into score!)");
console.log("=".repeat(80));

const userSkills = exampleUser.skills.map(s => s.toLowerCase());
const jobRequirements = exampleJob.requirements.map(r => r.toLowerCase());

const matchedSkills = userSkills.filter(skill => 
  jobRequirements.some(req => req.includes(skill) || skill.includes(req))
);

const skillMatchRate = (matchedSkills.length / jobRequirements.length) * 100;

console.log("\nUser Skills:", exampleUser.skills.join(", "));
console.log("Job Requirements:", exampleJob.requirements.join(", "));
console.log("\n✅ Matched Skills:", matchedSkills.join(", "));
console.log(`📊 Match Rate: ${matchedSkills.length}/${jobRequirements.length} = ${skillMatchRate.toFixed(0)}%`);
console.log("\n⚠️ ISSUE: This high skill match doesn't improve the COMPASS score!");
console.log("💡 SOLUTION: We should add a skill matching component to ranking!");

