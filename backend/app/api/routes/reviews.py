import uuid
from typing import Any, Literal

from fastapi import APIRouter, HTTPException

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.models.review import ReviewCreate, ReviewPublic, ReviewsPublic, ReviewUpdate

router = APIRouter(prefix="/products", tags=["reviews"])


@router.get("/{product_id}/reviews", response_model=ReviewsPublic)
def get_product_reviews(
    *,
    session: SessionDep,
    product_id: uuid.UUID,
    skip: int = 0,
    limit: int = 50,
    sort: Literal["newest", "rating_desc", "rating_asc"] = "newest",
) -> Any:
    """Get all reviews for a product with optional sorting"""
    reviews, count = crud.get_reviews_for_product(
        session=session, product_id=product_id, skip=skip, limit=limit, sort=sort
    )

    # Enrich with author names
    review_publics = []
    for review in reviews:
        review_public = ReviewPublic.model_validate(review)
        if review.author:
            review_public.author_name = review.author.full_name
        review_publics.append(review_public)

    return ReviewsPublic(data=review_publics, count=count)


@router.post("/{product_id}/reviews", response_model=ReviewPublic)
def create_product_review(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    product_id: uuid.UUID,
    review_in: ReviewCreate,
) -> Any:
    """Create a review for a product (purchasers only)"""
    # Check if user has purchased this product
    if not crud.has_purchased_product(
        session=session, user_id=current_user.id, product_id=product_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You can only review products you have purchased",
        )

    # Check if user already reviewed this product
    existing_review = crud.get_user_review_for_product(
        session=session, user_id=current_user.id, product_id=product_id
    )
    if existing_review:
        raise HTTPException(
            status_code=400, detail="You have already reviewed this product"
        )

    # Verify product exists
    product = crud.get_product_by_id(session=session, product_id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    review = crud.create_review(
        session=session,
        review_in=review_in,
        product_id=product_id,
        user_id=current_user.id,
    )

    review_public = ReviewPublic.model_validate(review)
    review_public.author_name = current_user.full_name
    return review_public


@router.patch("/reviews/{review_id}", response_model=ReviewPublic)
def update_product_review(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    review_id: uuid.UUID,
    review_in: ReviewUpdate,
) -> Any:
    """Update a review (author only)"""
    review = crud.get_review_by_id(session=session, review_id=review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    if review.author_user_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="You can only edit your own reviews"
        )

    review = crud.update_review(session=session, review=review, review_in=review_in)

    review_public = ReviewPublic.model_validate(review)
    review_public.author_name = current_user.full_name
    return review_public


@router.delete("/reviews/{review_id}")
def delete_product_review(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    review_id: uuid.UUID,
) -> Any:
    """Delete a review (author only)"""
    review = crud.get_review_by_id(session=session, review_id=review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    if review.author_user_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="You can only delete your own reviews"
        )

    crud.delete_review(session=session, review=review)
    return {"message": "Review deleted successfully"}
