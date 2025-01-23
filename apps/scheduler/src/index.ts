import cron from 'node-cron';
import { cookies } from './etl/cookies';
import { main } from './etl/main';

console.log('Starting ETL scheduler...');

// Run cookies ETL daily at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running cookies ETL...');
  try {
    await cookies();
    console.log('Cookies ETL completed successfully');
  } catch (error) {
    console.error('Error in cookies ETL:', error);
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
    console.log('Running initial cookies ETL...');
    await cookies();
    console.log('Initial cookies ETL completed successfully');
  } catch (error) {
    console.error('Error in initial cookies ETL:', error);
  }
  
  try {
    console.log('Running initial facilities ETL...');
    await main();
    console.log('Initial facilities ETL completed successfully');
  } catch (error) {
    console.error('Error in initial facilities ETL:', error);
  }
})(); 