import NavHeader from "../../navbar";
type HomePageLayoutProps={
    children:React.ReactNode;
};
export default function HomePageLayout({children}:HomePageLayoutProps){
    return(
        <div>
            <div className="absolute top-[10px] left-[20px] flex items-center gap-3 z-[100]">
                <img src="/images/Screenshot 2025-05-03 132116.png" alt="FinScope logo" loading="lazy" decoding="async" className="h-[70px] drop-shadow-lg" />
                <span className="text-4xl font-bold text-white drop-shadow-lg">FinScope</span>
            </div>
            <header className="z-[100] justify-center items-center h-auto pt-2 absolute left-1/2 transform -translate-x-1/2">
            <NavHeader />
            </header>
            <div className="min-h-screen w-full relative">
                {children}
            </div>
        </div>
    )
}
