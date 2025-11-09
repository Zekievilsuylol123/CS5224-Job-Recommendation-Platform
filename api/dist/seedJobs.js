const ROLE_TEMPLATES = [
    {
        title: 'Software Engineer',
        industry: 'Technology',
        baseSalary: [6000, 9500],
        requirements: [
            'bachelor\'s degree',
            'typescript',
            'react',
            'node.js',
            '3+ years experience'
        ],
        description: 'Design and build cloud-native services with TypeScript and React.'
    },
    {
        title: 'Data Scientist',
        industry: 'Technology',
        baseSalary: [6500, 10000],
        requirements: [
            'python',
            'machine learning',
            'sql',
            'statistics',
            '3+ years experience'
        ],
        description: 'Build predictive models and partner with product teams on insights.'
    },
    {
        title: 'Product Manager',
        industry: 'Product',
        baseSalary: [7000, 11000],
        requirements: [
            "bachelor's degree",
            'roadmap planning',
            'agile',
            'stakeholder management',
            '5+ years experience'
        ],
        description: 'Own product discovery and delivery for a cross-functional squad.'
    },
    {
        title: 'Finance Analyst',
        industry: 'Finance',
        baseSalary: [5000, 8000],
        requirements: [
            'accounting',
            'excel',
            'forecasting',
            '2+ years experience'
        ],
        description: 'Model revenue and expense scenarios to support decision making.'
    },
    {
        title: 'Data Engineer',
        industry: 'Technology',
        baseSalary: [6500, 9800],
        requirements: [
            'spark',
            'data pipelines',
            'cloud',
            '4+ years experience'
        ],
        description: 'Build scalable data pipelines and manage reliable data ingestion.'
    },
    {
        title: 'UX Designer',
        industry: 'Product',
        baseSalary: [5500, 8800],
        requirements: [
            'ux research',
            'figma',
            'design systems',
            'portfolio',
            '3+ years experience'
        ],
        description: 'Craft end-to-end journeys grounded in research and usability.'
    },
    {
        title: 'Analytics Engineer',
        industry: 'Technology',
        baseSalary: [6000, 9000],
        requirements: [
            'dbt',
            'sql',
            'data modeling',
            'stakeholder management',
            '3+ years experience'
        ],
        description: 'Build a trustworthy analytics layer for business stakeholders.'
    },
    {
        title: 'Quantitative Analyst',
        industry: 'Finance',
        baseSalary: [8000, 13000],
        requirements: [
            'programming',
            'financial modeling',
            'statistics',
            '5+ years experience'
        ],
        description: 'Develop quantitative strategies and support trading desks.'
    }
];
const COMPANIES = [
    { name: 'NovaTech Labs', size: 'Startup', localHQ: true },
    { name: 'Straits Financial', size: 'MNC', localHQ: false },
    { name: 'Lion City GovTech', size: 'Gov', localHQ: true },
    { name: 'Bluewave Analytics', size: 'SME', localHQ: true },
    { name: 'Aster Manufacturing', size: 'MNC', localHQ: false },
    { name: 'Cirrus AI', size: 'Startup', localHQ: true },
    { name: 'Harbour Bank', size: 'MNC', localHQ: false },
    { name: 'Meridian Health', size: 'SME', localHQ: true }
];
const LOCATIONS = ['Singapore', 'Remote - Singapore', 'Singapore (Hybrid)'];
function mulberry32(seed) {
    return () => {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export function createSeedJobs(count, seed = 42) {
    const rng = mulberry32(seed);
    const jobs = [];
    for (let index = 0; index < count; index += 1) {
        const role = ROLE_TEMPLATES[index % ROLE_TEMPLATES.length];
        const companyMeta = COMPANIES[index % COMPANIES.length];
        const location = LOCATIONS[Math.floor(rng() * LOCATIONS.length)];
        const salaryVariance = 0.85 + rng() * 0.3;
        const [baseMin, baseMax] = role.baseSalary;
        const salaryMin = Math.round(baseMin * salaryVariance);
        const salaryMax = Math.round(baseMax * (salaryVariance + 0.05));
        const job = {
            id: `job-${index + 1}`,
            title: role.title,
            company: companyMeta.name,
            location,
            industry: role.industry,
            salaryMinSGD: salaryMin,
            salaryMaxSGD: salaryMax,
            description: `${role.description} You will partner cross-functionally and champion EP readiness for talent relocating to Singapore.`,
            requirements: [...role.requirements],
            employer: {
                size: companyMeta.size,
                localHQ: companyMeta.localHQ,
                diversityScore: Number((0.45 + rng() * 0.45).toFixed(2))
            },
            createdAt: new Date(Date.now() - Math.floor(rng() * 45) * 86400000).toISOString()
        };
        jobs.push(job);
    }
    return jobs;
}
