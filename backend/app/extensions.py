from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, scoped_session, sessionmaker


Base = declarative_base()

db_session = scoped_session(
    sessionmaker(autocommit=False, autoflush=False)
)


def init_db(app):
    engine = create_engine(app.config["DATABASE_URL"], pool_pre_ping=True)
    db_session.configure(bind=engine)
    Base.query = db_session.query_property()

    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db_session.remove()

