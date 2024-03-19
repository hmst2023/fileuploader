import React from 'react'
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from './hooks/useAuth';


const Propose = () => {
    const {link} = useParams();
    const [error, setError] = useState();
    const { setAuth } = useAuth();
    const [proposal, setProposal] = useState({email:''});

    let navigate = useNavigate();

    const getProposal = async()=>{
        const timeout = 12000;
        const controller = new AbortController();
        const id2 = setTimeout(() => controller.abort(), timeout);
        try {
            const res = await fetch(process.env.REACT_APP_BACKEND_LOCATION + "proposal/"+link, {
              signal: controller.signal,
              method:"GET",
              headers: {
                  "Content-Type": "application/json",
              }
            })
            const data = await res.json()
            if (!res.ok){
              navigate('/', {replace:true});
            } else {
              setError([])
              setProposal(data)
            }
          } catch (error) {
            if (error.name==='AbortError'){
              setError(['Possible Timeout'])
          } else {
              setError([error.message])
          }
        };
        clearTimeout(id2);
      }
      const submitHandler = async(e)=>{
        var dict = {...proposal}
        e.preventDefault()
        dict['link'] = link
        dict['password'] = e.target.password.value
        dict['accepted_terms']=e.target.acceptedTerms.checked
        const timeout = 8000;
        const controller = new AbortController();
        const id2 = setTimeout(() => controller.abort(), timeout);
        try {
          if (e.target.password.value!=e.target.verifyPassword.value){
            throw new Error("Verify Password does not match") 
          }
        const res = await fetch(process.env.REACT_APP_BACKEND_LOCATION + "register", {
        method:"POST",
        signal:controller.signal,
        headers: {
            "Content-Type": "application/json",
            },
        body: JSON.stringify(dict)
        })
        if (res.ok){
          const token = await res.json();
          setAuth(token['token']);
          const d = new Date();
          d.setTime(d.getTime() + (31*24*60*60*1000));
          document.cookie = "token="+token["token"]+"; expires="+d+ ";path=/;samesite=strict";
          navigate('/', {replace:true});

        } else {
          let errorResponse = await res.json();
          setError(errorResponse["detail"])
        }
        } catch (error) {
        if (error.name==='AbortError'){
            setError(['Possible Timeout'])
        } else {
            setError([error.message])
        }
        }
        } 
      useEffect(()=>{
        getProposal()
      },[])
  return (
    <div className='bg-aubergine p-8'>
        <h1 className='font-bold text-lg leading-loose py-2'>Register User:</h1>
        <div className='flex'>
        <form onSubmit={submitHandler}>
            <p className='py-1'>Email:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {proposal.email}</p>
            <p className='py-1'>Password: &nbsp;&nbsp;<input name='password' type='password'  minLength="4" required/></p>
            <p className='py-1'>Verify Password: <input name='verifyPassword' type='password' required/></p>
            <p><input name="acceptedTerms" type='checkbox' required/> Ich habe die <Link to='/termsofuse' className='text-blue-700'>Nutzungsbedingungen</Link> und die <Link to="/datenschutz" className='text-blue-700'>Datenschutzverordnung</Link> gelesen und stimme ihnen zu.</p>
            <p className='text-right text-xs text-red-500'>&nbsp; {error}</p>
            <div className='text-right text-lg'>
            <input type='submit' className="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"/><br/>
            <span className='text-sm'>
          <input className='py-2 px-4' type="reset"/>
          </span>
            </div>
        </form>
        </div>
       
    </div>
  )
}

export default Propose