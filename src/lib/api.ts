// API utility functions using Supabase edge functions and tables
import { supabase } from "@/integrations/supabase/client";

export const api = {
  async createCampaign(params: {
    title: string;
    subject: string;
    html_content: string;
    selected_lists: string[];
    sender_sequence: number;
    webhook_url: string;
    user_id: string;
    emails_per_sequence?: number;
    max_sender_sequences?: number;
  }) {
    try {
      // 1) Create the campaign record (using correct column names from schema)
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: params.user_id,
          name: params.title,
          subject: params.subject,
          html_content: params.html_content,
          list_ids: params.selected_lists,
          sender_sequence_number: params.sender_sequence,
          webhook_url: params.webhook_url,
          status: 'draft',
          total_recipients: 0,
          sent_count: 0,
        })
        .select()
        .maybeSingle();

      if (campaignError || !campaign) throw campaignError || new Error('Failed to create campaign');

      // 2) Start sending via edge function
      const { error: sendError } = await supabase.functions.invoke('send-campaign', {
        body: {
          campaignId: campaign.id,
          webhookUrl: params.webhook_url,
          title: params.subject,
          html: params.html_content,
          name: params.title,
          senderSequenceNumber: params.sender_sequence,
          emailsPerSequence: params.emails_per_sequence || 10,
          maxSenderSequences: params.max_sender_sequences || 3,
        },
      });
      if (sendError) throw sendError;

      return { ok: true, json: async () => campaign } as const;
    } catch (error) {
      console.error('Campaign creation error:', error);
      return {
        ok: false,
        status: 500,
        text: async () => (error instanceof Error ? error.message : 'Unknown error'),
      } as const;
    }
  },

  async getCampaign(id: string) {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) throw error || new Error('Campaign not found');
      return { ok: true, json: async () => data } as const;
    } catch (error) {
      console.error('Get campaign error:', error);
      return {
        ok: false,
        status: 500,
        statusText: error instanceof Error ? error.message : 'Unknown error',
      } as const;
    }
  },

  async pauseCampaign(id: string) {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: 'paused' })
        .eq('id', id);
      if (error) throw error;
      return { ok: true } as const;
    } catch (error) {
      console.error('Pause campaign error:', error);
      return { ok: false, status: 500, statusText: (error as Error).message } as const;
    }
  },

  async resumeCampaign(id: string) {
    try {
      // Call the resume-campaign edge function
      const { data, error } = await supabase.functions.invoke('resume-campaign', {
        body: { campaignId: id }
      });
      
      if (error) throw error;
      
      return { 
        ok: true, 
        json: async () => data 
      } as const;
    } catch (error) {
      console.error('Resume campaign error:', error);
      return { 
        ok: false, 
        status: 500, 
        statusText: (error as Error).message 
      } as const;
    }
  },
};
