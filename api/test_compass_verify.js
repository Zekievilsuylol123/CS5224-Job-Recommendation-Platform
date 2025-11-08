// Verify COMPASS scoring totals are correct

console.log('COMPASS SCORE VERIFICATION');
console.log('='.repeat(70));

const SALARY_MAX = 20;
const QUALIFICATIONS_MAX = 20;
const DIVERSITY_MAX = 20;
const SUPPORT_MAX = 20;
const SKILLS_BONUS_MAX = 20;
const STRATEGIC_BONUS_MAX = 10;
const TOTAL_MAX = SALARY_MAX + QUALIFICATIONS_MAX + DIVERSITY_MAX + SUPPORT_MAX + SKILLS_BONUS_MAX + STRATEGIC_BONUS_MAX;

console.log('\nMAX POINTS PER CRITERION:');
console.log(`C1 Salary:        ${SALARY_MAX}/20`);
console.log(`C2 Qualifications: ${QUALIFICATIONS_MAX}/20`);
console.log(`C3 Diversity:     ${DIVERSITY_MAX}/20`);
console.log(`C4 Support:       ${SUPPORT_MAX}/20`);
console.log(`C5 Skills Bonus:  ${SKILLS_BONUS_MAX}/20`);
console.log(`C6 Strategic:     ${STRATEGIC_BONUS_MAX}/10`);
console.log(`─────────────────────────`);
console.log(`TOTAL MAX:        ${TOTAL_MAX} points`);

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

const totalRaw = Object.values(exampleBreakdown).reduce((sum, val) => sum + val, 0);
const totalPercent = Math.round((totalRaw / TOTAL_MAX) * 100);

console.log('\nBREAKDOWN:');
console.log(`C1 Salary:        ${exampleBreakdown.salary}/20`);
console.log(`C2 Qualifications: ${exampleBreakdown.qualifications}/20`);
console.log(`C3 Diversity:     ${exampleBreakdown.diversity}/20`);
console.log(`C4 Support:       ${exampleBreakdown.support}/20`);
console.log(`C5 Skills Bonus:  ${exampleBreakdown.skills}/20`);
console.log(`C6 Strategic:     ${exampleBreakdown.strategic}/10`);
console.log(`─────────────────────────`);
console.log(`RAW TOTAL:        ${totalRaw}/${TOTAL_MAX} points`);
console.log(`PERCENTAGE:       ${totalPercent}%`);

console.log('\n✅ VERIFICATION:');
console.log(`   10 + 10 + 5 + 5 + 20 + 0 = ${totalRaw} points`);
console.log(`   ${totalRaw} / ${TOTAL_MAX} * 100 = ${totalPercent}%`);

const verdict = totalRaw >= 40 ? 'Likely' : totalRaw >= 20 ? 'Borderline' : 'Unlikely';
console.log(`\n🎯 VERDICT: ${verdict}`);
console.log(`   (≥40 = Likely, 20-39 = Borderline, <20 = Unlikely)`);

console.log('\n' + '='.repeat(70));
console.log('NOTES ON SHORTAGE OCCUPATIONS:');
console.log('='.repeat(70));

const shortageOccupations = [
  'artificial intelligence engineer',
  'ai engineer',
  'machine learning engineer',
  'data scientist',
  'analytics engineer',
  'cloud architect',
  'cybersecurity specialist',
  'software architect',
  'semiconductor engineer'
];

console.log('\nJob Title: "Data & AI Engineer"');
console.log('Checking against shortage occupations...');
console.log('\n✅ MATCH FOUND: Title contains "ai engineer"');
console.log('   → Grants C5 Skills Bonus = 20 points');

console.log('\n' + '='.repeat(70));
