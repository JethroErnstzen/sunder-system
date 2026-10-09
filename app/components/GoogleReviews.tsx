'use client'

import { useState } from 'react'
import {
  googleReviews,
  googleReviewSnapshot,
  type GoogleReview,
} from '@/app/data/google-reviews'
import styles from './GoogleReviews.module.css'

export function GoogleMark() {
  return (
    <svg
      className={styles.googleMark}
      viewBox="0 0 24 24"
      role="img"
      aria-label="Google"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v2.99h3.87c2.27-2.09 3.57-5.17 3.57-8.63Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.93l-3.87-2.99c-1.08.72-2.46 1.15-4.06 1.15-3.12 0-5.76-2.1-6.71-4.92H1.29v3.09C3.26 21.14 7.27 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.31a7.22 7.22 0 0 1 0-4.62V6.6H1.29a12 12 0 0 0 0 10.8l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.94 1.18 15.24 0 12 0 7.27 0 3.26 2.86 1.29 6.6l4 3.09C6.24 6.87 8.88 4.77 12 4.77Z"
      />
    </svg>
  )
}

function Stars({ rating }: { rating: number }) {
  return (
    <span
      className={styles.stars}
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {'★'.repeat(rating)}
    </span>
  )
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
}

function ReviewCard({ review }: { review: GoogleReview }) {
  const [expanded, setExpanded] = useState(false)
  const [photoUnavailable, setPhotoUnavailable] = useState(!review.photoUrl)

  return (
    <article className={styles.card}>
      <div className={styles.reviewer}>
        <span className={styles.avatar} aria-hidden="true">
          {photoUnavailable ? (
            initials(review.name)
          ) : (
            <img
              className={styles.avatarImage}
              src={review.photoUrl ?? undefined}
              alt=""
              onError={() => setPhotoUnavailable(true)}
            />
          )}
        </span>
        <div className={styles.reviewerInfo}>
          <h3>{review.name}</h3>
          <time>{review.date}</time>
        </div>
        <GoogleMark />
      </div>
      <div className={styles.reviewMeta}>
        <Stars rating={review.rating} />
        <span className={styles.visuallyHidden}>{review.rating} out of 5</span>
      </div>
      <p
        id={`review-text-${review.id}`}
        className={`${styles.reviewText} ${expanded ? styles.expanded : ''}`}
      >
        {review.text}
      </p>
      {review.text.length > 190 && (
        <button
          type="button"
          className={styles.readMore}
          aria-expanded={expanded}
          aria-controls={`review-text-${review.id}`}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
      {review.ownerReply && (
        <div className={styles.ownerReply}>
          <strong>Response from the owner</strong>
          <time>{review.ownerReply.date}</time>
          <p>{review.ownerReply.text}</p>
        </div>
      )}
    </article>
  )
}

export default function GoogleReviews() {
  const snapshotDate = new Date(
    `${googleReviewSnapshot.snapshotDate}T00:00:00`,
  ).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  return (
    <section className={styles.section} aria-labelledby="google-reviews-title">
      <div className={styles.inner}>
        <div className={styles.heading}>
          <div className={styles.headingCopy}>
            <div className={styles.kicker}>CUSTOMER REVIEWS</div>
            <h2 id="google-reviews-title">
              What customers say about <em>Sunder Computers.</em>
            </h2>
          </div>
          <div className={styles.score} aria-label="Google rating snapshot">
            <GoogleMark />
            <span className={styles.scoreValue}>
              {googleReviewSnapshot.rating.toFixed(1)}
            </span>
            <span className={styles.scoreDetails}>
              <Stars rating={Math.round(googleReviewSnapshot.rating)} />
              <span>{googleReviewSnapshot.reviewCount} Google reviews</span>
            </span>
          </div>
        </div>

        <div className={styles.reviewList} aria-label="Selected Google reviews">
          {googleReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>

        <div className={styles.footer}>
          <p>
            Selected Google reviews. Rating and review count captured on{' '}
            {snapshotDate}; this custom section is not a live Google feed.
          </p>
          <div className={styles.actions}>
            <a
              href={`${googleReviewSnapshot.googleReviewsUrl}#reviews`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read all Google reviews
              <span aria-hidden="true">↗</span>
            </a>
            <a
              href={googleReviewSnapshot.googleReviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.writeReview}
            >
              Write a review
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
