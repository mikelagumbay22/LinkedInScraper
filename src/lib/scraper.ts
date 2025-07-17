import axios, { AxiosError } from 'axios';
import { load, CheerioAPI } from 'cheerio';
import { Job } from './types/job';
import puppeteer from 'puppeteer';

export class JobScraper {
  private scrapeCount = 0;
  private readonly LIMIT = 15;

  // Main method - uses the proxy method which is working
  async scrapeJobs(keywords: string = 'Python', location: string = 'Colorado, United States', geoId: string = '103644278', pageNum: number = 0): Promise<Job[]> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        console.log(`Scraping jobs for ${keywords} in ${location} with geoId ${geoId} on page ${pageNum}...`);
        
        // Encode parameters
        const encodedKeywords = encodeURIComponent(keywords);
        const encodedLocation = encodeURIComponent(location);
        
        const targetUrl = `https://www.linkedin.com/jobs/search?keywords=${encodedKeywords}&location=${encodedLocation}&geoId=${geoId}&f_TPR=r86400&position=1&pageNum=${pageNum}`;
        console.log(`Target URL: ${targetUrl}`);
        
        // Try different proxy services in sequence with increased timeouts
        const proxyUrls = [
          `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
          `https://cors-anywhere.herokuapp.com/${targetUrl}`,
          `https://api.codetabs.com/v1/proxy?quest=${targetUrl}`
        ];

