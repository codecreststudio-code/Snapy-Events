"use client"

import { useState } from "react"
import { Sparkles, CreditCard, Ticket, Package, Bot, Sliders } from "lucide-react"
import { cn } from "@/lib/utils"

import { PlanBuilder } from "./plan-builder"
import { FeatureManager } from "./feature-manager"
import { CouponManager } from "./coupon-manager"
import { AddonMarketplace } from "./addon-marketplace"
import { AutomationRules } from "./automation-rules"
import { SubscriptionsManager } from "./subscriptions-manager"

export default function AdminSubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<"plans" | "features" | "addons" | "coupons" | "automations" | "subscriptions">("plans")

  const tabs = [
    { id: "plans" as const,         label: "Plan Builder",    icon: Sparkles    },
    { id: "features" as const,      label: "Features",        icon: Sliders     },
    { id: "addons" as const,        label: "Add-ons",         icon: Package     },
    { id: "coupons" as const,       label: "Coupons",         icon: Ticket      },
    { id: "automations" as const,   label: "Automations",     icon: Bot         },
    { id: "subscriptions" as const, label: "Subscriptions",   icon: CreditCard  },
  ]

  return (
    <main className="px-6 py-8 space-y-6 bg-surface-dark min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-playfair font-light tracking-tight text-white">Subscription Control Center</h1>
          <p className="text-sm text-white/50 mt-1">Manage all plans, features, quotas, promotions, and logic dynamically.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 bg-surface-card border border-hairline-dark rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200",
              activeTab === tab.id
                ? "bg-mauve text-[#141110]"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "plans" && <PlanBuilder />}
      {activeTab === "features" && <FeatureManager />}
      {activeTab === "addons" && <AddonMarketplace />}
      {activeTab === "coupons" && <CouponManager />}
      {activeTab === "automations" && <AutomationRules />}
      {activeTab === "subscriptions" && <SubscriptionsManager />}
    </main>
  )
}


