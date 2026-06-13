from flask import Blueprint

from app.extensions import db_session
from app.models.product import Product
from app.utils.response import success_response


products_bp = Blueprint("products", __name__, url_prefix="/api/products")


@products_bp.get("")
def get_products():
    products = (
        db_session.query(Product)
        .order_by(Product.product_name.asc())
        .all()
    )

    return success_response(
        "Products fetched successfully.",
        [product.to_dict() for product in products],
    )

