import path from 'node:path'
import { pathToFileURL } from 'node:url'
import fs from 'node:fs'

const projectRoot = process.cwd()

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const subPath = specifier.slice(2)
    const fullPath = path.join(projectRoot, subPath)
    const extensions = ['', '.js', '.jsx', '.json']
    for (const ext of extensions) {
      const candidate = fullPath + ext
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return {
          shortCircuit: true,
          url: pathToFileURL(candidate).href,
        }
      }
    }
  }
  return nextResolve(specifier, context)
}
