from fastapi import FastAPI, status, UploadFile, Depends
from fastapi.responses import JSONResponse,StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from deta import Deta
from setup import DEVELOPER_MODE, DETA_KEY
import uvicorn
import mimetypes

app = FastAPI()
deta = Deta(DETA_KEY)

db = deta.Base('fileuploader_db')
drive = deta.Drive('fileuploader_drive')
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.get('/')
async def get_new_entry_id() -> JSONResponse:
    response = db.put(None, None, expire_in=360)  # 6 mins
    return JSONResponse(status_code=status.HTTP_201_CREATED, content=response['key'])


@app.get('/{upload_id}')
async def follow_upload_id(upload_id:str) -> JSONResponse:
    response = db.get(upload_id)
    if not response:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content=None)
    return JSONResponse(status_code=status.HTTP_200_OK, content=response)


@app.post('/{upload_id}')
async def send_file(upload_id:str, upload: UploadFile) -> JSONResponse:
    if db.get(upload_id):
        upload_response = drive.put(upload.filename, upload.file)
        response = db.put(upload_response, upload_id, expire_in=360)
        return JSONResponse(status_code=status.HTTP_200_OK, content=response)
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content=None)


@app.get('/file/{upload_id}')
def get_file(upload_id) -> StreamingResponse:
    if entry := db.get(upload_id):
        if not entry['value']:
            raise ValueError
        else:
            file = drive.get(entry['value'])
            return StreamingResponse(file.iter_chunks(1024), media_type=mimetypes.guess_type(entry['value'])[0])
    raise ValueError


if DEVELOPER_MODE:
    if __name__ == "__main__":
        uvicorn.run(
            "main:app",
            host="0.0.0.0", port=8000,
            reload=True)
