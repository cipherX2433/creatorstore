/**
 * Single source of truth for the CreatorStore Features catalog.
 * Grounded in real, verified application capabilities.
 * 
 * STRICT COMPLIANCE RULE:
 * - NO Courses anywhere in datasets, descriptions, keywords, goals, or FAQs.
 */

export const FEATURE_CATEGORIES = [
  'All features',
  'Earn',
  'Engage',
  'Grow',
  'Manage',
]

export const RAW_FEATURES = [
  {
    id: 'digital-products',
    name: 'Digital Products',
    description: 'Sell downloadable files, PDFs, presets, templates, guides, and software with instant fulfillment.',
    iconName: 'Package',
    category: 'Earn',
    goals: ['monetize', 'manage'],
    searchKeywords: 'digital products downloads files pdf templates ebooks presets software instant delivery store items',
    href: '/dashboard/products',
    isPopular: true,
  },
  {
    id: 'creator-storefront',
    name: 'Creator Storefront',
    description: 'A clean, mobile-first bio link and digital storefront that showcases your links, products, and services.',
    iconName: 'Store',
    category: 'Manage',
    goals: ['manage', 'monetize'],
    searchKeywords: 'storefront store bio link custom domain profile link in bio linktree mobile storefront',
    href: '/dashboard/store',
    isPopular: true,
  },
  {
    id: 'instagram-autodm',
    name: 'Instagram AutoDM',
    description: 'Automatically send direct messages with links and products to Instagram users who comment on your posts.',
    iconName: 'Bot',
    category: 'Engage',
    goals: ['engage', 'grow'],
    searchKeywords: 'instagram autodm comments automations direct message replies meta dm trigger social engagement',
    href: '/dashboard/automations',
    isPopular: true,
  },
  {
    id: 'sales-analytics',
    name: 'Sales Analytics & Insights',
    description: 'Understand visitor behavior, track revenue trends, and optimize conversion rates across all your offerings.',
    iconName: 'BarChart3',
    category: 'Grow',
    goals: ['grow'],
    searchKeywords: 'analytics insights traffic revenue stats performance conversions page views metrics',
    href: '/dashboard/analytics',
    isPopular: true,
  },
  {
    id: 'coaching-bookings',
    name: '1:1 Coaching & Bookings',
    description: 'Offer 1:1 strategy calls, mentorship, and consulting sessions with integrated calendar scheduling.',
    iconName: 'Calendar',
    category: 'Earn',
    goals: ['monetize', 'engage'],
    searchKeywords: 'coaching bookings calendar calls mentorship appointment 1:1 scheduling meetings consultation',
    href: '/dashboard/calendar',
    isPopular: true,
  },
  {
    id: 'instant-payouts',
    name: 'Instant Payouts & Ledger',
    description: 'Track earnings, view transparent transaction fees, and receive fast payouts directly to your bank account.',
    iconName: 'Wallet',
    category: 'Earn',
    goals: ['monetize', 'manage'],
    searchKeywords: 'payouts earnings bank account upi money balance ledger withdrawal finance revenue payouts',
    href: '/dashboard/earn/earnings',
    isPopular: true,
  },
  {
    id: 'store-customization',
    name: 'Store Themes & Styling',
    description: 'Personalize your storefront with curated color palettes, custom covers, bio styling, and layout controls.',
    iconName: 'Palette',
    category: 'Manage',
    goals: ['manage'],
    searchKeywords: 'themes design customization styling colors branding appearance layout cover avatar profile',
    href: '/dashboard/store?tab=design',
    isPopular: false,
  },
  {
    id: 'audience-database',
    name: 'Audience & Customer Database',
    description: 'Centralize customer contact details, purchase history, and subscriber lists with one-click export.',
    iconName: 'Users',
    category: 'Grow',
    goals: ['grow', 'manage'],
    searchKeywords: 'audience customers leads database subscribers contacts email list export crm',
    href: '/dashboard/customers',
    isPopular: false,
  },
  {
    id: 'forms-lead-capture',
    name: 'Forms & Lead Capture',
    description: 'Collect custom information, questions, feedback, and newsletter signups directly on your store.',
    iconName: 'FormInput',
    category: 'Grow',
    goals: ['grow', 'engage'],
    searchKeywords: 'forms responses survey feedback questions newsletter email capture lead generation contact forms',
    href: '/dashboard/forms',
    isPopular: false,
  },
  {
    id: 'digital-business-cards',
    name: 'Digital Business Cards & QR',
    description: 'Share your creator profile instantly with a downloadable vCard and customizable scan-to-visit QR code.',
    iconName: 'IdCard',
    category: 'Engage',
    goals: ['engage'],
    searchKeywords: 'business cards qr code vcard contact sharing networking scan profile digital card',
    href: '/dashboard/business-cards',
    isPopular: false,
  },
  {
    id: 'discounts-coupons',
    name: 'Discounts & Coupons',
    description: 'Run promotional campaigns with percentage or fixed-amount discount codes and usage limit controls.',
    iconName: 'Tag',
    category: 'Earn',
    goals: ['monetize', 'grow'],
    searchKeywords: 'discounts coupons promo codes sales marketing promotions vouchers deals percentage off',
    href: '/dashboard/marketing/coupons',
    isPopular: false,
  },
  {
    id: 'order-management',
    name: 'Order Management & Receipts',
    description: 'Review every customer purchase, download log, and order status with instant receipt generation.',
    iconName: 'ShoppingBag',
    category: 'Manage',
    goals: ['manage', 'monetize'],
    searchKeywords: 'orders transactions sales receipts fulfillment customer orders refund purchase history',
    href: '/dashboard/earn/orders',
    isPopular: false,
  },
  {
    id: 'global-checkout',
    name: 'Multi-Currency Global Checkout',
    description: 'Accept payments seamlessly via UPI, cards, and net banking with localized currencies and frictionless checkout.',
    iconName: 'CreditCard',
    category: 'Earn',
    goals: ['monetize'],
    searchKeywords: 'checkout payments razorpay upi credit card currency inr usd gateway global pay',
    href: '/dashboard/payments',
    isPopular: false,
  },
  {
    id: 'email-broadcasts',
    name: 'Email Broadcasts & Updates',
    description: 'Send announcements, product launch notifications, and updates directly to your customer base.',
    iconName: 'Mail',
    category: 'Engage',
    goals: ['engage', 'grow'],
    searchKeywords: 'email broadcasts newsletters messages updates announcements marketing customer updates',
    href: '/dashboard/marketing/email',
    isPopular: false,
  },
  {
    id: 'bio-links-hub',
    name: 'Bio Links & Social Media Hub',
    description: 'Unify all your social links, YouTube channels, podcasts, and portfolios in a single high-converting link.',
    iconName: 'Link2',
    category: 'Engage',
    goals: ['engage', 'manage'],
    searchKeywords: 'bio links social media links youtube instagram tiktok twitter profile link link hub',
    href: '/dashboard/store',
    isPopular: false,
  },
]

