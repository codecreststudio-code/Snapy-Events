import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  try {
    const { action } = await req.json()

    // 1. Fetch active automation rules
    const { data: rules } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("is_active", true)

    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ message: "No active rules" }), { status: 200 })
    }

    const now = new Date().toISOString()
    let processedCount = 0

    // 2. Process 'trial_expired' event
    if (action === "process_trials" || action === "all") {
      const trialRules = rules.filter((r: any) => r.trigger_event === "trial_expired")
      
      for (const rule of trialRules) {
        // Fetch subscriptions where trial_ends_at is in the past and status is trialing
        const { data: expiredSubs } = await supabase
          .from("subscriptions")
          .select("id, user_id, plan_id")
          .eq("status", "trialing")
          .lt("trial_ends_at", now)

        for (const sub of (expiredSubs || [])) {
          if (rule.action_type === "downgrade_plan" && rule.target_plan) {
            await supabase
              .from("subscriptions")
              .update({ status: "active", plan_id: rule.target_plan })
              .eq("id", sub.id)
            
            await supabase
              .from("users")
              .update({ plan: rule.target_plan })
              .eq("id", sub.user_id)
              
            processedCount++
          }
        }
      }
    }

    // 3. Process 'subscription_expired' event
    if (action === "process_subscriptions" || action === "all") {
      const subRules = rules.filter((r: any) => r.trigger_event === "subscription_expired")
      
      for (const rule of subRules) {
        const { data: expiredSubs } = await supabase
          .from("subscriptions")
          .select("id, user_id, plan_id")
          .eq("status", "active")
          .eq("cancel_at_period_end", true)
          .lt("current_period_end", now)

        for (const sub of (expiredSubs || [])) {
          if (rule.action_type === "downgrade_plan" && rule.target_plan) {
            await supabase
              .from("subscriptions")
              .update({ status: "cancelled" })
              .eq("id", sub.id)
            
            await supabase
              .from("users")
              .update({ plan: rule.target_plan })
              .eq("id", sub.user_id)

            processedCount++
          }
        }
      }
    }

    // 4. Process 'event_expired' (cleanup)
    if (action === "process_events" || action === "all") {
       // e.g., cleanup logic for events
    }

    return new Response(JSON.stringify({ success: true, processedCount }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err: any) {
    return new Response(String(err?.message), { status: 500 })
  }
})
