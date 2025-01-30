import { ToadScheduler, SimpleIntervalJob, AsyncTask, CronJob } from 'toad-scheduler';
import { headers } from './etl/headers';
import { pptc, mccarren, usta } from './facilities';
import { main } from './etl/main';

console.log('Starting ETL scheduler...');

const scheduler = new ToadScheduler();

// Create tasks for headers
const mccarrenHeadersTask = new AsyncTask('mccarren-headers', () => headers(mccarren));
const ustaHeadersTask = new AsyncTask('usta-headers', () => headers(usta));
const pptcHeadersTask = new AsyncTask('pptc-headers', () => headers(pptc));
const facilitiesTask = new AsyncTask('facilities', main);

// Create jobs with cron schedules
const mccarrenHeadersJob = new CronJob(
  { cronExpression: '0 0 * * *' },
  mccarrenHeadersTask,
  { preventOverrun: true }
);

const ustaHeadersJob = new CronJob(
  { cronExpression: '0 0 * * *' },
  ustaHeadersTask,
  { preventOverrun: true }
);

const pptcHeadersJob = new CronJob(
  { cronExpression: '0 * * * *' },
  pptcHeadersTask,
  { preventOverrun: true }
);

// Facilities job runs every 5 minutes
const facilitiesJob = new SimpleIntervalJob(
  { minutes: 5, runImmediately: false },
  facilitiesTask,
  { preventOverrun: true }
);

// Add all jobs to the scheduler
scheduler.addCronJob(mccarrenHeadersJob);
scheduler.addCronJob(ustaHeadersJob);
scheduler.addCronJob(pptcHeadersJob);
scheduler.addIntervalJob(facilitiesJob);

// Run initial jobs immediately
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

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down scheduler...');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down scheduler...');
  scheduler.stop();
  process.exit(0);
}); 