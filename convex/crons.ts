import { cronJobs } from 'convex/server';
import { api } from './_generated/api';

const crons = cronJobs();

crons.cron(
  'summarize long chat threads',
  '0 */6 * * *', // every 6 hours at :00 UTC
  api.summarize.summarizeNextChat,
);

export default crons;
