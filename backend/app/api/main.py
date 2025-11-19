from fastapi import APIRouter

from app.api.routes import addresses, login, products, signup, users, utils

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(signup.router)
api_router.include_router(utils.router)
api_router.include_router(products.router)
api_router.include_router(addresses.router)
