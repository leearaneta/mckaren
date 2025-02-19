import { launchBrowser } from "~/utils/launchBrowser";
import { config } from './config';

export async function extractHeaders() {
  const browser = await launchBrowser()
  
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
    
    console.log('Navigating to login page...', config.name, config.loginUrl);
    await page.goto(config.loginUrl);
        
    console.log('Looking for email field...', config.name);
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', config.email);
    
    console.log('Looking for password field...', config.name);
    await page.waitForSelector('input[name="password"]');
    await page.type('input[name="password"]', config.password);
    
    await page.click('input[type="checkbox"]');

    console.log('Looking for login button...', config.name);
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

    const cookies = await browser.cookies()
    
    const headers: Record<string, string> = {
      Cookie: cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ')
    };

    headers.RequestVerificationToken = requestVerificationToken || '';
    console.log('requestVerificationToken', requestVerificationToken);
    return headers;
  } finally {
    await new Promise(resolve => setTimeout(resolve, 500));
    await browser.close();
  }
}