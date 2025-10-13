import { useEffect, useState } from "react"


const TOKEN_KEY = "token";

const useAuth=()=>{
    const [isLoggedIn,setIsLoggedIn]=useState(()=>{
      return !!localStorage.getItem(TOKEN_KEY);
    });
    useEffect(() => {
        const handleStorageChange = () => {
          setIsLoggedIn(!!localStorage.getItem(TOKEN_KEY));
        };
        window.addEventListener("storage", handleStorageChange);
        return () => {
          window.removeEventListener("storage", handleStorageChange);
        };
      }, []);
    return {isLoggedIn};
}
export default useAuth;
