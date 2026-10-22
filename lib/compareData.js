/**
 * Centralized Competitor Comparison Data for CreatorStore
 * 
 * Rules:
 * - Only features where CreatorStore = YES are included.
 * - Pricing distinguishes canonical INR billing with international USD equivalents.
 * - Verified competitor pricing across Stan Store, Linktree, and Beacons.
 */

export const CREATORSTORE_PRICING = {
  creator: {
    monthlyInr: '₹499',
    monthlyUsdEquivalent: '≈ $5.20',
    annualInr: '₹4,790',
    annualUsdEquivalent: '≈ $50.00',
    discountPercent: 20,
    platformFee: '0%',
  },
  pro: {
    monthlyInr: '₹999',
    monthlyUsdEquivalent: '≈ $10.40',
    annualInr: '₹9,590',
    annualUsdEquivalent: '≈ $100.00',
    discountPercent: 20,
    platformFee: '0%',
  },
}

export const COMPETITOR_TABS = [
  {
    id: 'stan',
    name: 'Stan Store',
    tagline: 'CreatorStore vs. Stan Store',
    description: 'Compare all-in-one creator commerce, digital products, services, and AutoDM automation.',
  },
  {
    id: 'linktree',
    name: 'Linktree',
    tagline: 'CreatorStore vs. Linktree',
    description: 'Compare full-featured creator storefronts, digital product delivery, and native Instagram AutoDM.',
  },
  {
    id: 'beacons',
    name: 'Beacons',
    tagline: 'CreatorStore vs. Beacons',
    description: 'Compare digital downloads, coaching, Instagram automation, and 0% platform fee monetization.',
  },
]

