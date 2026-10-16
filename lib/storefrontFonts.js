export const STOREFRONT_FONTS = [
  { id: 'Manrope', family: 'Manrope, sans-serif', google: 'Manrope', pro: false },
  { id: 'Albert Sans', family: '"Albert Sans", sans-serif', google: 'Albert Sans', pro: false },
  { id: 'Belanosima', family: '"Belanosima", sans-serif', google: 'Belanosima', pro: true },
  { id: 'Bricolage Grotesque', family: '"Bricolage Grotesque", sans-serif', google: 'Bricolage Grotesque', pro: true },
  { id: 'DM Sans', family: '"DM Sans", sans-serif', google: 'DM Sans', pro: false },
  { id: 'Epilogue', family: '"Epilogue", sans-serif', google: 'Epilogue', pro: false },
  { id: 'IBM Plex Sans', family: '"IBM Plex Sans", sans-serif', google: 'IBM Plex Sans', pro: false },
  { id: 'Lato', family: 'Lato, sans-serif', google: 'Lato', pro: true },
  { id: 'Link Sans', family: 'Manrope, sans-serif', google: null, pro: false },
  { id: 'M Plus Rounded', family: '"M PLUS Rounded 1c", sans-serif', google: 'M PLUS Rounded 1c', pro: true },
  { id: 'Oxanium', family: 'Oxanium, sans-serif', google: 'Oxanium', pro: false },
  { id: 'Poppins', family: 'Poppins, sans-serif', google: 'Poppins', pro: true },
  { id: 'Red Hat Display', family: '"Red Hat Display", sans-serif', google: 'Red Hat Display', pro: false },
  { id: 'Roboto', family: 'Roboto, sans-serif', google: 'Roboto', pro: true },
  { id: 'Rubik', family: 'Rubik, sans-serif', google: 'Rubik', pro: true },
  { id: 'Space Grotesk', family: '"Space Grotesk", sans-serif', google: 'Space Grotesk', pro: true },
  { id: 'Syne', family: 'Syne, sans-serif', google: 'Syne', pro: true },
  { id: 'BioRhyme', family: 'BioRhyme, serif', google: 'BioRhyme', pro: true },
  { id: 'Bitter', family: 'Bitter, serif', google: 'Bitter', pro: true },
]

export function resolveFontFamily(id) {
  if (!id) return 'Manrope, sans-serif'
  const match = STOREFRONT_FONTS.find((f) => f.id === id)
  if (match) return match.family
  return `${id}, sans-serif`
}

export function googleFontsHref(ids = []) {
  const families = new Set()
  ids.forEach((id) => {
    const font = STOREFRONT_FONTS.find((f) => f.id === id)
    if (font?.google) families.add(font.google)
  })
  if (!families.size) return null
  const params = [...families]
    .map((name) => `family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@400;600;700;800`)
    .join('&')
  return `https://fonts.googleapis.com/css2?${params}&display=swap`
}

let injectedHref = null
export function ensureGoogleFonts(ids) {
  if (typeof document === 'undefined') return
  const href = googleFontsHref(ids)
  if (!href || href === injectedHref) return
  let link = document.getElementById('storefront-google-fonts')
  if (!link) {
    link = document.createElement('link')
    link.id = 'storefront-google-fonts'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  link.href = href
  injectedHref = href
}
