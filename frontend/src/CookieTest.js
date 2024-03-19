import React from 'react'
import { useState } from 'react'
import useAuth from './hooks/useAuth';
const CookieTest = () => {
    const {auth, setAuth} = useAuth();
    const [apiError, setApiError] = useState();
    const d = new Date();
    d.setTime(d.getTime() + (31*24*60*60*1000));
    let token = {
        token : '1234567'
    }
    setAuth('')
    
    console.log(document.cookie.split('=')[1]===true)
  return (
    <div>CookieTest {document.cookie.split('=')[1]} Auth{auth}</div>
  )
}

export default CookieTest