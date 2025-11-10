// Website Scraper
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import OpenAI from 'openai';
import { logger } from '../logger.js';
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
export async function scrapeWebsite(url) {
    logger.info(`Scraping website: ${url}`);
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; JobPlatformBot/1.0)',
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
        }
        const html = await response.text();
        const $ = cheerio.load(html);
        // Remove unwanted elements
        $('script, style, nav, footer, header, aside, .advertisement, #cookie-banner').remove();
        // Extract title
        const title = $('title').text() || $('h1').first().text() || 'Untitled';
        // Try to find main content area
        const mainContent = $('main').html() ||
            $('article').html() ||
            $('.content').html() ||
            $('#content').html() ||
            $('body').html() ||
            '';
        // Convert to markdown
        const turndown = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
        });
        const markdown = turndown.turndown(mainContent);
        // Summarize with LLM to avoid context bloat
        const summary = await summarizeWebContent(markdown, url);
        logger.info(`Successfully scraped website: ${title}`);
        return {
            title,
            content: markdown.slice(0, 10000), // Limit content
            summary,
            url,
        };
    }
    catch (error) {
        logger.error('Failed to scrape website:', error);
        throw new Error(`Failed to scrape website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function summarizeWebContent(markdown, url) {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Extract key professional information from this personal website. Focus on:
- Technical skills and expertise
- Professional experience and projects
- Achievements and accomplishments
- Educational background
- Contact information
- Career interests and goals

Be concise and factual. Output as a structured summary.`,
                },
                {
                    role: 'user',
                    content: markdown.slice(0, 10000), // Limit input
                },
            ],
            max_tokens: 500,
            temperature: 0.3,
        });
        return response.choices[0].message.content || 'No summary available';
    }
    catch (error) {
        logger.warn(`Failed to generate summary for ${url}, using truncated content`, error);
        return markdown.slice(0, 500) + '...';
    }
}
export function normalizeWebsiteToKnowledge(data) {
    // The summary already contains the extracted information
    // We'll store it as additional context
    return {
        summary: data.summary,
        about: data.content.slice(0, 1000),
        personal_website_url: data.url,
    };
}
export async function scrapeAndParseWebsite(url) {
    const raw = await scrapeWebsite(url);
    const parsed = normalizeWebsiteToKnowledge(raw);
    return { raw, parsed };
}
