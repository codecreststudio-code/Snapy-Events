import Link from "next/link"
import {
  Camera,
  QrCode,
  Image,
  Users,
  Sparkles,
  Shield,
  Zap,
  ArrowRight,
  Check,
} from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { PublicNavbar, PublicFooter } from "@/lib/components/layout"

const features = [
  {
    name: "QR Code Galleries",
    description: "Generate unique QR codes for each event. Guests scan and instantly access the gallery to upload photos.",
    icon: QrCode,
  },
  {
    name: "Instant Photo Sharing",
    description: "Share moments in real-time. Guests can upload photos directly from their phones.",
    icon: Image,
  },
  {
    name: "AI Face Search",
    description: "Find photos of anyone in seconds. Our AI detects and matches faces across your entire gallery.",
    icon: Sparkles,
  },
  {
    name: "Guest Management",
    description: "Track RSVPs, manage guest lists, and control who can access your event galleries.",
    icon: Users,
  },
  {
    name: "Secure & Private",
    description: "Password protection, approval workflows, and granular permissions keep your photos safe.",
    icon: Shield,
  },
  {
    name: "Lightning Fast",
    description: "Optimized CDN delivery ensures your galleries load instantly, even with thousands of photos.",
    icon: Zap,
  },
]

const plans = [
  {
    name: "Free",
    price: 0,
    description: "Perfect for trying out Snapsy",
    features: ["1 event", "1 GB storage", "100 photos", "Basic QR codes"],
  },
  {
    name: "Starter",
    price: 499,
    description: "For small events and personal use",
    features: ["5 events", "10 GB storage", "5,000 photos", "10 QR codes per event", "Email support"],
    popular: true,
  },
  {
    name: "Premium",
    price: 3999,
    description: "For professional photographers and large events",
    features: [
      "Unlimited events",
      "1 TB storage",
      "Unlimited photos",
      "Unlimited QR codes",
      "AI Face Search",
      "Priority support",
      "Custom branding",
    ],
  },
]

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 lg:py-32">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
            <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
          </div>

          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Event Photography, Reimagined
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Create stunning event galleries in seconds. Generate QR codes, collect guest photos,
                and discover faces with AI-powered search. The complete platform for photographers
                and event hosts.
              </p>
              <div className="mt-10 flex items-center justify-center gap-4">
                <Link href="/signup">
                  <Button size="lg" className="gap-2">
                    Get Started Free
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" size="lg">
                    View Pricing
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mt-16 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-background" />
              <img
                src="/placeholder-gallery.jpg"
                alt="Snapsy Gallery Preview"
                className="mx-auto rounded-lg shadow-2xl border"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-muted/50">
          <div className="container">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">Everything you need</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Powerful features to manage any event, big or small
              </p>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.name}
                  className="relative rounded-lg border bg-background p-8 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-6 font-semibold">{feature.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24">
          <div className="container">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Three simple steps to your event gallery
              </p>
            </div>

            <div className="mt-16 grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h3 className="mt-6 font-semibold">Create Your Event</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Set up your event in seconds. Add details, customize settings, and choose your galleries.
                </p>
              </div>

              <div className="text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <h3 className="mt-6 font-semibold">Share QR Codes</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Print or share QR codes with your guests. They scan, join, and start uploading photos.
                </p>
              </div>

              <div className="text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <h3 className="mt-6 font-semibold">Collect & Share</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Watch photos pour in. Manage galleries, approve content, and share the final collection.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-24 bg-muted/50" id="pricing">
          <div className="container">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">Simple, transparent pricing</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Start free, upgrade when you need more
              </p>
            </div>

            <div className="mt-16 grid gap-8 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-lg border bg-background p-8 shadow-sm ${
                    plan.popular ? "ring-2 ring-primary" : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      Most Popular
                    </div>
                  )}

                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">₹{plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>

                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <Link href="/signup">
                      <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                        Get Started
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container">
            <div className="rounded-lg bg-primary px-6 py-16 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-primary-foreground">
                Ready to transform your events?
              </h2>
              <p className="mt-4 text-lg text-primary-foreground/80">
                Join thousands of photographers and event hosts using Snapsy
              </p>
              <div className="mt-8">
                <Link href="/signup">
                  <Button size="lg" variant="secondary" className="gap-2">
                    Start Free Today
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}