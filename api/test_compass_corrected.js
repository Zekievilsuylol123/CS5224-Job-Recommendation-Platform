// Verify COMPASS scoring with correct maximum

console.log('COMPASS SCORE VERIFICATION (CORRECTED)');
console.log('='.repeat(70));

const SALARY_MAX = 20;
const QUALIFICATIONS_MAX = 20;
const DIVERSITY_MAX = 20;
const SUPPORT_MAX = 20;
const SKILLS_BONUS_MAX = 20;
const STRATEGIC_BONUS_MAX = 10;

const FOUNDATIONAL_MAX = SALARY_MAX + QUALIFICATIONS_MAX + DIVERSITY_MAX + SUPPORT_MAX; // 60
const BONUS_MAX = SKILLS_BONUS_MAX + STRATEGIC_BONUS_MAX; // 30
const TOTAL_MAX = FOUNDATIONAL_MAX + BONUS_MAX; // 90

console.log('\n�� COMPASS FRAMEWORK:');
console.log('─────────────────────────');
console.log('Foundational Criteria (C1-C4): 60 points max');
console.log('  C1 Salary:        20 pts');
console.log('  C2 Qualifications: 20 pts');
console.log('  C3 Diversity:     20 pts');
console.log('  C4 Support:       20 pts');
console.log('');
console.log('Bonus Criteria (C5-C6):    30 points max');
console.log('  C5 Skills Bonus:  20 pts');
console.log('  C6 Strategic:     10 pts');
console.log('─────────────────────────');
console.log(`TOTAL POSSIBLE:     ${TOTAL_MAX} points`);
console.log('');
console.log('⚠️  Note: "Full marks" = 60 points (foundational only)');
console.log('    Bonus points help reach the 40-point pass threshold');

console.log('\n' + '='.repeat(70));
console.log('EXAMPLE: Data & AI Engineer at IFS Capital');
console.log('='.repeat(70));

const exampleBreakdown = {
  salary: 10,        // Missing salary = 10 pts
  qualifications: 10, // Degree outside QS top tier = 10 pts
  diversity: 5,      // No data = 5 pts
  support: 5,        // No data = 5 pts
  skills: 20,        // Matches shortage occupation = 20 pts
  strategic: 0       // No SEP data = 0 pts
};

const foundationalScore = exampleBreakdown.salary + exampleBreakdown.qualifications + 
                         exampleBreakdown.diversity + exampleBreakdown.support;
const bonusScore = exampleBreakdown.skills + exampleBreakdown.strategic;
const totalRaw = foundationalScore + bonusScore;

// OLD calculation (incorrect):
const oldPercentOLD = Math.round((totalRaw / 110) * 100);

// NEW calculation (correct):
const percentageNEW = Math.round((totalRaw / TOTAL_MAX) * 100);

console.log('\nBREAKDOWN:');
console.log('Foundational:');
console.log(`  C1 Salary:        ${exampleBreakdown.salary}/20`);
console.log(`  C2 Qualifications: ${exampleBreakdown.qualifications}/20`);
console.log(`  C3 Diversity:     ${exampleBreakdown.diversity}/20`);
console.log(`  C4 Support:       ${exampleBreakdown.support}/20`);
console.log(`  Subtotal:         ${foundationalScore}/60`);
console.log('');
console.log('Bonus:');
console.log(`  C5 Skills Bonus:  ${exampleBreakdown.skills}/20`);
console.log(`  C6 Strategic:     ${exampleBreakdown.strategic}/10`);
console.log(`  Subtotal:         ${bonusScore}/30`);
console.log('─────────────────────────');
console.log(`TOTAL:              ${totalRaw}/90 points`);

console.log('\n📈 SCORING:');
console.log(`OLD (WRONG):  ${totalRaw}/110 = ${oldPercentOLD}%  ❌`);
console.log(`NEW (CORRECT): ${totalRaw}/90  = ${percentageNEW}%  ✅`);

const verdict = totalRaw >= 40 ? 'Likely' : totalRaw >= 20 ? 'Borderline' : 'Unlikely';
console.log(`\n🎯 VERDICT: ${verdict}`);
console.log(`   (≥40 pts = Likely, 20-39 pts = Borderline, <20 pts = Unlikely)`);

console.log('\n' + '='.repeat(70));
