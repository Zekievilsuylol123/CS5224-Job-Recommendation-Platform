/**
 * Mock job descriptions for different job categories
 * Used when real JD is not available from external API
 */
export const MOCK_JOB_DESCRIPTIONS = {
    'software-engineer': `
**About the Role:**
We are seeking a talented Software Engineer to join our growing engineering team. You will be responsible for designing, developing, and maintaining scalable software solutions.

**Key Responsibilities:**
- Design and develop robust backend services and APIs
- Write clean, maintainable, and well-tested code
- Collaborate with cross-functional teams including product, design, and QA
- Participate in code reviews and provide constructive feedback
- Contribute to technical architecture decisions
- Debug and resolve production issues

**Requirements:**
- Bachelor's degree in Computer Science or related field
- 3+ years of professional software development experience
- Strong proficiency in TypeScript, Node.js, and modern web frameworks
- Experience with databases (SQL and NoSQL)
- Familiarity with cloud platforms (AWS, GCP, or Azure)
- Understanding of RESTful APIs and microservices architecture
- Experience with Git and CI/CD pipelines
- Strong problem-solving and communication skills

**Nice to Have:**
- Experience with containerization (Docker, Kubernetes)
- Knowledge of message queues and event-driven architecture
- Contributions to open-source projects
- Experience mentoring junior developers
`,
    'data-scientist': `
**About the Role:**
We are looking for a Data Scientist to help drive data-driven decision making across the organization. You will work on challenging problems involving machine learning, statistical analysis, and data visualization.

**Key Responsibilities:**
- Build and deploy predictive models and ML pipelines
- Analyze large datasets to extract meaningful insights
- Design and run A/B tests and experiments
- Develop data visualizations and dashboards
- Collaborate with engineering teams to productionize models
- Present findings and recommendations to stakeholders

**Requirements:**
- Master's or PhD in Data Science, Statistics, Computer Science, or related field
- 4+ years of experience in data science or machine learning roles
- Expert-level Python programming skills
- Strong knowledge of ML frameworks (scikit-learn, TensorFlow, PyTorch)
- Proficiency in SQL and experience with big data technologies
- Experience with cloud ML platforms (AWS SageMaker, GCP Vertex AI, etc.)
- Strong statistical analysis and experimental design skills
- Excellent communication and presentation abilities

**Nice to Have:**
- Publications in top-tier ML/AI conferences
- Experience with NLP or computer vision
- Knowledge of MLOps best practices
- Experience with real-time ML systems
`,
    'product-manager': `
**About the Role:**
We are seeking an experienced Product Manager to define and execute the product vision and roadmap. You will work closely with engineering, design, and business teams to deliver products that delight customers.

**Key Responsibilities:**
- Define product vision, strategy, and roadmap
- Gather and prioritize product requirements from customers and stakeholders
- Work with engineering and design to ship high-quality features
- Analyze product metrics and user feedback to drive improvements
- Conduct market research and competitive analysis
- Lead product launches and go-to-market initiatives
- Communicate product strategy to internal and external stakeholders

**Requirements:**
- Bachelor's degree in Business, Computer Science, or related field
- 5+ years of product management experience
- Proven track record of successfully launching products
- Strong analytical and problem-solving skills
- Experience with agile development methodologies
- Excellent communication and stakeholder management abilities
- Data-driven decision-making approach
- Understanding of technical concepts and ability to work with engineers

**Nice to Have:**
- MBA or advanced degree
- Experience in B2B SaaS products
- Technical background or engineering experience
- Experience with product analytics tools
- Understanding of UX design principles
`,
    'frontend-developer': `
**About the Role:**
We are looking for a skilled Frontend Developer to build beautiful, responsive, and performant user interfaces. You will work closely with designers and backend engineers to create seamless user experiences.

**Key Responsibilities:**
- Develop modern, responsive web applications using React/Vue/Angular
- Implement pixel-perfect designs from Figma/Sketch
- Optimize application performance and user experience
- Write clean, maintainable, and well-tested code
- Collaborate with backend engineers to integrate APIs
- Participate in design reviews and provide technical input
- Stay up-to-date with latest frontend technologies and best practices

**Requirements:**
- Bachelor's degree in Computer Science or related field
- 3+ years of professional frontend development experience
- Expert knowledge of HTML, CSS, and JavaScript/TypeScript
- Strong proficiency in React and modern frontend frameworks
- Experience with state management (Redux, Zustand, etc.)
- Understanding of responsive design and CSS frameworks
- Familiarity with build tools (Webpack, Vite, etc.)
- Knowledge of web performance optimization techniques

**Nice to Have:**
- Experience with testing frameworks (Jest, Vitest, Cypress)
- Knowledge of accessibility standards (WCAG)
- Experience with design systems
- Backend development experience
`,
    'devops-engineer': `
**About the Role:**
We are seeking a DevOps Engineer to build and maintain our infrastructure and deployment pipelines. You will ensure our systems are reliable, scalable, and secure.

**Key Responsibilities:**
- Design and implement CI/CD pipelines
- Manage cloud infrastructure using Infrastructure as Code
- Monitor system performance and respond to incidents
- Implement security best practices
- Automate repetitive operational tasks
- Collaborate with development teams on deployment strategies
- Maintain documentation for infrastructure and processes

**Requirements:**
- Bachelor's degree in Computer Science or related field
- 4+ years of DevOps or Infrastructure engineering experience
- Strong knowledge of AWS, GCP, or Azure
- Experience with Infrastructure as Code (Terraform, CloudFormation)
- Proficiency in scripting languages (Python, Bash)
- Experience with containerization and orchestration (Docker, Kubernetes)
- Knowledge of CI/CD tools (GitHub Actions, GitLab CI, Jenkins)
- Understanding of networking, security, and monitoring

**Nice to Have:**
- Relevant cloud certifications
- Experience with service mesh technologies
- Knowledge of observability tools (Prometheus, Grafana, Datadog)
- Experience with disaster recovery and backup strategies
`,
    'default': `
**About the Role:**
We are looking for a talented professional to join our team. This role offers the opportunity to work on challenging problems and make a significant impact.

**Key Responsibilities:**
- Contribute to the success of the team and organization
- Collaborate with colleagues across different departments
- Take ownership of projects and deliver high-quality results
- Continuously learn and grow in your role
- Share knowledge and mentor others

**Requirements:**
- Relevant degree or equivalent experience
- Strong communication and teamwork skills
- Problem-solving mindset and attention to detail
- Ability to work in a fast-paced environment
- Passion for learning and continuous improvement

**Nice to Have:**
- Industry-specific certifications
- Experience with relevant tools and technologies
- Track record of successful projects
`
};
/**
 * Get the most appropriate mock JD based on job title
 */
