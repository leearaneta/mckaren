import puppeteer from "puppeteer";
import { FacilityConfig } from "../types";

export async function courtreserveHeaders(config: FacilityConfig) {
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
    
    console.log('Navigating to login page...');
    await page.goto(config.loginUrl);
        
    console.log('Looking for email field...');
    await page.waitForSelector('input[name="UserNameOrEmail"]');
    await page.type('input[name="UserNameOrEmail"]', config.email);
    
    console.log('Looking for password field...');
    await page.waitForSelector('input[name="Password"]');
    await page.type('input[name="Password"]', config.password);
    
    console.log('Looking for login button...');
    await page.evaluate(() => {
      [...document.querySelectorAll('button')].find(element => element.textContent?.includes('Login'))?.click();
    });
    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    const cookies = await page.cookies();
    
    return { Cookie: cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ') };
  } finally {
    await new Promise(resolve => setTimeout(resolve, 500));
    await browser.close();
  }
}