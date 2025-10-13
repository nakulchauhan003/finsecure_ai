import NavHeader from "../../navbar";
type HomePageLayoutProps={
    children:React.ReactNode;
};
export default function HomePageLayout({children}:HomePageLayoutProps){
    return(
        <div>
            <img src="/images/Screenshot 2025-05-03 132116.png" alt="FinScope logo" loading="lazy" decoding="async" className="absolute top-[10px] left-[20px] h-[10%] min-h-[60px]" />
            <header className="z-[100] justify-center items-center h-auto pt-2 absolute left-1/2 transform -translate-x-1/2">
            <NavHeader />
            </header>
            <div className="min-h-screen w-full relative">
                {children}
            </div>
        </div>
    )
}
