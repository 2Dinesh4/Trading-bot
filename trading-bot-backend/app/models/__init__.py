# Import all models from their specific files
from app.models.user import User
from app.models.kyc import KYCDocument
from app.models.api_keys import UserAPIKey
from app.models.trade import Trade
from app.models.wallet import WalletTransaction
from app.models.strategy import Strategy
from app.models.order import Order

# Export them so SQLAlchemy can find them all
__all__ = [
    "User",
    "KYCDocument",
    "UserAPIKey",
    "Trade",
    "WalletTransaction",
    "Strategy",
    "Order"
]