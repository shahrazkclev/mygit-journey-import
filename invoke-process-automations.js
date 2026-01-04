// Script to invoke the process-automations Edge Function
// Run with: node invoke-process-automations.js

const SUPABASE_URL = 'https://mixifcnokcmxarpzwfiy.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_ANON_KEY) {
  console.error('Please set SUPABASE_ANON_KEY environment variable');
  process.exit(1);
}

async function invokeProcessAutomations() {
  try {
    console.log('Invoking process-automations Edge Function...');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-automations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Failed: ${JSON.stringify(data)}`);
    }

    console.log('✅ Success!', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

invokeProcessAutomations();

