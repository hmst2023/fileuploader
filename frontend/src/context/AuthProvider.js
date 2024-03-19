import { createContext, useState, useEffect} from "react"

const AuthContext = createContext({})
export const AuthProvider = ({children}) => {
    let didInit = false
    let cookie = document.cookie.split('=')[1]
    
    const [auth, setAuth] = useState(cookie ? cookie : '')

    const getNewToken = async() => {
        const timeout = 12000;
        const controller = new AbortController();
        const id2 = setTimeout(() => controller.abort(), timeout);
        
        try {
          const res = await fetch(process.env.REACT_APP_BACKEND_LOCATION+"refreshToken", {
            signal: controller.signal,
            method:"GET",
            headers: {
                    Authorization : `Bearer ${auth}`,
                    "Content-Type": "application/json",
                  }, 

          });
          if (!res.ok){
            setAuth('');
            document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC;"+ ";path=/";
            let errorResponse = await res.json();
            console.log(errorResponse["detail"]);
    
          } else {
            let token = await res.json()
            setAuth(token['token'])
            const d = new Date();
            d.setTime(d.getTime() + (31*24*60*60*1000));
            document.cookie = "token="+token["token"]+"; expires="+d+ ";path=/;samesite=strict";
      
          }
        } catch (error) {
          if (error.name==='AbortError'){
            console.log(['Possible Timeout'])
        } else {
            console.log([error.message])
        }
      };
      clearTimeout(id2);
      }
    
      useEffect(()=>{
        if (!didInit) {
            cookie && getNewToken()
            
            didInit = true;
        }
        },[])


    return <AuthContext.Provider value={{auth, setAuth}}>
            {children}
            </AuthContext.Provider>
    }
export default AuthContext
