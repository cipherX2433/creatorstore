/**
 * Grounded data source for CreatorStore "How It Works" page.
 * Strictly verified against real application capabilities.
 * 
 * STRICT COMPLIANCE RULE:
 * - Grounded exclusively in verified digital capabilities and tools.
 * - Accurate checkout, AutoDM, and payout representations.
 */

export const THREE_STEPS = [
  {
    step: '01',
    title: 'Create your storefront',
    description: 'Claim your unique username, upload your profile avatar, add your bio, and customize your storefront theme to match your personal brand.',
    iconName: 'Store',
    actionText: 'Claim your handle',
    actionHref: '/signup',
  },
  {
    step: '02',
    title: 'Add your products and links',
    description: 'Upload digital downloads, configure 1:1 coaching booking calendars, create lead capture forms, and organize all your priority links in one place.',
    iconName: 'Package',
    actionText: 'See supported products',
    actionHref: '/features',
  },
  {
    step: '03',
    title: 'Connect and start selling',
    description: 'Share your storefront URL in your social bios, enable Instagram AutoDM for automated keyword triggers, and accept secure payments worldwide.',
    iconName: 'Sparkles',
    actionText: 'Explore automations',
    actionHref: '/features',
  },
]

export const EXPLORE_FEATURES = [
  {
    id: 'digital-products',
    name: 'Digital Products',
    category: 'Monetize',
    description: 'Sell downloadable files, PDFs, presets, templates, guides, and software with instant, authenticated delivery upon payment.',
    iconName: 'Package',
    href: '/features',
  },
  {
    id: 'coaching-bookings',
    name: '1:1 Coaching & Bookings',
    category: 'Monetize',
    description: 'Offer 1:1 strategy calls, mentorship, and consulting sessions with integrated calendar scheduling and timezone conversion.',
    iconName: 'Calendar',
    href: '/features',
  },
  {
    id: 'global-checkout',
    name: 'Multi-Currency Global Checkout',
    category: 'Monetize',
    description: 'Accept payments seamlessly via UPI, credit/debit cards, Apple Pay, and Google Pay for both domestic and international buyers.',
    iconName: 'CreditCard',
    href: '/features',
  },
  {
    id: 'instagram-autodm',
    name: 'Instagram AutoDM',
    category: 'Engage',
    description: 'Automatically send direct messages with storefront links and products to Instagram users who comment on your posts and Reels.',
    iconName: 'Bot',
    href: '/features',
  },
  {
    id: 'sales-analytics',
    name: 'Sales Analytics & Insights',
    category: 'Grow',
    description: 'Track visitor traffic, product pageviews, conversion rates, and revenue trends across all your offerings in real time.',
    iconName: 'BarChart3',
    href: '/features',
  },
  {
    id: 'customer-database',
    name: 'Audience & Customer Database',
    category: 'Grow',
    description: 'Own your customer relationships, inspect purchase history, track order statuses, and export your contact lists anytime.',
    iconName: 'Users',
    href: '/features',
  },
  {
    id: 'discounts-coupons',
    name: 'Discounts & Coupons',
    category: 'Monetize',
    description: 'Create customizable percentage or fixed-amount promo codes to boost product launches and reward loyal community members.',
    iconName: 'Tag',
    href: '/features',
  },
  {
    id: 'lead-capture-forms',
    name: 'Forms & Lead Capture',
    category: 'Grow',
    description: 'Collect email subscribers, client intake forms, and inquiries directly from your mobile-first creator storefront.',
    iconName: 'FileText',
    href: '/features',
  },
  {
    id: 'creator-storefront',
    name: 'Store Themes & Styling',
    category: 'Manage',
    description: 'Customize colors, typography, card shapes, and button treatments to give your store a polished, bespoke feel.',
    iconName: 'Palette',
    href: '/features',
  },
]

export const WORKFLOW_STEPS = [
  {
    number: '01',
    title: 'Create your creator profile',
    description: 'Claim your username handle, add your avatar and bio, and select your store theme colors.',
  },
  {
    number: '02',
    title: 'Publish your storefront',
    description: 'Upload your digital files, set pricing, add booking schedules, and organize your key links.',
  },
  {
    number: '03',
    title: 'Share and automate',
    description: 'Place your URL in your social bios and turn on Instagram AutoDM to send links on comment triggers.',
  },
  {
    number: '04',
    title: 'Receive orders and get paid',
    description: 'Buyers checkout securely, files deliver immediately, and payouts route straight to your bank account.',
  },
]

export const HOW_IT_WORKS_FAQS = [
  {
    id: 'faq-01',
    num: '01',
    question: 'How quickly can I set up my CreatorStore?',
    answer: 'Most creators launch their complete storefront in under 10 minutes. You can claim your handle, customize your profile, upload your first digital product or service, and start sharing your link immediately.',
  },
  {
    id: 'faq-02',
    num: '02',
    question: 'What types of products and services can I sell?',
    answer: 'You can sell downloadable digital files (PDFs, templates, presets, ebooks, guides, software), custom services, and 1:1 coaching sessions with automated calendar booking. Physical merchandise is not supported.',
  },
  {
    id: 'faq-03',
    num: '03',
    question: 'How does automated digital product delivery work?',
    answer: 'The moment a customer completes checkout, they receive an immediate download link on the order confirmation screen, along with an encrypted access link sent directly to their email address.',
  },
  {
    id: 'faq-04',
    num: '04',
    question: 'How does Instagram AutoDM work?',
    answer: 'You authorize your Instagram account in your CreatorStore dashboard. When followers comment on your Reels or posts with your designated keyword (e.g. "SEND"), CreatorStore securely sends your product link straight to their direct messages.',
  },
  {
    id: 'faq-05',
    num: '05',
    question: 'How and when do I receive payouts for my sales?',
    answer: 'Payments are processed securely via Dodo Payments (supporting UPI, credit/debit cards, Apple Pay, and Google Pay). Net earnings settle on standard scheduled payout cycles directly into your connected bank account.',
  },
  {
    id: 'faq-06',
    num: '06',
    question: 'Can I use my own custom domain?',
    answer: 'Yes! Pro plan creators can connect their own custom domain (e.g. store.yourname.com) directly to their storefront with automatic SSL certificate provisioning.',
  },
  {
    id: 'faq-07',
    num: '07',
    question: 'What are the platform transaction fees?',
    answer: 'CreatorStore charges 0% platform transaction fees on paid plans. You only pay standard third-party payment processing fees (e.g. card/UPI gateways), keeping the rest of what you earn.',
  },
]
