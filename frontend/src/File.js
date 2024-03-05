import React from 'react'
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

const File = () => {
    const {id} = useParams()

    function getFile(){
        fetch(process.env.REACT_APP_BACKEND_LOCATION+"file/"+id)
        .then((response) => response.blob())
        .then((blob)=>window.location.assign(URL.createObjectURL(blob)))
    }
    getFile()
  return (
    <div>File</div>
  )
}

export default File