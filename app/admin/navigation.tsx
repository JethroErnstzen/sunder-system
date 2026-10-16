"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./navigation.module.css";

const links = [
  { href: "/admin/analytics", label: "Activity" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/subscribers", label: "Subscribers" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/products", label: "Add product" },
];

export default function AdminNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin-login");
    router.refresh();
  }

  return (
    <div className={styles.bar}>
      <Link className={styles.brand} href="/admin">SUNDER <span>ADMIN</span></Link>
      <nav className={styles.links} aria-label="Admin navigation">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
            || (link.href === "/admin/inventory" && pathname === "/admin");
          return (
            <Link key={link.href} href={link.href} className={active ? styles.active : undefined}>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <button className={styles.signOut} type="button" onClick={signOut}>Sign out</button>
    </div>
  );
}
