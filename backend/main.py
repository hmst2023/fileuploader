import os
from sys import prefix

from fastapi import FastAPI, status, UploadFile, Depends, Body,Request
from fastapi.responses import JSONResponse, Response
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from secrets import token_urlsafe
from decouple import config
import mimetypes
import datetime

from fastapi_utils.tasks import repeat_every
from authentification import Authorization
from models import FetchProposal, PostRegister, FollowLink
from data import DB, Drive


app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

db = DB('fileuploader_db')
db_users = DB('users')
db_proposals = DB('proposals')
db_backups = DB('backups')

drive = Drive()


auth_handler = Authorization()

MAIL_USERNAME = config('MAIL_USERNAME', cast=str)
MAIL_PASSWORD = config('MAIL_PASSWORD', cast=str)
MAIL_FROM = config('MAIL_FROM', cast=str)
MAIL_SERVER = config('MAIL_SERVER', cast=str)

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
        list_of_backups = {i['filename'] for i in db_backups.fetch({'uid': str(user['_id'])}).items}
        list_of_all_files = {i['url'] for i in drive.list(options={'prefix': str(user['_id'])})['blobs']}
        for expired in list_of_all_files.difference(list_of_backups):
            drive.delete(expired)


@app.get('/')
async def get_new_entry_id(user_id=Depends(auth_handler.auth_optional_wrapper)) -> JSONResponse:
    link = token_urlsafe(64)
    db.put({'value':None, 'user':user_id, 'link': link}, expire_in=3600 if user_id else 360)
    return JSONResponse(status_code=status.HTTP_201_CREATED, content=link)


@app.get('/check/{upload_id}')
def is_uploaded(upload_id:str) -> JSONResponse:
    response = db.get({'link': upload_id})
    if response:
        return JSONResponse(status_code=status.HTTP_200_OK, content=response['value'] is not None)
    raise HTTPException(status_code=404, detail='not found')


@app.get('/follow/{upload_id}')
async def follow_upload_id(upload_id:str, user_id=Depends(auth_handler.auth_wrapper)) -> JSONResponse:
    response = db.get({'link': upload_id})
    if response is None:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content=None)
    if response['user'] in {None, user_id}:
        tempvar = db.update({'link': upload_id},{'user':user_id}, expire_in=3600)
        print(tempvar)
        response = db.get({'link': upload_id})
        print(response)
        return JSONResponse(status_code=status.HTTP_200_OK, content=FollowLink(**response).model_dump())
    return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content='in use by others')


@app.post('/login', response_description='login user')
def login(email: str = Body(), password: str = Body()) -> JSONResponse:
    users = db_users.fetch({"email": email})
    if (users.count != 1) or (not auth_handler.verify_password(password, users.items[0]['hash'])):
        raise HTTPException(status_code=401, detail='wrong password')
    token = auth_handler.encode_token(str(users.items[0]['_id']))
    return JSONResponse(content={"token":token})


@app.post("/users/proposeuser")
async def propose_new_user(email: str = Body()) -> JSONResponse:
    entry = {'email': email.lower()}
    users = db_users.fetch({"email": entry['email']})
    proposals = db_proposals.fetch({"email": entry['email']})

    if users.count + proposals.count > 0:
        raise HTTPException(status_code=409, detail='Mail address already taken')

    entry['link'] = token_urlsafe(64)

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
        return JSONResponse(status_code=status.HTTP_200_OK, content=FetchProposal(**proposal.items[0]).model_dump())
    raise HTTPException(status_code=404, detail=f"No proposal for {link} !")


@app.post('/upload/{upload_id}')
def send_file(request: Request, upload_id:str, upload: UploadFile, user_id=Depends(auth_handler.auth_wrapper)) -> JSONResponse:
    db_entry = db.get({'link': upload_id})
    if db_entry and (db_entry['user'] == user_id):
        filename, extension = os.path.splitext(upload.filename)
        filename = user_id + '_' + filename.lower().replace(" ", "_")
        upload_response = drive.put(filename + extension, upload.file.read())
        db.update({'link':upload_id}, {'value':upload_response['url']}, expire_in=3600)
        db_backups.put({'filename': upload_response['url'], "uid": user_id, "ip":request.client.host}, expire_in=60*60*24*30)
        return JSONResponse(status_code=status.HTTP_200_OK, content="Done")
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content=None)


@app.get('/file/{upload_id}')
async def get_file(upload_id) -> Response:
    try:
        if entry := db.get({'link': upload_id}):
            if 'value' not in entry:
                raise FileNotFoundError
            else:
                file = drive.get(entry['value'])
                if file:
                    return Response(content=file, media_type=mimetypes.guess_type(entry['value'])[0])
                else:
                    raise FileNotFoundError
        else:
            raise FileNotFoundError
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='File not found')


@app.post('/register', response_description='Register user')
def register(userinfs: PostRegister) -> JSONResponse:
    proposal = db_proposals.fetch({"link": userinfs.link})
    if proposal.count != 1:
        raise HTTPException(status_code=404, detail=f"No proposal for {userinfs.link} !")

    proposal_items = proposal.items[0]
    users = db_users.fetch({'email': proposal_items['email']})

    if not userinfs.accepted_terms:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="User terms must be accepted")

    if users.count != 0:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="User already exists")

    new_user = {'email': proposal_items['email'], 'acceptedTerms': datetime.datetime.utcnow().strftime("%m/%d/%Y, %H:%M:%S"),
                'hash': auth_handler.get_password_hash(userinfs.password)}

    user = db_users.put(new_user)
    db_proposals.delete({'link':proposal.items[0]['link']})
    token = auth_handler.encode_token(str(user.inserted_id))
    return JSONResponse(content={"token": token})


@app.get('/refreshToken')
async def refresh_token(user_id=Depends(auth_handler.auth_wrapper)) -> JSONResponse:
    token = auth_handler.encode_token(user_id)
    return JSONResponse(content={"token": token})
