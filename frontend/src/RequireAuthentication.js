import{Navigate, Outlet} from "react-router-dom";
import useAuth from "./hooks/useAuth";
import { useLocation } from "react-router-dom";

const RequiredAuthentication = () => {
    const {auth} = useAuth();
    const location = useLocation();
  return auth ? <Outlet/> : <Navigate to="login" state={{ prev: location.pathname }}/>
  
};

export default RequiredAuthentication;