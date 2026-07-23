export interface DemoGuest {
  id: string
  name: string
  avatar: string
  role: string
  uploadsCount: number
  reactionsCount: number
  commentsCount: number
}

export interface DemoMediaItem {
  id: string
  type: "photo" | "video" | "voice"
  title: string
  url: string
  thumbnailUrl?: string
  duration?: string // for video or voice
  category: "ceremony" | "portraits" | "dance" | "guests" | "food" | "moments"
  guestName: string
  guestAvatar: string
  timestamp: string
  reactions: Record<string, number>
  comments: Array<{
    id: string
    guestName: string
    guestAvatar: string
    text: string
    timestamp: string
    isVoiceNote?: boolean
  }>
  isFeatured?: boolean
  faceTags?: string[]
}

export interface DemoMilestone {
  id: string
  time: string
  title: string
  description: string
  icon: string
  mediaIds: string[]
}

export interface DemoNotification {
  id: string
  type: "upload" | "comment" | "join" | "ai" | "memory"
  title: string
  message: string
  timestamp: string
  unread: boolean
  avatar?: string
}

export interface DemoEventTemplate {
  id: string
  name: string
  emoji: string
  tagline: string
  description: string
  eventDate: string
  venue: string
  joinCode: string
  coverImage: string
  hostName: string
  hostAvatar: string
  guests: DemoGuest[]
  media: DemoMediaItem[]
  milestones: DemoMilestone[]
  notifications: DemoNotification[]
  analytics: {
    guestsJoined: number
    totalUploads: number
    imagesCount: number
    videosCount: number
    voiceNotesCount: number
    commentsCount: number
    reactionsCount: number
    storageUsedGb: number
    mostActiveGuest: string
    popularPhotoTitle: string
    peakActivityTime: string
    dailyUploads: Array<{ date: string; uploads: number }>
    hourlyActivity: Array<{ hour: string; count: number }>
  }
  aiOutputs: {
    eventSummary: string
    memoryStory: {
      title: string
      chapters: Array<{ title: string; text: string; image: string }>
    }
    slideshow: {
      musicTrack: string
      durationMin: number
      featuredCount: number
    }
    highlightVideo: {
      durationSec: number
      thumbnailUrl: string
      title: string
    }
    smartAlbums: Array<{
      id: string
      name: string
      count: number
      coverImage: string
    }>
    faceClusters: Array<{
      guestName: string
      avatar: string
      matchedPhotoCount: number
    }>
  }
}

