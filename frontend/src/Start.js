import './App.css';
import {QRCodeSVG} from 'qrcode.react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from './hooks/useAuth';

const link = process.env.REACT_APP_LOCATION

function Start() {

  let navigate = useNavigate()
  
  const {auth, setAuth} = useAuth();
  const [error, setError] = useState('');
  const [uploadId, setUploadId] = useState('');
  const [uploaded, setUploaded] = useState(false);
  const [timer, setTimer] = useState(true);
  let didInit = useRef(false);
  let positivCheck = useRef(false);

  const headerNotAuthenticated = {"Content-Type": "application/json"}
  const headerAuthenticated = {
    Authorization : `Bearer ${auth}`
  }

  const getUploadId = async() => {
    const timeout = 12000;
    const controller = new AbortController();
    const id2 = setTimeout(() => controller.abort(), timeout);
    
    try {
      const res = await fetch(process.env.REACT_APP_BACKEND_LOCATION, {
        signal: controller.signal,
        method:"GET",
        headers: auth ? headerAuthenticated : headerNotAuthenticated,

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
  const checkUploadId = async() => {
    const timeout = 12000;
    const controller = new AbortController();
    const id2 = setTimeout(() => controller.abort(), timeout);
    
    try {
      const res = await fetch(process.env.REACT_APP_BACKEND_LOCATION+'check/'+uploadId, {
        signal: controller.signal,
        method:"GET",
        headers: headerNotAuthenticated,

      });
      if (!res.ok){
        let errorResponse = await res.json();
        setError(errorResponse["detail"]);

      } else {
        let isUploaded = await res.json()
        if (isUploaded && auth !== '' ){
          navigate('/file/'+ uploadId, {replace:true})
        }
        if (isUploaded) {
          setUploaded(isUploaded);
          positivCheck.current = true;
          setTimer(false)
        } 
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

  useEffect(() => {
    if (timer){
      if (!auth){
        var intervalID = setTimeout(function() { didInit.current=false; navigate(0)}, 360000);
      } else {
        var intervalID = setTimeout(function() { didInit.current=false; navigate(0)}, 3600000);
      }
    }
    return () => clearInterval(intervalID);
  }, [timer]);


  useEffect(()=>{
    if (!didInit.current) {
      getUploadId();
      didInit.current = true;
    }
    },[])

  useEffect(() => {
    const intervalCall = window.setInterval(() => {
        if (uploadId !== '' && !positivCheck.current){
          checkUploadId();
        }       
      }, 10000);
    }, [uploadId]);
  return (
    <div className="App">
        <QRCodeSVG className="QrCode" value={link+'upload/'+uploadId}/>
        {uploaded ? <p><Link to={"file/"+uploadId}>get file</Link></p> : <p>Scan to continue</p>}
        <p>{error} </p>
    </div>
  );
}

export default Start;
