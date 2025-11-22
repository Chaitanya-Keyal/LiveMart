#!/usr/bin/env python3
"""
Demo Data Population Script for LiveMart

This script populates the database with realistic demo data including:
- Indian addresses for existing users
- Products across all categories with real images from Unsplash
- Orders in various states (DELIVERED, PENDING, CONFIRMED, CANCELLED)
- Reviews, coupons, and settlements

Usage:
    python scripts/populate_demo_data.py [--clear]
"""

import argparse
import logging
import random
import sys
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path

import httpx
from sqlmodel import Session, select

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app import crud
from app.core.db import engine
from app.models.address import Address, AddressCreate, AddressLabelEnum
from app.models.coupon import Coupon, CouponCreate, DiscountType
from app.models.order import Cart, CartItem, Order, OrderStatus, PaymentStatus
from app.models.product import (
    BuyerType,
    CategoryEnum,
    Product,
    ProductCreate,
    ProductPricingCreate,
    SellerType,
)
from app.models.review import ProductReview, ReviewCreate
from app.models.role import RoleEnum
from app.models.settlement import (
    PaymentSettlement,
    PaymentSettlementCreate,
)
from app.models.user import User

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Indian cities with realistic coordinates
INDIAN_CITIES = [
    {
        "city": "Mumbai",
        "state": "Maharashtra",
        "latitude": Decimal("19.076090"),
        "longitude": Decimal("72.877426"),
        "pincode": "400001",
    },
    {
        "city": "Delhi",
        "state": "Delhi",
        "latitude": Decimal("28.704060"),
        "longitude": Decimal("77.102493"),
        "pincode": "110001",
    },
    {
        "city": "Bangalore",
        "state": "Karnataka",
        "latitude": Decimal("12.971599"),
        "longitude": Decimal("77.594566"),
        "pincode": "560001",
    },
    {
        "city": "Pune",
        "state": "Maharashtra",
        "latitude": Decimal("18.520430"),
        "longitude": Decimal("73.856743"),
        "pincode": "411001",
    },
    {
        "city": "Chennai",
        "state": "Tamil Nadu",
        "latitude": Decimal("13.082680"),
        "longitude": Decimal("80.270718"),
        "pincode": "600001",
    },
]

# Street names for address generation
STREET_NAMES = [
    "MG Road",
    "Brigade Road",
    "Linking Road",
    "Park Street",
    "Anna Salai",
    "Commercial Street",
    "Nehru Place",
    "Indiranagar",
    "Koramangala",
    "Bandra West",
    "Connaught Place",
    "T Nagar",
]

