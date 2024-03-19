import React from 'react'
import { useState, useEffect, useRef } from 'react'
const CookieTest = () => {
  const [timer, setTimer] = useState(true);
  function switchtimer(){
    setTimer(!timer)
  }
  useEffect(() => {
    if (timer){
      var intervalID = setInterval(() => {console.log('hello')}, 1000);
    }
    return () => clearInterval(intervalID);
  }, [timer]);

  return <button onClick={switchtimer}>Button</button>;
}


export default CookieTest