export function getMatchingJD(jobTitle) {
    const titleLower = jobTitle.toLowerCase();
    // Data Science roles
    if (titleLower.includes('data scientist') ||
        titleLower.includes('machine learning') ||
        titleLower.includes('ml engineer') ||
        titleLower.includes('ai engineer')) {
        return MOCK_JOB_DESCRIPTIONS['data-scientist'];
    }
    // Product Management roles
    if (titleLower.includes('product manager') ||
        titleLower.includes('product owner') ||
        titleLower.includes('pm ')) {
        return MOCK_JOB_DESCRIPTIONS['product-manager'];
    }
    // Frontend roles
    if (titleLower.includes('frontend') ||
        titleLower.includes('front-end') ||
        titleLower.includes('react') ||
        titleLower.includes('vue') ||
        titleLower.includes('ui engineer')) {
        return MOCK_JOB_DESCRIPTIONS['frontend-developer'];
    }
    // DevOps roles
    if (titleLower.includes('devops') ||
        titleLower.includes('sre') ||
        titleLower.includes('site reliability') ||
        titleLower.includes('platform engineer') ||
        titleLower.includes('infrastructure')) {
        return MOCK_JOB_DESCRIPTIONS['devops-engineer'];
    }
    // Software Engineer (default for most technical roles)
    if (titleLower.includes('engineer') ||
        titleLower.includes('developer') ||
        titleLower.includes('software') ||
        titleLower.includes('backend') ||
        titleLower.includes('full stack') ||
        titleLower.includes('fullstack')) {
        return MOCK_JOB_DESCRIPTIONS['software-engineer'];
    }
    // Default fallback
    return MOCK_JOB_DESCRIPTIONS['default'];
}
/**
 * Get job category for analytics/classification
 */
export function getJobCategory(jobTitle) {
    const titleLower = jobTitle.toLowerCase();
    if (titleLower.includes('data scientist') || titleLower.includes('machine learning') || titleLower.includes('ai engineer')) {
        return 'data-science';
    }
    if (titleLower.includes('product manager') || titleLower.includes('product owner')) {
        return 'product-management';
    }
    if (titleLower.includes('frontend') || titleLower.includes('front-end')) {
        return 'frontend';
    }
    if (titleLower.includes('devops') || titleLower.includes('sre')) {
        return 'devops';
    }
    if (titleLower.includes('engineer') || titleLower.includes('developer')) {
        return 'software-engineering';
    }
    return 'other';
}
