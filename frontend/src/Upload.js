import React from 'react'
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuth from './hooks/useAuth';


const Upload = () => {
    const {id} = useParams();
    const {auth, setAuth } = useAuth();
    const [error, setError] = useState();
    const [data, setData] = useState({});
    const [upload, setUpload] = useState({});

    let navigate = useNavigate();
  
    const followUploadId = async() => {
      const timeout = 12000;
      const controller = new AbortController();
      const id2 = setTimeout(() => controller.abort(), timeout);
      
      try {
        const res = await fetch(process.env.REACT_APP_BACKEND_LOCATION+'follow/'+id, {
          signal: controller.signal,
          method:"GET",
          headers: {
            Authorization : `Bearer ${auth}`
          }, 
        });
        
        if (!res.ok){
          navigate("/", {replace:true});
        } else {
          setData(await res.json())
          setError([])
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

    const handleSubmit = async (e) => {
      const timeout = 12000;
      const controller = new AbortController();
      const id2 = setTimeout(() => controller.abort(), timeout);
      e.preventDefault();
      const formData = new FormData();
      formData.append("upload", upload);
      try {
          const response = await fetch(process.env.REACT_APP_BACKEND_LOCATION+'upload/'+id,{
            signal: controller.signal,
            method:'POST',
            headers: {
              Authorization : `Bearer ${auth}`
            }, 
            body: formData
          })
          const data = await response.json()
          if (response.ok){
            setError('File in place')
          } else {
            setError(data['detail'])
          }
        }
      catch (error) {
        if (error.name==='AbortError'){
          setError('Possible Timeout')
        } else {
          setError(`Error Message: ${error.message}`)
        }
    };
    clearTimeout(id2);
    }
  
    useEffect(()=>{
      followUploadId()
    },[])
    
  return (
    <div className='App'>
      <form>
      <input type="file" name="upload" onChange={e=>setUpload(e.target.files[0])}/><br/>
      <button type='submit' onClick={handleSubmit}>Submit</button>
      <p>{error}</p>
    </form>
    </div>
  )
}

export default Upload