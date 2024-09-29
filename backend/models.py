from pydantic import BaseModel, BeforeValidator, Field
from typing import Annotated, Optional


PyObjectId = Annotated[str, BeforeValidator(str)]


class MongoBaseModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)


class FetchProposal(BaseModel):
    email: str
    link: str


class FetchResponse(BaseModel):
    items: list
    count: int


class PostRegister(BaseModel):
    link: str
    accepted_terms: bool
    password: str


class FollowLink(BaseModel):
    link: str
    value: str | None
    user: str


