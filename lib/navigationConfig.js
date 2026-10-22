import {
  Store,
  Package,
  Wallet,
  LayoutDashboard,
  Menu,
  Calendar,
  Bot,
  CreditCard,
  Users,
  Megaphone,
  Palette,
  ShoppingBag,
  Settings,
  Sparkles,
  Link2,
  HelpCircle,
  Mail,
  User,
  IdCard,
  FormInput,
  Coins,
  BarChart3,
  LayoutGrid,
} from 'lucide-react'

/**
 * Single shared source of truth for CreatorStore platform navigation.
 * Used by Desktop Sidebar, Mobile Bottom Navigation, and Mobile More Menu.
 */

export const MY_STORE_CHILDREN = [
  { href: '/dashboard/store', label: 'Store', icon: Store, description: 'Storefront builder & bio links' },
  { href: '/dashboard/products', label: 'Products', icon: Package, description: 'Digital products, courses & downloads' },
  { href: '/dashboard/store?tab=design', label: 'Design', icon: Palette, description: 'Storefront themes & styling' },
]

export const EARN_CHILDREN = [
  { href: '/dashboard/analytics', label: 'Insights', icon: BarChart3, description: 'Revenue & store overview' },
  { href: '/dashboard/earn/orders', label: 'Orders', icon: ShoppingBag, description: 'Customer orders & sales' },
  { href: '/dashboard/earn/earnings', label: 'Earnings', icon: Wallet, description: 'Payout balance & transactions' },
]

export const OTHER_PRIMARY_NAV = [
  { href: '/dashboard/business-cards', label: 'Business cards', icon: IdCard, description: 'Digital business card & QR code' },
  { href: '/dashboard/forms', label: 'Forms & Responses', icon: FormInput, description: 'Contact, feedback, newsletter & Q&A' },
  { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar, description: '1:1 bookings & webinar schedule' },
  { href: '/dashboard/automations', label: 'Automations', icon: Bot, description: 'Instagram AutoDM & comment replies' },
  { href: '/dashboard/payments', label: 'Payments', icon: CreditCard, description: 'Bank accounts & payout settings' },
  { href: '/dashboard/customers', label: 'Audience', icon: Users, description: 'Customer database & leads' },
  { href: '/dashboard/marketing', label: 'Marketing', icon: Megaphone, description: 'Coupons & email broadcasts' },
]

/**
 * 5 Primary Mobile Bottom Navigation Destinations (Phase 2.5)
 * - My Store
 * - Earn
 * - Audience
 * - Insights
 * - More
 */
export const MOBILE_BOTTOM_NAV_ITEMS = [
  {
    id: 'store',
    label: 'My Store',
    href: '/dashboard',
    icon: LayoutGrid,
    matches: (pathname) => {
      return pathname === '/dashboard' || pathname.startsWith('/dashboard/store') || pathname.startsWith('/dashboard/products')
    }
  },
  {
    id: 'earn',
    label: 'Earn',
    href: '/dashboard/earn/earnings',
    icon: Coins,
    matches: (pathname) => {
      return (
        pathname.startsWith('/dashboard/earn') ||
        pathname.startsWith('/dashboard/orders')
      )
    }
  },
  {
    id: 'audience',
    label: 'Audience',
    href: '/dashboard/customers',
    icon: Users,
    matches: (pathname) => {
      return (
        pathname.startsWith('/dashboard/customers') ||
        pathname.startsWith('/dashboard/leads')
      )
    }
  },
  {
    id: 'insights',
    label: 'Insights',
    href: '/dashboard/analytics',
    icon: BarChart3,
    matches: (pathname) => {
      return pathname.startsWith('/dashboard/analytics')
    }
  },
  {
    id: 'more',
    label: 'More',
    icon: HelpCircle,
    isAction: true,
    matches: (pathname) => {
      return (
        pathname.startsWith('/dashboard/business-cards') ||
        pathname.startsWith('/dashboard/automations') ||
        pathname.startsWith('/dashboard/calendar') ||
        pathname.startsWith('/dashboard/payments') ||
        pathname.startsWith('/dashboard/marketing') ||
        pathname.startsWith('/dashboard/settings') ||
        pathname.startsWith('/dashboard/help') ||
        pathname.startsWith('/dashboard/success-center') ||
        pathname.startsWith('/dashboard/admin')
      )
    }
  }
]

/**
 * Categorized Navigation for the Mobile "More" Menu / Sheet
 */
export const MORE_MENU_CATEGORIES = [
  {
    id: 'tools',
    title: 'Tools & Growth',
    items: [
      {
        label: 'Business cards',
        description: 'Digital business card & QR code',
        href: '/dashboard/business-cards',
        icon: IdCard,
      },
      {
        label: 'Forms & Responses',
        description: 'Contact, feedback, newsletter & Q&A',
        href: '/dashboard/forms',
        icon: FormInput,
      },
      {
        label: 'Automations',
        description: 'Instagram comment-to-DM & auto-reply',
        href: '/dashboard/automations',
        icon: Bot,
        badge: 'AutoDM'
      },
      {
        label: 'Calendar',
        description: '1:1 bookings & webinar schedule',
        href: '/dashboard/calendar',
        icon: Calendar
      },
      {
        label: 'Marketing & Coupons',
        description: 'Discount codes & email broadcasts',
        href: '/dashboard/marketing',
        icon: Megaphone
      },
      {
        label: 'Audience & Leads',
        description: 'Customer contacts & subscribers',
        href: '/dashboard/customers',
        icon: Users
      }
    ]
  },
  {
    id: 'finance',
    title: 'Finance & Payouts',
    items: [
      {
        label: 'Payments & Payouts',
        description: 'Bank accounts, UPI & payout thresholds',
        href: '/dashboard/payments',
        icon: CreditCard
      }
    ]
  },
  {
    id: 'account',
    title: 'Account & Settings',
    items: [
      {
        label: 'Store Settings',
        description: 'Store URL slug, branding & profile',
        href: '/dashboard/settings',
        icon: Settings
      },
      {
        label: 'Billing & Plan',
        description: 'Subscription management & invoices',
        href: '/dashboard/settings/billing',
        icon: Sparkles
      },
      {
        label: 'Connected Accounts',
        description: 'Meta / Instagram OAuth connection',
        href: '/dashboard/settings/connected-accounts',
        icon: Link2
      }
    ]
  },
  {
    id: 'support',
    title: 'Support & Help',
    items: [
      {
        label: 'Help Center',
        description: 'Creator guides & tutorials',
        href: '/dashboard/help',
        icon: HelpCircle
      },
      {
        label: 'Contact Support',
        description: 'Direct team assistance',
        href: '/contact',
        icon: Mail
      }
    ]
  }
]
