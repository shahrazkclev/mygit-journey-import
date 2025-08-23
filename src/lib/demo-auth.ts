// Demo user ID for single-user application
export const DEMO_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

// Mock auth functions for single-user mode
export const getDemoUser = () => ({
  id: DEMO_USER_ID,
  email: 'demo@example.com',
  created_at: new Date().toISOString(),
});

export const getDemoSession = () => ({
  user: getDemoUser(),
  access_token: 'demo-token',
  expires_at: Date.now() + 3600000, // 1 hour from now
});