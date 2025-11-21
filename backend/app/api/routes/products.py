import uuid
from decimal import Decimal
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, UploadFile

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.models.common import Message
from app.models.product import (
    BuyerType,
    CategoryEnum,
    ImageReorderSchema,
    ProductCreate,
    ProductInventoryPublic,
    ProductInventoryUpdate,
    ProductPublic,
    ProductsPublic,
    ProductUpdate,
    SellerType,
)
from app.models.role import RoleEnum
from app.utils import images as image_utils
from app.utils.location import annotate_distances

router = APIRouter(prefix="/products", tags=["products"])

PRODUCT_NOT_FOUND = "Product not found"
NOT_ENOUGH_PERMISSIONS = "Not enough permissions"
INVALID_SELLER_ROLE = "User must have RETAILER or WHOLESALER role to create products"
CLONE_ERROR_PREFIX = "Cannot clone product:"


def get_current_seller(current_user: CurrentUser) -> CurrentUser:
    """Dependency to ensure user is a seller (retailer or wholesaler)."""
    if not current_user.active_role:
        raise HTTPException(status_code=400, detail="No active role selected")

    if current_user.active_role not in [RoleEnum.RETAILER, RoleEnum.WHOLESALER]:
        raise HTTPException(status_code=403, detail=INVALID_SELLER_ROLE)

    return current_user


CurrentSeller = Annotated[CurrentUser, Depends(get_current_seller)]


@router.get("/", response_model=ProductsPublic)
def list_products(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    skip: int = 0,
    limit: int = 100,
    seller_type: SellerType | None = None,
    category: CategoryEnum | None = None,
    seller_id: uuid.UUID | None = None,
    tags: str | None = None,  # Comma-separated tags
    is_active: bool = True,
    search: str | None = None,
    brands: str | None = None,  # comma separated
    in_stock_only: bool | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    radius_km: float | None = None,
    sort_by: Literal["newest", "price_asc", "price_desc", "distance_asc"] | None = None,
) -> Any:
    """
    List products with filters.
    """
    tag_list = [tag.strip() for tag in tags.split(",")] if tags else None

    buyer_type = (
        BuyerType.RETAILER
        if (current_user and current_user.active_role == RoleEnum.RETAILER)
        else BuyerType.CUSTOMER
    )

    products, count = crud.get_products(
        session=session,
        skip=skip,
        limit=limit,
        seller_type=seller_type,
        category=category.value if category else None,
        seller_id=seller_id,
        tags=tag_list,
        is_active=is_active,
        search=search,
        brands=[b.strip() for b in brands.split(",")] if brands else None,
        in_stock_only=in_stock_only,
        min_price=min_price,
        max_price=max_price,
        buyer_type=buyer_type,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        sort_by=sort_by,
    )

    products_public: list[ProductPublic] = []
    if latitude is not None and longitude is not None:
        addr_map: dict[uuid.UUID, tuple[float | None, float | None]] = {}
        address_ids = [p.address_id for p in products if p.address_id]
        if address_ids:
            addr_map = crud.get_address_coords(session=session, address_ids=address_ids)

        # For products without an address, fallback to seller's active address
        seller_ids_missing = [p.seller_id for p in products if not p.address_id]
        user_active_map: dict[uuid.UUID, tuple[float | None, float | None]] = {}
        if seller_ids_missing:
            user_active_map = crud.get_users_active_address_coords(
                session=session, user_ids=seller_ids_missing
            )

        items_with_coords = []
        for p in products:
            if p.address_id:
                lat, lon = addr_map.get(p.address_id, (None, None))
            else:
                lat, lon = user_active_map.get(p.seller_id, (None, None))
            items_with_coords.append((p, lat, lon))
        with_dist = annotate_distances(items_with_coords, latitude, longitude)
        if sort_by == "distance_asc":
            with_dist.sort(key=lambda t: (t[1] is None, t[1] or 0.0))

        for prod, dist in with_dist:
            products_public.append(
                ProductPublic.from_product(
                    prod,
                    buyer_type=buyer_type,
                    distance_km=(round(dist, 2) if dist is not None else None),
                )
            )
    else:
        products_public = [
            ProductPublic.from_product(p, buyer_type=buyer_type) for p in products
        ]

    return ProductsPublic(data=products_public, count=count)


