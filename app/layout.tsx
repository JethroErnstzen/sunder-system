import './globals.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

export const metadata: Metadata={title:'Sunder Computers | New, Demo & Pre-owned Technology',description:'Quality new, demo and pre-owned laptops, desktops and technology from Sunder Computers. Warranty backed and delivered with FREE Nationwide Shipping across South Africa.'}
export default function RootLayout({children}:{children:ReactNode}){return <html lang="en-ZA"><body><SiteHeader/>{children}<SiteFooter/></body></html>}
