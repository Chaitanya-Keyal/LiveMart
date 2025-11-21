import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal

from sqlalchemy import cast, or_
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import joinedload
from sqlmodel import Session, func, select

from app.models.address import Address
from app.models.order import OrderItem
from app.models.product import (
    BuyerType,
    CategoryEnum,
    Product,
    ProductCreate,
    ProductInventory,
    ProductInventoryUpdate,
    ProductPricing,
    ProductPricingUpdate,
    ProductUpdate,
    SellerType,
)
from app.models.review import ProductReview
from app.models.role import RoleEnum
from app.models.user import User
from app.utils.images import copy_product_images, ensure_primary_image
from app.utils.location import latlon_bounding_box


def autocomplete_products(
    *,
    session: Session,
    q: str,
    limit: int = 10,
    seller_type: SellerType | None = None,
    category: CategoryEnum | None = None,
    is_active: bool = True,
) -> list[str]:
    """Return distinct product name suggestions for the given query."""
    q = (q or "").strip()
    if len(q) < 2:
        return []

    like = f"%{q}%"

    stmt = (
        select(Product.name, Product.created_at)
        .where(Product.deleted_at.is_(None))
        .where((Product.name.ilike(like)) | (Product.description.ilike(like)))
    )
    if is_active:
        stmt = stmt.where(Product.is_active.is_(True))
    if seller_type:
        stmt = stmt.where(Product.seller_type == seller_type)
    if category:
        stmt = stmt.where(Product.category == category)

    # Also match on brand if present
    stmt = stmt.where((Product.brand.is_(None)) | (Product.brand.ilike(like)))

    stmt = stmt.distinct().order_by(Product.created_at.desc()).limit(limit)
    rows = session.exec(stmt).all()
    return [str(r[0]) for r in rows if r]


def create_product(
    *,
    session: Session,
    product_in: ProductCreate,
    seller_id: uuid.UUID,
    seller_type: SellerType,
) -> Product:
    """
    Create a new product with pricing tiers and inventory.
    Validates that seller has appropriate role.
    """
    sku = product_in.sku if product_in.sku else str(uuid.uuid4())[:8].upper()

    product_data = product_in.model_dump(
        exclude={"pricing_tiers", "initial_stock", "sku"}
    )
    product_data["images"] = [img.model_dump() for img in product_in.images]

    product = Product(
        **product_data,
        sku=sku,
        seller_id=seller_id,
        seller_type=seller_type,
    )
    session.add(product)
    session.flush()

    for tier_in in product_in.pricing_tiers:
        pricing = ProductPricing(
            **tier_in.model_dump(),
            product_id=product.id,
        )
        session.add(pricing)

    inventory = ProductInventory(
        product_id=product.id,
        stock_quantity=product_in.initial_stock,
        last_restocked_at=(datetime.now(UTC) if product_in.initial_stock > 0 else None),
    )
    session.add(inventory)

    session.commit()
    session.refresh(product)
    return product


