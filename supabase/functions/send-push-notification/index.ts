// Supabase Edge Function: send-push-notification
// Sends push notifications to iOS and Android devices via Expo Push API
// Automatically chunks batches of 100, respects user preferences, and prunes stale tokens.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  user_ids?: string[]; // Target specific users
  city?: string; // Target all users with this preferred city
  college?: string; // Target all students from this college
  notification_type?: "event_reminders" | "campus_alerts" | "city_updates" | "weekly_digest";
  title: string;
  body: string;
  data?: Record<string, any>; // e.g. { eventId: "123" }
  channel_id?: string; // 'default' | 'events-reminders' | 'campus-alerts' | 'city-updates'
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload: PushPayload = await req.json();
    const { user_ids, city, college, notification_type = "event_reminders", title, body, data = {}, channel_id = "default" } = payload;

    if (!title || !body) {
      return new Response(JSON.stringify({ error: "Title and body are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Build profile query based on targeting filters
    let query = supabaseClient
      .from("profiles")
      .select("id, push_token, notification_preferences, preferred_cities, college")
      .not("push_token", "is", null);

    if (user_ids && user_ids.length > 0) {
      query = query.in("id", user_ids);
    } else if (city) {
      query = query.contains("preferred_cities", [city]);
    } else if (college) {
      query = query.eq("college", college);
    }

    const { data: profiles, error: dbError } = await query;
    if (dbError) throw dbError;

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No target users with push tokens found.", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Filter profiles by user notification preferences
    const validTokens: { token: string; userId: string }[] = [];
    for (const p of profiles) {
      const prefs = p.notification_preferences || {
        event_reminders: true,
        campus_alerts: true,
        city_updates: true,
        weekly_digest: false,
      };

      // Check if user has opted into this notification type
      if (prefs[notification_type] !== false && p.push_token) {
        validTokens.push({ token: p.push_token, userId: p.id });
      }
    }

    if (validTokens.length === 0) {
      return new Response(JSON.stringify({ message: "All eligible users have muted this notification type.", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Prepare messages for Expo Push API (chunking in batches of 100)
    const messages = validTokens.map(({ token }) => ({
      to: token,
      sound: "default",
      title,
      body,
      data,
      channelId: channel_id,
      priority: "high",
    }));

    const BATCH_SIZE = 100;
    const receipts: any[] = [];
    const deadTokens: string[] = [];

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const chunk = messages.slice(i, i + BATCH_SIZE);
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });

      const resData = await response.json();
      receipts.push(resData);

      // Check for DeviceNotRegistered to prune dead tokens
      if (resData?.data && Array.isArray(resData.data)) {
        resData.data.forEach((ticket: any, idx: number) => {
          if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
            deadTokens.push(chunk[idx].to);
          }
        });
      }
    }

    // 4. Prune dead/uninstalled tokens from database
    if (deadTokens.length > 0) {
      await supabaseClient
        .from("profiles")
        .update({ push_token: null })
        .in("push_token", deadTokens);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: messages.length,
        prunedDeadTokens: deadTokens.length,
        receipts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
