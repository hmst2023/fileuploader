import React from 'react'

import useAuth from '../hooks/useAuth'
import { Link, useNavigate } from 'react-router-dom'
import {ReactComponent as Logout} from './logout.svg'
import {ReactComponent as Login} from './login.svg'

const Footer = () => {
  let navigate = useNavigate();
  const {auth, setAuth} = useAuth();
  const Mailto = ({ email, children }) => {
    return <a href={`mailto:${email}`}>{children}</a>;
  };
  
  const logout = function(){
    setAuth('');
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC;"+ ";path=/";
    window.location.assign(process.env.REACT_APP_LOCATION) 
  }
  
  const login = function(){
    navigate('/login', {replace:true});
  }


  const LogButton = ({auth})=> {
    return auth ? <Logout width="100%" height="100%" onClick={logout}/> : <Login width="100%" height="100%" onClick={login}/>
  }  

  return (
    <div className='Footer'>
      <div className='Logbutton'><LogButton auth={auth}/></div>
      <div><Link to="/impressum">Impressum</Link> | <Link to="/datenschutz">Datenschutz</Link> | <Link to="/termsofuse">Nutzungsbedingungen</Link> | <Mailto email="mailer@stucki.cc">Kontakt</Mailto></div>
    </div>
  )
}

export default Footer