# Product data organized by category with Unsplash search queries
PRODUCT_CATALOG = {
    CategoryEnum.ELECTRONICS: [
        {
            "name": "Wireless Bluetooth Headphones",
            "brand": "SoundMax",
            "query": "headphones",
            "tags": ["audio", "wireless", "bluetooth"],
        },
        {
            "name": "Smart LED TV 43 inch",
            "brand": "VisionTech",
            "query": "television",
            "tags": ["tv", "smart", "4k"],
        },
        {
            "name": "Laptop Backpack",
            "brand": "TravelPro",
            "query": "laptop bag",
            "tags": ["bag", "travel", "laptop"],
        },
        {
            "name": "Wireless Mouse",
            "brand": "TechGear",
            "query": "computer mouse",
            "tags": ["mouse", "wireless", "computer"],
        },
    ],
    CategoryEnum.CLOTHING: [
        {
            "name": "Cotton T-Shirt",
            "brand": "StyleHub",
            "query": "tshirt",
            "tags": ["casual", "cotton", "summer"],
        },
        {
            "name": "Denim Jeans",
            "brand": "UrbanFit",
            "query": "jeans",
            "tags": ["denim", "casual", "pants"],
        },
        {
            "name": "Formal Shirt",
            "brand": "ClassicWear",
            "query": "dress shirt",
            "tags": ["formal", "office", "cotton"],
        },
        {
            "name": "Running Shoes",
            "brand": "SportsPro",
            "query": "running shoes",
            "tags": ["sports", "fitness", "shoes"],
        },
    ],
    CategoryEnum.FOOD_BEVERAGE: [
        {
            "name": "Organic Coffee Beans",
            "brand": "CafePure",
            "query": "coffee beans",
            "tags": ["coffee", "organic", "beverage"],
        },
        {
            "name": "Green Tea Pack",
            "brand": "TeaGarden",
            "query": "green tea",
            "tags": ["tea", "healthy", "organic"],
        },
        {
            "name": "Protein Bar Box",
            "brand": "FitSnack",
            "query": "protein bar",
            "tags": ["protein", "healthy", "snack"],
        },
    ],
    CategoryEnum.HOME_GARDEN: [
        {
            "name": "Indoor Plant Pot",
            "brand": "GreenSpace",
            "query": "plant pot",
            "tags": ["garden", "plant", "decor"],
        },
        {
            "name": "LED Table Lamp",
            "brand": "LightCraft",
            "query": "table lamp",
            "tags": ["lighting", "home", "led"],
        },
        {
            "name": "Wall Clock",
            "brand": "TimeMaster",
            "query": "wall clock",
            "tags": ["decor", "time", "wall"],
        },
    ],
    CategoryEnum.HEALTH_BEAUTY: [
        {
            "name": "Face Moisturizer",
            "brand": "SkinCare+",
            "query": "moisturizer",
            "tags": ["skincare", "beauty", "face"],
        },
        {
            "name": "Hair Serum",
            "brand": "HairVital",
            "query": "hair serum",
            "tags": ["haircare", "beauty", "treatment"],
        },
        {
            "name": "Vitamin C Tablets",
            "brand": "HealthFirst",
            "query": "vitamins",
            "tags": ["health", "supplement", "wellness"],
        },
    ],
    CategoryEnum.SPORTS: [
        {
            "name": "Yoga Mat",
            "brand": "FitLife",
            "query": "yoga mat",
            "tags": ["yoga", "fitness", "exercise"],
        },
        {
            "name": "Gym Dumbbell Set",
            "brand": "PowerFit",
            "query": "dumbbells",
            "tags": ["gym", "weights", "fitness"],
        },
        {
            "name": "Cricket Bat",
            "brand": "SportsPro",
            "query": "cricket bat",
            "tags": ["cricket", "sports", "outdoor"],
        },
    ],
    CategoryEnum.TOYS: [
        {
            "name": "Building Blocks Set",
            "brand": "KidPlay",
            "query": "building blocks",
            "tags": ["toys", "kids", "creative"],
        },
        {
            "name": "Remote Control Car",
            "brand": "ToyRacer",
            "query": "rc car",
            "tags": ["toys", "kids", "remote"],
        },
    ],
    CategoryEnum.BOOKS: [
        {
            "name": "Python Programming Book",
            "brand": "TechPress",
            "query": "programming book",
            "tags": ["book", "programming", "education"],
        },
        {
            "name": "Motivational Book",
            "brand": "InspireReads",
            "query": "book",
            "tags": ["book", "motivation", "self-help"],
        },
    ],
    CategoryEnum.AUTOMOTIVE: [
        {
            "name": "Car Phone Holder",
            "brand": "DriveEase",
            "query": "car phone mount",
            "tags": ["automotive", "accessories", "phone"],
        },
        {
            "name": "Car Air Freshener",
            "brand": "FreshDrive",
            "query": "car freshener",
            "tags": ["automotive", "fragrance", "car"],
        },
    ],
    CategoryEnum.OFFICE_SUPPLIES: [
        {
            "name": "Wireless Keyboard",
            "brand": "TypeMaster",
            "query": "keyboard",
            "tags": ["office", "computer", "wireless"],
        },
        {
            "name": "Notebook Set",
            "brand": "WriteWell",
            "query": "notebook",
            "tags": ["office", "stationery", "writing"],
        },
        {
            "name": "Pen Stand",
            "brand": "DeskOrganize",
            "query": "pen holder",
            "tags": ["office", "desk", "organizer"],
        },
    ],
    CategoryEnum.PET_SUPPLIES: [
        {
            "name": "Dog Food Premium",
            "brand": "PetNutrition",
            "query": "dog food",
            "tags": ["pet", "dog", "food"],
        },
        {
            "name": "Cat Toy Ball",
            "brand": "PlayPet",
            "query": "cat toy",
            "tags": ["pet", "cat", "toy"],
        },
    ],
    CategoryEnum.JEWELLERY: [
        {
            "name": "Silver Necklace",
            "brand": "ElegantGems",
            "query": "necklace",
            "tags": ["jewellery", "silver", "fashion"],
        },
        {
            "name": "Gold Plated Earrings",
            "brand": "RoyalJewels",
            "query": "earrings",
            "tags": ["jewellery", "gold", "fashion"],
        },
    ],
    CategoryEnum.FURNITURE: [
        {
            "name": "Office Chair",
            "brand": "ComfortSeat",
            "query": "office chair",
            "tags": ["furniture", "office", "chair"],
        },
        {
            "name": "Bookshelf",
            "brand": "WoodCraft",
            "query": "bookshelf",
            "tags": ["furniture", "storage", "wood"],
        },
    ],
}

# Unsplash API configuration
UNSPLASH_API_BASE_URL = "https://api.unsplash.com"


def download_image(
    query: str, seed: int = None, unsplash_access_key: str = None
) -> bytes:
    """Download a real image from Unsplash API based on search query, fallback to Lorem Picsum."""
    # If no access key provided, use Lorem Picsum directly
    if not unsplash_access_key:
        logger.info(f"No Unsplash access key, using Lorem Picsum for: {query}")
        return download_lorem_picsum_image(seed)

    try:
        # Search for photos matching the query
        search_url = f"{UNSPLASH_API_BASE_URL}/search/photos"
        params = {
            "query": query,
            "per_page": 10,
            "orientation": "squarish",
        }
        headers = {
            "Authorization": f"Client-ID {unsplash_access_key}",
        }

        logger.info(f"Searching Unsplash for: {query}")
        with httpx.Client(timeout=30.0) as client:
            # Search for photos
            search_response = client.get(search_url, params=params, headers=headers)
            search_response.raise_for_status()
            search_data = search_response.json()

            if not search_data.get("results"):
                logger.warning(
                    f"No images found for query '{query}', using Lorem Picsum"
                )
                return download_lorem_picsum_image(seed)

            # Use seed to select a consistent photo from results
            results = search_data.get("results", [])
            if not results:
                logger.warning(
                    f"No images found for query '{query}', using Lorem Picsum"
                )
                return download_lorem_picsum_image(seed)

            # Select photo based on seed for reproducibility
            index = (seed % len(results)) if seed else 0
            photo = results[index]

            # Get the small or regular image URL
            image_url = photo["urls"].get("small") or photo["urls"].get("regular")

            logger.info(f"Downloading image from: {image_url[:50]}...")
            # Download the actual image
            image_response = client.get(image_url)
            image_response.raise_for_status()

            # Trigger download tracking endpoint (required by Unsplash API guidelines)
            if "download_location" in photo.get("links", {}):
                client.get(photo["links"]["download_location"], headers=headers)

            return image_response.content

    except Exception as e:
        logger.warning(
            f"Failed to download image from Unsplash for '{query}': {e}, using Lorem Picsum"
        )
        return download_lorem_picsum_image(seed)


