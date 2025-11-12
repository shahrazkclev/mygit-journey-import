// API functions for automation engine
const AUTOMATION_WORKER_URL = import.meta.env.VITE_AUTOMATION_WORKER_URL || 'https://automation-engine.your-subdomain.workers.dev';

export const automationApi = {
  async triggerAutomation(contactId: string, triggerType: string, triggerData?: any) {
    try {
      const response = await fetch(`${AUTOMATION_WORKER_URL}/automation/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          triggerType,
          triggerData,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to trigger automation: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error triggering automation:', error);
      throw error;
    }
  },

  async listAutomationRules(userId?: string) {
    try {
      const url = new URL(`${AUTOMATION_WORKER_URL}/automation/list`);
      if (userId) {
        url.searchParams.append('user_id', userId);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to list automations: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error listing automations:', error);
      throw error;
    }
  },
};