@router.get("/search/autocomplete", response_model=list[str])
def autocomplete_products(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    q: str,
    limit: int = 10,
    seller_type: SellerType | None = None,
    category: CategoryEnum | None = None,
    is_active: bool = True,
) -> list[str]:
    return crud.autocomplete_products(
        session=session,
        q=q,
        limit=limit,
        seller_type=seller_type,
        category=category,
        is_active=is_active,
    )


@router.get("/{product_id}", response_model=ProductPublic)
def get_product(
    session: SessionDep,
    product_id: uuid.UUID,
    current_user: CurrentUser,  # noqa: ARG001
) -> Any:
    """
    Get product by ID.
    Returns pricing based on current user's active role (or CUSTOMER if not authenticated).
    """
    product = crud.get_product_by_id(session=session, product_id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail=PRODUCT_NOT_FOUND)

    buyer_type = (
        BuyerType.RETAILER
        if product.seller_type == SellerType.WHOLESALER
        else BuyerType.CUSTOMER
    )

    return ProductPublic.from_product(product, buyer_type=buyer_type)


@router.post("/", response_model=ProductPublic)
def create_product(
    *,
    session: SessionDep,
    current_seller: CurrentSeller,
    product_in: ProductCreate,
) -> Any:
    """
    Create new product.
    Requires RETAILER or WHOLESALER role.
    Seller type is automatically set based on active role.
    """
    seller_type = (
        SellerType.WHOLESALER
        if current_seller.active_role == RoleEnum.WHOLESALER
        else SellerType.RETAILER
    )

    if product_in.sku:
        existing = crud.get_product_by_seller_and_sku(
            session=session, seller_id=current_seller.id, sku=product_in.sku
        )
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Product with SKU '{product_in.sku}' already exists for this seller",
            )

    chosen_address_id = product_in.address_id or current_seller.active_address_id
    if chosen_address_id is None:
        raise HTTPException(
            status_code=400,
            detail="Seller must have an active address or provide address_id",
        )
    if not current_seller.has_address(chosen_address_id):
        raise HTTPException(status_code=400, detail="Invalid address_id for seller")

    product_in.address_id = chosen_address_id

    try:
        product = crud.create_product(
            session=session,
            product_in=product_in,
            seller_id=current_seller.id,
            seller_type=seller_type,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return ProductPublic.from_product(product)


@router.put("/{product_id}", response_model=ProductPublic)
def update_product(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    product_id: uuid.UUID,
    product_in: ProductUpdate,
) -> Any:
    """
    Update product.
    Only product owner or admin can update.
    """
    product = crud.get_product_by_id(session=session, product_id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail=PRODUCT_NOT_FOUND)

    if (
        not current_user.has_role(RoleEnum.ADMIN)
        and product.seller_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail=NOT_ENOUGH_PERMISSIONS)

    if product_in.sku is not None and product_in.sku != product.sku:
        existing = crud.get_product_by_seller_and_sku(
            session=session, seller_id=product.seller_id, sku=product_in.sku
        )
        if existing and existing.id != product.id:
            raise HTTPException(
                status_code=400,
                detail=f"Product with SKU '{product_in.sku}' already exists for this seller",
            )

    if product_in.pricing_tier is not None:
        if not current_user.active_role:
            raise HTTPException(status_code=400, detail="No active role selected")
        if current_user.active_role not in [RoleEnum.RETAILER, RoleEnum.WHOLESALER]:
            raise HTTPException(status_code=403, detail=INVALID_SELLER_ROLE)

        target_buyer_type = (
            BuyerType.CUSTOMER
            if current_user.active_role == RoleEnum.RETAILER
            else BuyerType.RETAILER
        )

        try:
            crud.update_pricing_tier(
                session=session,
                product=product,
                buyer_type=target_buyer_type,
                pricing_update=product_in.pricing_tier,
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    product = crud.update_product(
        session=session, product=product, product_in=product_in
    )
    return ProductPublic.from_product(product)


@router.delete("/{product_id}")
def delete_product(
    session: SessionDep, current_user: CurrentUser, product_id: uuid.UUID
) -> Message:
    """
    Delete product (soft delete).
    Only product owner or admin can delete.
    """
    product = crud.get_product_by_id(session=session, product_id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail=PRODUCT_NOT_FOUND)

    if (
        not current_user.has_role(RoleEnum.ADMIN)
        and product.seller_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail=NOT_ENOUGH_PERMISSIONS)

    crud.delete_product(session=session, product=product)
    return Message(message="Product deleted successfully")


@router.patch("/{product_id}/inventory", response_model=ProductInventoryPublic)
def update_product_inventory(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    product_id: uuid.UUID,
    inventory_update: ProductInventoryUpdate,
) -> Any:
    """
    Update product inventory.
    Only product owner can update inventory.
    """
    product = crud.get_product_by_id(session=session, product_id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail=PRODUCT_NOT_FOUND)

    if product.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail=NOT_ENOUGH_PERMISSIONS)

    try:
        inventory = crud.update_inventory(
            session=session, product=product, inventory_update=inventory_update
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return inventory


@router.post("/{product_id}/images", response_model=ProductPublic)
async def upload_product_image(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    product_id: uuid.UUID,
    file: UploadFile,
) -> Any:
    """
    Upload product image.
    Only product owner can upload images.
    """
    product = crud.get_product_by_id(session=session, product_id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail=PRODUCT_NOT_FOUND)

    if product.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail=NOT_ENOUGH_PERMISSIONS)

    try:
        next_order = len(product.images)

        image_schema = image_utils.save_product_image(
            product_id=product_id, file=file, order=next_order
        )

        if next_order == 0:
            image_schema.is_primary = True

        images = product.images.copy()
        images.append(image_schema.model_dump())

        product = crud.update_product_images(
            session=session, product=product, images=images
        )

        return ProductPublic.from_product(product)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")


@router.delete("/{product_id}/images")
def delete_product_image(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    product_id: uuid.UUID,
    image_path: str,
) -> ProductPublic:
    """
    Delete product image.
    Only product owner can delete images.
    Query parameter: image_path (e.g., /static/products/{id}/{filename})
    """
    product = crud.get_product_by_id(session=session, product_id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail=PRODUCT_NOT_FOUND)

    if product.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail=NOT_ENOUGH_PERMISSIONS)

    images = [img for img in product.images if img["path"] != image_path]

    if len(images) == len(product.images):
        raise HTTPException(status_code=404, detail="Image not found")

    images = image_utils.ensure_primary_image(images)

    try:
        image_utils.delete_product_image(image_path=image_path)
    except Exception:
        pass

    product = crud.update_product_images(
        session=session, product=product, images=images
    )

    return ProductPublic.from_product(product)