        let response;
        for (const proxyUrl of proxyUrls) {
          try {
            response = await axios.get(proxyUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
              timeout: 30000 // Increased timeout to 30 seconds per proxy
            });
            
            if (response.status === 200) {
              console.log(`Successfully used proxy: ${proxyUrl}`);
              break;
            }
          } catch (error) {
            console.log(`Proxy ${proxyUrl} failed:`, error instanceof Error ? error.message : 'Unknown error');
            continue;
          }
        }

        if (!response || response.status !== 200) {
          throw new Error('All proxy attempts failed');
        }
        
        console.log('Proxy response status:', response.status);
        
        if (response.data && response.data.contents) {
          console.log('HTML content length:', response.data.contents.length);
          console.log('HTML sample (first 1000 chars):', response.data.contents.substring(0, 1000));
          const jobs = this.parseLinkedIn(response.data.contents);
          jobs.forEach(job => {
            job.source = `linkedin (${location})`;
          });
          return jobs;
        } else {
          console.error('No content in proxy response');
          console.log('Response data keys:', Object.keys(response.data || {}));
          return [];
        }
      } catch (error) {
        const err = error as AxiosError;
        console.error('Error in scrapeJobs:', err.message);
        if (err.response) {
          console.error('Proxy response data:', err.response.data);
        } else {
          console.error('Error details:', err);
        }
        attempt++;
        if (attempt < maxRetries) {
          console.log(`Retrying... (${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 5000)); // Increased delay between retries
        } else {
          // If all retries fail, try the simple method as a fallback
          console.log('All proxy attempts failed, trying simple method...');
          return this.scrapeLinkedInSimple();
        }
      }
    }

    return [];
  }

  async scrapeIndeed(): Promise<Job[]> {
    const url = 'https://www.indeed.com/jobs?q=software+engineer';
    return this.scrapePage(url, 'indeed', this.parseIndeed);
  }

  async scrapeLinkedIn(): Promise<Job[]> {
    try {
      console.log('Starting LinkedIn scraping with Puppeteer...');
      
      // Launch a headless browser
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Navigate to LinkedIn jobs page
      const url = 'https://www.linkedin.com/jobs/search?keywords=Developer&location=California%2C%20United%20States&geoId=102095887&f_TPR=r86400&position=1&pageNum=0';
      console.log(`Navigating to ${url}`);
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Wait for job listings to load
      await page.waitForSelector('.jobs-search__results-list', { timeout: 10000 })
        .catch(e => console.log('Selector not found, but continuing...', e.message));
      
      // Get page content
      const content = await page.content();
      console.log('Page content retrieved, length:', content.length);
      
      // Parse the content
      const jobs = this.parseLinkedIn(content);
      
      // Close the browser
      await browser.close();
      console.log('Browser closed');
      
      return jobs;
    } catch (error) {
      console.error('Error in scrapeLinkedIn:', error);
      return [];
    }
  }

  // Alternative method using LinkedIn's RSS feed
  async scrapeLinkedInRSS(): Promise<Job[]> {
    try {
      console.log('Starting LinkedIn RSS scraping...');
      
      // LinkedIn RSS feed URL for jobs
      const url = 'https://www.linkedin.com/jobs/search?keywords=Developer&location=California%2C%20United%20States&geoId=102095887&f_TPR=r86400&position=1&pageNum=0';
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml',
        },
        timeout: 10000
      });
      
      console.log('RSS response status:', response.status);
      
      // Parse the RSS feed
      const jobs = this.parseLinkedInRSS(response.data);
      
      return jobs;
    } catch (error) {
      console.error('Error in scrapeLinkedInRSS:', error);
      return [];
    }
  }

  // Method using a free proxy service
  async scrapeLinkedInWithProxy(): Promise<Job[]> {
    try {
      console.log('Starting LinkedIn scraping with proxy...');
      
      // LinkedIn jobs URL
      const targetUrl = 'https://www.linkedin.com/jobs/search?keywords=Developer&location=California%2C%20United%20States&geoId=102095887&f_TPR=r86400&position=1&pageNum=0';
      
      // Using a free CORS proxy service
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      
      const response = await axios.get(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 15000
      });
      
      console.log('Proxy response status:', response.status);
      
      if (response.data && response.data.contents) {
        // Parse the content from the proxy response
        const jobs = this.parseLinkedIn(response.data.contents);
        return jobs;
      } else {
        console.error('No content in proxy response');
        return [];
      }
    } catch (error) {
      console.error('Error in scrapeLinkedInWithProxy:', error);
      return [];
    }
  }

  // Simple method using LinkedIn's jobs API
  async scrapeLinkedInSimple(): Promise<Job[]> {
    try {
      console.log('Starting LinkedIn simple scraping...');
      
      // LinkedIn jobs API URL
      const url = 'https://www.linkedin.com/jobs/search?keywords=Developer&location=California%2C%20United%20States&geoId=102095887&f_TPR=r86400&position=1&pageNum=0';
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://www.linkedin.com/jobs/search',
          'Origin': 'https://www.linkedin.com',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin'
        },
        timeout: 10000
      });
      
      console.log('Simple response status:', response.status);
      
      // Parse the content
      const jobs = this.parseLinkedInSimple(response.data);
      
      return jobs;
    } catch (error) {
      console.error('Error in scrapeLinkedInSimple:', error);
      return [];
    }
  }

  private async scrapePage(
    url: string,
    source: string,
    parser: (html: string) => Job[]
  ): Promise<Job[]> {
    try {
      this.scrapeCount++;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://www.linkedin.com/',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 10000
      });

      return parser(response.data);
    } catch (error) {
      console.error(`Error scraping ${source}:`, error);
      return [];
    }
  }

  private parseIndeed(html: string): Job[] {
    const $: CheerioAPI = load(html);
    const jobs: Job[] = [];
    
    $('.jobsearch-SerpJobCard').each((index: number, element) => {
      const $element = $(element);
      jobs.push({
        title: $element.find('.title').text().trim(),
        company: $element.find('.company').text().trim(),
        location: $element.find('.location').text().trim(),
        source: 'indeed',
        url: 'https://www.indeed.com' + ($element.find('a').attr('href') || ''),
        posted_at: new Date().toISOString()
      });
    });
    return jobs;
  }

  private parseLinkedIn(html: string): Job[] {
    const $: CheerioAPI = load(html);
    const jobs: Job[] = [];

    console.log('Parsing LinkedIn HTML...');
    console.log('HTML length:', html.length);
    
    // Try multiple modern LinkedIn selectors
    const selectors = [
      '.jobs-search__results-list li',
      '.base-card',
      '[data-job-id]',
      '.job-result-card',
      '.job-search-card',
      '.job-card-container',
      '.ember-view.jobs-search__result-item',
      '.jobs-search-results__list-item'
    ];
    
    let jobCards: any = null;
    let usedSelector = '';
    
    for (const selector of selectors) {
      jobCards = $(selector);
      console.log(`Selector "${selector}" found:`, jobCards.length, 'elements');
      if (jobCards.length > 0) {
        usedSelector = selector;
        break;
      }
    }
    
    if (!jobCards || jobCards.length === 0) {
      console.log('No job cards found with any selector. HTML sample:');
      console.log(html.substring(0, 2000));
      return [];
    }
    
    console.log(`Using selector: ${usedSelector}, found ${jobCards.length} job cards`);
    
    jobCards.each((index: number, element: any) => {
      const $element = $(element);
      
      // Try multiple title selectors
      const titleSelectors = [
        '.base-search-card__title',
        '.job-result-card__title',
        '.job-search-card__title',
        'h3',
        '.job-title',
        '[data-test-job-title]'
      ];
      
      let title = '';
      for (const titleSelector of titleSelectors) {
        title = $element.find(titleSelector).text().trim();
        if (title) break;
      }
      
      // Try multiple company selectors
      const companySelectors = [
        '.base-search-card__subtitle',
        '.job-result-card__company-name',
        '.job-search-card__company-name',
        '.company-name',
        '[data-test-company-name]'
      ];
      
      let company = '';
      for (const companySelector of companySelectors) {
        company = $element.find(companySelector).text().trim();
        if (company) break;
      }
      
      // Try multiple location selectors
      const locationSelectors = [
        '.job-search-card__location',
        '.job-result-card__location',
        '.job-location',
        '.location',
        '[data-test-location]'
      ];
      
      let location = '';
      for (const locationSelector of locationSelectors) {
        location = $element.find(locationSelector).text().trim();
        if (location) break;
      }
      
      // Try multiple URL selectors
      const urlSelectors = [
        'a.base-card__full-link',
        'a.job-result-card__link',
        'a[href*="/jobs/view/"]',
        'a[href*="/jobs/"]'
      ];
      
      let url = '';
      for (const urlSelector of urlSelectors) {
        url = $element.find(urlSelector).attr('href') || '';
        if (url) break;
      }
      
      // Trim the URL to simplified form
      const trimmedUrl = this.simplifyLinkedInJobUrl(url);
      
      if (title && company) {
        jobs.push({
          title,
          company,
          location,
          source: 'linkedin',
          url: trimmedUrl,
          posted_at: new Date().toISOString()
        });
      }
    });

    console.log(`Found ${jobs.length} jobs`);
    return jobs;
  }

  private parseLinkedInRSS(xml: string): Job[] {
    const $: CheerioAPI = load(xml, { xmlMode: true });
    const jobs: Job[] = [];

    console.log('Parsing LinkedIn RSS...');
    
    // Parse RSS items
    $('item').each((index: number, element) => {
      const $element = $(element);
      
      const title = $element.find('title').text().trim();
      const company = title.split(' at ')[1] || '';
      const jobTitle = title.split(' at ')[0] || title;
      const location = $element.find('location').text().trim();
      const url = $element.find('link').text().trim();
      
      if (jobTitle && company) {
        jobs.push({
          title: jobTitle,
          company,
          location,
          source: 'linkedin',
          url,
          posted_at: new Date().toISOString()
        });
      }
    });

    console.log(`Found ${jobs.length} jobs from RSS`);
    return jobs;
  }

  private parseLinkedInSimple(html: string): Job[] {
    const $: CheerioAPI = load(html);
    const jobs: Job[] = [];

    console.log('Parsing LinkedIn simple HTML...');
    
    // Use the direct job card selector for the API response
    $('li.job-result-card').each((index: number, element) => {
      const $element = $(element);
      
      const title = $element.find('h3.job-result-card__title').text().trim();
      const company = $element.find('h4.job-result-card__company-name').text().trim();
      const location = $element.find('.job-result-card__location').text().trim();
      const url = $element.find('a.job-result-card__link').attr('href') || '';
      
      if (title && company) {
        jobs.push({
          title,
          company,
          location,
          source: 'linkedin',
          url: url.startsWith('http') ? url : `https://www.linkedin.com${url}`,
          posted_at: new Date().toISOString()
        });
      }
    });

    console.log(`Found ${jobs.length} jobs from simple method`);
    return jobs;
  }

  // Add this new helper method to the JobScraper class
  private simplifyLinkedInJobUrl(url: string): string {
    try {
      // Extract job ID from the URL
      const matches = url.match(/\/view\/.*?-(\d+)\?/);
      if (matches && matches[1]) {
        return `https://www.linkedin.com/jobs/view/${matches[1]}/`;
      }
      return url; // Return original URL if pattern doesn't match
    } catch (error) {
      console.error('Error simplifying LinkedIn URL:', error);
      return url; // Return original URL if there's an error
    }
  }
}
