// API utility functions for backend authentication
const getBackendUrl = () => {
  return 'https://micro-edits.preview.emergentagent.com';
};

const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${getBackendUrl()}/api${endpoint}`;
  const headers = getAuthHeaders();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Token expired or invalid, redirect to login
    localStorage.removeItem('auth_token');
    window.location.reload();
    throw new Error('Authentication required');
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}`);
  }

  return response;
};

// Specific API functions
export const api = {
  // Authentication
  login: (email: string, password: string) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  verifyAuth: () => apiRequest('/auth/verify'),

  // Campaign management
  createCampaign: (campaignData: any) =>
    apiRequest('/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaignData),
    }),

  getCampaign: (campaignId: string) =>
    apiRequest(`/campaigns/${campaignId}`),

  getCampaignProgress: (campaignId: string) =>
    apiRequest(`/campaigns/${campaignId}/progress`),

  pauseCampaign: (campaignId: string) =>
    apiRequest(`/campaigns/${campaignId}/pause`, { method: 'POST' }),

  resumeCampaign: (campaignId: string) =>
    apiRequest(`/campaigns/${campaignId}/resume`, { method: 'POST' }),

  // Status endpoints
  createStatus: (clientName: string) =>
    apiRequest('/status', {
      method: 'POST',
      body: JSON.stringify({ client_name: clientName }),
    }),

  getStatuses: () => apiRequest('/status'),

  // Webhook
  sendWebhook: (payload: any) =>
    apiRequest('/webhook/contacts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};