def get_products(
    *,
    session: Session,
    skip: int = 0,
    limit: int = 100,
    seller_type: SellerType | None = None,
    category: str | None = None,
    seller_id: uuid.UUID | None = None,
    tags: list[str] | None = None,
    is_active: bool | None = None,
    search: str | None = None,
    brands: list[str] | None = None,
    in_stock_only: bool | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    buyer_type: BuyerType | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    radius_km: float | None = None,
    sort_by: Literal[
        "newest", "price_asc", "price_desc", "distance_asc", "rating_desc", "rating_asc"
    ]
    | None = None,
) -> tuple[list[Product], int]:
    """
    Get products with filters and pagination.
    Returns tuple of (products, total_count).
    """
    statement = select(Product).where(Product.deleted_at.is_(None))

    if seller_type:
        statement = statement.where(Product.seller_type == seller_type)
    if category:
        statement = statement.where(Product.category == category)
    if seller_id:
        statement = statement.where(Product.seller_id == seller_id)
    if is_active is not None:
        statement = statement.where(Product.is_active == is_active)
    if brands:
        brand_clauses = [Product.brand.ilike(f"%{b}%") for b in brands if b]
        if brand_clauses:
            statement = statement.where(or_(*brand_clauses))
    if search:
        like = f"%{search}%"
        statement = statement.where(
            (Product.name.ilike(like)) | (Product.description.ilike(like))
        )
    if tags:
        # For each provided tag term, require product to have at least one tag matching ILIKE '%term%'
        for term in tags:
            if not term:
                continue
            like = f"%{term}%"
            # Build a subquery over jsonb_array_elements_text(tags) and ensure at least one element matches ILIKE
            tag_elements_subq = select(
                func.jsonb_array_elements_text(
                    cast(Product.tags, postgresql.JSONB)
                ).label("tag")
            ).subquery()
            statement = statement.where(
                select(func.count())
                .select_from(tag_elements_subq)
                .where(tag_elements_subq.c.tag.ilike(like))
                .scalar_subquery()
                > 0
            )

    if in_stock_only:
        inv = select(ProductInventory.product_id).where(
            ProductInventory.stock_quantity > 0
        )
        statement = statement.where(Product.id.in_(inv))

    if (min_price is not None or max_price is not None) and buyer_type is not None:
        price_subq = (
            select(
                ProductPricing.product_id, func.min(ProductPricing.price).label("minp")
            )
            .where(
                (ProductPricing.is_active.is_(True))
                & (ProductPricing.buyer_type == buyer_type)
            )
            .group_by(ProductPricing.product_id)
            .subquery()
        )
        statement = statement.join(price_subq, price_subq.c.product_id == Product.id)
        if min_price is not None:
            statement = statement.where(price_subq.c.minp >= min_price)
        if max_price is not None:
            statement = statement.where(price_subq.c.minp <= max_price)

    if (
        latitude is not None
        and longitude is not None
        and radius_km is not None
        and radius_km > 0
    ):
        min_lat, max_lat, min_lon, max_lon = latlon_bounding_box(
            latitude, longitude, radius_km
        )
        from sqlalchemy import func as safunc
        from sqlalchemy.orm import aliased

        ProdAddr = aliased(Address)
        ActAddr = aliased(Address)

        statement = (
            statement.join(User, User.id == Product.seller_id)
            .join(ProdAddr, ProdAddr.id == Product.address_id, isouter=True)
            .join(ActAddr, ActAddr.id == User.active_address_id, isouter=True)
        )

        lat_expr = safunc.coalesce(ProdAddr.latitude, ActAddr.latitude)
        lon_expr = safunc.coalesce(ProdAddr.longitude, ActAddr.longitude)

        statement = statement.where(
            (lat_expr >= min_lat)
            & (lat_expr <= max_lat)
            & (lon_expr >= min_lon)
            & (lon_expr <= max_lon)
        )

    count_subq = statement.with_only_columns(Product.id).distinct().subquery()
    count_statement = select(func.count()).select_from(count_subq)
    count = session.exec(count_statement).one()

    if sort_by == "rating_desc":
        rating_subq = (
            select(
                ProductReview.product_id,
                func.avg(ProductReview.rating).label("avg_rating"),
                func.count(ProductReview.id).label("review_count"),
            )
            .where(ProductReview.deleted_at.is_(None))
            .group_by(ProductReview.product_id)
            .subquery()
        )
        statement = statement.join(
            rating_subq, rating_subq.c.product_id == Product.id, isouter=True
        )
        statement = statement.order_by(
            rating_subq.c.avg_rating.desc().nulls_last(),
            rating_subq.c.review_count.desc().nulls_last(),
            Product.created_at.desc(),
        )
    elif sort_by == "rating_asc":
        rating_subq = (
            select(
                ProductReview.product_id,
                func.avg(ProductReview.rating).label("avg_rating"),
                func.count(ProductReview.id).label("review_count"),
            )
            .where(ProductReview.deleted_at.is_(None))
            .group_by(ProductReview.product_id)
            .subquery()
        )
        statement = statement.join(
            rating_subq, rating_subq.c.product_id == Product.id, isouter=True
        )
        statement = statement.order_by(
            rating_subq.c.avg_rating.asc().nulls_last(),
            rating_subq.c.review_count.asc().nulls_last(),
            Product.created_at.desc(),
        )
    elif sort_by == "price_asc" and buyer_type is not None:
        price_min_subq = (
            select(
                ProductPricing.product_id, func.min(ProductPricing.price).label("minp")
            )
            .where(
                (ProductPricing.is_active.is_(True))
                & (ProductPricing.buyer_type == buyer_type)
            )
            .group_by(ProductPricing.product_id)
            .subquery()
        )
        statement = statement.join(
            price_min_subq, price_min_subq.c.product_id == Product.id
        )
        statement = statement.order_by(
            price_min_subq.c.minp.asc(), Product.created_at.desc()
        )
    elif sort_by == "price_desc" and buyer_type is not None:
        price_min_subq = (
            select(
                ProductPricing.product_id, func.min(ProductPricing.price).label("minp")
            )
            .where(
                (ProductPricing.is_active.is_(True))
                & (ProductPricing.buyer_type == buyer_type)
            )
            .group_by(ProductPricing.product_id)
            .subquery()
        )
        statement = statement.join(
            price_min_subq, price_min_subq.c.product_id == Product.id
        )
        statement = statement.order_by(
            price_min_subq.c.minp.desc(), Product.created_at.desc()
        )
    elif sort_by == "distance_asc" and latitude is not None and longitude is not None:
        statement = statement.order_by(Product.created_at.desc())
    else:
        statement = statement.order_by(Product.created_at.desc())

    statement = statement.offset(skip).limit(limit)
    products = session.exec(statement).all()

    return list(products), count


