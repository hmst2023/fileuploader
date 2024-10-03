from pymongo import MongoClient
from decouple import config
import datetime
import requests

import vercel_blob
from models import FetchResponse


DB_URL = config('DB_URL', cast=str)
DB_NAME = config('DB_NAME', cast=str)


class DB:
    def __init__(self, collection: str):
        connection = MongoClient(DB_URL)
        db_fileuploader = connection[DB_NAME]
        self.collection = db_fileuploader[collection]

    def put(self, data: dict, expire_in: int | None = None):
        if expire_in:
            data['expireAt'] = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=expire_in)
        return self.collection.insert_one(data)

    def get(self, kv):
        return self.collection.find_one(kv)

    def delete(self, kv):
        return self.collection.delete_one(kv)

    def update(self, k, v,  expire_in: int | None = None):
        if expire_in:
            v['expireAt'] = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=expire_in)
        return self.collection.update_one(k, {"$set":v})

    def fetch(self, kv=None):
        if kv is None:
            kv = {}
        items = [i for i in self.collection.find(kv)]
        return FetchResponse(items=items, count=len(items))


class Drive:
    def list(self,**kwargs):
        return vercel_blob.list(kwargs)

    def put(self, filename, data, option={'addRandomSuffix':'false'}):
        return vercel_blob.put(filename, data)

    def get(self, url):
        response = requests.get(url)
        return response.content

    def delete(self, url):
        return vercel_blob.delete(url)


if __name__ == "__main__":
    drive = Drive()
    print(drive.list())
