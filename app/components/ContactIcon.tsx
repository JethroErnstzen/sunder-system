type ContactIconName = 'whatsapp' | 'email' | 'phone' | 'location'

export default function ContactIcon({ name }: { name: ContactIconName }) {
  if (name === 'whatsapp') {
    return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="M20.2 11.8a8.2 8.2 0 0 1-12.2 7.1L3 20l1.1-4.8a8.2 8.2 0 1 1 16.1-3.4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M8.2 7.8c.3-.5.6-.5.9-.5h.4c.2 0 .4.1.5.4l.8 1.8c.1.2.1.4-.1.6l-.6.7c-.2.2-.2.4 0 .6.6 1 1.4 1.8 2.5 2.4.2.1.4.1.6-.1l.8-.9c.2-.2.4-.2.6-.1l1.7.8c.2.1.4.3.4.5 0 .3-.1.8-.4 1.1-.3.4-.9.7-1.5.7-.5 0-1.2-.2-2-.6-1.9-.8-3.4-2.4-4.1-3.4-.6-.9-1-1.8-1-2.5 0-.6.2-1.1.5-1.5Z" fill="currentColor"/></svg>
  }

  if (name === 'email') {
    return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="m4.5 7 7.5 6 7.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  }

  if (name === 'phone') {
    return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="M7.2 3.8h3l1.3 4.1-2 1.6a15 15 0 0 0 5 5l1.6-2 4.1 1.3v3c0 1-.8 1.8-1.8 1.8A15.6 15.6 0 0 1 5.4 5.6c0-1 .8-1.8 1.8-1.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  }

  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="M19 10.2c0 5-7 10.3-7 10.3S5 15.2 5 10.2a7 7 0 1 1 14 0Z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8"/></svg>
}