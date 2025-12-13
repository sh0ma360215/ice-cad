import opentype from 'opentype.js'
import { FONT_URL } from '../../constants/geometry'

let cachedFont: opentype.Font | null = null
let fontLoadPromise: Promise<opentype.Font> | null = null

export async function loadFont(): Promise<opentype.Font> {
  if (cachedFont) return cachedFont

  if (fontLoadPromise) return fontLoadPromise

  fontLoadPromise = new Promise((resolve, reject) => {
    opentype.load(FONT_URL, (err, font) => {
      if (err || !font) {
        console.error('Font load error:', err)
        reject(err)
      } else {
        cachedFont = font
        resolve(font)
      }
    })
  })

  return fontLoadPromise
}
