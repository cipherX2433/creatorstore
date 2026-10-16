import { NextResponse } from 'next/server'
import { attributionService } from '@/lib/services'
import { productsRepo, storesRepo, automationsRepo, automationEventsRepo } from '@/lib/repos'
import { getAppUrl } from '@/config/site'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request, context) {
  const params = await context.params
  const token = params?.token
  const appUrl = getAppUrl()

  if (!token) {
    return NextResponse.redirect(appUrl, 302)
  }

  try {
    const attr = attributionService.verifyAttributionToken(token)
    if (attr) {
      const auto = attr.automationId ? await automationsRepo.getForCreator(attr.automationId, attr.creatorId) : null
      const product = attr.productId ? await productsRepo.getById(attr.productId) : null
      const store = attr.creatorId ? await storesRepo.getByCreator(attr.creatorId) : null

      // Record LINK_CLICKED tracking event
      if (attr.creatorId && attr.automationId) {
        await automationEventsRepo.recordEvent({
          creatorId: attr.creatorId,
          automationId: attr.automationId,
          productId: attr.productId || null,
          eventType: 'LINK_CLICKED',
        })
      }

      // Handle CUSTOM_LINK destination
      if (auto && auto.destinationType === 'CUSTOM_LINK' && auto.customUrl) {
        try {
          const parsed = new URL(auto.customUrl, appUrl)
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return NextResponse.redirect(parsed.toString(), 302)
          }
        } catch (e) {
          console.warn('Invalid customUrl on automation redirect:', auto.customUrl)
        }
      }

      // Handle PRODUCT destination
      if (product && store) {
        const storeUsername = store.username || store.slug || 'store'
        const isPaid = Number(product.price || 0) > 0

        const targetUrl = `${appUrl}/${storeUsername}/${product.slug}?checkout=1&ref=${encodeURIComponent(token)}`

        return NextResponse.redirect(targetUrl, 302)
      }
    }
  } catch (err) {
    console.error('Tracking link error:', err)
  }

  return NextResponse.redirect(appUrl, 302)
}
