import React from 'react'
import {ReactComponent as Logo} from './logo.svg'
import { Link } from 'react-router-dom'

const Header = () => {
  return (
    <div className='App-header'>
        <Link to="/"><Logo className="App-logo"/></Link>
    </div>
  )
}

export default Header