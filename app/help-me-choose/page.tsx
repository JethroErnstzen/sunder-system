'use client'

import { useEffect, useMemo, useState } from 'react'
import ProductCard from '@/app/components/ProductCard'
import styles from './help.module.css'

type Product = {
  id: string
  stockNumber: string
  name: string
  brand?: string | null
  condition: string
  category?: string | null
  cpu?: string | null
  ram?: string | null
  storage?: string | null
  screen?: string | null
  screenSize?: number | null
  hasNumpad?: boolean | null
  gpu?: string | null
  description?: string | null
  sellingPrice: number
  salePrice?: number | null
  retailPrice?: number | null
  warranty?: string | null
  quantity: number
  images: { url: string }[]
}

type Answers = {
  portability: '' | 'yes' | 'unsure' | 'bigger'
  portabilityChoice: '' | 'okay' | 'bigger'
  numpad: '' | 'yes' | 'no'
  usage: '' | 'admin' | 'design' | 'multitasking' | 'cad' | 'gaming'
  designType: '' | 'photos' | 'video'
  cadRenders: '' | 'no' | 'yes'
  storage: '' | '256' | '512' | '1024'
}

const initial: Answers = { portability: '', portabilityChoice: '', numpad: '', usage: '', designType: '', cadRenders: '', storage: '' }
type Question = { key: keyof Answers; title: string; description?: string; options: { value: string; label: string }[] }

function getCurrentQuestion(a: Answers): Question | null {
  if (!a.portability) return {
    key: 'portability', title: 'Is portability important to you?',
    description: 'Tell us whether you want a smaller, easier-to-carry laptop or prefer a larger machine.',
    options: [
      { value: 'yes', label: 'Yes — I want something portable' },
      { value: 'unsure', label: "I'm not sure" },
      { value: 'bigger', label: 'No — I want a bigger laptop' },
    ],
  }
  if (a.portability === 'yes' && !a.portabilityChoice) return {
    key: 'portabilityChoice',
    title: 'Are you aware that laptops with 14" and smaller displays do not have a dedicated numpad?',
    description: 'Choose whether you want to stay with a smaller, more portable machine or move to a larger laptop.',
    options: [
      { value: 'okay', label: 'OK — I do not need a numpad' },
      { value: 'bigger', label: 'Rather go bigger — I want a numpad' },
    ],
  }
  if ((a.portability === 'unsure' || a.portability === 'bigger') && !a.numpad) return {
    key: 'numpad', title: 'Do you need a dedicated number pad?',
    description: a.portability === 'bigger' ? 'Because you prefer a bigger laptop, a numpad is an option, but tell us whether you actually need one.' : 'A numpad is useful for Excel, accounting and entering lots of numbers.',
    options: [
      { value: 'yes', label: 'Yes — I need a numpad' },
      { value: 'no', label: 'No — I do not need one' },
    ],
  }
  if (!a.usage) return {
    key: 'usage', title: 'What will it be used for?',
    options: [
      { value: 'admin', label: 'Simple admin — Excel, emails and everyday work' },
      { value: 'design', label: 'Design / photo / video editing' },
      { value: 'multitasking', label: 'Heavy multitasking' },
      { value: 'cad', label: 'CAD / engineering' },
      { value: 'gaming', label: 'Gaming' },
    ],
  }
  if (a.usage === 'design' && !a.designType) return {
    key: 'designType', title: 'What type of design work do you do?',
    description: 'This determines whether dedicated graphics are actually required.',
    options: [
      { value: 'photos', label: 'Photos — Photoshop, Lightroom and similar' },
      { value: 'video', label: 'Videos with rendering' },
    ],
  }
  if (a.usage === 'cad' && !a.cadRenders) return {
    key: 'cadRenders', title: 'Will you be doing renders in your CAD work?',
    options: [
      { value: 'no', label: 'No — CAD without rendering' },
      { value: 'yes', label: 'Yes — CAD plus rendering' },
    ],
  }
  if (!a.storage) return {
    key: 'storage', title: 'Will you need high storage?',
    description: 'We can often increase the storage in one of our advertised laptops — enquire with us.',
    options: [
      { value: '256', label: '256GB — the basis; more than enough unless you store large files such as a lot of movies' },
      { value: '512', label: '512GB — high storage; can store a lot of files including movies and games' },
      { value: '1024', label: '1TB — extra large storage; typically if you have lots of games installed' },
    ],
  }
  return null
}

