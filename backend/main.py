from fastapi import FastAPI, status, UploadFile, Depends, Body,Request
from fastapi.responses import JSONResponse,StreamingResponse
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from secrets import token_urlsafe
from deta import Deta
from decouple import config  # deactivate for use with deta
from setup import DEVELOPER_MODE, DETA_KEY
import uvicorn
import os
import mimetypes
from authentification import Authorization
import datetime
from fastapi_utils.tasks import repeat_every

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

deta = Deta(DETA_KEY)
db = deta.Base('fileuploader_db')
db_users = deta.Base('users')
db_proposals = deta.Base('proposals')
db_backups = deta.Base('backups')

drive = deta.Drive('fileuploader_drive')


auth_handler = Authorization()

if DEVELOPER_MODE:
    MAIL_USERNAME = config('MAIL_USERNAME', cast=str)  # deactivate for use with deta
    MAIL_PASSWORD = config('MAIL_PASSWORD', cast=str)  # deactivate for use with deta
    MAIL_FROM = config('MAIL_FROM', cast=str)  # deactivate for use with deta
    MAIL_SERVER = config('MAIL_SERVER', cast=str)  # deactivate for use with deta
else:
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "test")  # add for use with deta
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "test")  # add for use with deta
    MAIL_FROM = os.getenv("MAIL_FROM", "test")  # add for use with deta
    MAIL_SERVER = os.getenv("MAIL_SERVER", "test")  # add for use with deta

conf = ConnectionConfig(
    MAIL_USERNAME=MAIL_USERNAME,
    MAIL_PASSWORD=MAIL_PASSWORD,
    MAIL_FROM=MAIL_FROM,
    MAIL_PORT=465,
    MAIL_SERVER=MAIL_SERVER,
    MAIL_STARTTLS=False,
    MAIL_SSL_TLS=True,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

html = """
<p>Thanks for registering on stucki.cc. Click on the link below to complete the registration process.</p>
<p><a href="$$replace$$">$$replace$$</a></p>
<p>If your mailaddress was not added on purpose, you can just sit back and relax. Your address will be removed in 24 hours.</p>
<p>
"""


@app.on_event("startup")
@repeat_every(seconds=60*60*24)  # 1 hour
def remove_expired_files() -> None:
    for user in db_users.fetch().items:
        list_of_backups = {i['filename'] for i in db_backups.fetch({'uid': user['key']}).items}
        list_of_all_files = {i for i in drive.list(prefix=user['key'])['names']}
        # print(f'List of all files: {list_of_all_files} List of backups{list_of_backups}')
        for expired in list_of_all_files.difference(list_of_backups):
            print(drive.delete(expired))


@app.get('/')
async def get_new_entry_id(user_id=Depends(auth_handler.auth_optional_wrapper)) -> JSONResponse:
    response = db.put({'value':None, 'user':user_id}, token_urlsafe(64), expire_in=(3600 if user_id else 360))  # 6 mins
    print(response, datetime.datetime.now())
    return JSONResponse(status_code=status.HTTP_201_CREATED, content=response['key'])


@app.get('/check/{upload_id}')
def is_uploaded(upload_id:str) -> JSONResponse:
    response = db.get(upload_id)
    if response:
        return JSONResponse(status_code=status.HTTP_200_OK, content=response['value'] is not None)
    raise HTTPException(status_code=404, detail='not found')


@app.get('/follow/{upload_id}')
async def follow_upload_id(upload_id:str, user_id=Depends(auth_handler.auth_wrapper)) -> JSONResponse:
    response = db.get(upload_id)
    if response is None:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content=None)
    if response['user'] in {None, user_id}:
        db.update({'user':user_id}, response['key'], expire_in=360)
        response = db.get(upload_id)
        return JSONResponse(status_code=status.HTTP_200_OK, content=response)
    return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content='in use by others')


@app.post('/login', response_description='login user')
def login(email: str = Body(), password: str = Body()) -> JSONResponse:
    users = db_users.fetch({"email": email})
    if (users.count != 1) or (not auth_handler.verify_password(password, users.items[0]['hash'])):
        raise HTTPException(status_code=401, detail='wrong password')
    token = auth_handler.encode_token(str(users.items[0]['key']))
    return JSONResponse(content={"token":token})


