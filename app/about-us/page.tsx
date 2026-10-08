import Link from 'next/link'
import styles from './about.module.css'

const photos = [
  {
    src: 'https://www.sunder.co.za/wp-content/uploads/2025/07/About-Us-Banner.png',
    alt: 'Sunder Computers laptops',
    className: 'wide',
  },
  {
    src: 'https://www.sunder.co.za/wp-content/uploads/2024/10/thumbnail_IMG_2762-768x576.jpg',
    alt: 'Sunder Computers store',
    className: '',
  },
  {
    src: 'https://www.sunder.co.za/wp-content/uploads/2026/01/PHOTO-2024-11-23-14-23-56-1-1-768x576.jpg',
    alt: 'Laptops on display at Sunder Computers',
    className: '',
  },
]

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>SUNDER COMPUTERS</span>
          <h1>Good technology.<br /><strong>Properly looked after.</strong></h1>
          <p>
            For more than 10 years, Sunder Computers has focused on quality laptops, honest advice
            and service that keeps customers coming back.
          </p>
          <div className={styles.heroActions}>
            <Link href="/shop" className={styles.primary}>Shop laptops</Link>
            <Link href="/contact" className={styles.secondary}>Visit our store</Link>
          </div>
        </div>
        <div className={styles.heroImage}>
          <img src={photos[0].src} alt={photos[0].alt} />
        </div>
      </section>

      <section className={styles.intro}>
        <div>
          <span className={styles.kicker}>ABOUT SUNDER</span>
          <h2>Built on quality, service and trust.</h2>
        </div>
        <div className={styles.introText}>
          <p>
            Based in the Western Cape and serving customers nationwide, we have grown through
            customer support, repeat business and a commitment to making technology
            easier to buy.
          </p>
          <p>
            Whether you are buying a laptop for business, studying, home use, creative
            work or gaming, our aim is simple: help you find the right machine rather
            than simply sell you a machine.
          </p>
        </div>
      </section>

      <section className={styles.story}>
        <div className={styles.storyImage}>
          <img src={photos[1].src} alt={photos[1].alt} />
        </div>
        <div className={styles.storyCopy}>
          <span className={styles.kicker}>OUR APPROACH</span>
          <h2>We test what we sell.</h2>
          <p>
            Sunder sources equipment from reputable companies and puts products through
            a detailed inspection and testing process before they reach customers.
          </p>
          <div className={styles.checkList}>
            <div><b>01</b><span>Ports and connectivity are checked for functionality.</span></div>
            <div><b>02</b><span>CPU, RAM, storage, GPU and cooling performance are tested.</span></div>
            <div><b>03</b><span>The physical condition and casing are inspected carefully.</span></div>
            <div><b>04</b><span>Battery health is assessed and cooling systems are cleaned where required.</span></div>
          </div>
        </div>
      </section>

      <section className={styles.quality}>
        <div className={styles.qualityCopy}>
          <span className={styles.kicker}>WHY CUSTOMERS COME BACK</span>
          <h2>Real products. Real advice. Real value.</h2>
          <p>
            Our customers&apos; trust and loyalty are central to the business. We focus on
            clear advice, quality equipment and making sure customers understand what
            they are buying.
          </p>
          <div className={styles.stats}>
            <div><strong>10+</strong><span>Years in business</span></div>
            <div><strong>5★</strong><span>Rated business</span></div>
            <div><strong>SA</strong><span>Nationwide shipping</span></div>
          </div>
        </div>
        <div className={styles.qualityImage}>
          <img src={photos[2].src} alt={photos[2].alt} />
        </div>
      </section>

      <section className={styles.benefits}>
        <div className={styles.sectionHeading}>
          <span className={styles.kicker}>SHOP WITH CONFIDENCE</span>
          <h2>More reasons to shop with Sunder.</h2>
        </div>
        <div className={styles.benefitGrid}>
          <article><strong>Warranty</strong><p>All sales include a minimum warranty, with many products also carrying manufacturer warranty.</p></article>
          <article><strong>Free nationwide shipping</strong><p>We ship orders across South Africa at no additional shipping cost.</p></article>
          <article><strong>VAT inclusive</strong><p>All advertised prices include VAT, so the price you see is the price you pay.</p></article>
          <article><strong>Physical store</strong><p>View and purchase products at our store at Delphi Arena in Bellville, Cape Town.</p></article>
        </div>
      </section>

      <section className={styles.cta}>
        <div>
          <span className={styles.kicker}>NEED HELP CHOOSING?</span>
          <h2>Not sure which laptop is right for you?</h2>
          <p>Use our Help Me Choose guide and we&apos;ll narrow the current stock down according to how you plan to use your laptop.</p>
        </div>
        <Link href="/help-me-choose" className={styles.primary}>Help me choose</Link>
      </section>
    </main>
  )
}
