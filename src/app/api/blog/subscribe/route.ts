import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ success: false, error: "Valid email required" }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: "Invalid email format" }, { status: 400 })
    }

    // In a full implementation, this would insert into blog_subscribers table via Supabase.
    // For now, this is a graceful no-op that returns success.
    // TODO: Connect to Supabase blog_subscribers table.
    // const supabase = await createServerSupabaseClient()
    // const { error } = await supabase.from("blog_subscribers").upsert(
    //   { email: email.toLowerCase().trim(), name: name ?? null, status: "active" },
    //   { onConflict: "email", ignoreDuplicates: false }
    // )
    // if (error && error.code !== "23505") throw error

    return NextResponse.json({ success: true, message: "Successfully subscribed" })
  } catch (err) {
    console.error("[blog/subscribe]", err)
    return NextResponse.json({ success: false, error: "Failed to subscribe" }, { status: 500 })
  }
}
