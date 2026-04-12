const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { accountSid, authToken, from, to, body } = await req.json();

    if (!accountSid || !authToken || !from || !to || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields: accountSid, authToken, from, to, body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const recipients = Array.isArray(to) ? to : [to];
    const results: { phone: string; success: boolean; sid?: string; error?: string }[] = [];

    for (const phone of recipients) {
      try {
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ From: from, To: phone, Body: body }).toString(),
          }
        );

        const data = await res.json();

        if (res.ok) {
          results.push({ phone, success: true, sid: data.sid });
        } else {
          results.push({ phone, success: false, error: data.message || 'Unknown error' });
        }
      } catch (e: any) {
        results.push({ phone, success: false, error: e.message });
      }
    }

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({ sent, failed, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
