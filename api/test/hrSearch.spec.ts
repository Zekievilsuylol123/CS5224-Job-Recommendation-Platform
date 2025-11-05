import { describe, expect, it, vi, beforeEach } from 'vitest';
import { searchHRProspects } from '../src/hrSearch.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('HR Prospect Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should normalize company domain', async () => {
    const mockResponse = [
      {
        first_name: 'Jane',
        last_name: 'Doe',
        full_name: 'Jane Doe',
        email: 'jane.doe@example.com',
        personal_email: null,
        job_title: 'HR Manager',
        linkedin: 'https://linkedin.com/in/janedoe',
        company_name: 'Example Corp',
        company_domain: 'example.com',
        city: 'Singapore',
        country: 'Singapore'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await searchHRProspects('https://okx.com/', 2);

    expect(result.company_domain).toBe('okx.com');
    expect(result.fetch_count).toBe(2);
    expect(result.prospects).toHaveLength(1);
    expect(result.prospects[0]).toHaveProperty('first_name', 'Jane');
    expect(result.prospects[0]).toHaveProperty('full_name', 'Jane Doe');
    expect(result.prospects[0]).toHaveProperty('email', 'jane.doe@example.com');
  });

  it('should generate timestamped file name', async () => {
    const mockResponse: any[] = [];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await searchHRProspects('example.com', 2);

    expect(result.file_name).toMatch(/^Prospects_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/);
    expect(result.timestamp).toBeTruthy();
    expect(result.prospects).toEqual([]);
  });

  it('should call external API with correct payload', async () => {
    const mockResponse: any[] = [];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    await searchHRProspects('okx.com', 5);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://n8n.shiyao.dev/webhook/hrsearch',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: expect.stringContaining('"fetch_count":5')
      })
    );

    const callArgs = (global.fetch as any).mock.calls[0];
    const payload = JSON.parse(callArgs[1].body);

    expect(payload.company_domain).toEqual(['okx.com']);
    expect(payload.fetch_count).toBe(5);
    expect(payload.contact_job_title).toEqual(['hr', 'human resource', 'talent acquisition', 'recruiter']);
    expect(payload.contact_location).toEqual(['singapore']);
  });

  it('should throw error on API failure', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    await expect(searchHRProspects('example.com', 2)).rejects.toThrow(
      'HR search API returned 500: Internal Server Error'
    );
  });

  it('should handle network errors', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    await expect(searchHRProspects('example.com', 2)).rejects.toThrow(
      'Failed to search HR prospects: Network error'
    );
  });

  it('should use default fetch count of 2', async () => {
    const mockResponse: any[] = [];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await searchHRProspects('example.com');

    expect(result.fetch_count).toBe(2);

    const callArgs = (global.fetch as any).mock.calls[0];
    const payload = JSON.parse(callArgs[1].body);
    expect(payload.fetch_count).toBe(2);
  });

  it('should filter and map API response to essential fields only', async () => {
    const mockApiResponse = [
      {
        first_name: 'John',
        last_name: 'Doe',
        full_name: 'John Doe',
        email: 'john@example.com',
        personal_email: 'john.personal@example.com',
        job_title: 'HR Manager',
        linkedin: 'https://linkedin.com/in/johndoe',
        company_name: 'Example Corp',
        company_domain: 'example.com',
        city: 'Singapore',
        country: 'Singapore',
        // These fields should be filtered out
        headline: 'HR Manager at Example Corp',
        seniority_level: 'manager',
        industry: 'Financial Services',
        company_size: '5000',
        company_phone: '+6512345678',
        keywords: 'hr, recruitment, talent'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse
    });

    const result = await searchHRProspects('example.com', 1);

    expect(result.prospects).toHaveLength(1);
    
    const prospect = result.prospects[0];
    
    // Check essential fields are present
    expect(prospect).toHaveProperty('first_name', 'John');
    expect(prospect).toHaveProperty('last_name', 'Doe');
    expect(prospect).toHaveProperty('full_name', 'John Doe');
    expect(prospect).toHaveProperty('email', 'john@example.com');
    expect(prospect).toHaveProperty('personal_email', 'john.personal@example.com');
    expect(prospect).toHaveProperty('job_title', 'HR Manager');
    expect(prospect).toHaveProperty('linkedin', 'https://linkedin.com/in/johndoe');
    expect(prospect).toHaveProperty('company_name', 'Example Corp');
    expect(prospect).toHaveProperty('company_domain', 'example.com');
    expect(prospect).toHaveProperty('city', 'Singapore');
    expect(prospect).toHaveProperty('country', 'Singapore');
    
    // Check that non-essential fields are NOT present
    expect(prospect).not.toHaveProperty('headline');
    expect(prospect).not.toHaveProperty('seniority_level');
    expect(prospect).not.toHaveProperty('industry');
    expect(prospect).not.toHaveProperty('company_size');
    expect(prospect).not.toHaveProperty('company_phone');
    expect(prospect).not.toHaveProperty('keywords');
    
    // Verify only 11 essential fields exist
    expect(Object.keys(prospect)).toHaveLength(11);
  });
});
