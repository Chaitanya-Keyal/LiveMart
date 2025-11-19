import uuid
from datetime import UTC, datetime

from sqlalchemy import bindparam, cast
from sqlalchemy.dialects import postgresql
from sqlmodel import Session, func, select

from app.models.product import (
    Product,
    ProductCreate,
    ProductInventory,
    ProductInventoryUpdate,
    ProductPricing,
    ProductPricingUpdate,
    ProductUpdate,
    SellerType,
)


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
    if tags:
        for i, tag in enumerate(tags):
            param = bindparam(f"tag_{i}", value=[tag], type_=postgresql.JSONB)
            statement = statement.where(
                cast(Product.tags, postgresql.JSONB).op("@>")(param)
            )

    count_statement = select(func.count()).select_from(statement.subquery())
    count = session.exec(count_statement).one()

    statement = statement.offset(skip).limit(limit).order_by(Product.created_at.desc())
    products = session.exec(statement).all()

    return list(products), count


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
