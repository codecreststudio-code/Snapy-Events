const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function run() {
  try {
    const orgId = "1ce78844-b9c0-4156-acf0-f1ef33443fb6";
    const userId = "efbc4825-5c1b-4d8d-896d-276e9a0b1572";
    
    console.log(`Inserting user ${userId} into public.users...`);
    const { data: newUser, error: newUserErr } = await supabase.from("users").insert({
      id: userId,
      email: "admin@example.com",
      full_name: "Super Admin",
      role: "owner",
      is_admin: true,
      organization_id: orgId,
      permissions: ["*"],
    })
    .select()
    .single();

    if (newUserErr) {
      console.error('Failed to insert user profile:', newUserErr);
    } else {
      console.log('Successfully inserted user profile:', newUser);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
