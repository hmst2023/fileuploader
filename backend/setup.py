from decouple import config

DEVELOPER_MODE = False

if DEVELOPER_MODE:
    DETA_KEY = config('DETA_KEY', cast=str)
else:
    DETA_KEY = None

