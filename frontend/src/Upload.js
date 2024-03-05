import React from 'react'
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';


const Upload = () => {
    const {id} = useParams();
    const [error, setError] = useState([])
    const [data, setData] = useState({})
    const [upload, setUpload] = useState({})

    let navigate = useNavigate();
  
    const followUploadId = async() => {
      const timeout = 12000;
      const controller = new AbortController();
      const id2 = setTimeout(() => controller.abort(), timeout);
      
      try {
        const res = await fetch(process.env.REACT_APP_BACKEND_LOCATION+id, {
          signal: controller.signal,
          method:"GET",
          headers: {
              "Content-Type": "application/json",
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
      e.preventDefault();
      const formData = new FormData();
      formData.append("upload", upload);

      const response = await fetch(process.env.REACT_APP_BACKEND_LOCATION+id,{
        method:'POST',
        body: formData
      })
      const data = await response.json()
      navigate('/done', {replace:true});
      console.log(data['detail'])
    }
  
    useEffect(()=>{
      followUploadId()
    },[])
    
  return (
    <div>ID: {id}
      <form>
      <input type="file" name="upload" onChange={e=>setUpload(e.target.files[0])}/><br/>
      <button type='submit' onClick={handleSubmit}>Submit</button>
    </form>
    </div>
  )
}

export default Upload