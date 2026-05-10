export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Simtura",
  "url": "https://simtura.ai",
  "logo": "https://simtura.ai/favicon.png",
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "hello@simtura.ai",
    "contactType": "customer support",
  },
  "sameAs": [],
};

export const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Simtura",
  "url": "https://simtura.ai",
  "applicationCategory": "EducationApplication",
  "operatingSystem": "Web, iOS, Android",
  "description": "Immersive first-person video simulations for EMS and nursing students. NREMT- and NCLEX-aligned feedback on every decision.",
  "offers": [
    {
      "@type": "Offer",
      "name": "Free",
      "price": "0",
      "priceCurrency": "USD",
      "description": "One scenario per day, no card required.",
    },
    {
      "@type": "Offer",
      "name": "Pro",
      "price": "19",
      "priceCurrency": "USD",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "19",
        "priceCurrency": "USD",
        "unitCode": "MON",
      },
      "description": "Unlimited scenarios, NREMT/NCLEX-aligned grading, performance dashboard.",
    },
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "3",
    "bestRating": "5",
  },
  "review": [
    {
      "@type": "Review",
      "reviewBody": "It's the closest I've felt to the real call without being on one. The pause-and-decide flow rewires how you think under pressure.",
      "author": { "@type": "Person", "name": "Maya Chen" },
      "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
    },
    {
      "@type": "Review",
      "reviewBody": "We piloted Simtura with our nursing cohort for stroke recognition. Pass rates on the unit competency jumped noticeably the first month.",
      "author": { "@type": "Person", "name": "Dr. Lisa Bowman" },
      "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
    },
    {
      "@type": "Review",
      "reviewBody": "Finally a sim platform that doesn't feel like a quiz. The first-person video makes you commit before you can second-guess yourself.",
      "author": { "@type": "Person", "name": "Marcus Reyes" },
      "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
    },
  ],
};

export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Do these scenarios count toward clinical hours?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Simtura is a decision-making trainer, not a clinical hours substitute. Many programs use it as adjunct prep before live sim lab and field internships. Check with your program coordinator about credit.",
      },
    },
    {
      "@type": "Question",
      "name": "Who writes and reviews the content?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Every scenario is built and reviewed by NREMT-certified paramedics and practicing RNs, then mapped to the relevant board exam objectives (NREMT for EMS, NCLEX for nursing).",
      },
    },
    {
      "@type": "Question",
      "name": "Can I try a scenario before paying?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. The Free tier gives you one full scenario per day, forever — no credit card needed. You can also browse the full catalog without signing up.",
      },
    },
    {
      "@type": "Question",
      "name": "How does organization licensing work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You buy seats in bulk, get a code per seat, and distribute them to your students or crew. Everyone redeems independently and you see redemption status in one dashboard.",
      },
    },
    {
      "@type": "Question",
      "name": "Does this work on my phone?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes — fully responsive. That said, the video is the whole experience, so most users prefer a tablet or laptop for the immersion.",
      },
    },
  ],
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Simtura",
  "url": "https://simtura.ai",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://simtura.ai/scenarios?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};