@router.put("/{product_id}/images/reorder", response_model=ProductPublic)
def reorder_product_images(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    product_id: uuid.UUID,
    reorder_data: ImageReorderSchema,
) -> Any:
    """
    Reorder product images.
    Only product owner can reorder images.
    """
    product = crud.get_product_by_id(session=session, product_id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail=PRODUCT_NOT_FOUND)

    if product.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail=NOT_ENOUGH_PERMISSIONS)

    try:
        images = image_utils.reorder_images(
            current_images=product.images, new_order=reorder_data.images
        )

        product = crud.update_product_images(
            session=session, product=product, images=images
        )

        return ProductPublic.from_product(product)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/clone/{order_item_id}", response_model=ProductPublic)
def clone_product(
    *,
    session: SessionDep,
    current_seller: CurrentSeller,
    order_item_id: uuid.UUID,
) -> Any:
    """Clone a wholesaler product (from an order item) into the retailer's catalog.

    Restrictions:
    - Active role must be RETAILER.
    - Order item must belong to an order placed by this retailer (buyer_type=RETAILER).
    - Source product must be a WHOLESALER product.
    Returns the newly created product (with CUSTOMER pricing tier).
    """
    if current_seller.active_role != RoleEnum.RETAILER:
        raise HTTPException(status_code=403, detail="Only retailers can clone products")
    try:
        product = crud.clone_product_from_order_item(
            session=session, order_item_id=order_item_id, new_seller=current_seller
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"{CLONE_ERROR_PREFIX} {str(e)}")
    return ProductPublic.from_product(product, buyer_type=BuyerType.CUSTOMER)