export const COMPARISON_DATA = {
  stan: {
    competitorName: 'Stan Store',
    competitorBadge: 'Stan Store',
    summary: 'Full parity on digital products, coaching bookings, memberships, and Instagram AutoDM — with a free explore tier and 80% lower entry pricing.',
    pricingSnapshot: {
      creatorStorePlan: 'Creator: ₹499/mo (≈ $5.20 USD)',
      competitorPlan: 'Stan Creator: $29/mo',
      creatorStorePro: 'Pro: ₹999/mo (≈ $10.40 USD)',
      competitorPro: 'Stan Pro: $99/mo',
      platformFee: '0% on both platforms',
      note: 'CreatorStore pricing shown in INR with approximate USD equivalents. Standard payment gateway processing fees apply.',
    },
    categories: [
      {
        name: 'Selling & Monetization',
        features: [
          {
            name: 'Digital products (unlimited)',
            description: 'Ebooks, guides, templates, and files with instant delivery',
            creatorStore: { status: 'yes', label: 'Yes', note: 'Unlimited, all plans' },
            competitor: { status: 'yes', label: 'Yes', note: 'Unlimited' },
          },
          {
            name: 'Product bundles & packages',
            description: 'Combine multiple digital downloads and resources into curated bundles',
            creatorStore: { status: 'yes', label: 'Yes', note: 'All plans' },
            competitor: { status: 'yes', label: 'Yes', note: 'Supported' },
          },
          {
            name: '1:1 coaching & bookings',
            description: 'Custom calendar slots, client intake questions, and direct booking',
            creatorStore: { status: 'yes', label: 'Yes', note: 'All plans' },
            competitor: { status: 'yes', label: 'Yes', note: 'Supported' },
          },
          {
            name: 'Memberships & subscriptions',
            description: 'Recurring member communities, tier management, and private feeds',
            creatorStore: { status: 'yes', label: 'Yes', note: 'All plans' },
            competitor: { status: 'yes', label: 'Yes', note: 'Supported' },
          },
        ],
      },
      {
        name: 'Growth & Automation',
        features: [
          {
            name: 'Instagram AutoDM on every plan',
            description: 'Trigger instant product delivery from reel comments and direct messages',
            creatorStore: { status: 'yes', label: 'Yes', note: 'Native Graph API' },
            competitor: { status: 'yes', label: 'Yes', note: 'Native integration' },
          },
          {
            name: 'Lead capture (email/phone)',
            description: 'Free download magnets and lead capture opt-in forms',
            creatorStore: { status: 'yes', label: 'Yes', note: 'Included' },
            competitor: { status: 'yes', label: 'Yes', note: 'Included' },
          },
        ],
      },
      {
        name: 'Pricing & Value',
        features: [
          {
            name: 'Monthly subscription (Starter/Creator)',
            description: 'Base entry plan for launching storefront and selling products',
            creatorStore: { status: 'text', label: '₹499/mo', note: '≈ $5.20 USD/mo' },
            competitor: { status: 'text', label: '$29/mo', note: 'Stan Creator' },
          },
          {
            name: 'Pro subscription tier',
            description: 'Advanced automations, CRM export, and conversion analytics',
            creatorStore: { status: 'text', label: '₹999/mo', note: '≈ $10.40 USD/mo' },
            competitor: { status: 'text', label: '$99/mo', note: 'Stan Creator Pro' },
          },
          {
            name: 'Annual billing option',
            description: 'Yearly subscription with 20% savings discount',
            creatorStore: { status: 'yes', label: '20% Off', note: '₹4,790/yr (≈ $50 USD)' },
            competitor: { status: 'yes', label: 'Available', note: '$300/yr ($25/mo)' },
          },
          {
            name: '0% platform transaction fee',
            description: 'Keep 100% of your customer sales revenue',
            creatorStore: { status: 'yes', label: '0% fee', note: 'All plans' },
            competitor: { status: 'yes', label: '0% fee', note: 'All plans' },
          },
          {
            name: 'Free plan to explore',
            description: 'Set up your store, upload products, and preview before paying',
            creatorStore: { status: 'yes', label: 'Yes', note: 'Explore free' },
            competitor: { status: 'no', label: 'No', note: '14-day trial only' },
          },
        ],
      },
    ],
  },
  linktree: {
    competitorName: 'Linktree',
    competitorBadge: 'Linktree',
    summary: 'Move beyond a basic link-in-bio list. CreatorStore gives you a complete commerce storefront with digital products, coaching bookings, and Instagram AutoDM with 0% platform fees.',
    pricingSnapshot: {
      creatorStorePlan: 'Creator: ₹499/mo (≈ $5.20 USD)',
      competitorPlan: 'Linktree Starter: $8/mo + 9% fee',
      creatorStorePro: 'Pro: ₹999/mo (≈ $10.40 USD)',
      competitorPro: 'Linktree Pro: $15/mo / Premium $35/mo',
      platformFee: 'CreatorStore 0% vs. Linktree up to 12%',
      note: 'CreatorStore charges 0% platform fee on all plans. Linktree charges 12% on Free, 9% on Starter/Pro, 0% on Premium ($35/mo).',
    },
    categories: [
      {
        name: 'Selling & Monetization',
        features: [
          {
            name: 'Digital products (unlimited)',
            description: 'Sell downloadable files, guides, and templates directly',
            creatorStore: { status: 'yes', label: 'Yes', note: 'Unlimited, all plans' },
            competitor: { status: 'yes', label: 'Yes', note: 'Paid tiers only' },
          },
          {
            name: 'Custom services & deliverables',
            description: 'Accept custom client requests, briefs, and bespoke projects',
            creatorStore: { status: 'yes', label: 'Yes', note: 'All plans' },
            competitor: { status: 'limited', label: 'Limited', note: 'External add-on only' },
          },
          {
            name: '1:1 coaching & bookings',
            description: 'Direct scheduling, client intake, and video session booking',
            creatorStore: { status: 'yes', label: 'Yes', note: 'All plans' },
            competitor: { status: 'no', label: 'No', note: 'Not built-in' },
          },
          {
            name: 'Memberships & subscriptions',
            description: 'Recurring monthly subscriptions and member content feeds',
            creatorStore: { status: 'yes', label: 'Yes', note: 'All plans' },
            competitor: { status: 'no', label: 'No', note: 'Not built-in' },
          },
        ],
      },
      {
        name: 'Growth & Automation',
        features: [
          {
            name: 'Instagram AutoDM',
            description: 'Automated DM replies from comments to drive instant checkout',
            creatorStore: { status: 'yes', label: 'Yes', note: 'Native Graph API' },
            competitor: { status: 'no', label: 'No', note: 'Requires separate tool' },
          },
          {
            name: 'Lead capture',
            description: 'Collect email addresses and phone numbers from visitors',
            creatorStore: { status: 'yes', label: 'Yes', note: 'Included' },
            competitor: { status: 'yes', label: 'Yes', note: 'Paid tiers' },
          },
          {
            name: 'Email broadcasts',
            description: 'Direct email marketing campaigns to your buyers and leads',
            creatorStore: { status: 'yes', label: 'Yes', note: 'Pro plan' },
            competitor: { status: 'no', label: 'No', note: 'Not built-in' },
          },
        ],
      },
      {
        name: 'Pricing & Value',
        features: [
          {
            name: 'Monthly subscription (Starter/Entry)',
            description: 'Starting monthly price for paid capabilities',
            creatorStore: { status: 'text', label: '₹499/mo', note: '≈ $5.20 USD/mo' },
            competitor: { status: 'text', label: '$8/mo', note: 'Starter ($6/mo annual)' },
          },
          {
            name: 'Pro subscription tier',
            description: 'Advanced tools, analytics, and custom integrations',
            creatorStore: { status: 'text', label: '₹999/mo', note: '≈ $10.40 USD/mo' },
            competitor: { status: 'text', label: '$15/mo', note: 'Pro ($12/mo annual)' },
          },
          {
            name: 'Platform transaction fee on sales',
            description: 'Percentage taken by the platform on each customer purchase',
            creatorStore: { status: 'yes', label: '0% fee', note: '0% on all plans' },
            competitor: { status: 'no', label: 'Up to 12%', note: '12% Free, 9% Starter/Pro' },
          },
          {
            name: 'Annual billing option',
            description: 'Yearly billing discount option',
            creatorStore: { status: 'yes', label: '20% Off', note: '₹4,790/yr (≈ $50 USD)' },
            competitor: { status: 'yes', label: 'Available', note: 'Discounted yearly' },
          },
          {
            name: 'Free plan',
            description: 'Explore the full dashboard and build your catalog free',
            creatorStore: { status: 'yes', label: 'Yes', note: 'Explore free' },
            competitor: { status: 'yes', label: 'Yes', note: 'Limited (12% fee)' },
          },
        ],
      },
    ],
  },
  beacons: {
    competitorName: 'Beacons',
    competitorBadge: 'Beacons',
    summary: 'Get complete creator commerce with 0% platform fees on every plan, instant digital delivery, 1:1 coaching bookings, and built-in Instagram AutoDM.',
    pricingSnapshot: {
      creatorStorePlan: 'Creator: ₹499/mo (≈ $5.20 USD)',
      competitorPlan: 'Beacons Creator: $10/mo + 9% fee',
      creatorStorePro: 'Pro: ₹999/mo (≈ $10.40 USD)',
      competitorPro: 'Beacons Plus: $30/mo (0% fee)',
      platformFee: 'CreatorStore 0% vs. Beacons 9% (on $10 plan)',
      note: 'CreatorStore charges 0% platform fee on all plans. Beacons charges 9% transaction fee on the $10/mo Creator plan (0% requires $30/mo Creator Plus).',
    },
    categories: [
      {
        name: 'Selling & Monetization',
        features: [
          {
            name: 'Digital products (unlimited)',
            description: 'Instant delivery for downloads, templates, and assets',
            creatorStore: { status: 'yes', label: 'Yes', note: 'Unlimited, all plans' },
            competitor: { status: 'yes', label: 'Yes', note: '1 free, Store Pro for more' },
          },
          {
            name: 'Product bundles & packages',
            description: 'Bundled digital downloads, presets, and resource packs',
            creatorStore: { status: 'yes', label: 'Yes', note: 'All plans' },
            competitor: { status: 'yes', label: 'Yes', note: 'Creator Plus ($30/mo) only' },
          },
          {
            name: '1:1 coaching & bookings',
            description: 'Bookable time slots, custom questionnaires, and confirmations',
            creatorStore: { status: 'yes', label: 'Yes', note: 'All plans' },
            competitor: { status: 'no', label: 'No', note: 'Not built-in' },
          },
          {
            name: 'Memberships & subscriptions',
            description: 'Recurring monthly subscriptions and exclusive community tiers',
            creatorStore: { status: 'yes', label: 'Yes', note: 'All plans' },
            competitor: { status: 'yes', label: 'Yes', note: 'Creator Plus ($30/mo) only' },
          },
        ],
      },
      {
        name: 'Growth & Automation',
        features: [
          {
            name: 'Instagram AutoDM',
            description: 'Automatically trigger product delivery via Instagram Graph API',
            creatorStore: { status: 'yes', label: 'Yes', note: 'Native Graph API' },
            competitor: { status: 'no', label: 'No', note: 'Requires separate tool' },
          },
          {
            name: 'Lead capture',
            description: 'Offer lead magnets to build an owned audience list',
            creatorStore: { status: 'yes', label: 'Yes', note: 'Included' },
            competitor: { status: 'yes', label: 'Yes', note: 'Add-on app' },
          },
        ],
      },
      {
        name: 'Pricing & Value',
        features: [
          {
            name: 'Monthly subscription (Creator/Entry)',
            description: 'Lowest monthly cost for storefront capabilities',
            creatorStore: { status: 'text', label: '₹499/mo', note: '≈ $5.20 USD/mo (0% fee)' },
            competitor: { status: 'text', label: '$10/mo', note: 'Creator (+ 9% fee)' },
          },
          {
            name: 'Pro subscription tier (0% fee / High Volume)',
            description: 'Full 0% fee tier with advanced automations and analytics tools',
            creatorStore: { status: 'text', label: '₹999/mo', note: '≈ $10.40 USD/mo' },
            competitor: { status: 'text', label: '$30/mo', note: 'Creator Plus' },
          },
          {
            name: 'Platform transaction fee',
            description: 'Platform cut on sales made through your storefront',
            creatorStore: { status: 'yes', label: '0% fee', note: '0% on all plans' },
            competitor: { status: 'no', label: 'Fee applies', note: '9% fee (0% requires $30/mo)' },
          },
          {
            name: 'Annual billing option',
            description: 'Yearly discounted billing option',
            creatorStore: { status: 'yes', label: '20% Off', note: '₹4,790/yr (≈ $50 USD)' },
            competitor: { status: 'yes', label: 'Available', note: 'Discounted yearly' },
          },
          {
            name: 'Free plan',
            description: 'Access the storefront builder and explore tools at zero risk',
            creatorStore: { status: 'yes', label: 'Yes', note: 'Explore free' },
            competitor: { status: 'yes', label: 'Yes', note: 'Limited (1 product)' },
          },
        ],
      },
    ],
  },
}
