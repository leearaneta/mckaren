import puppeteer from "puppeteer";
import { config } from './config';

export async function extractHeaders() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Needed for Linux in containers
      '--disable-gpu', // Needed for some Linux environments
      '--window-size=1920,1080',
      '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    ],
    // Use system Chrome if available, otherwise use bundled Chromium
    executablePath: process.env.CHROME_PATH || undefined
  });

  console.log('Browser launched');
  
  try {
    const page = await browser.newPage();
    
    // Enable request interception
    await page.setRequestInterception(true);
    
    // Store the token when we find it
    let requestVerificationToken: string | undefined;
    
    // Listen for requests
    page.on('request', request => {
      if (request.headers()['requestverificationtoken']) {
        const headers = request.headers();
        requestVerificationToken = headers['requestverificationtoken'];
      }
      request.continue();
    });
    
    console.log('Navigating to login page...');
    await page.goto(config.loginUrl);
        
    console.log('Looking for email field...');
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', config.email);
    
    console.log('Looking for password field...');
    await page.waitForSelector('input[name="password"]');
    await page.type('input[name="password"]', config.password);
    
    await page.click('input[type="checkbox"]');

    console.log('Looking for login button...');
    await page.evaluate(() => {
      setTimeout(() => {
        [...document.querySelectorAll('button')].find(element => element.textContent?.includes('Sign In'))?.click();
      }, 1000);
    });
    
    // Wait for navigation and the specific request
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.waitForResponse(response => response.url().includes(config.headersPath!))
    ]);
    
    const cookies = await page.cookies();
    const headers: Record<string, string> = {
      Cookie: cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ')
    };
    
    // Add the verification token if we found it
    if (requestVerificationToken) {
      headers.RequestVerificationToken = requestVerificationToken;
    }    
    return headers;
  } finally {
    await new Promise(resolve => setTimeout(resolve, 500));
    await browser.close();
  }
}