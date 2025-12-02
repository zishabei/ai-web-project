from passlib.hash import pbkdf2_sha256
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import User


def hash_password(password: str) -> str:
    return pbkdf2_sha256.hash(password)


def verify_user(password: str, password_hash: str) -> bool:
    return pbkdf2_sha256.verify(password, password_hash)


def create_user_if_not_exists(db: Session, username: str, password: str) -> User:
    user = db.query(User).filter(User.username == username).first()
    if user:
        return user
    new_user = User(username=username, password_hash=hash_password(password))
    db.add(new_user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return db.query(User).filter(User.username == username).first()
    db.refresh(new_user)
    return new_user
