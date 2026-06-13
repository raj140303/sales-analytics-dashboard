from flask import Flask
from flask_cors import CORS
from sqlalchemy.exc import SQLAlchemyError

from app.config import Config
from app.extensions import init_db
from app.routes.products import products_bp
from app.routes.sales import sales_bp
from app.utils.response import error_response, success_response


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)
    init_db(app)

    app.register_blueprint(products_bp)
    app.register_blueprint(sales_bp)

    @app.get("/api/health")
    def health_check():
        return success_response("Backend is running.", {"status": "healthy"})

    @app.errorhandler(404)
    def not_found(error):
        return error_response("Route not found.", "The requested API route does not exist.", 404)

    @app.errorhandler(SQLAlchemyError)
    def database_error(error):
        return error_response("Database error.", str(error), 500)

    @app.errorhandler(Exception)
    def unexpected_error(error):
        return error_response("Unexpected error.", str(error), 500)

    return app

