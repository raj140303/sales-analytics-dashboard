from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.extensions import Base


class Product(Base):
    __tablename__ = "products"

    product_id = Column(Integer, primary_key=True)
    product_name = Column(String(100), nullable=False, unique=True)
    category = Column(String(50), nullable=False)

    sales = relationship("Sale", back_populates="product")

    def to_dict(self):
        return {
            "product_id": self.product_id,
            "product_name": self.product_name,
            "category": self.category,
        }

