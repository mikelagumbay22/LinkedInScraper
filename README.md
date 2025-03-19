# LinkedIn Job Scraper

A Next.js application that scrapes job listings from LinkedIn using various methods.

## Features

- Multiple scraping methods:
  - Proxy method (default): Uses a CORS proxy to fetch job listings
  - RSS method: Scrapes LinkedIn's RSS feed
  - Puppeteer method: Uses browser automation
  - Simple method: Direct API request

- Customizable search parameters:
  - Keywords (e.g., "Python", "JavaScript")
  - Location (e.g., "Las Vegas", "Remote")

## API Usage

The API endpoint is available at `/api/test` and accepts the following query parameters:

- `method`: Scraping method to use (default, proxy, rss, puppeteer, simple)
- `keywords`: Job search keywords (default: "Python")
- `location`: Job search location (default: "Las Vegas, Nevada, United States")

Example:
```
GET /api/test?keywords=JavaScript&location=Remote
```

Response format:
```json
{
  "success": true,
  "method": "default",
  "keywords": "JavaScript",
  "location": "Remote",
  "jobs": [
    {
      "title": "Software Engineer",
      "company": "Example Company",
      "location": "Remote",
      "source": "linkedin",
      "url": "https://www.linkedin.com/jobs/view/...",
      "posted_at": "2025-03-17T06:33:12.809Z"
    },
    ...
  ]
}
```

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the development server:
   ```
   npm run dev
   ```
4. Access the API at http://localhost:3000/api/test

## Technologies Used

- Next.js
- TypeScript
- Axios
- Cheerio
- Puppeteer (for browser automation method)

## Notes

- The proxy method uses a free CORS proxy service (api.allorigins.win) to bypass LinkedIn's restrictions
- Different scraping methods may yield different results
- LinkedIn frequently updates their site, so scraping methods may need to be updated accordingly