def download_lorem_picsum_image(seed: int = None) -> bytes:
    """Download a random image from Lorem Picsum as fallback."""
    try:
        # Use seed to get consistent random image
        image_id = (seed % 1000) if seed else random.randint(1, 1000)
        picsum_url = f"https://picsum.photos/seed/{image_id}/500/500"

        logger.info(f"Downloading Lorem Picsum image (seed: {image_id})")
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            response = client.get(picsum_url)
            response.raise_for_status()
            return response.content
    except Exception as e:
        logger.error(f"Failed to download Lorem Picsum image: {e}")
        raise


def save_product_image(
    product_id: uuid.UUID, image_bytes: bytes, order: int, extension: str = ".jpg"
) -> dict:
    """Save downloaded image to product directory and return image schema dict."""
    base_dir = Path("app/static/products")
    product_dir = base_dir / str(product_id)
    product_dir.mkdir(parents=True, exist_ok=True)

    unique_filename = f"{uuid.uuid4()}{extension}"
    file_path = product_dir / unique_filename

    with open(file_path, "wb") as f:
        f.write(image_bytes)

    logger.debug(f"Saved image: {file_path}")

    return {
        "path": f"/static/products/{product_id}/{unique_filename}",
        "order": order,
        "is_primary": order == 0,
    }


def create_addresses(
    session: Session, multi_role_user_id: uuid.UUID, customer_only_user_id: uuid.UUID
) -> dict[uuid.UUID, list[Address]]:
    """Create realistic Indian addresses for both users."""
    logger.info("Creating addresses for users...")

    addresses_by_user = {}

    # Multi-role user gets 3 addresses
    multi_role_user = session.get(User, multi_role_user_id)
    multi_role_addresses = []
    for i, city_data in enumerate(random.sample(INDIAN_CITIES, 3)):
        address_in = AddressCreate(
            street_address=f"{random.randint(1, 999)} {random.choice(STREET_NAMES)}",
            apartment_suite=(
                f"Apartment {random.randint(1, 20)}, Floor {random.randint(1, 15)}"
                if i > 0
                else None
            ),
            city=city_data["city"],
            state=city_data["state"],
            postal_code=city_data["pincode"],
            country="India",
            label=list(AddressLabelEnum)[i] if i < 3 else AddressLabelEnum.OTHER,
            custom_label="Main Office" if i == 1 else None,
            latitude=city_data["latitude"],
            longitude=city_data["longitude"],
            additional_notes=f"Near {random.choice(['Metro Station', 'Mall', 'Park', 'Hospital'])}",
        )
        multi_role_user = session.get(User, multi_role_user_id)
        address = crud.create_address(
            session=session, address_in=address_in, user=multi_role_user
        )
        multi_role_addresses.append(address)
        logger.info(f"Created address in {city_data['city']} for multi-role user")

    addresses_by_user[multi_role_user_id] = multi_role_addresses

    # Customer-only user gets 2 addresses
    customer_user = session.get(User, customer_only_user_id)
    customer_addresses = []
    for i, city_data in enumerate(random.sample(INDIAN_CITIES, 2)):
        address_in = AddressCreate(
            street_address=f"{random.randint(1, 999)} {random.choice(STREET_NAMES)}",
            apartment_suite=f"Flat {random.randint(100, 999)}" if i == 0 else None,
            city=city_data["city"],
            state=city_data["state"],
            postal_code=city_data["pincode"],
            country="India",
            label=AddressLabelEnum.HOME if i == 0 else AddressLabelEnum.WORK,
            latitude=city_data["latitude"],
            longitude=city_data["longitude"],
            additional_notes=f"Near {random.choice(['Bus Stop', 'Temple', 'Market', 'School'])}",
        )
        customer_user = session.get(User, customer_only_user_id)
        address = crud.create_address(
            session=session, address_in=address_in, user=customer_user
        )
        customer_addresses.append(address)
        logger.info(f"Created address in {city_data['city']} for customer-only user")

    addresses_by_user[customer_only_user_id] = customer_addresses

    session.commit()
    logger.info(
        f"Created total {len(multi_role_addresses) + len(customer_addresses)} addresses"
    )

    return addresses_by_user


