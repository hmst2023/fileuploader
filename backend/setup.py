from decouple import config

DEVELOPER_MODE = True

if DEVELOPER_MODE:
    DETA_KEY = config('DETA_KEY', cast=str)
else:
    DETA_KEY = None

