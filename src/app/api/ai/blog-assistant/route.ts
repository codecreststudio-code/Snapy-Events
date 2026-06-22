import { NextRequest, NextResponse } from "next/server"

const PROMPTS: Record<string, (title: string, excerpt: string) => string> = {
  seo_title: (title) =>
    `Generate a concise, SEO-optimised blog title (max 60 characters) for an article about: "${title}". Include a primary keyword. Return only the title text, no quotes.`,
  seo_description: (title, excerpt) =>
    `Write an SEO meta description (120-155 characters) for a blog article titled "${title}". Context: ${excerpt || "event photography and QR galleries"}. Include a call to action. Return only the description text.`,
  excerpt: (title) =>
    `Write a compelling 1-2 sentence excerpt for a blog post titled "${title}". Make it engaging and informative. Return only the excerpt text.`,
  outline: (title) =>
    `Create a detailed blog article outline for the topic: "${title}". Include an intro, 5-7 main sections with H2 headings, and a conclusion. Format using Markdown with ## for H2 and ### for H3. Be specific and actionable.`,
  ideas: (title) =>
    `Suggest 5 blog post ideas related to "${title || "event photography and QR galleries"}". Format as a numbered list with brief descriptions.`,
  social: (title, excerpt) =>
    `Write 3 social media posts (LinkedIn, Twitter, Instagram) promoting a blog article titled "${title}". Context: ${excerpt}. Include relevant hashtags.`,
}

export async function POST(req: NextRequest) {
  try {
    const { type, title, excerpt } = await req.json()

    if (!type || !(type in PROMPTS)) {
      return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 })
    }

    const prompt = PROMPTS[type](title ?? "", excerpt ?? "")

    // Use OpenAI if key is available, otherwise return a placeholder
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      // Graceful fallback when no AI key is configured
      const fallbacks: Record<string, string> = {
        seo_title: `${title} - Complete Guide | Snapsy Blog`,
        seo_description: `Discover everything you need to know about ${title}. Expert tips, real examples, and step-by-step guides from the Snapsy team.`,
        excerpt: `In this guide, we explore ${title} with practical tips and real-world examples that event professionals and photographers can apply immediately.`,
        outline: `## Introduction\n\nBrief overview of ${title}.\n\n## What Is ${title}?\n\nDefinition and context.\n\n## Why It Matters\n\nKey benefits and use cases.\n\n## How to Get Started\n\nStep-by-step implementation guide.\n\n## Best Practices\n\nPro tips from the field.\n\n## Common Mistakes to Avoid\n\nPitfalls and how to sidestep them.\n\n## Conclusion\n\nSummary and next steps.`,
        ideas: `1. **Complete Beginner's Guide to ${title}** — Start-to-finish walkthrough\n2. **Top 10 Tips for ${title}** — Quick wins for immediate results\n3. **${title} vs Traditional Methods** — Honest comparison\n4. **Real Results: How Photographers Use ${title}** — Case studies\n5. **Future of ${title}** — What's coming next`,
        social: `LinkedIn: Excited to share our latest guide on ${title}! Discover how top professionals are using this to transform their events. Read more at snapsy.app/blog #EventPhotography #Snapsy\n\nTwitter: New blog post: Everything you need to know about ${title} 📸 Check it out → snapsy.app/blog #events #photography\n\nInstagram: 📖 New article alert! We've put together the ultimate guide on ${title}. Link in bio! #snapsy #eventphotography #tips`,
      }
      return NextResponse.json({ success: true, result: fallbacks[type] })
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert content strategist and SEO specialist for Snapsy, a premium event photography platform. Write in a professional, helpful, and engaging tone.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("[ai/blog-assistant] OpenAI error:", err)
      return NextResponse.json({ success: false, error: "AI generation failed" }, { status: 500 })
    }

    const data = await response.json()
    const result = data.choices?.[0]?.message?.content?.trim()

    return NextResponse.json({ success: true, result })
  } catch (err) {
    console.error("[ai/blog-assistant]", err)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}
