// src/lib/payments/coupon-rules.ts
//
// Shared coupon business-rule evaluation. Admin > Marketing > Coupons lets
// an admin configure applicable_plans, excluded_plans, max_discount_amount,
// min_order_value, stackable, first_purchase_only, and specific_users on
// every coupon (see src/app/api/admin/subscriptions/coupons/route.ts), but
// until now nothing outside the admin CRUD routes ever read them — every
// coupon behaved identically at checkout regardless of what an admin
// configured. This is the single place those rules are actually enforced,
// used by both the money-authoritative path (calculatePrice() in
// src/app/api/payments/checkout/route.ts) and the pre-checkout "Apply
// coupon" UI check (src/app/api/payments/coupons/validate/route.ts), so the
// two can't silently drift out of sync again.

export interface CouponRow {
  is_active?: boolean | null
  valid_from?: string | null
  valid_until?: string | null
  max_uses?: number | null
  used_count?: number | null
  applicable_plans?: string[] | null
  excluded_plans?: string[] | null
  min_order_value?: number | null
  max_discount_amount?: number | null
  stackable?: boolean | null
  specific_users?: string[] | null
  first_purchase_only?: boolean | null
  discount_type?: string | null
  discount_value?: number | null
}

export interface CouponEligibilityInput {
  coupon: CouponRow
  /** The plan this checkout is for. Omit when there's no specific plan context (e.g. a bare code-validity check). */
  planId?: string
  /** Pre-discount price, already converted into `currency`. Omit to skip the min_order_value check. */
  priceInCurrency?: number
  currency: "INR" | "USD"
  /** Does this checkout include any guest/shot/photo-limit/video/voice add-ons on top of the base plan? */
  hasAddons?: boolean
  userId?: string | null
  /** How many prior successful transactions this user has — pass 0 for a brand-new user. Omit to skip the first_purchase_only check (e.g. anonymous code-validity check). */
  priorSuccessfulPurchases?: number
}

export interface CouponEligibilityResult {
  eligible: boolean
  reason?: string
}

const INR_PER_USD = 80

function toCurrency(amountInr: number, currency: "INR" | "USD"): number {
  return currency === "USD" ? Math.round(amountInr / INR_PER_USD) : amountInr
}

/** Checks every configured business rule on a coupon. Does NOT check is_active/expiry/max_uses/currently-active-window — callers already checked those via the DB query itself (`.eq("is_active", true)`) plus the timestamp/used_count checks that predate this module. */
export function evaluateCouponEligibility(input: CouponEligibilityInput): CouponEligibilityResult {
  const { coupon, planId, priceInCurrency, currency, hasAddons, userId, priorSuccessfulPurchases } = input

  const applicablePlans = coupon.applicable_plans || []
  const excludedPlans = coupon.excluded_plans || []
  if (planId) {
    if (applicablePlans.length > 0 && !applicablePlans.includes(planId)) {
      return { eligible: false, reason: "This coupon isn't valid for the selected plan." }
    }
    if (excludedPlans.includes(planId)) {
      return { eligible: false, reason: "This coupon isn't valid for the selected plan." }
    }
  }

  if (coupon.min_order_value != null && priceInCurrency != null) {
    const minInCurrency = toCurrency(coupon.min_order_value, currency)
    if (priceInCurrency < minInCurrency) {
      return { eligible: false, reason: `This coupon requires a minimum order value of ${minInCurrency}.` }
    }
  }

  // "Stackable with others" — this app only ever supports a single
  // coupon_code per checkout (no multi-coupon cart), so the closest
  // meaningful enforcement of "stacking" is: a non-stackable coupon only
  // discounts the base plan price, not a purchase that also layers on
  // guest/shot/photo-limit/video/voice add-ons.
  if (coupon.stackable !== true && hasAddons) {
    return { eligible: false, reason: "This coupon can't be combined with add-ons." }
  }

  if (Array.isArray(coupon.specific_users) && coupon.specific_users.length > 0) {
    if (!userId || !coupon.specific_users.includes(userId)) {
      return { eligible: false, reason: "This coupon isn't available for your account." }
    }
  }

  if (coupon.first_purchase_only && priorSuccessfulPurchases != null && priorSuccessfulPurchases > 0) {
    return { eligible: false, reason: "This coupon is only valid on a first purchase." }
  }

  return { eligible: true }
}

/** Applies a coupon's discount (percentage or flat) to a price, honoring max_discount_amount. Assumes evaluateCouponEligibility() already passed. */
export function applyCouponDiscount(coupon: CouponRow, price: number, currency: "INR" | "USD"): number {
  let discount = 0
  if (coupon.discount_type === "percentage") {
    discount = price * ((coupon.discount_value || 0) / 100)
  } else {
    discount = toCurrency(coupon.discount_value || 0, currency)
  }
  if (coupon.max_discount_amount != null) {
    discount = Math.min(discount, toCurrency(coupon.max_discount_amount, currency))
  }
  return Math.max(0, price - discount)
}
