from datetime import datetime
from decimal import Decimal, InvalidOperation

from flask import Blueprint, request
from sqlalchemy import or_
from sqlalchemy.orm import joinedload

from app.extensions import db_session
from app.models.product import Product
from app.models.sale import Sale
from app.utils.response import error_response, success_response


sales_bp = Blueprint("sales", __name__, url_prefix="/api/sales")


@sales_bp.get("")
def get_sales():
    page = _parse_positive_int(request.args.get("page"), default=1)
    limit = _parse_positive_int(request.args.get("limit"), default=25, maximum=100)

    query = db_session.query(Sale).join(Product).options(joinedload(Sale.product))
    query = _apply_sales_filters(query)

    total = query.count()
    sales = (
        query
        .order_by(Sale.sale_date.desc(), Sale.sale_id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return success_response(
        "Sales fetched successfully.",
        {
            "items": [sale.to_dict(include_product=True) for sale in sales],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit,
            },
        },
    )


@sales_bp.get("/<int:sale_id>")
def get_sale(sale_id):
    sale = (
        db_session.query(Sale)
        .join(Product)
        .options(joinedload(Sale.product))
        .filter(Sale.sale_id == sale_id)
        .first()
    )

    if not sale:
        return error_response("Sale not found.", "No sale exists with this id.", 404)

    return success_response("Sale fetched successfully.", sale.to_dict(include_product=True))


@sales_bp.post("")
def create_sale():
    data = request.get_json(silent=True) or {}
    cleaned_data, validation_error = _validate_sale_payload(data)

    if validation_error:
        return validation_error

    sale = Sale(**cleaned_data)
    db_session.add(sale)
    db_session.commit()

    saved_sale = (
        db_session.query(Sale)
        .join(Product)
        .options(joinedload(Sale.product))
        .filter(Sale.sale_id == sale.sale_id)
        .first()
    )

    return success_response(
        "Sale created successfully.",
        saved_sale.to_dict(include_product=True),
        201,
    )


@sales_bp.put("/<int:sale_id>")
def update_sale(sale_id):
    sale = db_session.query(Sale).filter(Sale.sale_id == sale_id).first()

    if not sale:
        return error_response("Sale not found.", "No sale exists with this id.", 404)

    data = request.get_json(silent=True) or {}
    cleaned_data, validation_error = _validate_sale_payload(data)

    if validation_error:
        return validation_error

    for key, value in cleaned_data.items():
        setattr(sale, key, value)

    db_session.commit()

    updated_sale = (
        db_session.query(Sale)
        .join(Product)
        .options(joinedload(Sale.product))
        .filter(Sale.sale_id == sale_id)
        .first()
    )

    return success_response(
        "Sale updated successfully.",
        updated_sale.to_dict(include_product=True),
    )


@sales_bp.delete("/<int:sale_id>")
def delete_sale(sale_id):
    sale = db_session.query(Sale).filter(Sale.sale_id == sale_id).first()

    if not sale:
        return error_response("Sale not found.", "No sale exists with this id.", 404)

    db_session.delete(sale)
    db_session.commit()

    return success_response("Sale deleted successfully.", {"sale_id": sale_id})


def _apply_sales_filters(query):
    search = _clean_string(request.args.get("search"))
    state = _clean_string(request.args.get("state"))
    city = _clean_string(request.args.get("city"))
    category = _clean_string(request.args.get("category"))
    product_id = request.args.get("product_id")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    if search:
        search_text = f"%{search}%"
        query = query.filter(or_(
            Sale.customer_name.ilike(search_text),
            Product.product_name.ilike(search_text),
            Product.category.ilike(search_text),
            Sale.state.ilike(search_text),
            Sale.city.ilike(search_text),
        ))

    if state:
        query = query.filter(Sale.state == state)

    if city:
        query = query.filter(Sale.city == city)

    if category:
        query = query.filter(Product.category == category)

    if product_id:
        parsed_product_id = _parse_positive_int(product_id)
        if parsed_product_id:
            query = query.filter(Sale.product_id == parsed_product_id)

    parsed_start_date = _parse_date(start_date)
    parsed_end_date = _parse_date(end_date)

    if parsed_start_date:
        query = query.filter(Sale.sale_date >= parsed_start_date)

    if parsed_end_date:
        query = query.filter(Sale.sale_date <= parsed_end_date)

    return query


def _validate_sale_payload(data):
    customer_name = _clean_string(data.get("customer_name"))
    product_id = _parse_positive_int(data.get("product_id"))
    quantity = _parse_positive_int(data.get("quantity"))
    unit_price = _parse_decimal(data.get("unit_price"))
    state = _clean_string(data.get("state"))
    city = _clean_string(data.get("city"))
    sale_date = _parse_date(data.get("sale_date"))

    if not customer_name:
        return None, error_response("Validation failed.", "customer_name is required.", 400)

    if not product_id:
        return None, error_response("Validation failed.", "product_id is required.", 400)

    product = db_session.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        return None, error_response("Validation failed.", "product_id does not exist.", 400)

    if not quantity:
        return None, error_response("Validation failed.", "quantity must be greater than 0.", 400)

    if unit_price is None:
        return None, error_response("Validation failed.", "unit_price is required.", 400)

    if unit_price < 0:
        return None, error_response("Validation failed.", "unit_price must be 0 or greater.", 400)

    if not state:
        return None, error_response("Validation failed.", "state is required.", 400)

    if not city:
        return None, error_response("Validation failed.", "city is required.", 400)

    if not sale_date:
        return None, error_response("Validation failed.", "sale_date is required in YYYY-MM-DD format.", 400)

    return {
        "customer_name": customer_name,
        "product_id": product_id,
        "quantity": quantity,
        "unit_price": unit_price,
        "total_sales": quantity * unit_price,
        "state": state,
        "city": city,
        "sale_date": sale_date,
    }, None


def _parse_positive_int(value, default=None, maximum=None):
    if value in (None, ""):
        return default

    try:
        number = int(value)
    except (TypeError, ValueError):
        return default

    if number <= 0:
        return default

    if maximum:
        return min(number, maximum)

    return number


def _parse_decimal(value):
    if value in (None, ""):
        return None

    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


def _parse_date(value):
    if not value:
        return None

    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None


def _clean_string(value):
    if value is None:
        return None
    return str(value).strip()