// Copyright-safe high quality demonstration assets using curated Unsplash imagery & media
export const DEMO_TEMPLATES: Record<string, DemoEventTemplate> = {
  wedding: {
    id: "wedding",
    name: "Snapsy & Events Wedding",
    emoji: "💍",
    tagline: "A celebration of love, laughter, and everlasting memories",
    description:
      "Welcome to Snapsy & Events Wedding! Explore how guests effortlessly capture and share photos, videos, voice notes, and AI memories in real time.",
    eventDate: "Saturday, July 18, 2026 • 4:00 PM EST",
    venue: "The Grand Rosewood Estate, Sonoma Valley, CA",
    joinCode: "SNAP-WED2026",
    coverImage:
      "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop",
    hostName: "Alex & Jordan Taylor",
    hostAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop",
    guests: [
      { id: "g1", name: "Emily Watson", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop", role: "Maid of Honor", uploadsCount: 14, reactionsCount: 42, commentsCount: 11 },
      { id: "g2", name: "John Miller", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop", role: "Best Man", uploadsCount: 18, reactionsCount: 38, commentsCount: 9 },
      { id: "g3", name: "Sophia Martinez", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop", role: "Bridesmaid", uploadsCount: 12, reactionsCount: 31, commentsCount: 7 },
      { id: "g4", name: "Michael Chen", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop", role: "Groomsman", uploadsCount: 15, reactionsCount: 29, commentsCount: 8 },
      { id: "g5", name: "Olivia Davis", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop", role: "Family", uploadsCount: 9, reactionsCount: 24, commentsCount: 6 },
      { id: "g6", name: "Noah Wilson", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=150&auto=format&fit=crop", role: "Photographer Guest", uploadsCount: 22, reactionsCount: 51, commentsCount: 15 },
      { id: "g7", name: "Emma Taylor", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=150&auto=format&fit=crop", role: "Sister of Bride", uploadsCount: 11, reactionsCount: 35, commentsCount: 10 },
      { id: "g8", name: "Liam Anderson", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150&auto=format&fit=crop", role: "College Friend", uploadsCount: 8, reactionsCount: 19, commentsCount: 4 },
    ],
    media: [
      {
        id: "m1",
        type: "photo",
        title: "The Golden Hour Couple Portrait",
        url: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop",
        category: "portraits",
        guestName: "Noah Wilson",
        guestAvatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=150&auto=format&fit=crop",
        timestamp: "5:45 PM",
        isFeatured: true,
        faceTags: ["Alex & Jordan Taylor"],
        reactions: { "❤️": 48, "😍": 32, "🔥": 19, "👏": 14 },
        comments: [
          { id: "c1", guestName: "Emily Watson", guestAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop", text: "This picture is amazing ❤️", timestamp: "5:48 PM" },
          { id: "c2", guestName: "John Miller", guestAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop", text: "My favorite moment! Snapsy & Events", timestamp: "5:50 PM" },
          { id: "c3", guestName: "Sophia Martinez", guestAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop", text: "So beautiful! Snapsy-Events ✨", timestamp: "5:55 PM" },
        ],
      },
      {
        id: "m2",
        type: "photo",
        title: "Walking Down the Aisle",
        url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop",
        category: "ceremony",
        guestName: "Emily Watson",
        guestAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop",
        timestamp: "4:20 PM",
        isFeatured: true,
        faceTags: ["Emily Watson", "Alex & Jordan Taylor"],
        reactions: { "❤️": 42, "😍": 28, "👏": 22 },
        comments: [
          { id: "c4", guestName: "Olivia Davis", guestAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop", text: "Not a dry eye in the room! 😭❤️", timestamp: "4:25 PM" },
        ],
      },
      {
        id: "m3",
        type: "video",
        title: "First Dance Highlight",
        url: "https://assets.mixkit.co/videos/preview/mixkit-wedding-couple-dancing-in-a-hall-41584-large.mp4",
        thumbnailUrl: "https://images.unsplash.com/photo-1545232979-fbf34fe378a8?q=80&w=800&auto=format&fit=crop",
        duration: "0:45",
        category: "dance",
        guestName: "John Miller",
        guestAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop",
        timestamp: "7:30 PM",
        isFeatured: true,
        reactions: { "❤️": 55, "🔥": 34, "😍": 26, "👏": 18 },
        comments: [
          { id: "c5", guestName: "Michael Chen", guestAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop", text: "What a memory! created with Snapsy-Events 🎉", timestamp: "7:35 PM" },
          { id: "c6", guestName: "Liam Anderson", guestAvatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150&auto=format&fit=crop", text: "Hahaha love the spin move at the end! 😂", timestamp: "7:38 PM" },
        ],
      },
      {
        id: "m4",
        type: "voice",
        title: "Maid of Honor Toast & Wishes",
        url: "#voice-sample-1",
        duration: "0:32",
        category: "moments",
        guestName: "Emily Watson",
        guestAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop",
        timestamp: "6:15 PM",
        reactions: { "❤️": 39, "😊": 21, "👏": 15 },
        comments: [
          { id: "c7", guestName: "Emma Taylor", guestAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=150&auto=format&fit=crop", text: "We love you Snapsy & Events!", timestamp: "6:18 PM", isVoiceNote: true },
        ],
      },
      {
        id: "m5",
        type: "photo",
        title: "Grand Entrance & Cheers",
        url: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=800&auto=format&fit=crop",
        category: "guests",
        guestName: "Sophia Martinez",
        guestAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop",
        timestamp: "6:00 PM",
        faceTags: ["Sophia Martinez", "Michael Chen"],
        reactions: { "❤️": 31, "🔥": 18, "😊": 12 },
        comments: [
          { id: "c8", guestName: "Noah Wilson", guestAvatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=150&auto=format&fit=crop", text: "Love this energy! 🔥", timestamp: "6:05 PM" },
        ],
      },
      {
        id: "m6",
        type: "photo",
        title: "Multi-tier Wedding Cake",
        url: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?q=80&w=800&auto=format&fit=crop",
        category: "food",
        guestName: "Olivia Davis",
        guestAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop",
        timestamp: "8:00 PM",
        reactions: { "❤️": 27, "😍": 24, "😊": 10 },
        comments: [
          { id: "c9", guestName: "Emily Watson", guestAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop", text: "The lemon raspberry flavor was divine! 🎂", timestamp: "8:10 PM" },
        ],
      },
      {
        id: "m7",
        type: "photo",
        title: "Outdoor Rose Garden Setup",
        url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?q=80&w=800&auto=format&fit=crop",
        category: "food",
        guestName: "Michael Chen",
        guestAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop",
        timestamp: "3:30 PM",
        reactions: { "❤️": 29, "😍": 19 },
        comments: [
          { id: "c10", guestName: "Liam Anderson", guestAvatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150&auto=format&fit=crop", text: "Unbelievable venue setting!", timestamp: "3:40 PM" },
        ],
      },
      {
        id: "m8",
        type: "photo",
        title: "Bridal Party Group Selfie",
        url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=800&auto=format&fit=crop",
        category: "guests",
        guestName: "Emma Taylor",
        guestAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=150&auto=format&fit=crop",
        timestamp: "5:15 PM",
        faceTags: ["Emily Watson", "Sophia Martinez", "Emma Taylor"],
        reactions: { "❤️": 36, "😂": 15, "🔥": 21 },
        comments: [
          { id: "c11", guestName: "John Miller", guestAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop", text: "Squad goals! 📸", timestamp: "5:20 PM" },
        ],
      },
      {
        id: "m9",
        type: "voice",
        title: "Family Congratulatory Audio Note",
        url: "#voice-sample-2",
        duration: "0:25",
        category: "moments",
        guestName: "Olivia Davis",
        guestAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop",
        timestamp: "6:45 PM",
        reactions: { "❤️": 33, "👏": 12 },
        comments: [
          { id: "c12", guestName: "Emily Watson", guestAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop", text: "So happy to be here.", timestamp: "6:48 PM" },
        ],
      },
      {
        id: "m10",
        type: "video",
        title: "Cake Cutting Ceremony",
        url: "https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-wedding-couple-cutting-a-cake-41585-large.mp4",
        thumbnailUrl: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?q=80&w=800&auto=format&fit=crop",
        duration: "0:28",
        category: "ceremony",
        guestName: "Noah Wilson",
        guestAvatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=150&auto=format&fit=crop",
        timestamp: "8:05 PM",
        reactions: { "❤️": 41, "😂": 19, "👏": 25 },
        comments: [
          { id: "c13", guestName: "Sophia Martinez", guestAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop", text: "What a beautiful wedding! of Snapsy & Events", timestamp: "8:09 PM" },
        ],
      },
    ],
    milestones: [
      { id: "t1", time: "3:30 PM", title: "Guests Started Joining & QR Scans", description: "Guests arrived, scanned QR code, and uploaded arrival selfies", icon: "Users", mediaIds: ["m7"] },
      { id: "t2", time: "4:00 PM", title: "Wedding Ceremony Started", description: "Vows exchanged under the rose arch", icon: "Heart", mediaIds: ["m2"] },
      { id: "t3", time: "5:30 PM", title: "Sunset Portraits & Golden Hour", description: "Couple portraits captured around estate gardens", icon: "Camera", mediaIds: ["m1", "m8"] },
      { id: "t4", time: "6:30 PM", title: "Dinner & Toasts", description: "Speeches, champagne toasts, and voice notes recorded", icon: "Mic", mediaIds: ["m4", "m9", "m5"] },
      { id: "t5", time: "7:30 PM", title: "First Dance & Dance Floor Opened", description: "Music began and guest live wall started streaming", icon: "Music", mediaIds: ["m3"] },
      { id: "t6", time: "8:00 PM", title: "Cake Cutting Ceremony", description: "Four-tier lemon raspberry cake cutting", icon: "Sparkles", mediaIds: ["m6", "m10"] },
      { id: "t7", time: "10:00 PM", title: "Sparkler Farewell", description: "Final sendoff with sparklers and AI highlight generation", icon: "Star", mediaIds: ["m1"] },
    ],
    notifications: [
      { id: "n1", type: "upload", title: "New Photos", message: "Emily Watson uploaded 5 new photos.", timestamp: "2 mins ago", unread: true, avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop" },
      { id: "n2", type: "comment", title: "New Comment", message: "Michael Chen commented on your video.", timestamp: "12 mins ago", unread: true, avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop" },
      { id: "n3", type: "join", title: "Guests Joining", message: "12 new guests scanned QR and joined the event.", timestamp: "35 mins ago", unread: false },
      { id: "n4", type: "ai", title: "AI Highlight Video Ready", message: "Your 4K AI Highlight Video has been generated!", timestamp: "1 hour ago", unread: false },
      { id: "n5", type: "memory", title: "AI Memory Story Created", message: "New AI Memory Story is ready to view and share.", timestamp: "2 hours ago", unread: false },
    ],
    analytics: {
      guestsJoined: 48,
      totalUploads: 154,
      imagesCount: 124,
      videosCount: 18,
      voiceNotesCount: 12,
      commentsCount: 89,
      reactionsCount: 342,
      storageUsedGb: 2.4,
      mostActiveGuest: "Emily Watson (18 uploads)",
      popularPhotoTitle: "The Golden Hour Couple Portrait (80 reactions)",
      peakActivityTime: "8:00 PM – 9:00 PM",
      dailyUploads: [
        { date: "Jul 17", uploads: 12 },
        { date: "Jul 18 (Day of)", uploads: 128 },
        { date: "Jul 19", uploads: 14 },
      ],
      hourlyActivity: [
        { hour: "3 PM", count: 8 },
        { hour: "4 PM", count: 24 },
        { hour: "5 PM", count: 32 },
        { hour: "6 PM", count: 28 },
        { hour: "7 PM", count: 35 },
        { hour: "8 PM", count: 42 },
        { hour: "9 PM", count: 22 },
        { hour: "10 PM", count: 15 },
      ],
    },
    aiOutputs: {
      eventSummary:
        "The Snapsy & Events Wedding was an extraordinary celebration with 48 active guests uploading 154 photos, videos, and voice notes. Peak activity occurred during the First Dance and Cake Cutting between 7:30 PM and 8:30 PM. 89 comments and 342 reactions were shared across galleries.",
      memoryStory: {
        title: "Snapsy & Events: The Journey of Love",
        chapters: [
          { title: "Chapter 1: The Gathering", text: "Friends and family arrived from near and far, scanning the QR code and capturing smiles.", image: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?q=80&w=800&auto=format&fit=crop" },
          { title: "Chapter 2: The Vows", text: "Under golden light and fragrant roses, vows were spoken that will last a lifetime.", image: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop" },
          { title: "Chapter 3: Golden Hour", text: "Sunset embraced the estate as couple portraits filled the live wall with warmth.", image: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop" },
          { title: "Chapter 4: The Celebration", text: "Dancing, laughter, and sweet cake capped off an unforgettable evening.", image: "https://images.unsplash.com/photo-1545232979-fbf34fe378a8?q=80&w=800&auto=format&fit=crop" },
        ],
      },
      slideshow: {
        musicTrack: "Romantic Acoustic Strings",
        durationMin: 3.5,
        featuredCount: 42,
      },
      highlightVideo: {
        durationSec: 60,
        thumbnailUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop",
        title: "Snapsy & Events Wedding Official 60s Recap",
      },
      smartAlbums: [
        { id: "sa1", name: "Ceremony Moments", count: 32, coverImage: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=400&auto=format&fit=crop" },
        { id: "sa2", name: "Couple Portraits", count: 24, coverImage: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=400&auto=format&fit=crop" },
        { id: "sa3", name: "Dance Floor Madness", count: 45, coverImage: "https://images.unsplash.com/photo-1545232979-fbf34fe378a8?q=80&w=400&auto=format&fit=crop" },
        { id: "sa4", name: "Food & Toast Drinks", count: 28, coverImage: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?q=80&w=400&auto=format&fit=crop" },
        { id: "sa5", name: "Guest Selfies", count: 25, coverImage: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=400&auto=format&fit=crop" },
      ],
      faceClusters: [
        { guestName: "Emily Watson", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop", matchedPhotoCount: 14 },
        { guestName: "John Miller", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop", matchedPhotoCount: 18 },
        { guestName: "Sophia Martinez", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop", matchedPhotoCount: 12 },
        { guestName: "Michael Chen", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop", matchedPhotoCount: 15 },
        { guestName: "Alex & Jordan Taylor", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop", matchedPhotoCount: 38 },
      ],
    },
  },
  birthday: {
    id: "birthday",
    name: "Snapsy's Birthday Party 🎂",
    emoji: "🎂",
    tagline: "Unforgettable birthday bash filled with music, cake & laughter",
    description: "Sample birthday celebration showcasing instant guest photo uploads and live party wall streaming.",
    eventDate: "Friday, August 14, 2026 • 7:00 PM EST",
    venue: "Skyline Rooftop Lounge, Downtown Austin, TX",
    joinCode: "SNAP-BDAY26",
    coverImage: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=1200&auto=format&fit=crop",
    hostName: "Snapsy Team",
    hostAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop",
    guests: [
      { id: "g1", name: "Emily Watson", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop", role: "Co-Host", uploadsCount: 12, reactionsCount: 30, commentsCount: 6 },
      { id: "g2", name: "John Miller", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop", role: "DJ Friend", uploadsCount: 16, reactionsCount: 25, commentsCount: 8 },
    ],
    media: [
      {
        id: "bm1",
        type: "photo",
        title: "Blowing Birthday Candles",
        url: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=800&auto=format&fit=crop",
        category: "moments",
        guestName: "Emily Watson",
        guestAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop",
        timestamp: "8:30 PM",
        isFeatured: true,
        reactions: { "❤️": 35, "🔥": 20, "🎂": 28 },
        comments: [{ id: "bc1", guestName: "John Miller", guestAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop", text: "Happy Birthday Snapsy! 🎉", timestamp: "8:32 PM" }],
      },
    ],
    milestones: [
      { id: "bt1", time: "7:00 PM", title: "Party Kicks Off", description: "Rooftop drinks and DJ set", icon: "Music", mediaIds: ["bm1"] },
    ],
    notifications: [
      { id: "bn1", type: "upload", title: "Party Photos", message: "John uploaded 8 party snaps.", timestamp: "5 mins ago", unread: true },
    ],
    analytics: {
      guestsJoined: 32, totalUploads: 88, imagesCount: 75, videosCount: 8, voiceNotesCount: 5, commentsCount: 42, reactionsCount: 195, storageUsedGb: 1.2, mostActiveGuest: "John Miller", popularPhotoTitle: "Blowing Birthday Candles", peakActivityTime: "9:00 PM", dailyUploads: [{ date: "Aug 14", uploads: 88 }], hourlyActivity: [{ hour: "8 PM", count: 40 }],
    },
    aiOutputs: {
      eventSummary: "Wild birthday celebration with 32 guests, 88 uploads, and high energy!",
      memoryStory: { title: "The Ultimate Birthday Bash", chapters: [{ title: "Rooftop Vibes", text: "Skyline views and celebration.", image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=800&auto=format&fit=crop" }] },
      slideshow: { musicTrack: "Upbeat Party Beats", durationMin: 2.5, featuredCount: 30 },
      highlightVideo: { durationSec: 45, thumbnailUrl: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=800&auto=format&fit=crop", title: "Birthday Party Highlights" },
      smartAlbums: [{ id: "bsa1", name: "Party Shots", count: 40, coverImage: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=400&auto=format&fit=crop" }],
      faceClusters: [{ guestName: "Emily Watson", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop", matchedPhotoCount: 12 }],
    },
  },
}
