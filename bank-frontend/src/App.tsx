import { Route, Routes } from "react-router-dom";
import { Suspense, lazy } from "react";

const Login = lazy(() => import("./pages/login"));
const Home = lazy(() => import("./pages/home"));
const Dashboard = lazy(() => import("./pages/dashboard"));
const AboutUs = lazy(() => import("./pages/aboutUs"));
const ContactUs = lazy(() => import("./pages/contactUs"));
const FraudDetPage = lazy(() => import("./pages/fraudDetPage"));
const ChatBotPage = lazy(() => import("./pages/chatBotPage"));
const ExpLrPage = lazy(() => import("./pages/expLrPage"));
const RealTimeOptPage = lazy(() => import("./pages/realTimeOptPage"));
const PersoSuggPage = lazy(() => import("./pages/persoSuggPage"));
const RiskAssmtPage = lazy(() => import("./pages/riskAssmtPage"));
const IntTermPredPage = lazy(() => import("./pages/intTermPredPage"));
const DuesPage = lazy(() => import("./pages/DuesPage"));
const BankRevenue = lazy(() => import("./pages/bankRevenue"));

export default function App() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path='/dashboard' element={<Dashboard/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/aboutUs" element={<AboutUs/>}/>
        <Route path="/contactUs" element={<ContactUs/>} />
        <Route path='/dashboard/ITP' element={<IntTermPredPage/>}/>
        <Route path='/dashboard/RA' element={<RiskAssmtPage/>}/>
        <Route path='/dashboard/PS' element={<PersoSuggPage/>}/>
        <Route path='/dashboard/RTO' element={<RealTimeOptPage/>}/>
        <Route path='/dashboard/ELR' element={<ExpLrPage/>}/>
        <Route path='/dashboard/CA' element={<ChatBotPage/>}/>
        <Route path='/dashboard/FD' element={<FraudDetPage/>}/>
        <Route path="/dashboard/Dues" element={<DuesPage/>}/>
        <Route path="/dashboard/revenue" element={<BankRevenue/>}/>
      </Routes>
    </Suspense>
  )
}
