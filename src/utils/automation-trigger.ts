// Utility to trigger automation when tags change
import { automationApi } from '@/lib/automation-api';

export async function triggerAutomationOnTagChange(
  contactId: string,
  oldTags: string[] | null,
  newTags: string[] | null
) {
  try {
    const oldTagsSet = new Set((oldTags || []).map(t => t.toLowerCase().trim()));
    const newTagsSet = new Set((newTags || []).map(t => t.toLowerCase().trim()));

    // Find added tags
    const addedTags = Array.from(newTagsSet).filter(tag => !oldTagsSet.has(tag));
    
    // Find removed tags
    const removedTags = Array.from(oldTagsSet).filter(tag => !newTagsSet.has(tag));

    // Trigger automation for each added tag
    for (const tag of addedTags) {
      await automationApi.triggerAutomation(contactId, 'tag_added', { tag });
    }

    // Trigger automation for each removed tag
    for (const tag of removedTags) {
      await automationApi.triggerAutomation(contactId, 'tag_removed', { tag });
    }
  } catch (error) {
    console.error('Error triggering automation on tag change:', error);
    // Don't throw - we don't want tag updates to fail if automation fails
  }
}

