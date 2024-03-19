import React from 'react'

import useAuth from '../hooks/useAuth'
import { Link } from 'react-router-dom'
import {ReactComponent as Logout} from './logout.svg'

const Mailto = ({ email, children }) => {
  return <a href={`mailto:${email}`}>{children}</a>;
};

const Footer = () => {
  const {auth, setAuth} = useAuth()
  const logout = function(){
    setAuth('');
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC;"+ ";path=/";
    window.location.assign(process.env.REACT_APP_LOCATION) 
  }
  return (
    <div className='Footer'>
      <div>{auth && <Logout height="25px" onClick={logout}/>}</div>
      <div className='test'><Link to="/impressum">Impressum</Link> | <Link to="/datenschutz">Datenschutz</Link> | <Link to="/termsofuse">Nutzungsbedingungen</Link> | <Mailto email="mailer@stucki.cc">Kontakt</Mailto></div>
    </div>
  )
}

export default Footer