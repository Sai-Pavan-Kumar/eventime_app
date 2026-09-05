// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  channelId?: string;
  sound?: string;
  priority?: "default" | "normal" | "high";
}

async function sendExpoPush(messages: ExpoPushMessage[]) {
  if (!messages || messages.length === 0) return;
  const BATCH_SIZE = 100;
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const chunk = messages.slice(i, i + BATCH_SIZE);
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });
      const data = await response.json();
      console.log("[Expo Push Dispatch]:", JSON.stringify(data));
    } catch (err) {
      console.error("[Expo Push Error]:", err);
    }
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase URL or Service Role Key");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const payload = await req.json();
    const { type, table, record, old_record } = payload;

    console.log(`[notify-admin] Triggered for table: ${table}, type: ${type}`);

    // ==========================================
    // 🔔 1. EVENTS TABLE
    // ==========================================
    if (table === "events") {
      // SCENARIO 1: A New Event is Created (From Website, App, or API)
      if (type === "INSERT") {
        // Fetch all Admins with registered push tokens
        const { data: admins, error: adminErr } = await supabase
          .from("profiles")
          .select("id, role, user_type, push_token, fcm_token")
          .or("role.eq.admin,user_type.eq.admin");

        if (adminErr) {
          console.error("[notify-admin] Error fetching admins:", adminErr);
        }

        const tokens = (admins || [])
          .map((a) => a.push_token || a.fcm_token)
          .filter((t): t is string => Boolean(t && t.trim().length > 0));

        if (tokens.length > 0) {
          const eventTitle = record?.title || "An event";
          const eventCity = record?.city || (record?.is_virtual ? "Online" : "Location TBD");
          const organizer = record?.organizer_name || "A curator";

          const adminMessages: ExpoPushMessage[] = tokens.map((token) => ({
            to: token,
            sound: "default",
            title: "New Event Submitted 🔔",
            body: `"${eventTitle}" in ${eventCity} was submitted by ${organizer}. Tap to review in Admin Panel.`,
            data: {
              screen: "Admin",
              eventId: record?.id,
              type: "new_event_submission",
            },
            channelId: "admin-alerts",
            priority: "high",
          }));

          await sendExpoPush(adminMessages);
        } else {
          console.log("[notify-admin] No admin push tokens found in profiles.");
        }
      }

      // SCENARIO 2: Event Approved or Rejected (Notify Curator)
      if (type === "UPDATE" && record?.status !== old_record?.status) {
        const creatorId = record?.creator_id || record?.curator_id;
        if (creatorId) {
          const { data: creatorProfile } = await supabase
            .from("profiles")
            .select("push_token, fcm_token")
            .eq("id", creatorId)
            .maybeSingle();

          const creatorToken = creatorProfile?.push_token || creatorProfile?.fcm_token;
          if (creatorToken) {
            const isApproved = record.status === "approved";
            const isRejected = record.status === "rejected";

            if (isApproved || isRejected) {
              await sendExpoPush([
                {
                  to: creatorToken,
                  sound: "default",
                  title: isApproved ? "🎉 Event Approved!" : "Event Status Update",
                  body: isApproved
                    ? `Your event "${record.title}" is now live on EvenTime!`
                    : `Your event "${record.title}" was not approved. Tap to view notes.`,
                  data: {
                    eventId: record.id,
                    screen: isApproved ? "EventDetail" : "MyPostedEvents",
                  },
                  channelId: "events-reminders",
                  priority: "high",
                },
              ]);
            }
          }
        }
      }
    }

    // ==========================================
    // 🚩 2. EVENT REPORTS TABLE (Event Flagged)
    // ==========================================
    if (table === "event_reports" && type === "INSERT") {
      const { data: admins } = await supabase
        .from("profiles")
        .select("id, push_token, fcm_token")
        .or("role.eq.admin,user_type.eq.admin");

      const tokens = (admins || [])
        .map((a) => a.push_token || a.fcm_token)
        .filter((t): t is string => Boolean(t && t.trim().length > 0));

      if (tokens.length > 0) {
        const reason = record?.reason || "Inaccurate info or spam";
        const adminMessages: ExpoPushMessage[] = tokens.map((token) => ({
          to: token,
          sound: "default",
          title: "⚠️ Event Flagged for Review",
          body: `An event was flagged for "${reason}". Tap to inspect in Admin Panel.`,
          data: {
            screen: "Admin",
            reportId: record?.id,
            eventId: record?.event_id,
          },
          channelId: "admin-alerts",
          priority: "high",
        }));

        await sendExpoPush(adminMessages);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[notify-admin] Unhandled error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
