import os  # add for use with deta
import jwt
from fastapi import HTTPException, Security, Request, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from datetime import datetime, timedelta
from decouple import config  # deactivate for use with deta
from setup import DEVELOPER_MODE
from typing import Annotated, Optional

if DEVELOPER_MODE:
    SECRET_STRING = config('SECRET_STRING', cast=str)  # deactivate for use with deta
else:
    SECRET_STRING = os.getenv("SECRET_STRING", "test")


class Authorization:
    security = HTTPBearer()
    optional_security = HTTPBearer(auto_error=False)
    pwd_context = CryptContext(schemes=['bcrypt'], deprecated="auto")
    secret = SECRET_STRING

    def get_password_hash(self, password):
        return self.pwd_context.hash(password)

    def verify_password(self, plain_password, hashed_password):
        return self.pwd_context.verify(plain_password, hashed_password)

    def encode_token(self, user_id):
        payload = {
            'exp': datetime.utcnow() + timedelta(days=31),
            'iat': datetime.utcnow(),
            'sub': user_id
        }
        return jwt.encode(
            payload,
            self.secret,
            algorithm='HS256'
        )

    def decode_token(self, token):
        try:
            payload = jwt.decode(token, self.secret, algorithms=['HS256'])
            return payload['sub']
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail='expired')
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail='invalid')

    def auth_wrapper(self, auth: HTTPAuthorizationCredentials = Security(security)):
        return self.decode_token(auth.credentials)

    def auth_optional_wrapper(self, auth: HTTPAuthorizationCredentials | None = Security(optional_security)):
        if not auth:
            return None
        return self.decode_token(auth.credentials)
