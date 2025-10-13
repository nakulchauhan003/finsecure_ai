import { useEffect } from "react";
import DashBoardMainComponent from "../components/DashboardMainComponent";
import DashboardLayout from "../layouts/DashboardLayout";
import useAuth from "../Hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Dashboard(){
    // const navigation=useNavigate();
    // const {isLoggedIn}=useAuth();
    // useEffect(()=>{
    //     if(!isLoggedIn){
    //         navigation('/login');
    //     }
    // },[isLoggedIn]);
    return (
        <DashboardLayout>
            <DashBoardMainComponent/>
        </DashboardLayout>    
    )
}