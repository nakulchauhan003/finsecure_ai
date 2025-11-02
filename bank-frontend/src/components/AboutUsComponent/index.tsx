import { Link } from 'react-router-dom';
import { Brain, Target, Shield, Sparkles } from 'lucide-react';
import './style.css';

const teamMembers = [
  {
    name: "Nakul Chauhan",
    role: "AI and Software Developer",
    image: "/images/team/alex.jpg",
    description: "Final yera B.Tech Student"
  },
  {
    name: "--- IGNORE ---",
    role: "Head of AI Developer",
    image: "/images/team/sarah.jpg",
    description: "Final year B.Tech Student"
  },
  {
    name: "--- IGNORE ---",
    role: "UI/UX Designer",
    image: "/images/team/michael.jpg",
    description: "Final year B.Tech Student"
  },
  {
    name: "--- IGNORE ---",
    role: "Product Manager",
    image: "/images/team/emma.jpg",
    description: "Final year B.Tech Student"
  }
];

const values = [
  {
    icon: <Brain className="w-8 h-8 text-purple-500" />,
    title: "AI-Driven Innovation",
    description: "Leveraging cutting-edge artificial intelligence to transform financial services."
  },
  {
    icon: <Shield className="w-8 h-8 text-blue-500" />,
    title: "Security First",
    description: "Protecting your financial data with enterprise-grade security measures."
  },
  {
    icon: <Target className="w-8 h-8 text-green-500" />,
    title: "Customer Success",
    description: "Dedicated to helping our clients achieve their financial goals."
  },
  {
    icon: <Sparkles className="w-8 h-8 text-amber-500" />,
    title: "Continuous Evolution",
    description: "Constantly improving our solutions to meet tomorrow's challenges."
  }
];

export default function AboutUsComponent() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative px-6 lg:px-8 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Revolutionizing Financial Services with AI
            </h1>
            <p className="mt-6 text-lg leading-8 text-purple-200">
              We're a team of AI enthusiasts, finance experts, and developers who came together to build
              smarter solutions for one of the most important financial decisions—loans. Whether you're a
              customer seeking clarity or a bank striving for efficiency, FinScope makes lending smarter
              and simpler.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link to="/" className="rounded-md bg-purple-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600">
                Explore Our Platform
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Company Values */}
      <div className="py-24 sm:py-32 bg-white/5 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Our Values</h2>
            <p className="mt-6 text-lg leading-8 text-purple-200">
              Built on a foundation of innovation, security, and customer success
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-7xl">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((value, index) => (
                <div key={index} className="flex flex-col items-center p-8 backdrop-blur-sm bg-white/5 rounded-2xl border border-purple-500/10 hover:border-purple-500/30 transition-all">
                  <div className="rounded-lg bg-white/10 p-3 ring-1 ring-white/10">
                    {value.icon}
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-white text-center">{value.title}</h3>
                  <p className="mt-2 text-purple-200 text-center">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Our Team</h2>
            <p className="mt-6 text-lg leading-8 text-purple-200">
              Meet the experts behind FinScope's innovative solutions
            </p>
          </div>
          <ul className="mx-auto mt-20 grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-2 lg:max-w-4xl">
            {teamMembers.map((member, index) => (
              <li key={index} className="backdrop-blur-sm bg-white/5 rounded-2xl border border-purple-500/10 hover:border-purple-500/30 transition-all">
                <div className="flex items-center gap-x-6 p-6">
                  <img className="h-16 w-16 rounded-full object-cover" src={member.image} alt={member.name} />
                  <div>
                    <h3 className="text-lg font-semibold leading-7 tracking-tight text-white">{member.name}</h3>
                    <p className="text-base font-semibold leading-6 text-purple-400">{member.role}</p>
                    <p className="mt-1 text-sm leading-5 text-purple-300">{member.description}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Call to Action */}
      <div className="relative isolate py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="backdrop-blur-sm bg-white/5 border border-purple-500/10 rounded-2xl py-16">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Ready to get started?</h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-purple-200">
                Join us in transforming the future of financial services with AI-powered solutions.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link 
                  to="/contact" 
                  className="rounded-md bg-white/10 backdrop-blur-sm px-6 py-3 text-lg font-semibold text-white hover:bg-white/20 transition-all">
                  Contact Us
                </Link>
                <Link 
                  to="/dashboard" 
                  className="rounded-md bg-gradient-to-r from-purple-600 to-purple-500 px-6 py-3 text-lg font-semibold text-white shadow-lg hover:shadow-purple-500/50 hover:translate-y-[-2px] transition-all">
                  Request Demo <span aria-hidden="true" className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}