def create_products_with_images(
    session: Session,
    addresses: dict,
    multi_role_user_id: uuid.UUID,
    unsplash_access_key: str = None,
) -> dict[str, list[Product]]:
    """Create wholesaler and retailer products with real images."""
    logger.info("Creating products with images from Unsplash...")

    products_by_type = {"wholesaler": [], "retailer": []}

    wholesaler_address = addresses[multi_role_user_id][0]
    retailer_address = (
        addresses[multi_role_user_id][1]
        if len(addresses[multi_role_user_id]) > 1
        else wholesaler_address
    )

    # Create wholesaler products (15-20 products)
    logger.info("Creating wholesaler products...")
    wholesaler_count = 0
    for category, products_list in PRODUCT_CATALOG.items():
        # Take 1-2 products per category for wholesaler
        for product_data in random.sample(products_list, min(2, len(products_list))):
            try:
                # Download images FIRST before creating product
                images_data = []
                num_images = random.randint(2, 3)
                for img_idx in range(num_images):
                    try:
                        image_bytes = download_image(
                            product_data["query"],
                            seed=wholesaler_count * 10 + img_idx,
                            unsplash_access_key=unsplash_access_key,
                        )
                        images_data.append(image_bytes)
                    except Exception as e:
                        logger.warning(
                            f"Failed to download image {img_idx} for {product_data['name']}: {e}"
                        )
                        break

                # Skip product creation if no images could be downloaded
                if not images_data:
                    logger.warning(
                        f"Skipping wholesaler product {product_data['name']} - no images available"
                    )
                    continue

                # Create product
                pricing_tiers = [
                    ProductPricingCreate(
                        buyer_type=BuyerType.RETAILER,
                        price=Decimal(str(random.uniform(50, 500))).quantize(
                            Decimal("0.01")
                        ),
                        min_quantity=random.choice([1, 5, 10]),
                        max_quantity=random.choice([100, 500, 1000]),
                    )
                ]

                product_in = ProductCreate(
                    name=product_data["name"],
                    description=f"High quality {product_data['name'].lower()} from {product_data['brand']}. Perfect for retail businesses.",
                    category=category,
                    pricing_tiers=pricing_tiers,
                    brand=product_data["brand"],
                    sku=None,  # Auto-generated
                    initial_stock=random.randint(500, 2000),
                    tags=product_data["tags"],
                    images=[],
                    address_id=wholesaler_address.id,
                )

                product = crud.create_product(
                    session=session,
                    product_in=product_in,
                    seller_id=multi_role_user_id,
                    seller_type=SellerType.WHOLESALER,
                )

                # Save downloaded images
                images = []
                for img_idx, image_bytes in enumerate(images_data):
                    img_dict = save_product_image(
                        product.id, image_bytes, img_idx, ".jpg"
                    )
                    images.append(img_dict)

                # Update product with images
                product.images = images
                session.add(product)
                session.commit()
                session.refresh(product)

                products_by_type["wholesaler"].append(product)
                wholesaler_count += 1
                logger.info(
                    f"Created wholesaler product: {product.name} with {len(images)} images"
                )

            except Exception as e:
                logger.error(
                    f"Failed to create wholesaler product {product_data['name']}: {e}"
                )
                session.rollback()

    logger.info(f"Created {wholesaler_count} wholesaler products")

    # Create retailer products (25-30 products)
    logger.info("Creating retailer products...")
    retailer_count = 0
    for category, products_list in PRODUCT_CATALOG.items():
        # Take 2-3 products per category for retailer
        for product_data in random.sample(products_list, min(3, len(products_list))):
            try:
                # Download images FIRST before creating product
                images_data = []
                num_images = random.randint(2, 4)
                for img_idx in range(num_images):
                    try:
                        image_bytes = download_image(
                            product_data["query"],
                            seed=retailer_count * 10 + img_idx + 1000,
                            unsplash_access_key=unsplash_access_key,
                        )
                        images_data.append(image_bytes)
                    except Exception as e:
                        logger.warning(
                            f"Failed to download image {img_idx} for {product_data['name']}: {e}"
                        )
                        break

                # Skip product creation if no images could be downloaded
                if not images_data:
                    logger.warning(
                        f"Skipping retailer product {product_data['name']} - no images available"
                    )
                    continue

                # Create product
                pricing_tiers = [
                    ProductPricingCreate(
                        buyer_type=BuyerType.CUSTOMER,
                        price=Decimal(str(random.uniform(100, 1000))).quantize(
                            Decimal("0.01")
                        ),
                        min_quantity=1,
                        max_quantity=random.choice([10, 20, 50]),
                    )
                ]

                product_in = ProductCreate(
                    name=f"{product_data['name']} - Premium",
                    description=f"Premium quality {product_data['name'].lower()}. {product_data['brand']} certified product with warranty.",
                    category=category,
                    pricing_tiers=pricing_tiers,
                    brand=product_data["brand"],
                    sku=None,
                    initial_stock=random.randint(50, 300),
                    tags=product_data["tags"] + ["retail", "premium"],
                    images=[],
                    address_id=retailer_address.id,
                )

                product = crud.create_product(
                    session=session,
                    product_in=product_in,
                    seller_id=multi_role_user_id,
                    seller_type=SellerType.RETAILER,
                )

                # Save downloaded images
                images = []
                for img_idx, image_bytes in enumerate(images_data):
                    img_dict = save_product_image(
                        product.id, image_bytes, img_idx, ".jpg"
                    )
                    images.append(img_dict)

                # Update product with images
                product.images = images
                session.add(product)
                session.commit()
                session.refresh(product)

                products_by_type["retailer"].append(product)
                retailer_count += 1
                logger.info(
                    f"Created retailer product: {product.name} with {len(images)} images"
                )

            except Exception as e:
                logger.error(
                    f"Failed to create retailer product {product_data['name']}: {e}"
                )
                session.rollback()

    logger.info(f"Created {retailer_count} retailer products")
    logger.info(f"Total products created: {wholesaler_count + retailer_count}")

    return products_by_type


