import puppeteer from "puppeteer";
import fs from 'fs/promises';
import path from 'path';
import { FacilityConfig } from "../types";

export async function courtreserveCookies(config: FacilityConfig) {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });
  
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
    
    const cookiesPath = path.join(process.cwd(), 'data', 'cookies.json');
    await fs.mkdir(path.dirname(cookiesPath), { recursive: true });
    await fs.writeFile(cookiesPath, JSON.stringify(cookies, null, 2));
    
    return cookies;
  } finally {
    await new Promise(resolve => setTimeout(resolve, 3000));
    await browser.close();
  }
}