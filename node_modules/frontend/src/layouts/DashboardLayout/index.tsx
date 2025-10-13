import DashBoardOptionBar from "../../components/DashBoardOptionBar";

type DashboardLayoutProps={
    children:React.ReactNode;
};
export default function DashboardLayout({children}:DashboardLayoutProps){
    return(
        <div className="flex h-screen overflow-hidden">
            <div className="flex-shrink-0">
                <DashBoardOptionBar />
            </div>
            <div className="flex-grow overflow-auto">
                {children}
            </div>
        </div>
    )
}