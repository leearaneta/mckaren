import puppeteer from "puppeteer";

export async function launchBrowser() {
  console.log('Launching browser...');
  if (process.env.BROWSER_WS_ENDPOINT) {
    const browser = await puppeteer.connect({ browserWSEndpoint: process.env.BROWSER_WS_ENDPOINT });
    console.log('Browser connected');
    return browser
  } else {
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
      executablePath: process.env.CHROME_PATH || undefined,
    });
    console.log('Browser launched');
    return browser
  }
}