import cron from 'node-cron';
import { headers } from './etl/headers';
import { pptc, mccarren, usta } from './facilities';
import { main } from './etl/main';

console.log('Starting ETL scheduler...');

// Run headers ETL daily at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running headers ETL...');
  try {
    await headers(mccarren);
    console.log('Headers for mccarren completed successfully');
  } catch (error) {
    console.error('Error in headers ETL:', error);
  }
});

cron.schedule('0 0 * * *', async () => {
  console.log('Running headers ETL...');
  try {
    await headers(usta);
    console.log('Headers for usta completed successfully');
  } catch (error) {
    console.error('Error in headers ETL:', error);
  }
});

cron.schedule('0 0 * * *', async () => {
  console.log('Running headers ETL...');
  try {
    await headers(pptc);
    console.log('Headers for pptc completed successfully');
  } catch (error) {
    console.error('Error in headers ETL:', error);
  }
});

// Run facilities ETL every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Running facilities ETL...');
  try {
    await main();
    console.log('Facilities ETL completed successfully');
  } catch (error) {
    console.error('Error in facilities ETL:', error);
  }
});

// Run both immediately on startup
(async () => {
  console.log('Running initial ETL jobs...');
  
  try {
    console.log('Running initial headers ETL...');
    await Promise.all([
      headers(mccarren),
      headers(usta),
      headers(pptc)
    ]);
    console.log('Initial headers ETL completed successfully');
  } catch (error) {
    console.error('Error in initial headers ETL:', error);
  }
  
  try {
    console.log('Running initial facilities ETL...');
    await main();
    console.log('Initial facilities ETL completed successfully');
  } catch (error) {
    console.error('Error in initial facilities ETL:', error);
  }
})(); 