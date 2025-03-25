import axios, { AxiosError } from 'axios';
import { load, CheerioAPI } from 'cheerio';
import { Job, RawJobData } from './types/job';
import puppeteer from 'puppeteer';

export class JobScraper {
  private scrapeCount = 0;
  private readonly LIMIT = 15;

  // Main method - uses the proxy method which is working
  async scrapeJobs(keywords: string = 'Python', location: string = 'Colorado, United States', geoId: string = '103644278', pageNum: number = 0): Promise<{ jobs: Job[], rawData: RawJobData[] }> {
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
            console.log(`Trying proxy: ${proxyUrl}`);
            response = await axios.get(proxyUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
              timeout: 30000
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
        console.log('Response data type:', typeof response.data);
        console.log('Response data keys:', Object.keys(response.data));
        
        let htmlContent = '';
        if (response.data && typeof response.data === 'object') {
          if (response.data.contents) {
            htmlContent = response.data.contents;
          } else if (response.data.data) {
            htmlContent = response.data.data;
          } else if (typeof response.data === 'string') {
            htmlContent = response.data;
          } else {
            console.error('Unexpected response data structure:', response.data);
            throw new Error('Invalid response data structure');
          }
        } else if (typeof response.data === 'string') {
          htmlContent = response.data;
        } else {
          console.error('Unexpected response type:', typeof response.data);
          throw new Error('Invalid response type');
        }

        console.log('HTML content length:', htmlContent.length);
        console.log('First 500 characters of HTML:', htmlContent.substring(0, 500));
        
        if (!htmlContent) {
          console.error('No HTML content found in response');
          return { jobs: [], rawData: [] };
        }

        // Check if the HTML contains job listings
        if (!htmlContent.includes('jobs-search__results-list') && !htmlContent.includes('job-result-card') && !htmlContent.includes('job-card-list__entity')) {
          console.error('HTML does not contain job listings structure');
          console.log('HTML content preview:', htmlContent.substring(0, 1000));
          return { jobs: [], rawData: [] };
        }

        const result = this.parseLinkedIn(htmlContent);
        console.log('Parsing result:', {
          jobsCount: result.jobs.length,
          rawDataCount: result.rawData.length,
          firstJob: result.jobs[0],
          firstRawData: result.rawData[0]
        });

        result.jobs.forEach(job => {
          job.source = `linkedin (${location})`;
        });
        return result;
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
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          console.log('All proxy attempts failed, trying simple method...');
          const simpleJobs = await this.scrapeLinkedInSimple();
          return { jobs: simpleJobs, rawData: [] };
        }
      }
    }

    return { jobs: [], rawData: [] };
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
      const result = this.parseLinkedIn(content);
      return result.jobs;
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
        const result = this.parseLinkedIn(response.data.contents);
        return result.jobs;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseLinkedIn(html: string): { jobs: Job[], rawData: RawJobData[] } {
    const $: CheerioAPI = load(html);
    const jobs: Job[] = [];
    const rawData: RawJobData[] = [];

    console.log('Parsing LinkedIn HTML...');
    console.log('HTML length:', html.length);
    
    // Try different selectors for job cards
    const jobCards = $('.jobs-search__results-list li, .base-card, .job-result-card, .job-card-container, .job-card-list__entity');
    console.log('Job cards found:', jobCards.length);
    
    // Log all possible job card selectors for debugging
    console.log('Available selectors:', {
      jobsList: $('.jobs-search__results-list li').length,
      baseCard: $('.base-card').length,
      jobResultCard: $('.job-result-card').length,
      jobCardContainer: $('.job-card-container').length,
      jobCardListEntity: $('.job-card-list__entity').length
    });
    
    // Log the first job card's HTML structure if available
    const firstCard = jobCards.first();
    if (firstCard.length) {
      console.log('First job card HTML structure:', firstCard.html());
      console.log('First job card classes:', firstCard.attr('class'));
    }
    
    jobCards.each((index: number, element) => {
      const $element = $(element);
      
      // Log the HTML structure for debugging
      console.log(`Job card ${index} HTML:`, $element.html());
      
      // Extract basic information with multiple selector attempts
      const title = $element.find('.base-search-card__title, .job-result-card__title, h3, h4, .job-card-container__title, .job-card-list__title, .job-card-list__entity-title').first().text().trim();
      const company = $element.find('.base-search-card__subtitle, .job-result-card__company-name, .company-name, .job-card-container__company-name, .job-card-list__entity-name').first().text().trim();
      const location = $element.find('.job-search-card__location, .job-result-card__location, .location, .job-card-container__location, .job-card-list__entity-location').first().text().trim();
      const url = $element.find('a[href*="/jobs/view/"], .job-card-container__link, .job-card-list__entity-link').first().attr('href') || '';
      
      // Extract additional information with multiple selector attempts
      const description = $element.find('.base-search-card__metadata, .job-result-card__description, .job-description, .job-card-container__description, .job-card-list__entity-description').first().text().trim();
      const employmentType = $element.find('.job-search-card__employment-type, .job-result-card__employment-type, .employment-type, .job-card-container__employment-type, .job-card-list__entity-employment-type').first().text().trim();
      const salary = $element.find('.job-search-card__salary-info, .job-result-card__salary, .salary-snippet, .job-card-container__salary, .job-card-list__entity-salary').first().text().trim();
      const benefits = $element.find('.job-search-card__benefits, .job-result-card__benefits, .benefits-snippet, .job-card-container__benefits, .job-card-list__entity-benefits').first().text().trim();
      const companySize = $element.find('.job-search-card__company-size, .company-size-snippet, .job-card-container__company-size, .job-card-list__entity-company-size').first().text().trim();
      const companyIndustry = $element.find('.job-search-card__company-industry, .company-industry-snippet, .job-card-container__company-industry, .job-card-list__entity-company-industry').first().text().trim();
      
      // Extract company domain from URL if available
      const companyUrl = $element.find('a[href*="/company/"], .job-card-container__company-link, .job-card-list__entity-company-link').first().attr('href') || '';
      const companyDomain = companyUrl ? new URL(companyUrl).hostname : undefined;
      
      // Log extracted data for debugging
      console.log('Extracted data:', {
        title,
        company,
        location,
        url,
        description,
        employmentType,
        salary,
        benefits,
        companySize,
        companyIndustry,
        companyDomain
      });
      
      // Create raw job data
      const rawJobData: RawJobData = {
        title,
        company,
        location,
        url,
        description,
        employmentType,
        salary,
        benefits,
        companySize,
        companyIndustry,
        companyUrl,
        postedTime: $element.find('time, .job-result-card__posted-time, .job-card-container__posted-time, .job-card-list__entity-posted-time').first().text().trim(),
        jobType: employmentType,
        experienceLevel: $element.find('.job-search-card__experience-level, .experience-level-snippet, .job-card-container__experience-level, .job-card-list__entity-experience-level').first().text().trim(),
        jobFunction: $element.find('.job-search-card__job-function, .job-function-snippet, .job-card-container__job-function, .job-card-list__entity-job-function').first().text().trim(),
        jobLevel: $element.find('.job-search-card__job-level, .job-level-snippet, .job-card-container__job-level, .job-card-list__entity-job-level').first().text().trim(),
        jobSchedule: $element.find('.job-search-card__job-schedule, .job-schedule-snippet, .job-card-container__job-schedule, .job-card-list__entity-job-schedule').first().text().trim(),
        jobWorkplace: $element.find('.job-search-card__workplace, .workplace-snippet, .job-card-container__workplace, .job-card-list__entity-workplace').first().text().trim(),
        jobLocation: location,
        jobDescription: description,
        companyDescription: $element.find('.company-search-card__description, .company-description-snippet, .job-card-container__company-description, .job-card-list__entity-company-description').first().text().trim(),
        companyLogo: $element.find('.company-search-card__logo, .company-logo, .job-card-container__company-logo, .job-card-list__entity-company-logo').first().attr('src') || '',
        companyFollowers: $element.find('.company-search-card__followers, .company-followers-snippet, .job-card-container__company-followers, .job-card-list__entity-company-followers').first().text().trim(),
        companySpecialties: $element.find('.company-search-card__specialties, .company-specialties-snippet, .job-card-container__company-specialties, .job-card-list__entity-company-specialties').first().text().trim(),
        companyWebsite: $element.find('.company-search-card__website, .company-website-snippet, .job-card-container__company-website, .job-card-list__entity-company-website').first().attr('href') || '',
        companyHeadquarters: $element.find('.company-search-card__headquarters, .company-headquarters-snippet, .job-card-container__company-headquarters, .job-card-list__entity-company-headquarters').first().text().trim(),
        companyFounded: $element.find('.company-search-card__founded, .company-founded-snippet, .job-card-container__company-founded, .job-card-list__entity-company-founded').first().text().trim(),
        companyType: $element.find('.company-search-card__type, .company-type-snippet, .job-card-container__company-type, .job-card-list__entity-company-type').first().text().trim(),
        companyServices: $element.find('.company-search-card__services, .company-services-snippet, .job-card-container__company-services, .job-card-list__entity-company-services').first().text().trim(),
        companyTechnologies: $element.find('.company-search-card__technologies, .company-technologies-snippet, .job-card-container__company-technologies, .job-card-list__entity-company-technologies').first().text().trim(),
        companyBenefits: benefits,
        companyCulture: $element.find('.company-search-card__culture, .company-culture-snippet, .job-card-container__company-culture, .job-card-list__entity-company-culture').first().text().trim(),
        companyValues: $element.find('.company-search-card__values, .company-values-snippet, .job-card-container__company-values, .job-card-list__entity-company-values').first().text().trim(),
        companyMission: $element.find('.company-search-card__mission, .company-mission-snippet, .job-card-container__company-mission, .job-card-list__entity-company-mission').first().text().trim(),
        companyVision: $element.find('.company-search-card__vision, .company-vision-snippet, .job-card-container__company-vision, .job-card-list__entity-company-vision').first().text().trim(),
        companyAwards: $element.find('.company-search-card__awards, .company-awards-snippet, .job-card-container__company-awards, .job-card-list__entity-company-awards').first().text().trim(),
        companyNews: $element.find('.company-search-card__news, .company-news-snippet, .job-card-container__company-news, .job-card-list__entity-company-news').first().text().trim(),
        companyBlog: $element.find('.company-search-card__blog, .company-blog-snippet, .job-card-container__company-blog, .job-card-list__entity-company-blog').first().text().trim(),
        companyCareers: $element.find('.company-search-card__careers, .company-careers-snippet, .job-card-container__company-careers, .job-card-list__entity-company-careers').first().text().trim(),
        companyContact: $element.find('.company-search-card__contact, .company-contact-snippet, .job-card-container__company-contact, .job-card-list__entity-company-contact').first().text().trim(),
        companyAddress: $element.find('.company-search-card__address, .company-address-snippet, .job-card-container__company-address, .job-card-list__entity-company-address').first().text().trim(),
        companyPhone: $element.find('.company-search-card__phone, .company-phone-snippet, .job-card-container__company-phone, .job-card-list__entity-company-phone').first().text().trim(),
        companyEmail: $element.find('.company-search-card__email, .company-email-snippet, .job-card-container__company-email, .job-card-list__entity-company-email').first().text().trim(),
        companySocial: {
          linkedin: $element.find('.company-search-card__linkedin, .company-linkedin-snippet, .job-card-container__company-linkedin, .job-card-list__entity-company-linkedin').first().attr('href') || '',
          twitter: $element.find('.company-search-card__twitter, .company-twitter-snippet, .job-card-container__company-twitter, .job-card-list__entity-company-twitter').first().attr('href') || '',
          facebook: $element.find('.company-search-card__facebook, .company-facebook-snippet, .job-card-container__company-facebook, .job-card-list__entity-company-facebook').first().attr('href') || '',
          instagram: $element.find('.company-search-card__instagram, .company-instagram-snippet, .job-card-container__company-instagram, .job-card-list__entity-company-instagram').first().attr('href') || '',
          youtube: $element.find('.company-search-card__youtube, .company-youtube-snippet, .job-card-container__company-youtube, .job-card-list__entity-company-youtube').first().attr('href') || '',
          website: $element.find('.company-search-card__website, .company-website-snippet, .job-card-container__company-website, .job-card-list__entity-company-website').first().attr('href') || '',
        }
      };
      
      rawData.push(rawJobData);
      
      // Create job object with all available information
      if (title && company) {
        jobs.push({
          title,
          company,
          location,
          source: 'linkedin',
          url: this.simplifyLinkedInJobUrl(url),
          posted_at: new Date().toISOString(),
          description,
          employment_type: employmentType,
          salary,
          benefits,
          company_size: companySize,
          company_industry: companyIndustry,
          company_domain: companyDomain
        });
      }
    });

    console.log(`Found ${jobs.length} jobs`);
    return { jobs, rawData };
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