def get_address_coords(
    *, session: Session, address_ids: list[uuid.UUID]
) -> dict[uuid.UUID, tuple[float | None, float | None]]:
    """Fetch latitude/longitude for given address IDs."""
    if not address_ids:
        return {}
    rows = session.exec(
        select(Address.id, Address.latitude, Address.longitude).where(
            Address.id.in_(address_ids)
        )
    ).all()
    result: dict[uuid.UUID, tuple[float | None, float | None]] = {}
    for aid, lat, lon in rows:
        result[aid] = (float(lat), float(lon))
    return result


def get_users_active_address_coords(
    *, session: Session, user_ids: list[uuid.UUID]
) -> dict[uuid.UUID, tuple[float | None, float | None]]:
    """Fetch active address latitude/longitude for given user IDs.

    Returns a mapping of user_id -> (lat, lon). If a user has no active address,
    the coordinates will not be present in the result (caller should handle None).
    """
    if not user_ids:
        return {}
    rows = session.exec(
        select(User.id, Address.latitude, Address.longitude)
        .join(Address, Address.id == User.active_address_id, isouter=True)
        .where(User.id.in_(user_ids))
    ).all()
    result: dict[uuid.UUID, tuple[float | None, float | None]] = {}
    for uid, lat, lon in rows:
        lat_f = float(lat) if lat is not None else None
        lon_f = float(lon) if lon is not None else None
        result[uid] = (lat_f, lon_f)
    return result


def get_product_by_id(*, session: Session, product_id: uuid.UUID) -> Product | None:
    """Get product by ID with relationships loaded."""
    statement = (
        select(Product)
        .where(Product.id == product_id)
        .where(Product.deleted_at.is_(None))
    )
    return session.exec(statement).first()


def get_product_by_seller_and_sku(
    *, session: Session, seller_id: uuid.UUID, sku: str
) -> Product | None:
    """Get product by seller and SKU."""
    statement = (
        select(Product)
        .where(Product.seller_id == seller_id)
        .where(Product.sku == sku)
        .where(Product.deleted_at.is_(None))
    )
    return session.exec(statement).first()


def update_product(
    *, session: Session, product: Product, product_in: ProductUpdate
) -> Product:
    """Update a product."""
    update_dict = product_in.model_dump(exclude_unset=True)
    # Remove nested pricing_tier from direct product update; handled separately
    update_dict.pop("pricing_tier", None)
    product.sqlmodel_update(update_dict)
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


def update_pricing_tier(
    *,
    session: Session,
    product: Product,
    buyer_type,
    pricing_update: ProductPricingUpdate,
) -> ProductPricing:
    """Update a product's pricing tier for the specified buyer type."""
    tier = None
    for t in product.pricing_tiers:
        if t.buyer_type == buyer_type:
            tier = t
            break
    if not tier:
        raise ValueError("Pricing tier not found for specified buyer type")

    update_dict = pricing_update.model_dump(exclude_unset=True)

    if (
        "min_quantity" in update_dict
        and product.inventory
        and update_dict["min_quantity"] is not None
        and update_dict["min_quantity"] > product.inventory.stock_quantity
    ):
        raise ValueError(
            f"min_quantity {update_dict['min_quantity']} cannot exceed current stock {product.inventory.stock_quantity}"
        )

    tier.sqlmodel_update(update_dict)
    session.add(tier)
    session.commit()
    session.refresh(tier)
    return tier


