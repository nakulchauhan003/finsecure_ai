import { Link } from 'react-router-dom';
import { Suspense, lazy } from 'react'
import { Demo } from '../LogoSymbol/demo';
import './index-style.css';
import { DemoPage } from './DemoJoinButton';

const AnimatedTestimonialsDemo = lazy(() => import('../ui-cards/demo').then(m => ({ default: m.AnimatedTestimonialsDemo })))
const TestimonialsSectionDemo = lazy(() => import('./demo').then(m => ({ default: m.TestimonialsSectionDemo })))

export default function HomePageHero(){
    return (
        <>
        <div className="homeHeroContainer relative z-10">
            <h1 className="text-[4rem] font-bold">Welcome To FinScope</h1>
            <p className="text-[4rem] mb-[20vh]">See Risk. Simulate. Decide Smarter.</p>
            <Suspense fallback={<div />}>
              <AnimatedTestimonialsDemo/>
            </Suspense>
            <Suspense fallback={<div />}>
              <TestimonialsSectionDemo/>
            </Suspense>
            <Link to={'/dashboard'}><DemoPage/></Link>
        </div>
        <Link to={'/dashboard/CA'}>
            <div className='AiLogoBottomRight'>
                <Demo/>
            </div>
        </Link>
        </>
    )
}
