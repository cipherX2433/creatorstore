/**
 * CreatorStore Help & Support Content
 * Structured, data-driven help categories and detailed articles
 * accurately reflecting real CreatorStore features.
 */

export const HELP_CATEGORIES = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Create and customize your storefront, profile, and basic setup.',
    iconName: 'Compass',
    topics: [
      'Create and customize a storefront',
      'Set up a creator profile',
      'Publish and organize store items',
    ],
  },
  {
    id: 'products-content',
    title: 'Products & Content',
    description: 'Add digital products, media links, and troubleshoot visibility.',
    iconName: 'Package',
    topics: [
      'Add digital products and files',
      'Add media and social links',
      'Edit and publish storefront items',
      'Troubleshoot product visibility',
    ],
  },
  {
    id: 'payments-earnings',
    title: 'Payments & Earnings',
    description: 'Understand transactions, payouts, and bank details.',
    iconName: 'Wallet',
    topics: [
      'Understand payment status',
      'Configure payout details',
      'Understand orders and earnings',
      'Troubleshoot pending or failed transactions',
    ],
  },
  {
    id: 'bookings',
    title: 'Bookings',
    description: 'Configure 1:1 coaching, availability schedules, and client sessions.',
    iconName: 'Calendar',
    topics: [
      'Configure calendar availability',
      'Set booking prices and schedules',
      'Manage booking requests',
    ],
  },
  {
    id: 'plans-billing',
    title: 'Plans & Billing',
    description: 'Understand subscription tiers, upgrades, and invoices.',
    iconName: 'Sparkles',
    topics: [
      'Understand CreatorStore subscription plans',
      'Resolve subscription status issues',
      'Find help with upgrades and billing',
    ],
  },
  {
    id: 'account-security',
    title: 'Account & Security',
    description: 'Update profile information, protect account access, and logins.',
    iconName: 'ShieldCheck',
    topics: [
      'Update profile information',
      'Resolve login issues',
      'Protect account access',
    ],
  },
]