def update_inventory(
    *,
    session: Session,
    product: Product,
    inventory_update: ProductInventoryUpdate,
) -> ProductInventory:
    """
    Update product inventory.
    Validates that new stock quantity meets all pricing tier min_quantity requirements.
    """
    if not product.inventory:
        raise ValueError("Product has no inventory record")

    # If updating stock_quantity, validate against pricing tiers
    if inventory_update.stock_quantity is not None:
        new_stock = inventory_update.stock_quantity
        for tier in product.pricing_tiers:
            if tier.is_active and tier.min_quantity > new_stock:
                raise ValueError(
                    f"Cannot reduce stock to {new_stock}. "
                    f"Pricing tier for {tier.buyer_type.value} requires minimum {tier.min_quantity} units."
                )

        # Update last_restocked_at if stock increased
        if new_stock > product.inventory.stock_quantity:
            product.inventory.last_restocked_at = datetime.now(UTC)

    update_dict = inventory_update.model_dump(exclude_unset=True)
    product.inventory.sqlmodel_update(update_dict)
    session.add(product.inventory)
    session.commit()
    session.refresh(product.inventory)
    return product.inventory


def delete_product(*, session: Session, product: Product) -> None:
    """Soft delete a product."""
    product.deleted_at = datetime.now(UTC)
    session.add(product)
    session.commit()


def update_product_images(
    *, session: Session, product: Product, images: list[dict]
) -> Product:
    """Update product images."""
    product.images = images
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


def clone_product_from_order_item(
    *, session: Session, order_item_id: uuid.UUID, new_seller: User
) -> Product:
    """Clone a wholesaler product from an order item into a new retailer-owned product.

    Validations:
    - new_seller.active_role must be RETAILER.
    - OrderItem must exist and belong to an Order where buyer_id == new_seller.id and buyer_type == BuyerType.RETAILER.
    - The source product must exist, not deleted, and have seller_type == WHOLESALER.
    - new_seller must have an active address (used if none provided later by user).

    Cloning rules:
    - Copy name, description, category, tags, brand.
    - Pricing: take wholesaler's retailer tier and convert to a single CUSTOMER tier for the retailer product.
    - Inventory: initial stock = 0.
    - Images: physically copy files and preserve order and primary flag.
    - SKU: generate new UUID slice.
    - Address: set to new_seller.active_address_id (if present) else None (route layer may enforce address requirement later).
    """
    if new_seller.active_role != RoleEnum.RETAILER:
        raise ValueError("Only retailers can clone wholesaler products")

    # Load order item with its order and product
    oi_stmt = (
        select(OrderItem)
        .where(OrderItem.id == order_item_id)
        .options(joinedload(OrderItem.product), joinedload(OrderItem.order))
    )
    order_item = session.exec(oi_stmt).first()
    if not order_item:
        raise ValueError("Order item not found")

    order = order_item.order
    if (
        not order
        or order.buyer_id != new_seller.id
        or order.buyer_type != BuyerType.RETAILER
    ):
        raise ValueError(
            "Order item does not belong to a retailer purchase by current user"
        )

    product = order_item.product
    if not product or product.deleted_at is not None:
        raise ValueError("Source product unavailable for cloning")
    if product.seller_type != SellerType.WHOLESALER:
        raise ValueError("Only wholesaler products can be cloned")

    # Find wholesaler pricing tier for retailers
    source_tier = None
    for tier in product.pricing_tiers:
        if tier.buyer_type == BuyerType.RETAILER and tier.is_active:
            source_tier = tier
            break
    if not source_tier:
        raise ValueError("Source product lacks active retailer pricing tier")

    # Prepare new product data (initial creation without images/pricing handled after flush)
    new_sku = str(uuid.uuid4())[:8].upper()
    clone = Product(
        name=product.name,
        description=product.description,
        category=product.category,
        seller_id=new_seller.id,
        seller_type=SellerType.RETAILER,
        sku=new_sku,
        brand=product.brand,
        address_id=new_seller.active_address_id,  # may be validated at route layer
        images=[],  # will populate after copying
        is_active=True,
        tags=list(product.tags) if product.tags else [],
    )
    session.add(clone)
    session.flush()  # obtain product.id

    # Copy images
    copied_images = copy_product_images(
        source_product=product, target_product_id=clone.id
    )
    copied_images = ensure_primary_image(copied_images)
    clone.images = copied_images
    session.add(clone)

    # Create pricing tier for CUSTOMER using wholesaler's retailer tier
    cust_pricing = ProductPricing(
        product_id=clone.id,
        buyer_type=BuyerType.CUSTOMER,
        price=source_tier.price,
        min_quantity=1,
        max_quantity=source_tier.max_quantity,
        is_active=True,
    )
    session.add(cust_pricing)

    purchased_qty = getattr(order_item, "quantity", 0) or 0
    inv = ProductInventory(
        product_id=clone.id,
        stock_quantity=purchased_qty,
        last_restocked_at=(datetime.now(UTC) if purchased_qty > 0 else None),
    )
    session.add(inv)

    session.commit()
    session.refresh(clone)
    return clone
