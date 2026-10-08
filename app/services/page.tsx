import Link from 'next/link'
import styles from './services.module.css'

const services = [
	{
		number: '01',
		title: 'Company leasing',
		description: 'Equip your team with the computers it needs through leasing options for businesses. Talk to us about your team size, devices and requirements.',
		link: 'Discuss business leasing',
		href: '/contact',
	},
	{
		number: '02',
		title: 'Hardware support',
		description: 'Get practical help with business computer hardware from a team that works with these devices every day.',
		link: 'Ask about hardware support',
		href: '/contact',
	},
	{
		number: '03',
		title: 'Maintenance & warranty',
		description: 'Keep equipment supported with maintenance guidance and clear warranty options suited to the device and its use.',
		link: 'View warranty information',
		href: '/warranty',
	},
]

export default function Services() {
	return (
		<main className={styles.page}>
			<section className={styles.hero}>
				<div className={styles.heroCopy}>
					<p className={styles.eyebrow}>BUSINESS SERVICES - BELLVILLE &amp; BEYOND</p>
					<h1>Work-ready technology.<br /><em>People to back it up.</em></h1>
					<p className={styles.lead}>
						Business computer leasing, hands-on hardware support and an in-house technician, all from one local team.
					</p>
					<div className={styles.actions}>
						<Link className={styles.primary} href="/contact">Talk to us about your business</Link>
						<Link className={styles.textLink} href="#services">Explore our services <span aria-hidden="true">↓</span></Link>
					</div>
					<div className={styles.trustLine}><span />Supporting businesses with practical technology and real people.</div>
				</div>
				<div className={styles.heroVisual}>
					<img src="/sunder-store-hero.jpg" alt="Laptops displayed at the Sunder Computers store in Bellville" />
					<div className={styles.photoNote}><span>YOUR LOCAL BUSINESS TECH TEAM</span><strong>Delphi Arena, Bellville</strong></div>
				</div>
			</section>

			<section className={styles.services} id="services">
				<div className={styles.sectionIntro}>
					<p className={styles.eyebrow}>HOW WE HELP</p>
					<h2>More than supplying<br />the equipment.</h2>
					<p>Get the right setup for your company, and a real team to turn to when you need support.</p>
				</div>
				<div className={styles.serviceList}>
					{services.map((service) => (
						<article className={styles.service} key={service.number}>
							<span className={styles.serviceNumber}>{service.number}</span>
							<div className={styles.serviceCopy}>
								<h3>{service.title}</h3>
								<p>{service.description}</p>
							</div>
							<Link href={service.href} className={styles.serviceLink}>{service.link} <span aria-hidden="true">↗</span></Link>
						</article>
					))}
				</div>
			</section>

			<section className={styles.leasing}>
				<div className={styles.leasingCopy}>
					<p className={styles.eyebrow}>FOR COMPANIES</p>
					<h2>Lease the computers<br />your team needs.</h2>
					<p>Whether you are equipping a growing team or replacing a few machines, we can discuss business leasing options around your requirements.</p>
					<ul>
						<li>Tell us how many people and devices you need to support.</li>
						<li>Choose suitable business laptops and computer hardware.</li>
						<li>Speak with our team about available lease options and next steps.</li>
					</ul>
					<Link href="/contact" className={styles.lightButton}>Enquire about company leasing <span aria-hidden="true">→</span></Link>
				</div>
				<div className={styles.leaseAside}>
					<span className={styles.leaseMark}>B2B</span>
					<p>One conversation to get the requirements moving.</p>
					<span className={styles.leaseRule} />
					<small>BUSINESS COMPUTERS - LEASING OPTIONS - LOCAL SUPPORT</small>
				</div>
			</section>

			<section className={styles.support}>
				<div className={styles.supportImage}>
					<img src="https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=1400&q=85" alt="Technician working with electronic hardware" loading="lazy" />
					<span>IN-HOUSE HARDWARE SUPPORT</span>
				</div>
				<div className={styles.supportCopy}>
					<p className={styles.eyebrow}>REAL PEOPLE. HANDS-ON HELP.</p>
					<h2>Our own in-house technician.</h2>
					<p>When a computer needs attention, you can speak to our team and get hardware support from our in-house technician. No guessing who to call next.</p>
					<div className={styles.supportPoints}>
						<div><strong>01</strong><span>Talk through the issue with our team.</span></div>
						<div><strong>02</strong><span>Get practical hardware guidance.</span></div>
						<div><strong>03</strong><span>Discuss the next step for your equipment.</span></div>
					</div>
					<Link href="/contact" className={styles.darkLink}>Contact the support team <span aria-hidden="true">→</span></Link>
				</div>
			</section>

			<section className={styles.closing}>
				<div>
					<p className={styles.eyebrow}>LET&apos;S TALK BUSINESS</p>
					<h2>Tell us what your team needs.</h2>
					<p>Share your requirements and we&apos;ll help you work out the right next step.</p>
				</div>
				<div className={styles.closingActions}>
					<Link href="/contact" className={styles.primary}>Contact Sunder Computers <span aria-hidden="true">→</span></Link>
					<a href="https://wa.me/27610571714" className={styles.whatsapp}>WhatsApp +27 61 057 1714</a>
				</div>
			</section>
		</main>
	)
}