export const HELP_ARTICLES = [
  {
    id: 'art-1',
    slug: 'how-to-set-up-storefront',
    categoryId: 'getting-started',
    title: 'How to set up your CreatorStore storefront',
    summary: 'A step-by-step guide to customizing your bio, header style, background wallpaper, and brand theme.',
    readTime: '3 min read',
    keywords: ['storefront', 'theme', 'bio', 'avatar', 'design', 'customization', 'wallpaper'],
    content: `
### Overview
Your CreatorStore storefront is the public landing page where visitors, followers, and customers can discover your digital products, schedule bookings, and access your social links.

### Step-by-Step Instructions
1. **Navigate to Store Builder**:
   - From your dashboard sidebar, click **My Store → Store** (or visit \`/dashboard/store\`).
2. **Update Store Identity**:
   - In the Store Editor, you can edit your display name, bio description, and profile avatar.
   - Click the pencil icon next to your store name or avatar to edit them directly.
3. **Choose a Theme and Styling**:
   - Click the **Design** tab in the sidebar or top toolbar to select from curated color presets, customize button radius, and set card borders.
   - Under Header Layout, you can choose between **Classic** and **Immersive** headers.
4. **Publish Your Store**:
   - Ensure the **Published** toggle in the top-right header is set to active. When published, your store is live at \`creatorstore.store/your-username\`.

> **Tip:** You can preview your store at any time on desktop and mobile by clicking the mobile preview pane on the right side of the Store editor.
    `,
  },
  {
    id: 'art-2',
    slug: 'how-to-add-and-publish-product',
    categoryId: 'products-content',
    title: 'How to add and publish a digital product',
    summary: 'Learn how to create a digital download product, upload delivery files, configure pricing, and set visibility.',
    readTime: '4 min read',
    keywords: ['product', 'digital download', 'pricing', 'files', 'upload', 'pdf', 'publish'],
    content: `
### Overview
CreatorStore enables you to sell downloadable files (PDFs, templates, ebooks, audio files, design assets) or external redirect links directly to customers with zero platform commissions.

### Adding a Digital Product
1. Go to **My Store → Products** in your dashboard.
2. Click the black **+ Add product** button in the top-right toolbar.
3. Select **Digital Product / Download**.
4. **Product Details**:
   - Enter a descriptive **Title** and optional **Subtitle / Description**.
   - Set your **Price** and currency (or check "Free product" if offering a free download or lead magnet).
5. **Delivery Deliverable**:
   - Choose whether you are delivering an **Uploaded File** (e.g. PDF, ZIP, MP3) or a **Redirect Link** (e.g. Notion template, Google Drive folder).
   - If uploading a file, select your asset using the file picker.
6. **Publish to Store**:
   - Toggle **Show in Store** to display the product tile on your public storefront.
   - Click **Save Product**.

> **Note:** Once a customer completes checkout, CreatorStore automatically generates a secure tokenized access link and emails the delivery file to the customer's email address.
    `,
  },
  {
    id: 'art-3',
    slug: 'how-to-add-social-media-links',
    categoryId: 'products-content',
    title: 'How to add social media links and choose display styles',
    summary: 'Connect Instagram, YouTube, TikTok, X, LinkedIn, and customize their display layouts (Classic, Cards, Grid, Carousel).',
    readTime: '3 min read',
    keywords: ['social', 'instagram', 'youtube', 'tiktok', 'display styles', 'cards', 'grid', 'carousel'],
    content: `
### Overview
You can showcase your content and social profiles directly on your storefront using rich visual display styles.

### Adding Social Links
1. Open **My Store → Store** in your dashboard.
2. Click **+ Add to store**, then select **Social Media**.
3. Choose your platform (e.g., **Instagram**, **YouTube**, **TikTok**, **X / Twitter**, **LinkedIn**, or **Custom Link**).
4. Enter your profile URL or public username.

### Customizing Display Styles
In both the Add modal and the Social Card editor, you can pick from 6 display styles:
- **Classic**: A sleek horizontal link row with the platform icon.
- **Cards / Image**: A rich rectangular media card with thumbnail preview.
- **Grid**: A multi-tile photo grid showcasing recent posts or thumbnails.
- **Carousel**: A horizontally scrollable visual swipe gallery.
- **Video Embed**: An interactive playable video preview (for YouTube/TikTok).
- **Badge**: A compact, pill-shaped badge ideal for stacking multiple social links.

You can edit the style at any time by clicking the social item in your store editor list.
    `,
  },
  {
    id: 'art-4',
    slug: 'how-to-configure-booking-items',
    categoryId: 'bookings',
    title: 'How to configure 1:1 coaching and booking availability',
    summary: 'Set your session duration, price, calendar availability hours, and manage client bookings.',
    readTime: '4 min read',
    keywords: ['booking', 'coaching', 'calendar', 'availability', 'sessions', '1:1', 'schedule'],
    content: `
### Overview
The Bookings feature allows followers and clients to book paid or free 1:1 consulting calls, mentoring sessions, or workshops directly from your storefront.

### Setting Up Bookings
1. From the dashboard sidebar, navigate to **Tools → Calendar** or **Products → Add Product → 1:1 Coaching**.
2. **Session Configuration**:
   - Set the session **Title** (e.g. "30-Min Strategy Call").
   - Specify the **Duration** in minutes (e.g. 30, 45, or 60 minutes).
   - Enter your **Session Fee** (or set as Free).
3. **Availability Settings**:
   - Set your working days (e.g., Monday through Friday).
   - Define your available time windows in your local timezone.
   - Set a buffer time between calls if desired.
4. **Meeting Link / Location**:
   - Provide your Zoom, Google Meet, or Microsoft Teams meeting link or instructions.
5. **Managing Bookings**:
   - Upcoming confirmed bookings appear in your **Calendar** dashboard.
   - When a client books, both you and the client receive calendar confirmation emails with the meeting link.
    `,
  },
  {
    id: 'art-5',
    slug: 'how-to-customize-digital-business-card',
    categoryId: 'getting-started',
    title: 'How to customize your digital business card & QR code',
    summary: 'Personalize your business card display name, color palette, scannable QR code, and visitor contact sharing.',
    readTime: '3 min read',
    keywords: ['business cards', 'qr code', 'contact card', 'vcard', 'color palette', 'autosave'],
    content: `
### Overview
CreatorStore provides a dedicated Digital Business Card feature with an editable card preview, scannable QR code, and visitor contact collection.

### Customization Options
1. Navigate to **Tools → Business cards** in your dashboard.
2. **Card Style**:
   - **Display Name**: Customize the name shown on your business card without affecting your username.
   - **Background Color**: Pick from 11 curated solid swatches (Lime, Forest green, Orange, Navy, Charcoal, etc.) or choose any custom color using the rainbow color wheel.
   - Changes are **saved automatically** with real-time feedback.
3. **Visitor Contact Sharing ("Let visitors share their details back")**:
   - Toggle this option ON to allow visitors who scan your QR code or visit your storefront to share their name and email with you.
   - Submitted contacts are automatically saved to your **Audience** and **Leads** dashboard.
4. **Downloadable vCard ("Let visitors save your contact")**:
   - Click **Add contact details** to add your phone, email, professional title, company, and website.
   - Visitors can tap "Save contact" to download a standard \`.vcf\` vCard file directly into their phone contacts!
5. **Download QR Code**:
   - Click **Download QR** below the live preview to save a high-resolution PNG image for print or social sharing.
    `,
  },
  {
    id: 'art-6',
    slug: 'understanding-payment-statuses',
    categoryId: 'payments-earnings',
    title: 'Understanding orders, payments, and transaction statuses',
    summary: 'Learn what Pending, Paid, Failed, and Refunded statuses mean, and how customer transactions are handled.',
    readTime: '3 min read',
    keywords: ['orders', 'payments', 'status', 'transactions', 'paid', 'pending', 'refunded'],
    content: `
### Transaction Statuses
When a customer purchases a product or books a session on your storefront, the order record tracks the lifecycle of the transaction:

- **PAID**: The customer's payment was successfully verified by the payment gateway (Razorpay / Dodo Payments / Stripe). The customer immediately receives product access, and earnings are credited to your balance.
- **PENDING**: The customer initiated checkout but has not yet completed payment. Pending orders that remain unpaid are automatically expired after a safety window.
- **FAILED**: The payment was declined by the customer's bank, card issuer, or UPI provider. No delivery access is granted.
- **REFUNDED**: A previously completed order that was refunded to the buyer. Associated entitlements are safely revoked.

### Viewing Order Details
Go to **Earn → Orders** in your dashboard to view customer names, emails, amounts, dates, and order line items.
    `,
  },
  {
    id: 'art-7',
    slug: 'how-to-configure-payouts',
    categoryId: 'payments-earnings',
    title: 'How to configure bank accounts and payout details',
    summary: 'Link your bank account, UPI ID, or PayPal details to receive automatic payouts for your creator sales.',
    readTime: '3 min read',
    keywords: ['payouts', 'bank account', 'upi', 'paypal', 'earnings', 'finance'],
    content: `
### Overview
CreatorStore routes payouts directly to your designated bank account or payment provider.

### Setting Up Payout Details
1. In your dashboard sidebar, click **Tools → Payments** (or go to **Earn → Earnings → Payout Settings**).
2. Choose your preferred payout method based on your billing region:
   - **Bank Transfer (NEFT/RTGS/IMPS)**: Enter Account Number, Account Holder Name, and IFSC Code.
   - **UPI (India)**: Enter your verified UPI VPA (e.g. \`username@okhdfcbank\`).
   - **PayPal / International**: Link your verified PayPal account email.
3. Review and save your payout profile.

> **Security Note:** Payout details are encrypted and securely stored. Any changes to payout details trigger security audit logs.
    `,
  },
  {
    id: 'art-8',
    slug: 'managing-subscription-billing',
    categoryId: 'plans-billing',
    title: 'Managing your CreatorStore plan and billing',
    summary: 'Understand Free Trial entitlements, Pro subscription features, payment cycles, and billing management.',
    readTime: '3 min read',
    keywords: ['subscription', 'plans', 'pro plan', 'billing', 'trial', 'upgrade', 'invoices'],
    content: `
### CreatorStore Plans
- **Free Trial**: Access essential store-building tools, unlimited free products, and basic analytics.
- **Pro Plan**: Unlocks advanced features including Instagram AutoDM automations, custom branding removal, unlimited paid products, and priority support.

### Managing Your Subscription
1. Click your profile avatar in the bottom-left sidebar.
2. Select **Account Settings → Billing & Plan** (or visit \`/dashboard/settings/billing\`).
3. You can review your active plan status, renewal date, and download past subscription invoices.
4. If you need to upgrade, click **Upgrade Plan** to open the plan comparison modal.
    `,
  },
  {
    id: 'art-9',
    slug: 'updating-profile-and-slug',
    categoryId: 'account-security',
    title: 'Updating your creator profile, username, and storefront slug',
    summary: 'How to modify your display name, profile avatar, account email, and custom store URL slug.',
    readTime: '3 min read',
    keywords: ['profile', 'username', 'slug', 'account', 'avatar', 'security', 'password'],
    content: `
### Updating Your Profile
1. Go to **Settings** in the dashboard or click your profile row in the sidebar.
2. **Profile & Storefront Details**:
   - **Full Name**: Your public creator name.
   - **Store Name**: The title displayed at the top of your store.
   - **Avatar Image**: Upload a high-resolution PNG, JPG, or WEBP profile picture.
3. **Username & Store URL**:
   - Your store slug determines your public link: \`creatorstore.store/your-slug\`.
   - When entering a new username, CreatorStore automatically checks for availability.
   - Click **Save Profile** to apply changes.
    `,
  },
  {
    id: 'art-10',
    slug: 'how-to-capture-leads-grow-audience',
    categoryId: 'products-content',
    title: 'How to capture leads and grow your customer audience',
    summary: 'Use free lead magnets, contact forms, and digital business cards to build an engaged email audience.',
    readTime: '3 min read',
    keywords: ['leads', 'audience', 'lead magnet', 'email list', 'customers', 'growth'],
    content: `
### Overview
Growing an email list gives you direct access to your audience without relying on social media algorithms.

### Strategies to Capture Leads on CreatorStore
1. **Free Lead Magnets**:
   - Create a product priced at \`$0.00\` or \`₹0.00\`.
   - When visitors download your free checklist, template, or guide, their name and email are automatically added to your **Audience** list.
2. **Digital Business Card Contact Sharing**:
   - Enable "Let visitors share their details back" in **Tools → Business cards**.
   - Visitors scanning your QR code can leave their contact details in seconds.
3. **Audience Management**:
   - View, search, and export your captured contacts under **Tools → Audience** (\`/dashboard/customers\`) and **Leads** (\`/dashboard/leads\`).
   - Export your subscriber list as a CSV file to import into your favorite newsletter or marketing platform.
    `,
  },
]
