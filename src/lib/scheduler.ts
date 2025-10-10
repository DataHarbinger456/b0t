import cron, { ScheduledTask } from 'node-cron';

export interface ScheduledJob {
  name: string;
  schedule: string; // Cron expression: e.g., '*/5 * * * *' for every 5 minutes
  task: () => void | Promise<void>;
  enabled?: boolean;
}

class Scheduler {
  private jobs: Map<string, ScheduledTask> = new Map();
  private isInitialized = false;

  /**
   * Register a scheduled job
   * @param job - The job configuration
   *
   * Cron expression format:
   * * * * * *
   * ┬ ┬ ┬ ┬ ┬
   * │ │ │ │ │
   * │ │ │ │ └─── day of week (0 - 7) (0 or 7 is Sunday)
   * │ │ │ └───── month (1 - 12)
   * │ │ └─────── day of month (1 - 31)
   * │ └───────── hour (0 - 23)
   * └─────────── minute (0 - 59)
   *
   * Examples:
   * - '* /5 * * * *' - Every 5 minutes
   * - '0 * * * *' - Every hour at minute 0
   * - '0 0 * * *' - Every day at midnight
   * - '0 9 * * 1' - Every Monday at 9:00 AM
   */
  register(job: ScheduledJob) {
    if (this.jobs.has(job.name)) {
      console.warn(`⚠️  Job "${job.name}" is already registered. Skipping.`);
      return;
    }

    if (job.enabled === false) {
      console.log(`⏸️  Job "${job.name}" is disabled. Skipping registration.`);
      return;
    }

    if (!cron.validate(job.schedule)) {
      console.error(`❌ Invalid cron expression for job "${job.name}": ${job.schedule}`);
      return;
    }

    const scheduledTask = cron.schedule(
      job.schedule,
      async () => {
        console.log(`🔄 Running scheduled job: ${job.name}`);
        try {
          await job.task();
          console.log(`✅ Completed job: ${job.name}`);
        } catch (error) {
          console.error(`❌ Error in job "${job.name}":`, error);
        }
      }
    );

    // Stop the task initially so it doesn't run until start() is called
    scheduledTask.stop();

    this.jobs.set(job.name, scheduledTask);
    console.log(`📅 Registered job: ${job.name} (${job.schedule})`);
  }

  /**
   * Start all registered jobs
   */
  start() {
    if (this.isInitialized) {
      console.warn('⚠️  Scheduler is already running.');
      return;
    }

    console.log(`🚀 Starting scheduler with ${this.jobs.size} job(s)...`);

    this.jobs.forEach((task, name) => {
      task.start();
      console.log(`▶️  Started job: ${name}`);
    });

    this.isInitialized = true;
    console.log('✅ Scheduler started successfully');
  }

  /**
   * Stop all registered jobs
   */
  stop() {
    console.log('🛑 Stopping scheduler...');

    this.jobs.forEach((task, name) => {
      task.stop();
      console.log(`⏹️  Stopped job: ${name}`);
    });

    this.isInitialized = false;
    console.log('✅ Scheduler stopped');
  }

  /**
   * Stop and remove a specific job
   */
  unregister(jobName: string) {
    const task = this.jobs.get(jobName);
    if (!task) {
      console.warn(`⚠️  Job "${jobName}" not found.`);
      return;
    }

    task.stop();
    this.jobs.delete(jobName);
    console.log(`🗑️  Unregistered job: ${jobName}`);
  }

  /**
   * Get list of registered jobs
   */
  getJobs() {
    return Array.from(this.jobs.keys());
  }

  /**
   * Check if scheduler is running
   */
  isRunning() {
    return this.isInitialized;
  }
}

// Singleton instance
export const scheduler = new Scheduler();
