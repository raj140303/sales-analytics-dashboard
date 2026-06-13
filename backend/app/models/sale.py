from decimal import Decimal

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.extensions import Base


class Sale(Base):
    __tablename__ = "sales"

    sale_id = Column(Integer, primary_key=True)
    customer_name = Column(String(100), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    total_sales = Column(Numeric(12, 2), nullable=False)
    state = Column(String(50), nullable=False)
    city = Column(String(100), nullable=False)
    sale_date = Column(Date, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())

    product = relationship("Product", back_populates="sales")

    def to_dict(self, include_product=False):
        data = {
            "sale_id": self.sale_id,
            "customer_name": self.customer_name,
            "product_id": self.product_id,
            "quantity": self.quantity,
            "unit_price": _decimal_to_float(self.unit_price),
            "total_sales": _decimal_to_float(self.total_sales),
            "state": self.state,
            "city": self.city,
            "sale_date": self.sale_date.isoformat() if self.sale_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

        if include_product and self.product:
            data["product_name"] = self.product.product_name
            data["category"] = self.product.category

        return data


def _decimal_to_float(value):
    if isinstance(value, Decimal):
        return float(value)
    return value