def create_coupons(session: Session, customer_only_user_id: uuid.UUID) -> list[Coupon]:
    """Create various coupon codes for testing."""
    logger.info("Creating coupon codes...")

    customer_user = session.get(User, customer_only_user_id)

    coupons_data = [
        {
            "code": "WELCOME10",
            "discount_type": DiscountType.PERCENTAGE,
            "discount_value": Decimal("10.00"),
            "min_order_value": Decimal("500.00"),
            "valid_from": datetime.now() - timedelta(days=30),
            "valid_until": datetime.now() + timedelta(days=30),
            "is_active": True,
            "is_featured": True,
        },
        {
            "code": "FLAT100",
            "discount_type": DiscountType.FIXED,
            "discount_value": Decimal("100.00"),
            "min_order_value": Decimal("1000.00"),
            "usage_limit": 100,
            "valid_from": datetime.now() - timedelta(days=15),
            "valid_until": datetime.now() + timedelta(days=45),
            "is_active": True,
            "is_featured": True,
        },
        {
            "code": "SPECIAL25",
            "discount_type": DiscountType.PERCENTAGE,
            "discount_value": Decimal("25.00"),
            "max_discount": Decimal("500.00"),
            "min_order_value": Decimal("2000.00"),
            "valid_from": datetime.now() - timedelta(days=5),
            "valid_until": datetime.now() + timedelta(days=10),
            "is_active": True,
            "is_featured": False,
            "target_emails": [customer_user.email] if customer_user else None,
        },
        {
            "code": "EXPIRED50",
            "discount_type": DiscountType.FIXED,
            "discount_value": Decimal("50.00"),
            "valid_from": datetime.now() - timedelta(days=60),
            "valid_until": datetime.now() - timedelta(days=30),
            "is_active": False,
            "is_featured": False,
        },
        {
            "code": "SAVE200",
            "discount_type": DiscountType.FIXED,
            "discount_value": Decimal("200.00"),
            "min_order_value": Decimal("1500.00"),
            "usage_limit": 50,
            "valid_from": datetime.now() - timedelta(days=10),
            "valid_until": datetime.now() + timedelta(days=20),
            "is_active": True,
            "is_featured": False,
        },
    ]

    coupons = []
    for coupon_data in coupons_data:
        # Check if coupon already exists
        existing_coupon = crud.get_coupon_by_code(
            session=session, code=coupon_data["code"]
        )
        if existing_coupon:
            logger.info(f"Coupon {coupon_data['code']} already exists, skipping")
            coupons.append(existing_coupon)
            continue

        coupon_in = CouponCreate(**coupon_data)
        coupon = crud.create_coupon(session=session, coupon_in=coupon_in)
        coupons.append(coupon)
        logger.info(f"Created coupon: {coupon.code}")

    session.commit()
    logger.info(f"Loaded/Created {len(coupons)} coupons")

    return coupons


