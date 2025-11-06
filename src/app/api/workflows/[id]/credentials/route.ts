import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { useSQLite, sqliteDb, postgresDb } from '@/lib/db';
import {
  workflowsTableSQLite, accountsTableSQLite, userCredentialsTableSQLite,
  workflowsTablePostgres, accountsTablePostgres, userCredentialsTablePostgres
} from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { analyzeWorkflowCredentials, getPlatformDisplayName, getPlatformIcon } from '@/lib/workflows/analyze-credentials';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: workflowId } = await params;

    // Get workflow
    let workflow;
    if (useSQLite) {
      if (!sqliteDb) throw new Error('SQLite database not initialized');
      const workflows = await sqliteDb
        .select()
        .from(workflowsTableSQLite)
        .where(
          and(
            eq(workflowsTableSQLite.id, workflowId),
            eq(workflowsTableSQLite.userId, session.user.id)
          )
        )
        .limit(1);

      if (workflows.length === 0) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
      }
      workflow = workflows[0];
    } else {
      if (!postgresDb) throw new Error('PostgreSQL database not initialized');
      const workflows = await postgresDb
        .select()
        .from(workflowsTablePostgres)
        .where(
          and(
            eq(workflowsTablePostgres.id, workflowId),
            eq(workflowsTablePostgres.userId, session.user.id)
          )
        )
        .limit(1);

      if (workflows.length === 0) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
      }
      workflow = workflows[0];
    }

    // Parse config if it's a string (SQLite TEXT column)
    // Note: Drizzle with { mode: 'json' } should auto-parse, but we handle both cases
    let config: {
      steps: Array<{
        id: string;
        module?: string;
        inputs?: Record<string, unknown>;
      }>;
    };

    if (typeof workflow.config === 'string') {
      try {
        config = JSON.parse(workflow.config);
      } catch (error) {
        console.error('Failed to parse workflow config:', error);
        return NextResponse.json(
          { error: 'Invalid workflow configuration' },
          { status: 500 }
        );
      }
    } else {
      config = workflow.config as typeof config;
    }

    // Analyze required credentials (pass trigger to detect chat workflows)
    const requiredCredentials = analyzeWorkflowCredentials(config, workflow.trigger);
    console.log('Workflow config:', JSON.stringify(config, null, 2));
    console.log('Workflow trigger:', workflow.trigger);
    console.log('Required credentials detected:', requiredCredentials);

    // Get OAuth accounts (can have multiple per platform)
    // Note: This is optional - if accounts table doesn't exist, we'll just use API keys
    const oauthAccounts: Record<string, Array<{ id: string; accountName: string; isExpired: boolean }>> = {};
    try {
      if (useSQLite && sqliteDb) {
        const accounts = await sqliteDb
          .select()
          .from(accountsTableSQLite)
          .where(eq(accountsTableSQLite.userId, session.user.id));

        for (const account of accounts) {
          if (!oauthAccounts[account.provider]) {
            oauthAccounts[account.provider] = [];
          }
          if (account.access_token) {
            // Check if expired
            const isExpired = account.expires_at ? Date.now() > account.expires_at * 1000 : false;
            oauthAccounts[account.provider].push({
              id: account.id,
              accountName: account.account_name || account.providerAccountId,
              isExpired,
            });
          }
        }
      } else if (postgresDb) {
        const accounts = await postgresDb
          .select()
          .from(accountsTablePostgres)
          .where(eq(accountsTablePostgres.userId, session.user.id));

        for (const account of accounts) {
          if (!oauthAccounts[account.provider]) {
            oauthAccounts[account.provider] = [];
          }
          if (account.access_token) {
            // Check if expired
            const isExpired = account.expires_at ? new Date(account.expires_at).getTime() < Date.now() : false;
            oauthAccounts[account.provider].push({
              id: account.id,
              accountName: account.account_name || account.providerAccountId,
              isExpired,
            });
          }
        }
      }
    } catch (error) {
      // Accounts table might not exist - this is fine, we'll just use API keys
      console.log('OAuth accounts not available (table may not exist):', error instanceof Error ? error.message : 'Unknown error');
    }

    // Get API keys (can have multiple per platform)
    const apiKeys: Record<string, Array<{ id: string; name: string }>> = {};
    if (useSQLite && sqliteDb) {
      const keys = await sqliteDb
        .select()
        .from(userCredentialsTableSQLite)
        .where(eq(userCredentialsTableSQLite.userId, session.user.id));

      for (const key of keys) {
        if (!apiKeys[key.platform]) {
          apiKeys[key.platform] = [];
        }
        if (key.encryptedValue) {
          apiKeys[key.platform].push({
            id: key.id,
            name: key.name,
          });
        }
      }
    } else if (postgresDb) {
      const keys = await postgresDb
        .select()
        .from(userCredentialsTablePostgres)
        .where(eq(userCredentialsTablePostgres.userId, session.user.id));

      for (const key of keys) {
        if (!apiKeys[key.platform]) {
          apiKeys[key.platform] = [];
        }
        if (key.encryptedValue) {
          apiKeys[key.platform].push({
            id: key.id,
            name: key.name,
          });
        }
      }
    }

    // Platform aliases for credential lookup
    // Maps platform names (from analyze-credentials) to actual credential IDs (from platform-configs)
    const platformAliases: Record<string, string[]> = {
      'youtube': ['youtube_apikey', 'youtube'],
      'twitter': ['twitter_oauth2', 'twitter'],
      'github': ['github_oauth', 'github'],
      'google-sheets': ['googlesheets', 'googlesheets_oauth'],
      'googlesheets': ['googlesheets', 'googlesheets_oauth'],
      'google-calendar': ['googlecalendar', 'googlecalendar_serviceaccount'],
      'googlecalendar': ['googlecalendar', 'googlecalendar_serviceaccount'],
      'notion': ['notion_oauth', 'notion'],
      'airtable': ['airtable_oauth', 'airtable'],
      'hubspot': ['hubspot_oauth', 'hubspot'],
      'salesforce': ['salesforce_jwt', 'salesforce'],
      'slack': ['slack_oauth', 'slack'],
      'discord': ['discord_oauth', 'discord'],
      'stripe': ['stripe_connect', 'stripe'],
    };

    // Build credential status list
    const credentials = requiredCredentials.map((cred) => {
      // Check both the exact platform name and any aliases
      const platformsToCheck = [cred.platform, ...(platformAliases[cred.platform] || [])];

      let accounts: Array<{ id: string; accountName: string; isExpired: boolean }> = [];
      let keys: Array<{ id: string; name: string }> = [];

      // Collect accounts and keys from all matching platforms
      for (const platform of platformsToCheck) {
        accounts = [...accounts, ...(oauthAccounts[platform] || [])];
        keys = [...keys, ...(apiKeys[platform] || [])];
      }

      // Determine connection status based on credential type
      let connected = false;
      if (cred.type === 'oauth') {
        connected = accounts.length > 0;
      } else if (cred.type === 'api_key') {
        connected = keys.length > 0;
      } else if (cred.type === 'both' || cred.type === 'optional') {
        // For 'both' and 'optional', connected if EITHER OAuth or API key is available
        connected = accounts.length > 0 || keys.length > 0;
      }

      return {
        platform: cred.platform,
        type: cred.type,
        displayName: getPlatformDisplayName(cred.platform),
        icon: getPlatformIcon(cred.platform),
        connected,
        accounts,
        keys,
        preferredType: cred.preferredType,
      };
    });

    return NextResponse.json({ credentials });
  } catch (error) {
    console.error('Error fetching workflow credentials:', error);
    // Return empty credentials array instead of error to avoid breaking the UI
    return NextResponse.json({ credentials: [] });
  }
}
