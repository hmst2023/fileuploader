import './App.css';
import {QRCodeSVG} from 'qrcode.react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const link = process.env.REACT_APP_LOCATION



function Start() {

  let navigate = useNavigate()
  
  setTimeout(function() { didInit=false; navigate(0)}, 360000);

  const [error, setError] = useState({})
  const [uploadId, setUploadId] = useState('')
  let didInit = false;


  const getUploadId = async() => {
    const timeout = 12000;
    const controller = new AbortController();
    const id2 = setTimeout(() => controller.abort(), timeout);
    
    try {
      const res = await fetch(process.env.REACT_APP_BACKEND_LOCATION, {
        signal: controller.signal,
        method:"GET",
        headers: {
            "Content-Type": "application/json",
        },

      });
      if (!res.ok){
        let errorResponse = await res.json();
        setError(errorResponse["detail"]);

      } else {
        setUploadId(await res.json())
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

  useEffect(()=>{
    if (!didInit) {
      getUploadId();
      didInit = true;
    }
    },[])
  return (
    <div className="App">
      <header className="App-header">
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <QRCodeSVG value={link+'upload/'+uploadId} size="512"/>
        <a
          className="App-link"
          href={link+'file/'+uploadId}
          target="_blank"
          rel="noopener noreferrer"
        >
          {link+'file/'+ uploadId}
        </a>
      </header>
    </div>
  );
}

export default Start;