// Defensive safeguard: Ensure Courses can NEVER appear anywhere in the dataset
export const CREATORSTORE_FEATURES = RAW_FEATURES.filter(
  (f) =>
    !f.id.toLowerCase().includes('course') &&
    !f.name.toLowerCase().includes('course') &&
    !f.description.toLowerCase().includes('course') &&
    !f.searchKeywords.toLowerCase().includes('course')
)

export const POPULAR_FEATURES = CREATORSTORE_FEATURES.filter((f) => f.isPopular)

export const FEATURE_GOALS = [
  {
    id: 'monetize',
    title: 'Monetize',
    description: 'Turn your audience into income.',
    panelColor: 'bg-[#2058EA]',
    panelText: 'text-white',
    panelSub: 'Digital Products & Checkout',
    iconName: 'Wallet',
    featureIds: [
      'digital-products',
      'coaching-bookings',
      'global-checkout',
      'discounts-coupons',
      'instant-payouts',
    ],
  },
  {
    id: 'grow',
    title: 'Grow',
    description: 'Own and expand your audience.',
    panelColor: 'bg-[#0B1536]',
    panelText: 'text-white',
    panelSub: 'Analytics & Database',
    iconName: 'BarChart3',
    featureIds: [
      'sales-analytics',
      'audience-database',
      'forms-lead-capture',
      'email-broadcasts',
    ],
  },
  {
    id: 'engage',
    title: 'Engage',
    description: 'Build stronger relationships with your audience.',
    panelColor: 'bg-[#5B347C]',
    panelText: 'text-white',
    panelSub: 'Instagram AutoDM & Links',
    iconName: 'Bot',
    featureIds: [
      'instagram-autodm',
      'digital-business-cards',
      'bio-links-hub',
      'forms-lead-capture',
    ],
  },
  {
    id: 'manage',
    title: 'Manage',
    description: 'Streamline your storefront and creator operations.',
    panelColor: 'bg-[#1F1F1F]',
    panelText: 'text-white',
    panelSub: 'Storefront & Operations',
    iconName: 'Store',
    featureIds: [
      'creator-storefront',
      'store-customization',
      'order-management',
      'instant-payouts',
    ],
  },
]

export const FEATURES_FAQS = [
  {
    id: 'faq-what-is',
    question: 'What is CreatorStore?',
    answer:
      'CreatorStore is an all-in-one platform for creators, consultants, and educators to launch a branded storefront, sell digital products, automate Instagram comment replies with AutoDM, manage 1:1 bookings, and collect direct payouts.',
  },
  {
    id: 'faq-storefront',
    question: 'How do I create and customize my storefront?',
    answer:
      'After creating your account, you get your own unique storefront URL (e.g., creatorstore.store/yourname). Use our drag-and-drop builder to customize themes, color palettes, cover images, profile bios, and bio links in seconds.',
  },
  {
    id: 'faq-products',
    question: 'What types of digital products can I sell?',
    answer:
      'You can sell any downloadable file: PDFs, e-books, templates, presets, software, design assets, and audio files. CreatorStore securely hosts your deliverable files and issues instant, time-limited download links upon successful customer payment.',
  },
  {
    id: 'faq-autodm',
    question: 'How does Instagram AutoDM work?',
    answer:
      'Connect your Instagram professional or creator account via Meta OAuth. Whenever followers comment a designated trigger word (like "LINK" or "SEND") on your post or reel, CreatorStore automatically sends them a direct message with your store or product link.',
  },
  {
    id: 'faq-payments-payouts',
    question: 'How do payments and creator payouts work?',
    answer:
      'CreatorStore accepts all major payment methods including UPI, credit/debit cards, and net banking via secure gateways. Your earnings accumulate in your verified creator balance, and payouts are transferred directly to your bank account or UPI ID.',
  },
  {
    id: 'faq-coaching',
    question: 'Can I offer 1:1 coaching and bookings?',
    answer:
      'Yes. You can configure 1:1 coaching sessions with custom durations, pricing, and availability. Customers choose an open slot on your booking calendar, pay upfront, and receive automated confirmations with meeting details.',
  },
  {
    id: 'faq-plans',
    question: 'Which features are included in my plan?',
    answer:
      'CreatorStore offers a free tier to build your storefront, publish digital products, and start earning. Premium plans unlock higher storage limits, advanced Instagram AutoDM automation volume, custom domain linking, and lower transaction fees.',
  },
]