function hasDedicatedGpu(p: Product) {
  const text = `${p.gpu || ''} ${p.name} ${p.category || ''} ${p.description || ''}`.toLowerCase()
  if (/intel arc 140t(?: graphics)?/.test(text)) return false
  if (/no dedicated graphics|without dedicated graphics/.test(text)) return false
  return /rtx|gtx|geforce|quadro|radeon rx|arc a\d|dedicated graphics/.test(text)
}
function isGaming(p: Product) {
  const text = `${p.category || ''} ${p.name} ${p.gpu || ''}`.toLowerCase()
  return /gaming|omen|legion|rog|tuf|nitro|predator|alienware|razer|katana|stealth|cyborg|loq|victus|aorus|strix/.test(text)
}
function isLaptop(p: Product) { return p.quantity > 0 && /laptop|macbook|notebook|business notebooks|gaming laptops/i.test(`${p.category || ''} ${p.name}`) }
function cpuStrength(p: Product) {
  const text = `${p.cpu || ''} ${p.name}`.toLowerCase()
  if (/ultra 9|i9|ryzen 9|threadripper|xeon|m[3-9] max|m[3-9] pro/.test(text)) return 5
  if (/ultra 7|i7|ryzen 7|core 7|m[2-9] pro|m[2-9]/.test(text)) return 4
  if (/ultra 5|i5|ryzen 5|core 5/.test(text)) return 3
  if (/i3|ryzen 3|celeron|pentium/.test(text)) return 1
  return 2
}
function ramGb(p: Product) {
  const field = `${p.ram || ''}`.match(/(\d+)\s*GB/i)
  if (field) return Number(field[1])
  const details = `${p.name} ${p.description || ''}`
  const labelled = details.match(/(\d+)\s*GB\s*(?:RAM|DDR[345])/i)
  if (labelled) return Number(labelled[1])
  // Product titles commonly list RAM first, then storage, then GPU memory.
  const titleSizes = [...p.name.matchAll(/(\d+)\s*GB/ig)]
  return titleSizes.length > 1 ? Number(titleSizes[0][1]) : 0
}
function storageGb(p: Product) {
  const field = `${p.storage || ''}`.toLowerCase()
  const tb = field.match(/(\d+(?:\.\d+)?)\s*tb/)
  if (tb) return Number(tb[1]) * 1024
  const gb = field.match(/(\d+)\s*gb/)
  if (gb) return Number(gb[1])
  const titleSizes = [...p.name.matchAll(/(\d+(?:\.\d+)?)\s*(tb|gb)/ig)]
  if (titleSizes.length === 1 && titleSizes[0][2].toLowerCase() === 'gb' && Number(titleSizes[0][1]) < 64) return 0
  const storageMatch = titleSizes.length > 1 ? titleSizes[1] : titleSizes[0]
  return storageMatch ? Number(storageMatch[1]) * (storageMatch[2].toLowerCase() === 'tb' ? 1024 : 1) : 0
}
function screenSize(p: Product) {
  if (typeof p.screenSize === 'number' && Number.isFinite(p.screenSize) && p.screenSize > 0) return p.screenSize
  const match = String(p.screen || '').match(/(\d{1,2}(?:\.\d)?)\s*(?:"|”|inch(?:es)?\b)/i)
  return match ? Number(match[1]) : 0
}
function currentPrice(p: Product) {
  return p.salePrice && p.salePrice > 0 && p.salePrice < p.sellingPrice ? p.salePrice : p.sellingPrice
}

function prefersPortableSmallScreen(a: Answers) {
  return a.portability === 'yes' && a.portabilityChoice === 'okay'
}
function wantsDedicatedNumpad(a: Answers) {
  return a.numpad === 'yes' || (a.portability === 'yes' && a.portabilityChoice === 'bigger')
}
function isPortableScreen(size: number) { return size > 0 && size <= 14 }
function numpadStatus(p: Product): boolean | null {
  if (typeof p.hasNumpad === 'boolean') return p.hasNumpad
  const text = `${p.name} ${p.description || ''}`.toLowerCase()
  if (/no (?:dedicated )?(?:number|numeric) (?:keypad|pad)|without (?:a )?(?:dedicated )?(?:number|numeric) (?:keypad|pad)|(?:numpad|number pad) not included/.test(text)) return false
  if (/dedicated (?:number|numeric) (?:keypad|pad)|numeric keypad|numpad/.test(text)) return true
  if (screenSize(p) > 0 && screenSize(p) <= 14) return false
  return null
}

function baseCandidates(products: Product[]) {
  return products.filter(isLaptop)
}

function productShortfalls(p: Product, a: Answers) {
  const shortfalls: string[] = []
  const size = screenSize(p)
  const gpu = hasDedicatedGpu(p)
  const gaming = isGaming(p)
  const storage = storageGb(p)
  const ram = ramGb(p)

  if (prefersPortableSmallScreen(a)) {
    if (!size) shortfalls.push('Screen size is not listed, so portability cannot be confirmed.')
    else if (!isPortableScreen(size)) shortfalls.push(size <= 15.5 ? `Its ${size}" display is larger than your 14" portability preference.` : `Its ${size}" display is much larger than your 14" portability preference.`)
  }
  const wantsLargerScreen = a.portabilityChoice === 'bigger' || a.portability === 'bigger' || (a.portability !== 'yes' && a.numpad === 'yes')
  if (wantsLargerScreen) {
    if (!size) shortfalls.push('Screen size is not listed, so the larger-screen preference cannot be confirmed.')
    else if (size < 15.6) shortfalls.push(`Its ${size}" display is below your preferred 15.6" or larger size.`)
  }
  if (wantsDedicatedNumpad(a)) {
    if (numpadStatus(p) === false) shortfalls.push('It does not have a dedicated number pad.')
    else if (numpadStatus(p) !== true) shortfalls.push('A dedicated number pad is not confirmed in its listing.')
  }

  if (a.usage === 'admin' && gaming) shortfalls.push('It is a gaming model, with gaming-focused graphics beyond what you need for everyday admin.')
  if (a.usage === 'gaming') {
    if (!gaming) shortfalls.push('It is not identified as a gaming model.')
    if (!gpu) shortfalls.push('Its listing does not confirm dedicated graphics for games.')
  }
  if (a.usage === 'design' && a.designType === 'video' && !gpu) shortfalls.push('Dedicated graphics for video rendering are not listed.')
  if (a.usage === 'multitasking' && ram < 16) shortfalls.push(ram ? `It has ${ram}GB RAM; you asked for at least 16GB.` : 'RAM is not listed, so the 16GB minimum cannot be confirmed.')
  if (a.usage === 'cad' && a.cadRenders === 'no' && cpuStrength(p) < 3) shortfalls.push('Its processor is below the Core i5 / Ryzen 5 level recommended for CAD.')
  if (a.usage === 'cad' && a.cadRenders === 'yes' && !gpu) shortfalls.push('Dedicated graphics for CAD rendering are not listed.')
  if (a.storage && storage < Number(a.storage)) shortfalls.push(storage ? `It has ${storage >= 1024 ? `${storage / 1024}TB` : `${storage}GB`} storage; you asked for at least ${Number(a.storage) >= 1024 ? `${Number(a.storage) / 1024}TB` : `${a.storage}GB`}.` : 'Storage is not listed, so your minimum cannot be confirmed.')

  return shortfalls
}

function scoreProduct(p: Product, a: Answers) {
  let score = 0
  const size = screenSize(p), gpu = hasDedicatedGpu(p), gaming = isGaming(p), storage = storageGb(p)
  if (a.portability === 'yes' && a.portabilityChoice === 'okay') score += size > 0 && size < 15.6 ? 30 : -15
  if ((a.portabilityChoice === 'bigger') || a.portability === 'bigger' || (a.portability !== 'yes' && a.numpad === 'yes')) score += size >= 15.6 ? 25 : -15
  if (wantsDedicatedNumpad(a)) score += numpadStatus(p) === true ? 25 : numpadStatus(p) === false ? -15 : 0
  if (a.portability === 'unsure' && a.numpad === 'no') score += size > 0 && size < 15.6 ? 10 : 3
  if (a.usage === 'admin') score += gaming ? -1000 : (gpu ? -20 : 18) + cpuStrength(p) * 2
  if (a.usage === 'design' && a.designType === 'photos') score += gaming ? -500 : (gpu ? 1 : 12) + cpuStrength(p) * 2
  if (a.usage === 'design' && a.designType === 'video') score += gpu ? 50 : -1000
  if (a.usage === 'multitasking') score += ramGb(p) >= 16 ? 35 : -1000
  score += cpuStrength(p) * 3
  if (a.usage === 'cad' && a.cadRenders === 'no') score += cpuStrength(p) >= 3 ? 40 + cpuStrength(p) * 4 : -1000
  if (a.usage === 'cad' && a.cadRenders === 'yes') score += gpu ? 50 : -1000
  if (a.usage === 'gaming') score += gaming ? 70 + (gpu ? 20 : 0) : -1000
  if (a.storage === '256') score += storage >= 256 ? Math.min(storage / 256, 4) * 5 : -1000
  if (a.storage === '512') score += storage >= 512 ? Math.min(storage / 512, 4) * 7 : -1000
  if (a.storage === '1024') score += storage >= 1024 ? Math.min(storage / 1024, 4) * 9 : -1000
  return score
}

function rankProducts(products: Product[], a: Answers) {
  const candidates = baseCandidates(products)
  const matches = candidates.filter(p => productShortfalls(p, a).length === 0)
    .sort((x, y) => scoreProduct(y, a) - scoreProduct(x, a) || currentPrice(x) - currentPrice(y))
  const exact = matches.length >= 2
  const alternatives = exact ? [] : candidates.filter(p => productShortfalls(p, a).length > 0)
    .sort((x, y) => productShortfalls(x, a).length - productShortfalls(y, a).length
      || scoreProduct(y, a) - scoreProduct(x, a)
      || currentPrice(x) - currentPrice(y))
    .slice(0, Math.max(0, 8 - matches.length))
  return { matches, alternatives, exact }
}

function requirementText(a: Answers) {
  const requirements: string[] = []
  if (a.portability === 'yes' && a.portabilityChoice === 'okay') requirements.push('A portable laptop with a 14" or smaller display; you chose portability over a dedicated numpad.')
  if (a.portabilityChoice === 'bigger' || a.portability === 'bigger' || (a.portability !== 'yes' && a.numpad === 'yes')) requirements.push('A 15.6" or larger laptop.')
  if (wantsDedicatedNumpad(a)) requirements.push('A dedicated number pad, confirmed in the product listing.')
  if (a.usage === 'admin') requirements.push('A practical laptop for Excel, emails and everyday administration; identified gaming laptops are excluded as over-spec for this use.')
  if (a.usage === 'design' && a.designType === 'photos') requirements.push('A capable laptop for photo work; dedicated graphics are not required.')
  if (a.usage === 'design' && a.designType === 'video') requirements.push('Dedicated graphics for video work and rendering.')
  if (a.usage === 'multitasking') requirements.push('16GB RAM or more for heavy multitasking.')
  if (a.usage === 'cad' && a.cadRenders === 'no') requirements.push('A strong CPU for CAD without dedicated rendering requirements.')
  if (a.usage === 'cad' && a.cadRenders === 'yes') requirements.push('Dedicated graphics for CAD rendering.')
  if (a.usage === 'gaming') requirements.push('A gaming laptop with dedicated graphics and gaming-focused hardware.')
  if (a.storage === '256') requirements.push('At least 256GB storage; higher storage is also suitable.')
  if (a.storage === '512') requirements.push('At least 512GB storage; lower storage is excluded.')
  if (a.storage === '1024') requirements.push('At least 1TB storage; lower storage is excluded.')
  return requirements
}

function adviceText(a: Answers, exact: boolean, matchCount: number, alternativeCount: number) {
  const usage = a.usage === 'admin' ? 'Exact matches focus on practical laptops for everyday admin and exclude identified gaming models.' : a.usage === 'gaming' ? 'Exact matches are identified gaming laptops with dedicated graphics.' : a.usage === 'multitasking' ? 'For heavy multitasking, exact matches have at least 16GB RAM; higher RAM and stronger processors rank first.' : a.usage === 'design' ? (a.designType === 'video' ? 'Exact matches have dedicated graphics for video work and rendering.' : 'For photo work, dedicated graphics are not a requirement, so non-gaming laptops can also match.') : a.usage === 'cad' ? (a.cadRenders === 'yes' ? 'Exact matches have dedicated graphics for CAD rendering.' : 'For CAD without rendering, exact matches have at least a Core i5 / Ryzen 5 class processor.') : ''
  const storage = a.storage === '256' ? 'You selected 256GB, so higher-storage machines are also included.' : a.storage === '512' ? 'You selected 512GB, so machines below 512GB are excluded.' : a.storage === '1024' ? 'You selected 1TB, so machines below 1TB are excluded.' : ''
  const match = exact ? '' : alternativeCount
    ? `Only ${matchCount} current-stock ${matchCount === 1 ? 'laptop matches' : 'laptops match'} every requirement. Other recommendations are shown with the specific shortfall for each.`
    : `Only ${matchCount} current-stock ${matchCount === 1 ? 'laptop matches' : 'laptops match'} every requirement, and there are no other in-stock laptops to suggest right now.`
  return [usage, storage, match, 'Check each product listing for its full specifications, condition and warranty. Stock changes as products sell.'].filter(Boolean)
}

export default function HelpMeChoose() {
  const [answers, setAnswers] = useState<Answers>(initial)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetch('/api/products?take=100').then(r => r.ok ? r.json() : []).then(d => setProducts(Array.isArray(d) ? d : [])).catch(() => setProducts([])).finally(() => setLoading(false)) }, [])
  const current = useMemo(() => getCurrentQuestion(answers), [answers])
  const finished = !current && Boolean(answers.storage)
  const ranked = useMemo(() => rankProducts(products, answers), [products, answers])
  const choose = (value: string) => { if (!current) return; setAnswers(a => ({ ...a, [current.key]: value } as Answers)) }
  const restart = () => setAnswers(initial)
  const requirements = requirementText(answers)
  const advice = adviceText(answers, ranked.exact, ranked.matches.length, ranked.alternatives.length)

  return (
    <main style={{ background: '#f5f7fb', minHeight: '100vh', color: '#101827' }}>
      <section style={{ background: 'linear-gradient(135deg,#071a3a 0%,#123b73 55%,#087f9d 100%)', color: '#fff', padding: '58px 20px 48px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}><div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.12em' }}>SUNDER COMPUTERS</div><h1 style={{ fontSize: 'clamp(38px,5vw,62px)', lineHeight: 1, margin: '12px 0', letterSpacing: '-.045em' }}>Help me <span style={{ color: '#61e7f4' }}>choose.</span></h1><p style={{ maxWidth: 760, fontSize: 19, lineHeight: 1.55, margin: 0 }}>Answer a few practical questions and we will narrow our current laptop stock down to machines that suit how you actually work.</p></div>
      </section>
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '28px 20px 60px' }}>
        {!finished && current ? <div style={{ background: '#fff', border: '1px solid #d9e1ec', borderRadius: 8, padding: '28px 28px 30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 22 }}><strong style={{ fontSize: 13, letterSpacing: '.08em' }}>NEXT QUESTION</strong><span style={{ fontSize: 14, color: '#64748b' }}>We will only ask what matters for your use.</span></div>
          <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', lineHeight: 1.08, margin: '0 0 10px', letterSpacing: '-.03em' }}>{current.title}</h2>
          {current.description && <p style={{ fontSize: 16, lineHeight: 1.5, color: '#5c6b7d', margin: '0 0 22px', maxWidth: 780 }}>{current.description}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10, marginTop: current.description ? 0 : 22 }}>
            {current.options.map(option => <button key={option.value} type="button" onClick={() => choose(option.value)} style={{ textAlign: 'left', padding: '17px 18px', minHeight: 70, border: '1px solid #cfd9e6', borderRadius: 6, background: '#fff', color: '#101827', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>{option.label}<span style={{ float: 'right', fontSize: 21, color: '#1675d1' }}>→</span></button>)}
          </div>
        </div> : <div>
          <div style={{ background: '#fff', border: '1px solid #d9e1ec', borderRadius: 8, padding: '26px 28px', marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.1em', color: '#1675d1' }}>WHAT IS REQUIRED FOR YOUR USAGE</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', margin: '8px 0 14px', letterSpacing: '-.03em' }}>We looked for laptops that match your requirements.</h2>
            <ul style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 7, fontSize: 17, lineHeight: 1.45 }}>{requirements.map(r => <li key={r}>{r}</li>)}</ul>
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #e7edf4', display: 'grid', gap: 8, color: '#59687a', fontSize: 15, lineHeight: 1.5 }}>{advice.map(x => <p key={x} style={{ margin: 0 }}>{x}</p>)}<p style={{ margin: 0 }}>We can often increase the storage in one of our advertised laptops. If you need more storage, enquire with us.</p></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 14 }}><div><h2 style={{ fontSize: 28, margin: 0 }}>{ranked.exact ? 'Your matching laptops' : 'Your recommendations'}</h2><p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 15 }}>{ranked.exact ? 'At least two current-stock laptops meet every requirement you selected.' : 'We found fewer than two exact matches, so we have added the closest alternatives and explained what each one is missing.'}</p></div><button type="button" onClick={restart} style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '10px 15px', borderRadius: 5, fontWeight: 800, cursor: 'pointer' }}>Start again</button></div>
          {loading ? <div style={{ background: '#fff', border: '1px solid #d9e1ec', padding: 30 }}>Loading current stock…</div> : ranked.matches.length || ranked.alternatives.length ? <>
            {ranked.matches.length > 0 && <section className={styles.productSection}><h3 className={styles.groupTitle}>Exact matches <span>{ranked.matches.length}</span></h3><div className={styles.productGrid}>{ranked.matches.map(p => <ProductCard key={p.id} product={p} compact />)}</div></section>}
            {ranked.alternatives.length > 0 && <section className={styles.productSection}><h3 className={styles.groupTitle}>{ranked.matches.length ? 'Other recommendations' : 'Closest alternatives'} <span>{ranked.alternatives.length}</span></h3><div className={styles.alternativeGrid}>{ranked.alternatives.map(p => <article className={styles.alternative} key={p.id}><ProductCard product={p} compact /><div className={styles.shortfall}><strong>What falls short</strong><ul>{productShortfalls(p, answers).map(reason => <li key={reason}>{reason}</li>)}</ul></div></article>)}</div></section>}
          </> : <div style={{ background: '#fff', border: '1px solid #d9e1ec', padding: 30 }}>There are no laptops in stock to recommend right now. Try the shop page or restart to change your preferences.</div>}
        </div>}
      </section>
    </main>
  )
}
