import { FacilityConfig } from "~/types";
import { launchBrowser } from "./launchBrowser";

export async function courtreserveHeaders(config: FacilityConfig) {
  const browser = await launchBrowser()
  
  try {
    const page = await browser.newPage();
    
    console.log('Navigating to login page...', config.name, config.loginUrl);
    await page.goto(config.loginUrl);
        
    console.log('Looking for email field...', config.name);
    await page.waitForSelector('input[name="UserNameOrEmail"]');
    await page.type('input[name="UserNameOrEmail"]', config.email);
    
    console.log('Looking for password field...', config.name);
    await page.waitForSelector('input[name="Password"]');
    await page.type('input[name="Password"]', config.password);
    
    console.log('Looking for login button...', config.name);
    await page.evaluate(() => {
      [...document.querySelectorAll('button')].find(element => element.textContent?.includes('Login'))?.click();
    });
    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    const cookies = await browser.cookies();
    
    return { Cookie: cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ') };
  } finally {
    await new Promise(resolve => setTimeout(resolve, 500));
    await browser.close();
  }
}