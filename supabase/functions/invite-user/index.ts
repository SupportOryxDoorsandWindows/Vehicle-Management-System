// supabase/functions/invite-user/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;

  // Identify the caller from their own token (not trusted from the request body).
  const callerClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role, active')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (!callerProfile || callerProfile.role !== 'admin' || !callerProfile.active) {
    return new Response(JSON.stringify({ error: 'Only active admins can invite users' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json().catch(() => null);
  const email = body?.email as string | undefined;
  const role = body?.role as string | undefined;
  if (!email || (role !== 'admin' && role !== 'viewer')) {
    return new Response(JSON.stringify({ error: 'email and role (admin|viewer) are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: existing } = await adminClient
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existing) {
    return new Response(JSON.stringify({ error: 'A user with this email already exists' }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email);
  if (inviteError || !invited.user) {
    return new Response(JSON.stringify({ error: inviteError?.message ?? 'Invite failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({ id: invited.user.id, email, role, active: true });
  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ id: invited.user.id, email, role }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