def create_orders_and_payments(
    session: Session,
    products: dict[str, list[Product]],
    addresses: dict,
    coupons: list[Coupon],
    multi_role_user_id: uuid.UUID,
    customer_only_user_id: uuid.UUID,
) -> list[Order]:
    """Create orders in various states with payments."""
    logger.info("Creating orders and payments...")

    orders = []

    # Customer buys from retailer (7 orders)
    logger.info("Creating customer orders from retailer...")
    retailer_products = products["retailer"]
    customer_address = addresses[customer_only_user_id][0]

    order_statuses = [
        OrderStatus.DELIVERED,
        OrderStatus.DELIVERED,
        OrderStatus.DELIVERED,
        OrderStatus.CONFIRMED,
        OrderStatus.OUT_FOR_DELIVERY,
        OrderStatus.PREPARING,
        OrderStatus.CANCELLED,
    ]

    for i, status in enumerate(order_statuses):
        try:
            # Select 1-3 random products
            num_items = random.randint(1, 3)
            selected_products = random.sample(
                retailer_products, min(num_items, len(retailer_products))
            )

            # Create cart items (simulate)

            cart = session.exec(
                select(Cart).where(Cart.user_id == customer_only_user_id)
            ).first()
            if not cart:
                cart = Cart(user_id=customer_only_user_id)
                session.add(cart)
                session.commit()
                session.refresh(cart)

            # Clear existing cart items
            for item in cart.items:
                session.delete(item)
            session.commit()

            # Add new items
            for product in selected_products:
                quantity = random.randint(1, 3)
                cart_item = CartItem(
                    cart_id=cart.id, product_id=product.id, quantity=quantity
                )
                session.add(cart_item)

            session.commit()
            session.refresh(cart)

            # Checkout with or without coupon
            coupon_code = None
            if i < 3 and coupons:  # Apply coupon to first 3 orders
                active_coupons = [
                    c
                    for c in coupons
                    if c.is_active and c.valid_from <= datetime.now() <= c.valid_until
                ]
                if active_coupons:
                    coupon_code = random.choice(active_coupons).code

            # Perform checkout
            customer_user = session.get(User, customer_only_user_id)
            created_orders = crud.create_orders_from_cart(
                session=session,
                user=customer_user,
                delivery_address_id=customer_address.id,
                coupon_code=coupon_code,
            )

            # Create payment
            payment = crud.create_unified_payment_for_orders(
                session=session,
                user=customer_user,
                orders=created_orders,
                coupon_code=coupon_code,
            )

            # Update payment status - all payments should be completed for demo
            payment.status = PaymentStatus.COMPLETED
            payment.razorpay_payment_id = f"pay_demo_{uuid.uuid4().hex[:16]}"
            session.add(payment)

            # Update order statuses
            for order in created_orders:
                order.order_status = status

                # Add delivery partner for delivered/in-transit orders
                if status in [
                    OrderStatus.DELIVERED,
                    OrderStatus.OUT_FOR_DELIVERY,
                    OrderStatus.PICKED_UP,
                ]:
                    order.delivery_partner_id = multi_role_user_id

                # Update timestamps for realism
                if status == OrderStatus.DELIVERED:
                    order.created_at = datetime.now() - timedelta(
                        days=random.randint(5, 30)
                    )
                    order.updated_at = datetime.now() - timedelta(
                        days=random.randint(1, 4)
                    )
                elif status == OrderStatus.CANCELLED:
                    order.created_at = datetime.now() - timedelta(
                        days=random.randint(1, 10)
                    )

                session.add(order)
                orders.extend(created_orders)

            session.commit()
            logger.info(
                f"Created customer order with status {status} ({len(created_orders)} order(s), payment: {payment.id})"
            )

            # Refresh orders to ensure they're loaded for review creation later
            for order in created_orders:
                session.refresh(order)

        except Exception as e:
            logger.error(f"Failed to create customer order {i}: {e}")
            session.rollback()

    # Retailer (multi-role user) buys from wholesaler (5 orders)
    logger.info("Creating retailer orders from wholesaler...")
    wholesaler_products = products["wholesaler"]
    retailer_address = (
        addresses[multi_role_user_id][1]
        if len(addresses[multi_role_user_id]) > 1
        else addresses[multi_role_user_id][0]
    )

    # Switch multi-role user to RETAILER role for wholesale purchases
    multi_role_user = session.get(User, multi_role_user_id)
    if multi_role_user.active_role != RoleEnum.RETAILER:
        crud.switch_active_role(
            session=session, user=multi_role_user, role=RoleEnum.RETAILER
        )
        session.refresh(multi_role_user)
        logger.info("Switched multi-role user to RETAILER role")

    retailer_statuses = [
        OrderStatus.DELIVERED,
        OrderStatus.DELIVERED,
        OrderStatus.CONFIRMED,
        OrderStatus.PREPARING,
        OrderStatus.READY_TO_SHIP,
    ]

    for i, status in enumerate(retailer_statuses):
        try:
            # Select 1-2 random wholesaler products
            num_items = random.randint(1, 2)
            selected_products = random.sample(
                wholesaler_products, min(num_items, len(wholesaler_products))
            )

            # Create cart for multi-role user
            cart = session.exec(
                select(Cart).where(Cart.user_id == multi_role_user_id)
            ).first()
            if not cart:
                cart = Cart(user_id=multi_role_user_id)
                session.add(cart)
                session.commit()
                session.refresh(cart)

            # Clear and add items
            for item in cart.items:
                session.delete(item)
            session.commit()

            for product in selected_products:
                # Retailer buying bulk
                quantity = random.randint(10, 50)
                cart_item = CartItem(
                    cart_id=cart.id, product_id=product.id, quantity=quantity
                )
                session.add(cart_item)

            session.commit()
            session.refresh(cart)

            # Checkout
            multi_role_user = session.get(User, multi_role_user_id)
            created_orders = crud.create_orders_from_cart(
                session=session,
                user=multi_role_user,
                delivery_address_id=retailer_address.id,
                coupon_code=None,
            )

            # Create payment
            payment = crud.create_unified_payment_for_orders(
                session=session,
                user=multi_role_user,
                orders=created_orders,
                coupon_code=None,
            )

            # Update payment and order status
            if status != OrderStatus.PENDING:
                payment.status = PaymentStatus.COMPLETED
                payment.razorpay_payment_id = f"pay_demo_{uuid.uuid4().hex[:16]}"
                session.add(payment)

            for order in created_orders:
                order.order_status = status

                if status == OrderStatus.DELIVERED:
                    order.created_at = datetime.now() - timedelta(
                        days=random.randint(10, 45)
                    )
                    order.updated_at = datetime.now() - timedelta(
                        days=random.randint(2, 9)
                    )

                session.add(order)
                orders.extend(created_orders)

            session.commit()
            logger.info(
                f"Created retailer order with status {status} ({len(created_orders)} order(s))"
            )

            # Refresh orders to ensure they're loaded for review creation later
            for order in created_orders:
                session.refresh(order)

        except Exception as e:
            logger.error(f"Failed to create retailer order {i}: {e}")
            session.rollback()

    logger.info(f"Created total {len(orders)} orders")
    return orders


