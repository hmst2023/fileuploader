import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Start from './Start'
import Upload from './Upload'
import Done from './Done'
import File from './File'
import Login from './Login'
import Layout from './Layout'
import CookieTest from './CookieTest'
import RequiredAuthentication from './RequireAuthentication'
import TermsOfUse from './TermsOfUse'
import Datenschutz from './Datenschutz'
import Impressum from './Impressum'
import Signup from './Signup'
import Propose from './Propose'

const App = () => {
  return (
    <Routes>
      <Route element={<Layout/>}>
        <Route path="/" element={<Start/>}/>
        <Route path="login" element={<Login/>}/>
        <Route element={<RequiredAuthentication />}>
          <Route path="upload/:id" element={<Upload/>}/>
          <Route path="done" element={<Done/>}/>
        </Route>
        <Route path="file/:id" element={<File/>}/>
        <Route path="cookie" element={<CookieTest/>}/>
        <Route path="termsofuse" element={<TermsOfUse/>}/>
        <Route path="datenschutz" element={<Datenschutz/>}/>
        <Route path="impressum" element={<Impressum/>}/>
        <Route path="signup" element={<Signup/>}/>
        <Route path="proposal/:link" element={<Propose/>}/>
      </Route>
    </Routes>
  )
}

export default App