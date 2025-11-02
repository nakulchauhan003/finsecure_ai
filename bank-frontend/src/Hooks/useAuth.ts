import { useAuthContext } from '../contexts/AuthContext';

const useAuth = () => {
    const { session, loading } = useAuthContext();
    return { 
        isLoggedIn: !!session, 
        loading 
    };
}

export default useAuth;
