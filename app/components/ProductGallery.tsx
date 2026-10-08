'use client'

import { useState } from 'react'
import styles from './ProductGallery.module.css'

type ProductImage = { id: string; url: string }

export default function ProductGallery({ images, productName }: { images: ProductImage[]; productName: string }) {
  const [activeIndex, setActiveIndex] = useState(0)
  if (!images.length) return <div className={styles.main}>SUNDER COMPUTERS</div>
  const active = images[activeIndex] || images[0]
  return (
    <div className={styles.gallery}>
      <div className={styles.main}><img src={active.url} alt={`${productName} - image ${activeIndex + 1}`} /></div>
      {images.length > 1 && <div className={styles.thumbs}>{images.map((image,index)=><button key={image.id} type="button" className={`${styles.thumb} ${index===activeIndex?styles.active:''}`} onClick={()=>setActiveIndex(index)}><img src={image.url} alt={`${productName} thumbnail ${index+1}`} /></button>)}</div>}
      {images.length > 1 && <div className={styles.counter}>{activeIndex+1} / {images.length}</div>}
    </div>
  )
}
