import HomePageHero from "../components/HomePageHero";
import { WavesDemo } from "../components/ui/demo";
import HomePageLayout from "../layouts/HomePageLayout";

export default function Home(){
    return(
        <HomePageLayout>
            <WavesDemo/>
            <div className="relative z-10">
                <HomePageHero />
            </div>
        </HomePageLayout>
    )
}