def create_reviews(session: Session, orders: list[Order]) -> list[ProductReview]:
    """Create reviews for delivered products."""
    logger.info("Creating product reviews...")

    reviews = []
    review_titles = [
        "Excellent product!",
        "Good value for money",
        "Average quality",
        "Not satisfied",
        "Outstanding!",
        "Highly recommended",
        "Could be better",
        "Perfect!",
        "Decent product",
        "Loved it!",
    ]

    review_texts = [
        "This product exceeded my expectations. Highly recommended!",
        "Good quality and fast delivery. Will buy again.",
        "The product is okay, nothing special.",
        "Not worth the price. Quality could be better.",
        "Absolutely amazing! Best purchase ever.",
        "Great product, exactly as described.",
        "It's decent but there's room for improvement.",
        "Perfect! Exactly what I was looking for.",
        "Good product overall. Satisfied with the purchase.",
        "Love it! Great quality and value.",
    ]

    # Review only delivered orders
    delivered_orders = [o for o in orders if o.order_status == OrderStatus.DELIVERED]

    for order in delivered_orders:
        # Review 50-70% of delivered order items
        for item in order.items:
            if random.random() < 0.6 and item.product_id:  # 60% chance to review
                try:
                    rating = random.choices(
                        [1, 2, 3, 4, 5], weights=[5, 10, 15, 30, 40]
                    )[0]

                    review_in = ReviewCreate(
                        rating=rating,
                        title=random.choice(review_titles),
                        content=random.choice(review_texts),
                    )

                    review = crud.create_review(
                        session=session,
                        review_in=review_in,
                        product_id=item.product_id,
                        user_id=order.buyer_id,
                    )
                    reviews.append(review)
                    logger.info(
                        f"Created {rating}-star review for product {item.product_id}"
                    )

                except Exception as e:
                    logger.warning(f"Failed to create review: {e}")
                    session.rollback()

    session.commit()
    logger.info(f"Created {len(reviews)} reviews")
    return reviews


def create_settlements(
    session: Session, orders: list[Order], multi_role_user_id: uuid.UUID
) -> list[PaymentSettlement]:
    """Create settlements for completed orders."""
    logger.info("Creating settlements...")

    settlements = []

    # Seller settlements for multi-role user (as seller)
    seller_orders = [
        o
        for o in orders
        if o.seller_id == multi_role_user_id
        and o.order_status in [OrderStatus.CONFIRMED, OrderStatus.DELIVERED]
        and o.settlement_id is None
    ]

    if seller_orders:
        # Take about 70% of eligible orders for settlement
        orders_to_settle = random.sample(
            seller_orders, max(1, int(len(seller_orders) * 0.7))
        )
        order_ids = [str(o.id) for o in orders_to_settle]

        try:
            settlement_in = PaymentSettlementCreate(
                user_id=multi_role_user_id, order_ids=order_ids
            )
            settlement = crud.create_settlement(
                session=session, settlement_in=settlement_in
            )
            settlements.append(settlement)
            logger.info(
                f"Created seller settlement for {len(order_ids)} orders: ₹{settlement.net_amount}"
            )
        except Exception as e:
            logger.error(f"Failed to create seller settlement: {e}")
            session.rollback()

    # Delivery partner settlements
    delivery_orders = [
        o
        for o in orders
        if o.delivery_partner_id == multi_role_user_id
        and o.order_status == OrderStatus.DELIVERED
        and o.settlement_id is None
    ]

    if delivery_orders:
        # Settle about 60% of delivery orders
        orders_to_settle = random.sample(
            delivery_orders, max(1, int(len(delivery_orders) * 0.6))
        )
        order_ids = [str(o.id) for o in orders_to_settle]

        try:
            settlement_in = PaymentSettlementCreate(
                user_id=multi_role_user_id, order_ids=order_ids
            )
            settlement = crud.create_settlement(
                session=session, settlement_in=settlement_in
            )
            settlements.append(settlement)
            logger.info(
                f"Created delivery settlement for {len(order_ids)} orders: ₹{settlement.net_amount}"
            )
        except Exception as e:
            logger.error(f"Failed to create delivery settlement: {e}")
            session.rollback()

    session.commit()
    logger.info(f"Created {len(settlements)} settlements")
    return settlements


def clear_demo_data(
    session: Session, multi_role_user_id: uuid.UUID, customer_only_user_id: uuid.UUID
):
    """Clear existing demo data (optional)."""
    logger.warning("Clearing existing demo data...")

    # Note: Due to cascade deletes, we only need to delete top-level entities
    # Orders, Settlements, Reviews, Products, Addresses will cascade

    # Delete coupons
    coupons = session.exec(select(Coupon)).all()
    for coupon in coupons:
        session.delete(coupon)

    # Delete products (will cascade to inventory, pricing, order items, reviews)
    products = session.exec(select(Product)).all()
    for product in products:
        session.delete(product)

    # Delete addresses for our users
    addresses = session.exec(
        select(Address).where(
            Address.user_id.in_([multi_role_user_id, customer_only_user_id])
        )
    ).all()
    for address in addresses:
        session.delete(address)

    session.commit()
    logger.info("Demo data cleared")