@app.post("/users/proposeuser")
async def propose_new_user(email: str = Body()) -> JSONResponse:
    entry = {'email': email.lower()}
    users = db_users.fetch({"email": entry['email']})
    proposals = db_proposals.fetch({"email": entry['email']})

    if users.count + proposals.count > 0:
        raise HTTPException(status_code=409, detail='Mail address already taken')

    entry['link'] = token_urlsafe(64)
    if not DEVELOPER_MODE:
        message = MessageSchema(
            subject="stucki.cc - Fileuploader Registrierungsprozess",
            recipients=[entry['email']],
            body=html.replace("$$replace$$", "https://stucki.cc/fileuploader/proposal/"+entry['link']),
            subtype=MessageType.html)
        fm = FastMail(conf)
        await fm.send_message(message)

    entry['createdAt'] = datetime.datetime.utcnow().strftime("%m/%d/%Y, %H:%M:%S")
    new_proposal = db_proposals.put(entry, expire_in=86400)
    return JSONResponse(status_code=status.HTTP_201_CREATED, content=str(new_proposal))


@app.get("/proposal/{link}", response_description="get proposal infos")
def show_proposal(link: str) -> JSONResponse:
    proposal = db_proposals.fetch({"link": link})
    if proposal.count == 1:
        return JSONResponse(status_code=status.HTTP_200_OK, content=proposal.items[0])
    raise HTTPException(status_code=404, detail=f"No proposal for {link} !")


@app.post('/upload/{upload_id}')
def send_file(request: Request, upload_id:str, upload: UploadFile, user_id=Depends(auth_handler.auth_wrapper)) -> JSONResponse:
    db_entry = db.get(upload_id)
    if db_entry and (db_entry['user'] == user_id):
        now = datetime.datetime.utcnow().strftime("%m%d%Y%H%M%S")
        filename, extension = os.path.splitext(upload.filename)
        filename = user_id + '_' + filename.lower().replace(" ", "_") + '_' + now
        upload_response = drive.put(filename + extension, upload.file)
        response = db.update({'value':upload_response}, upload_id, expire_in=3600)
        db_backups.put({'filename': upload_response, "uid": user_id, 'time':now, "ip":request.client.host}, expire_in=60*60*24*30)
        return JSONResponse(status_code=status.HTTP_200_OK, content=response)
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content=None)


@app.get('/file/{upload_id}')
async def get_file(upload_id) -> StreamingResponse:
    try:
        if entry := db.get(upload_id):
            if 'value' not in entry:
                raise FileNotFoundError
            else:
                file = drive.get(entry['value'])
                if file:
                    return StreamingResponse(file.iter_chunks(1024), media_type=mimetypes.guess_type(entry['value'])[0])
                else:
                    raise FileNotFoundError
        else:
            raise FileNotFoundError
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='File not found')


@app.post('/register', response_description='Register user')
def register(link: str = Body(), accepted_terms: bool = Body(), password:str = Body()) -> JSONResponse:
    proposal = db_proposals.fetch({"link": link})
    if proposal.count != 1:
        raise HTTPException(status_code=404, detail=f"No proposal for {link} !")

    proposal_items = proposal.items[0]
    users = db_users.fetch({'email': proposal_items['email']})

    if not accepted_terms:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="User terms must be accepted")

    if users.count != 0:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="User already exists")

    new_user = {'email': proposal_items['email'], 'acceptedTerms': datetime.datetime.utcnow().strftime("%m/%d/%Y, %H:%M:%S"),
                'hash': auth_handler.get_password_hash(password)}

    user = db_users.put(new_user)
    db_proposals.delete(proposal.items[0]['key'])
    token = auth_handler.encode_token(str(user['key']))
    return JSONResponse(content={"token": token})


@app.get('/refreshToken')
async def refresh_token(user_id=Depends(auth_handler.auth_wrapper)) -> JSONResponse:
    user = db_users.get(user_id)
    token = auth_handler.encode_token(str(user['key']))
    return JSONResponse(content={"token": token})


if DEVELOPER_MODE:
    if __name__ == "__main__":
        uvicorn.run(
            "main:app",
            host="0.0.0.0", port=8000,
            reload=True)
