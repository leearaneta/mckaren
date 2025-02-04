import puppeteer from "puppeteer-core";
import fs from 'fs';

export async function launchBrowser() {
  console.log('Launching browser...');
    // Default Chromium paths to check
  const defaultChromiumPaths = {
    linux: '/usr/bin/chromium-browser',  // Debian/Ubuntu/Raspberry Pi
    darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',  // macOS
    win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'  // Windows
  };

  const defaultPath = defaultChromiumPaths[process.platform as keyof typeof defaultChromiumPaths];
  const execPath = process.env.CHROME_PATH || (defaultPath && fs.existsSync(defaultPath) ? defaultPath : undefined);

  if (!execPath) {
    throw new Error(
      'No Chrome/Chromium installation found. Please either:\n' +
      '1. Install Chromium on Raspberry Pi: sudo apt-get update && sudo apt-get install chromium-browser\n' +
      '2. Or set CHROME_PATH environment variable to your Chrome/Chromium installation\n' +
      '3. Or install Chrome/Chromium in the default location for your OS'
    );
  }

  console.log(`Using browser at: ${execPath}`);
  
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    ],
    executablePath: execPath,
  });
  console.log('Browser launched');
  return browser;
}