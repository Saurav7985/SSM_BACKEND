const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });
require('dotenv').config({ path: '../.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await mongoose.connection.collection('users').find({}).toArray();
  const monika = users.find(u => (u.name && u.name.toLowerCase().includes('monika')) || (u.username && u.username.toLowerCase().includes('monika')));
  if (!monika) {
    console.log('Monika not found in ' + users.length + ' users');
    process.exit(0);
  }
  
  const monikaId = monika._id.toString();
  console.log('Found Monika ID:', monikaId);

  const { data: tenantData } = await supabase.from('workspace_users').select('tenant_id').eq('user_id', monikaId).maybeSingle();
  let tenantId = tenantData ? tenantData.tenant_id : null;
  
  if (!tenantId) {
    console.log('No tenant found for Monika, creating one...');
    const { data: newTenant } = await supabase.from('tenants').insert({ name: 'Default Workspace', plan: 'Free' }).select('id').single();
    tenantId = newTenant.id;
    await supabase.from('workspace_users').insert({ tenant_id: tenantId, user_id: monikaId, email: monika.email || 'monika@example.com', username: monika.username, role: 'OWNER' });
  }

  console.log('Tenant ID:', tenantId);

  const accounts = [
    { platform: 'linkedin', name: 'Binjwa LinkedIn Page', profile_data: { id: 'org1', name: 'Binjwa LinkedIn Page' }, platform_id: 'li_id_9999' },
    { platform: 'discord', name: "Suryansh's server2 - #general", profile_data: { serverName: "Suryansh's server2", channelId: '12345' }, platform_id: 'disc_9999' },
    { platform: 'youtube', name: 'Suryansh Nema', profile_data: { snippet: { title: 'Suryansh Nema' } }, platform_id: 'yt_9999' },
    { platform: 'whatsapp', name: 'Binjwa IT Solutions', profile_data: { name: 'Binjwa IT Solutions' }, platform_id: 'wa_9999' },
    { platform: 'canva', name: 'My Canva Account (Dev Mode)', profile_data: { name: 'My Canva Account (Dev Mode)' }, platform_id: 'canva_9999' }
  ];

  for (const acc of accounts) {
    const { error } = await supabase.from('social_connections').insert({
      user_id: monikaId,
      tenant_id: tenantId,
      platform: acc.platform,
      name: acc.name,
      platform_id: acc.platform_id,
      access_token: 'restored_mock_token',
      profile_data: acc.profile_data
    });
    if (error) console.error('Error inserting', acc.platform, error);
    else console.log('Restored', acc.platform);
  }

  console.log('Done!');
  process.exit(0);
}
run();
