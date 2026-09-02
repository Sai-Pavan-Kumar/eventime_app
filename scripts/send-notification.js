// Script to trigger a test push notification to a user or all users
// Usage: node scripts/send-notification.js --title "Test Alert" --body "Hello from EvenTime!"

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function sendPushNotification() {
  const args = process.argv.slice(2);
  const title = args.find((_, i) => args[i - 1] === '--title') || '🎉 EvenTime Alert';
  const body = args.find((_, i) => args[i - 1] === '--body') || 'Check out trending events happening near you!';
  const eventId = args.find((_, i) => args[i - 1] === '--eventId') || null;

  console.log(`📡 Fetching registered push tokens...`);
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, push_token')
    .not('push_token', 'is', null);

  if (error) {
    console.error('Database query error:', error);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('ℹ️ No active push tokens found in profiles table.');
    return;
  }

  console.log(`Found ${profiles.length} registered push tokens.`);

  const messages = profiles.map((p) => ({
    to: p.push_token,
    sound: 'default',
    title,
    body,
    data: eventId ? { eventId } : { screen: 'MainTabs' },
    channelId: 'events-reminders',
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  const result = await response.json();
  console.log('✅ Push Notification Result:', JSON.stringify(result, null, 2));
}

sendPushNotification().catch(console.error);
