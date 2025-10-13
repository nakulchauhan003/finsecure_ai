import { AnimatedTestimonials } from "./animated-testomonials";

function AnimatedTestimonialsDemo() {
  const testimonials = [
    {
      quote:
        "Use machine learning models to predict optimal interest rates and loan durations based on customer preferences, credit score, income, and other relevant data.",
      name: "Interest Rate & Time Period Prediction",
      designation: "Product Manager at TechFlow",
      src: "/images/image2.jpg",
    },
    {
      quote:
        "Provide personalized loan plans tailored to customer profiles, ensuring the options are both profitable for the bank and affordable for the client.",
      name: "Personalized Loan Suggestions",
      designation: "CTO at InnovateSphere",
      src: "/images/image3.jpg",
    },
    {
      quote:
        "Ensure transparency by explaining why certain rates or time periods are suggested, helping both customers and bank officials trust the Al's decisions.",
      name: "Explainable AI",
      designation: "Operations Director at CloudScale",
      src: "/images/image5.jpg",
    },
    {
      quote:
        "Implement model that identify suspicious applications or data inconsistencies, alerting the bank to potential fraud.",
      name: "Fraud Detection",
      designation: "Engineering Lead at DataPro",
      src: "/images/image4.jpg",
    },
    {
      quote:
        "The Dues module provides a complete summary of a customer’s loan status, showing remaining installments, total dues, repayment history, and any penalties or refunds. It helps track payments and manage loan accounts efficiently using the customer’s name or code.",
      name: "Dues",
      designation: "VP of Technology at FutureNet",
      src: "/images/image6.jpg",
    },
  ];
  return <AnimatedTestimonials testimonials={testimonials} />;
}

export { AnimatedTestimonialsDemo };
