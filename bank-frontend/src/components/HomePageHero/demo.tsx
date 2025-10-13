import { TestimonialsSection } from "./testimonial-cards"


const testimonials = [
  {
    author: {
      name: "Zest AI",
      handle: "@Zestai",
      avatar: "/images/img2.jpg"
    },
    text: "Provide similar idea to our Risk Assessment Model and Creditworthiness Scoring ideas",
    href: "https://twitter.com/emmaai"
  },
  {
    author: {
      name: "IBM Watson",
      handle: "@IBMWatson",
      avatar: "/images/img2.webp"
    },
    text: "Includes fraud detection, risk modeling, and predictive analytics and aligns closely with our Fraud Detection and Risk Assessment features",
    href: "https://twitter.com/davidtech"
  },
  {
    author: {
      name: "Google AI",
      handle: "@GoogleAI",
      avatar: "/images/img1.jpg"
    },
    text: "Research on interpretable machine learning Supports our Explainable AI module for credit decisions"
  },
  {
    author: {
      name: "Upstart",
      handle: "@Upstart",
      avatar: "/images/img3.jpeg"
    },
    text: "Our concept of Personalized Loan Suggestions and Interest Rate Prediction matches theirs future working idea closely",
    href: "https://twitter.com/emmaai"
  },
   {
    author: {
      name: "LenddoEFL",
      handle: "@LenddoEFL",
      avatar: "/images/img4.png"
    },
    text: "Aligns with our idea of using real-time data and customer behavior for fraud detection and loan suggestion",
    href: "https://twitter.com/emmaai"
  },
  {
    author: {
      name: "KreditBee (India-based)",
      handle: "@KreditBee",
      avatar: "/images/img5.png"
    },
    text: "A practical model for your localized implementation.",
    href: "https://twitter.com/emmaai"
  },
  {
    author: {
      name: "Tala",
      handle: "@Tala",
      avatar: "/images/img6.jpeg"
    },
    text: "Great example of real-time loan optimization and behavioral risk analysis",
    href: "https://twitter.com/emmaai"
  },
  {
    author: {
      name: "Experian Boost",
      handle: "@ExperianBoost",
      avatar: "/images/img7.jpg"
    },
    text: "Demonstrates usage of non-traditional data—similar to your project idea.",
    href: "https://twitter.com/emmaai"
  }
]

export function TestimonialsSectionDemo() {
  return (
    <TestimonialsSection
      title=" Companies & Platforms Working on Similar Ideas"
      description="Join thousands of developers who are already building the future with our AI platform"
      testimonials={testimonials}
    />
  )
}