import { Schedule } from '@arkstack/scheduler'

/*
 * Console schedule
 *
 * Define your scheduled tasks here. In production, run them with a single system
 * cron entry:
 *
 *   * * * * * cd /path/to/app && npx ark schedule:run >> /dev/null 2>&1
 *
 * During development, run `ark schedule:work` to evaluate tasks every minute.
 */

// Schedule.command('cache:prune').hourly()
Schedule.call(() => console.log('tick'))
  .everyFiveMinutes()
  .withoutOverlapping()

// Pay out proofs the advertiser left unchecked past the deadline, and close bookings that ran their course.
Schedule.command('bookings:settle')
  .everyFifteenMinutes()
  .withoutOverlapping()
  .onOneServer()

// Send owners, scouts and billposters what they're owed, and check transfers still on their way.
Schedule.command('payouts:send')
  .everyThirtyMinutes()
  .withoutOverlapping()
  .onOneServer()

// Take back print jobs that missed their dates, and warn whoever looks after a board when nobody took its job.
Schedule.command('print-jobs:check')
  .hourly()
  .withoutOverlapping()
  .onOneServer()

// Schedule.exec('backup.sh').dailyAt('01:30').onOneServer()
