import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { appSettingsTable } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// GET /api/automation/settings?job=<jobName>
// Retrieves all settings for a specific automation job
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobName = req.nextUrl.searchParams.get('job');
    if (!jobName) {
      return NextResponse.json({ error: 'Job name is required' }, { status: 400 });
    }

    // Retrieve all settings for this job (keys start with jobName_)
    const prefix = `${jobName}_`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allSettings = await (db as any)
      .select()
      .from(appSettingsTable) as Array<{ id: number; key: string; value: string; updatedAt: Date | null }>;

    // Filter settings that belong to this job and convert to object
    const jobSettings = allSettings
      .filter((setting: { key: string }) => setting.key.startsWith(prefix))
      .reduce((acc: Record<string, unknown>, setting: { key: string; value: string }) => {
        const settingKey = setting.key.replace(prefix, '');
        // Parse JSON values
        try {
          acc[settingKey] = JSON.parse(setting.value);
        } catch {
          acc[settingKey] = setting.value;
        }
        return acc;
      }, {} as Record<string, unknown>);

    return NextResponse.json(jobSettings);
  } catch (error) {
    console.error('Error fetching automation settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// POST /api/automation/settings
// Saves settings for a specific automation job
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { jobName, settings } = body;

    if (!jobName || !settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Job name and settings object are required' },
        { status: 400 }
      );
    }

    // Save each setting to the database
    const prefix = `${jobName}_`;
    for (const [key, value] of Object.entries(settings)) {
      const settingKey = `${prefix}${key}`;
      const settingValue = JSON.stringify(value);

      // Check if setting already exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing = await (db as any)
        .select()
        .from(appSettingsTable)
        .where(eq(appSettingsTable.key, settingKey))
        .limit(1) as Array<{ id: number; key: string; value: string; updatedAt: Date | null }>;

      if (existing.length > 0) {
        // Update existing setting
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await ((db as any).update(appSettingsTable))
          .set({ value: settingValue, updatedAt: new Date() })
          .where(eq(appSettingsTable.key, settingKey));
      } else {
        // Insert new setting
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await ((db as any).insert(appSettingsTable))
          .values({ key: settingKey, value: settingValue });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving automation settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
