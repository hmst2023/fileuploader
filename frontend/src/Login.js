import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from "react-router-dom";
import useAuth from './hooks/useAuth';
import { type } from '@testing-library/user-event/dist/type';


const Login = () => {
  const {auth, setAuth} = useAuth();
  let navigate = useNavigate();
  const { state } = useLocation();
  const [apiError,setApiError] = useState();

  const onFormReset = ()=> {
    navigate("/", {replace:true});
  }

  const onFormSubmit = async (e)=>{
    let dict = {email: e.target.email.value, password: e.target.password.value}    
    e.preventDefault();
    const timeout = 8000;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout); 
    try {
      const response = await fetch(process.env.REACT_APP_BACKEND_LOCATION + "login", {
        signal:controller.signal,
        method:"POST",
        headers:{
            "Content-Type":"application/json",
        },
        body:JSON.stringify(dict)});
        if (response.ok){
          const token = await response.json()
          setAuth(token["token"]);
          const d = new Date();
          d.setTime(d.getTime() + (31*24*60*60*1000));
          document.cookie = "token="+token["token"]+"; expires="+d+ ";path=/;samesite=strict";
          navigate(state===null ? "/" :  state.prev , {replace:true});
        } else{
          let errorResponse = await response.json();
          setApiError(errorResponse["detail"]);
          setAuth(null);
        }
    } catch (error) {
      if (error.name==='AbortError'){
        setApiError('Possible Timeout')
      } else {
        setApiError(error.message)
      }
    };
    clearTimeout(id);
    }

  return (
      <div className='bg-aubergine p-8'>
      <p className='text-xl font-bold'>
            Melde dich bei deinem Account an
            </p>
        <p className='text-sm'>Kein Account? <Link to="/signup" className='text-blue-700'>Signup</Link></p>
        <p>&nbsp;</p>
        <div className='flex'>
        <form onSubmit={onFormSubmit} onReset={onFormReset}>
          E-Mail:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <input type="text" name="email" required/><br/>
          <p>&nbsp;</p>
          Passwort: &nbsp;&nbsp;<input type="password" name="password" required/><br/>
          <p className='text-right text-xs text-red-500'>&nbsp; {apiError}</p>
          <div className='text-right text-lg'>
          <input className="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded" type="submit"/> <br/>
          <span className='text-sm'>
          <input className='py-2 px-4' type="reset"/>
          </span>
          </div>
        </form>
        </div>
    </div>
  )
};

export default Login