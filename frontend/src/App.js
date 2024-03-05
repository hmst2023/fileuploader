import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Start from './Start'
import Upload from './Upload'
import Done from './Done'
import File from './File'

const App = () => {
  return (
    <Routes>
          <Route path="/" element={<Start/>}/>
          <Route path="upload/:id" element={<Upload/>}/>
          <Route path="file/:id" element={<File/>}/>
          <Route path="done" element={<Done/>}/>
    </Routes>
  )
}

export default App