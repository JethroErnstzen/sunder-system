import Link from 'next/link'
import styles from './warranty.module.css'

const exclusions = [
	'Devices that have been tampered with, opened or otherwise compromised.',
	'Warranty repairs arising from unlicensed software, computer viruses or similar destructive media.',
	'Data recovery or software recovery.',
	'General wear and tear.',
	'Damage or loss that may be covered by insurance, including theft, water, malicious or impact damage, drops, and broken or damaged LCD screens.',
	'Damage caused by power surges.',
	'Battery performance or battery life.',
	'Cosmetic defects.',
]

export default function Warranty() {
	return (
		<main className={styles.page}>
			<header className={styles.hero}>
				<div className={styles.heroInner}>
					<p className={styles.eyebrow}>SUNDER COMPUTERS - CUSTOMER CARE</p>
					<h1>Warranty<br /><em>&amp; returns.</em></h1>
					<p className={styles.lead}>Clear guidance on what is covered, how to arrange an assessment and what to expect if a product develops a fault.</p>
					<Link href="/contact" className={styles.primary}>Contact us about a product <span aria-hidden="true">→</span></Link>
				</div>
				<div className={styles.coverage}>
					<span className={styles.coverageLabel}>MINIMUM COVERAGE</span>
					<strong>6<span> months minimum</span></strong>
					<p>Carry-in repair or replace warranty. Check the product page or invoice for the applicable terms.</p>
				</div>
			</header>

			<nav className={styles.contents} aria-label="Warranty policy sections">
				<a href="#coverage">Coverage</a>
				<a href="#assessment">Assessment &amp; resolution</a>
				<a href="#exclusions">Exclusions</a>
			</nav>

			<section className={styles.section} id="coverage">
				<div className={styles.sectionHeading}>
					<p className={styles.eyebrow}>01 - WHAT&apos;S COVERED</p>
					<h2>Check the product&apos;s stated warranty first.</h2>
				</div>
				<div className={styles.sectionBody}>
					<p>Products include a minimum six-month carry-in repair or replace warranty. Check the product page or your invoice for the applicable warranty terms.</p>
					<p>If a device is covered by a manufacturer warranty, that manufacturer warranty takes precedence over Sunder&apos;s six-month minimum warranty.</p>
					<div className={styles.notice}>
						<strong>Demo and open-box products</strong>
						<p>The warranty does not cover cosmetic imperfections on demo or open-box products.</p>
					</div>
				</div>
			</section>

			<section className={styles.assessment} id="assessment">
				<div className={styles.assessmentIntro}>
					<p className={styles.eyebrow}>02 - IF THERE&apos;S A PROBLEM</p>
					<h2>Start by arranging an assessment.</h2>
					<p>If you are unhappy with your purchase or experience hardware failure, malfunction or a manufacturer defect, contact us before bringing or sending the device in.</p>
					<Link href="/contact" className={styles.lightLink}>Arrange an assessment <span aria-hidden="true">↗</span></Link>
				</div>
				<div className={styles.steps}>
					<article><span>01</span><div><h3>Get in touch</h3><p>Contact Sunder Computers so we can arrange an assessment.</p></div></article>
					<article><span>02</span><div><h3>Bring in or courier the device</h3><p>If you cannot bring it to us, you are responsible for courier costs related to returning it for assessment and any repair, replacement or refund process.</p></div></article>
					<article><span>03</span><div><h3>We assess and resolve</h3><p>Where a covered hardware defect is confirmed, we reserve the right to repair the product first. If repair is not possible or feasible, we may offer a replacement of the same or similar specification and equal value. A refund is processed only if repair and replacement are not possible.</p></div></article>
				</div>
			</section>

			<section className={styles.exclusions} id="exclusions">
				<div className={styles.sectionHeading}>
					<p className={styles.eyebrow}>03 - PLEASE NOTE</p>
					<h2>Specific warranty exclusions.</h2>
					<p>Warranty coverage does not include the following:</p>
				</div>
				<ul>{exclusions.map((exclusion, index) => <li key={exclusion}><span>{String(index + 1).padStart(2, '0')}</span>{exclusion}</li>)}</ul>
			</section>

			<footer className={styles.footer}>
				<div>
					<p className={styles.eyebrow}>NEED HELP?</p>
					<h2>Talk to our team.</h2>
					<p>We can help you check the stated warranty and arrange the next step.</p>
				</div>
				<div className={styles.footerActions}>
					<Link href="/contact" className={styles.primary}>Contact Sunder Computers <span aria-hidden="true">→</span></Link>
					<a href="https://wa.me/27610571714">WhatsApp +27 61 057 1714</a>
				</div>
			</footer>
		</main>
	)
}
