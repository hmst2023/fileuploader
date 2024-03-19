import React from 'react'
import { useState } from 'react';
import { useNavigate } from "react-router-dom";

const Signup = () => {
  let navigate = useNavigate();
  const [apiError,setApiError] = useState();
  const [apiMessage,setApiMessage] = useState();
  
  const onFormReset = ()=> {
    navigate("/", {replace:true});
  }
  const onFormSubmit = async (e)=>{
    e.preventDefault();
    const timeout = 8000;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    let emailAdress = e.target.signupMail.value
    try {
      const response = await fetch(process.env.REACT_APP_BACKEND_LOCATION + "users/proposeuser", {
        signal:controller.signal,
        method:"POST",
        headers:{
            "Content-Type":"application/json",
        },
        body:JSON.stringify(emailAdress)});
        if (response.ok){
          setApiMessage('Check your email account and follow the instructions')

        } else{
          let errorResponse = await response.json();
          setApiError(errorResponse["detail"]);
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
      <div>
        <h1>Signup</h1>
        Enter your emailadress: 
        <div>
      <form onSubmit={onFormSubmit}> 
        <input name='signupMail' type='email' required/><br/>
        <div>
        <p>&nbsp;<span>{apiMessage} {apiError}</span></p>
        
        <input type='submit'/><br/>
        <span>
          <input type="reset" onClick={onFormReset}/>
        </span>
        </div>

      </form>
      
    </div>
        </div>

  )
}

export default Signup