def verify_users(
    session: Session, multi_role_user_id: uuid.UUID, customer_only_user_id: uuid.UUID
) -> bool:
    """Verify that required users exist in the database."""
    logger.info("Verifying users exist...")

    multi_role_user = session.get(User, multi_role_user_id)
    customer_user = session.get(User, customer_only_user_id)

    if not multi_role_user:
        logger.error(f"Multi-role user {multi_role_user_id} not found!")
        return False

    if not customer_user:
        logger.error(f"Customer user {customer_only_user_id} not found!")
        return False

    # Verify multi-role user has required roles
    roles = multi_role_user.get_roles()
    required_roles = {
        RoleEnum.CUSTOMER,
        RoleEnum.RETAILER,
        RoleEnum.WHOLESALER,
        RoleEnum.DELIVERY_PARTNER,
    }
    if not required_roles.issubset(set(roles)):
        logger.error(
            f"Multi-role user missing roles. Has: {roles}, needs: {required_roles}"
        )
        return False

    logger.info(f"✓ Multi-role user verified: {multi_role_user.email} (roles: {roles})")
    logger.info(f"✓ Customer user verified: {customer_user.email}")

    return True


def main():
    """Main execution function."""
    parser = argparse.ArgumentParser(
        description="Populate LiveMart database with demo data"
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear existing demo data before populating",
    )
    parser.add_argument(
        "--skip-products",
        action="store_true",
        help="Skip product creation (use existing products to avoid re-downloading images)",
    )
    parser.add_argument(
        "--multi-role-user-id",
        type=str,
        required=True,
        help="UUID of the user with multiple roles (CUSTOMER, RETAILER, WHOLESALER, DELIVERY_PARTNER)",
    )
    parser.add_argument(
        "--customer-user-id",
        type=str,
        required=True,
        help="UUID of the customer-only user",
    )
    parser.add_argument(
        "--unsplash-access-key",
        type=str,
        help="Unsplash API access key (optional, falls back to Lorem Picsum if not provided)",
    )
    args = parser.parse_args()

    # Parse user IDs
    try:
        multi_role_user_id = uuid.UUID(args.multi_role_user_id)
        customer_only_user_id = uuid.UUID(args.customer_user_id)
    except ValueError as e:
        logger.error(f"Invalid UUID format: {e}")
        sys.exit(1)

    logger.info("=" * 60)
    logger.info("LiveMart Demo Data Population Script")
    logger.info("=" * 60)

    try:
        with Session(engine) as session:
            # Verify users
            if not verify_users(session, multi_role_user_id, customer_only_user_id):
                logger.error("User verification failed. Exiting.")
                sys.exit(1)

            # Clear if requested
            if args.clear:
                clear_demo_data(session, multi_role_user_id, customer_only_user_id)

            # Create data
            logger.info("\nStarting data population...")

            # Step 1: Addresses
            addresses = create_addresses(
                session, multi_role_user_id, customer_only_user_id
            )

            # Step 2: Products with images
            if args.skip_products:
                logger.info("Skipping product creation, loading existing products...")
                # Load existing products
                wholesaler_products = session.exec(
                    select(Product)
                    .where(Product.seller_type == SellerType.WHOLESALER)
                    .where(Product.deleted_at.is_(None))
                ).all()
                retailer_products = session.exec(
                    select(Product)
                    .where(Product.seller_type == SellerType.RETAILER)
                    .where(Product.deleted_at.is_(None))
                ).all()
                products = {
                    "wholesaler": list(wholesaler_products),
                    "retailer": list(retailer_products),
                }
                logger.info(
                    f"Loaded {len(products['wholesaler'])} wholesaler and {len(products['retailer'])} retailer products"
                )
            else:
                products = create_products_with_images(
                    session, addresses, multi_role_user_id, args.unsplash_access_key
                )

            # Step 3: Coupons
            coupons = create_coupons(session, customer_only_user_id)

            # Step 4: Orders and payments
            orders = create_orders_and_payments(
                session,
                products,
                addresses,
                coupons,
                multi_role_user_id,
                customer_only_user_id,
            )

            # Step 5: Reviews
            reviews = create_reviews(session, orders)

            # Step 6: Settlements
            settlements = create_settlements(session, orders, multi_role_user_id)

            logger.info("\n" + "=" * 60)
            logger.info("DATA POPULATION COMPLETE!")
            logger.info("=" * 60)
            logger.info(
                f"✓ Addresses created: {sum(len(addrs) for addrs in addresses.values())}"
            )
            logger.info(f"✓ Wholesaler products: {len(products['wholesaler'])}")
            logger.info(f"✓ Retailer products: {len(products['retailer'])}")
            logger.info(f"✓ Coupons created: {len(coupons)}")
            logger.info(f"✓ Orders created: {len(orders)}")
            logger.info(f"✓ Reviews created: {len(reviews)}")
            logger.info(f"✓ Settlements created: {len(settlements)}")
            logger.info("=" * 60)

    except Exception as e:
        logger.error(f"Fatal error during data population: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
