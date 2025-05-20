import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get search term from query params
    const url = new URL(req.url);
    const searchTerm = url.searchParams.get('search')?.toLowerCase();

    if (!searchTerm) {
      return new Response(
        JSON.stringify({ error: 'Search term is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // Get all users from auth.users
    const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers();
    if (authError) throw authError;

    // Get all profiles
    const { data: profiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, full_name');
    if (profileError) throw profileError;

    // Filter users based on email or name
    const matchedUsers = authUsers.users
      .filter(user => {
        const profile = profiles?.find(p => p.id === user.id);
        return (
          user.email?.toLowerCase().includes(searchTerm) ||
          profile?.full_name?.toLowerCase().includes(searchTerm)
        );
      })
      .map(user => ({
        id: user.id,
        email: user.email || '',
        full_name: profiles?.find(p => p.id === user.id)?.full_name || null
      }));

    return new Response(
      JSON.stringify(matchedUsers),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );

  } catch (error) {
    console.error('Error searching users:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to search users' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
});