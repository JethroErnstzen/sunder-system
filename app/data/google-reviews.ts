export type GoogleReview = {
  id: string
  name: string
  photoUrl: string | null
  date: string
  rating: 5
  text: string
  ownerReply?: {
    date: string
    text: string
  }
}

export const googleReviewSnapshot = {
  businessName: 'Sunder Computers',
  rating: 5.0,
  reviewCount: 78,
  snapshotDate: '2026-10-09',
  googleReviewsUrl:
    'https://www.google.com/maps/place/Sunder+Computers/@-33.8690834,18.6345384,17z/data=!3m1!4b1!4m6!3m5!1s0x971ad46c226ad2d:0x6ca1384c42f208c6!8m2!3d-33.8690834!4d18.6345384!16s%2Fg%2F11vz0s2h58',
} as const

export const googleReviews: GoogleReview[] = [
  {
    id: 'marcelle-moss',
    name: 'Marcelle Moss',
    photoUrl:
      'https://lh3.googleusercontent.com/a/ACg8ocLLobtKkgwOIQaLQye9K-m-r4HpZ0mpyyfJy943VWzwSda0uA=s64-c-rp-mo-br100',
    date: '2 days ago',
    rating: 5,
    text: 'Excellent in every way. Not my first time buying from them and definitely will not be the last. Great laptops, pricing, communication and service.',
  },
  {
    id: 'willem-van-der-vyver',
    name: 'Willem Van der Vyver',
    photoUrl:
      'https://lh3.googleusercontent.com/a/ACg8ocIWzPqUt9883YM2_6bPyyaycJziMcsPFc7TJWS8Yk5GUiJQwA=s64-c-rp-mo-br100',
    date: '6 days ago',
    rating: 5,
    text: 'Sunder Computers are definitely worth a five star. I had a fan and heat sink issue with a new Dell laptop that was returned to Dell. I visited Sunder Computers and was totally surprised with the range of laptops and the prices. I was again looking to get a new Dell laptop but was concerned about the fan and heat sink issue. Trevor agreed to perform a load test on the new Dell laptop to ensure no issues are detected. That is 5 star service that closed the deal. Certainty a happy customer.',
  },
  {
    id: 'francois-retief',
    name: 'Francois Retief',
    photoUrl: null,
    date: '3 weeks ago',
    rating: 5,
    text: 'Got a very good deal on a pair of Sony WF-1000XM5s. Very impressed with the whole process. Fast, efficient and hassle free. Will not hesitate to use again.',
    ownerReply: {
      date: '2 weeks ago',
      text: 'Thanks a lot for taking the time to leave a review Francois! Appreciate the kind words',
    },
  },
  {
    id: 'helga-bauermeister',
    name: 'Helga Bauermeister',
    photoUrl:
      'https://lh3.googleusercontent.com/a/ACg8ocLf4x53l7bnOWAi18NPsA6PBAKs92JFt7hxI7z5fRUHEVdacQ=s64-c-rp-mo-ba12-br100',
    date: '3 weeks ago',
    rating: 5,
    text: 'Well priced laptops and excellent service thank you!',
    ownerReply: {
      date: '2 weeks ago',
      text: 'Thanks a lot Helga! Appreciate it.',
    },
  },
  {
    id: 'william-fuller',
    name: 'William Fuller',
    photoUrl:
      'https://lh3.googleusercontent.com/a/ACg8ocKniDr8dkvI53bI946y-ehzMtU02iFcg-VNlCXeSwfvCjBb=s64-c-rp-mo-br100',
    date: '4 weeks ago',
    rating: 5,
    text: 'They led me on to believe my thermal paste replacement was going to take 2 days. Then they finished in 2 hours. Quick. Efficient. Job was well done and cheap!!',
    ownerReply: {
      date: '2 weeks ago',
      text: 'Thanks William for the review! If the GPU ever gives any issues please reach out and we will assist.',
    },
  },
  {
    id: 'trevor-ernstzen',
    name: 'Trevor Ernstzen',
    photoUrl: null,
    date: 'a month ago',
    rating: 5,
    text: 'Lekker man lekker - best service ever!',
  },
  {
    id: 'brandon-tuck',
    name: 'Brandon Tuck',
    photoUrl:
      'https://lh3.googleusercontent.com/a-/ALV-UjV-YjuKRCKcSoJcDKgg3MbNdC_brKi6zVZw699V0e9le-pLpkA=s64-c-rp-mo-br100',
    date: 'a month ago',
    rating: 5,
    text: 'Jethro has helped me out on numerous occasions and every time the process has been seamless! I would recommend Sunder Computers to anyone. Service and pricing very good!',
    ownerReply: {
      date: '2 weeks ago',
      text: 'Thanks a lot Brandon! Very much appreciate the kind words',
    },
  },
  {
    id: 'lizelle-heins',
    name: 'Lizelle Heins',
    photoUrl:
      'https://lh3.googleusercontent.com/a-/ALV-UjU1aaV3KZAkxt4i2RQAeDTooaZZCYBT-GbL9OazJ0ugoz6HY7jF=s64-c-rp-mo-br100',
    date: '2 months ago',
    rating: 5,
    text: 'Fantastic service. Their pre-owned laptops are as good as new. Have just made my second purchase couriered to the Free State. I will only purchase my computers from Sunder for the foreseeable future.',
    ownerReply: {
      date: '2 weeks ago',
      text: 'Thanks Lizelle, means a lot to us, and hopefully we keep providing computers that meet your expectations!',
    },
  },
  {
    id: 'humble-beginning',
    name: 'Humble Beginning',
    photoUrl:
      'https://lh3.googleusercontent.com/a-/ALV-UjUjh2FCapdishwWj2CBy_HEMzJDFsmbU0508fT0SdtUimqXut0=s64-c-rp-mo-br100',
    date: '3 months ago',
    rating: 5,
    text: 'If I could I would give Jethro more stars, I bought a computer through Takealot that I needed urgently for my NPO and online teaching. When it arrived, I had difficulty connecting to my internet wirelessly and could not get Bluetooth. I had an option to send it back to Takealot for refund or do what I did I contacted Jethro, Sunder Computers and explained my issue, he gave me some guidance, which I did but this did not help, I might just add this was at 23:00 hrs and he responded within minutes. I then reported to him about the issues not responding to his work about, to which he said he would come out to see what the issue was, the very next morning he made a plan that suited us both and he travelled to my house to rectify the issue which was an easy fix for him but not for me. I can highly recommend, Sunder Computers, Jethro, in particular for the above and beyond service, I will definitely use them again. Thank you for your professionalism and speedy resolution to the problem Jethro. regards Gary Fraser',
    ownerReply: {
      date: '2 weeks ago',
      text: 'Thanks so much Gary for taking the time to write out this review, its very much appreciated and if the laptop ever gives any issues please let us know!',
    },
  },
]
