import uuid

from sqlmodel import Session, select

from app.models.order import Cart, CartItem
from app.models.product import BuyerType, Product, ProductInventory, SellerType
from app.models.role import RoleEnum
from app.models.user import User


def _determine_buyer_type_for_purchase(user: User, product: Product) -> BuyerType:
    """Map user's active role and product seller_type to buyer type.

    - CUSTOMER (or no active role) buys from RETAILER -> BuyerType.CUSTOMER
    - RETAILER buys from WHOLESALER -> BuyerType.RETAILER
    Other combinations are not allowed.
    """
    active = user.active_role
    if product.seller_type == SellerType.RETAILER:
        # Only customers buy from retailers
        if active in (None, RoleEnum.CUSTOMER):
            return BuyerType.CUSTOMER
        raise PermissionError("Retail purchases only allowed for customers")
    else:  # product.seller_type == WHOLESALER
        if active == RoleEnum.RETAILER:
            return BuyerType.RETAILER
        raise PermissionError("Wholesale purchases only allowed for retailers")


def get_or_create_cart(*, session: Session, user_id: uuid.UUID) -> Cart:
    cart = session.exec(select(Cart).where(Cart.user_id == user_id)).first()
    if cart:
        return cart
    cart = Cart(user_id=user_id)
    session.add(cart)
    session.commit()
    session.refresh(cart)
    return cart


def get_cart_with_items(*, session: Session, user_id: uuid.UUID) -> Cart:
    cart = get_or_create_cart(session=session, user_id=user_id)
    # Eager load items and product relations
    session.refresh(cart)
    return cart


def add_to_cart(
    *, session: Session, user: User, product_id: uuid.UUID, quantity: int
) -> Cart:
    if quantity < 1:
        raise ValueError("Quantity must be at least 1")

    product = session.get(Product, product_id)
    if not product or product.deleted_at is not None or not product.is_active:
        raise ValueError("Product not available")

    # Validate buyer type mapping and stock
    _determine_buyer_type_for_purchase(user, product)

    inventory = session.exec(
        select(ProductInventory).where(ProductInventory.product_id == product.id)
    ).first()
    if not inventory or inventory.stock_quantity <= 0:
        raise ValueError("Product out of stock")

    cart = get_or_create_cart(session=session, user_id=user.id)

    existing = session.exec(
        select(CartItem).where(
            (CartItem.cart_id == cart.id) & (CartItem.product_id == product.id)
        )
    ).first()
    if existing:
        new_qty = existing.quantity + quantity
        if new_qty > inventory.stock_quantity:
            # Cap at max available stock
            new_qty = inventory.stock_quantity
        existing.quantity = new_qty
        session.add(existing)
    else:
        if quantity > inventory.stock_quantity:
            # Cap at max available stock
            quantity = inventory.stock_quantity
        session.add(CartItem(cart_id=cart.id, product_id=product.id, quantity=quantity))

    session.commit()
    session.refresh(cart)
    return cart


def update_cart_item_quantity(
    *, session: Session, user_id: uuid.UUID, cart_item_id: uuid.UUID, quantity: int
) -> Cart:
    if quantity < 1:
        raise ValueError("Quantity must be at least 1")
    cart = get_or_create_cart(session=session, user_id=user_id)
    item = session.get(CartItem, cart_item_id)
    if not item or item.cart_id != cart.id:
        raise ValueError("Cart item not found")

    product = session.get(Product, item.product_id)
    if not product or product.deleted_at is not None or not product.is_active:
        raise ValueError("Product not available")
    inventory = session.exec(
        select(ProductInventory).where(ProductInventory.product_id == product.id)
    ).first()

    if not inventory:
        raise ValueError("Product inventory not found")

    if quantity > inventory.stock_quantity:
        # Cap at max available stock
        quantity = inventory.stock_quantity

    item.quantity = quantity
    session.add(item)
    session.commit()
    session.refresh(cart)
    return cart


def remove_from_cart(
    *, session: Session, user_id: uuid.UUID, cart_item_id: uuid.UUID
) -> Cart:
    cart = get_or_create_cart(session=session, user_id=user_id)
    item = session.get(CartItem, cart_item_id)
    if not item or item.cart_id != cart.id:
        raise ValueError("Cart item not found")
    session.delete(item)
    session.commit()
    session.refresh(cart)
    return cart


def clear_cart(*, session: Session, user_id: uuid.UUID) -> Cart:
    cart = get_or_create_cart(session=session, user_id=user_id)
    for it in list(cart.items):
        session.delete(it)
    session.commit()
    session.refresh(cart)
    return cart
