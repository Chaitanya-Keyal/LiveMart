import uuid
from typing import Literal

from sqlalchemy import func
from sqlmodel import Session, select

from app.models.order import Order, OrderItem
from app.models.review import ProductReview, ReviewCreate, ReviewUpdate
from app.models.user import User


def has_purchased_product(
    *, session: Session, user_id: uuid.UUID, product_id: uuid.UUID
) -> bool:
    """Check if user has purchased the product in any order"""
    stmt = (
        select(OrderItem)
        .join(Order, OrderItem.order_id == Order.id)
        .where(Order.buyer_id == user_id)
        .where(OrderItem.product_id == product_id)
        .where(Order.deleted_at.is_(None))
        .limit(1)
    )
    result = session.exec(stmt).first()
    return result is not None


def get_user_review_for_product(
    *, session: Session, user_id: uuid.UUID, product_id: uuid.UUID
) -> ProductReview | None:
    """Get existing review by user for a product"""
    stmt = (
        select(ProductReview)
        .where(ProductReview.author_user_id == user_id)
        .where(ProductReview.product_id == product_id)
        .where(ProductReview.deleted_at.is_(None))
    )
    return session.exec(stmt).first()


def create_review(
    *,
    session: Session,
    review_in: ReviewCreate,
    product_id: uuid.UUID,
    user_id: uuid.UUID,
) -> ProductReview:
    """Create a new product review"""
    review = ProductReview(
        product_id=product_id,
        author_user_id=user_id,
        rating=review_in.rating,
        title=review_in.title,
        content=review_in.content,
    )
    session.add(review)
    session.commit()
    session.refresh(review)
    return review


def update_review(
    *, session: Session, review: ProductReview, review_in: ReviewUpdate
) -> ProductReview:
    """Update an existing review"""
    update_data = review_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(review, key, value)
    session.add(review)
    session.commit()
    session.refresh(review)
    return review


def delete_review(*, session: Session, review: ProductReview) -> None:
    """Soft delete a review"""
    review.soft_delete()
    session.add(review)
    session.commit()


def get_reviews_for_product(
    *,
    session: Session,
    product_id: uuid.UUID,
    skip: int = 0,
    limit: int = 50,
    sort: Literal["newest", "rating_desc", "rating_asc"] = "newest",
) -> tuple[list[ProductReview], int]:
    """Get reviews for a product with sorting options"""
    stmt = (
        select(ProductReview)
        .join(User, ProductReview.author_user_id == User.id)
        .where(ProductReview.product_id == product_id)
        .where(ProductReview.deleted_at.is_(None))
    )

    # Apply sorting
    if sort == "rating_desc":
        stmt = stmt.order_by(
            ProductReview.rating.desc(), ProductReview.created_at.desc()
        )
    elif sort == "rating_asc":
        stmt = stmt.order_by(
            ProductReview.rating.asc(), ProductReview.created_at.desc()
        )
    else:  # newest
        stmt = stmt.order_by(ProductReview.created_at.desc())

    stmt = stmt.offset(skip).limit(limit)
    reviews = session.exec(stmt).all()

    # Get count
    count_stmt = (
        select(func.count())
        .select_from(ProductReview)
        .where(ProductReview.product_id == product_id)
        .where(ProductReview.deleted_at.is_(None))
    )
    count = session.exec(count_stmt).one()

    return list(reviews), count


def get_review_by_id(*, session: Session, review_id: uuid.UUID) -> ProductReview | None:
    """Get a review by its ID"""
    stmt = (
        select(ProductReview)
        .where(ProductReview.id == review_id)
        .where(ProductReview.deleted_at.is_(None))
    )
    return session.exec(stmt).first()


def get_product_rating_stats(
    *, session: Session, product_id: uuid.UUID
) -> tuple[float | None, int]:
    """Get average rating and count for a product"""
    stmt = (
        select(
            func.avg(ProductReview.rating).label("avg_rating"),
            func.count(ProductReview.id).label("review_count"),
        )
        .where(ProductReview.product_id == product_id)
        .where(ProductReview.deleted_at.is_(None))
    )
    result = session.exec(stmt).first()
    if result and result[1] > 0:
        return (float(result[0]), int(result[1]))
    return (None, 0)
