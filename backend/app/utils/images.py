import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.models.product import ProductImageSchema

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def validate_image(file: UploadFile) -> None:
    """
    Validate uploaded image file.
    Checks MIME type and file size.
    """
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_IMAGE_TYPES)}",
        )

    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB",
        )


def save_product_image(
    *, product_id: uuid.UUID, file: UploadFile, order: int
) -> ProductImageSchema:
    """
    Save uploaded product image to filesystem.
    Creates directory structure: static/products/{product_id}/
    Returns ProductImageSchema with relative path.
    """
    validate_image(file)

    base_dir = Path("app/static/products")
    product_dir = base_dir / str(product_id)
    product_dir.mkdir(parents=True, exist_ok=True)

    file_extension = Path(file.filename or "image.jpg").suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = product_dir / unique_filename

    with open(file_path, "wb") as buffer:
        content = file.file.read()
        buffer.write(content)

    relative_path = f"/static/products/{product_id}/{unique_filename}"

    return ProductImageSchema(
        path=relative_path,
        order=order,
        is_primary=False,  # Will be set by caller if needed
    )


def delete_product_image(*, image_path: str) -> None:
    """
    Delete product image from filesystem.
    Accepts relative path like /static/products/{product_id}/{filename}
    """
    if image_path.startswith("/static/"):
        image_path = image_path[len("/static/") :]

    file_path = Path("app/static") / image_path

    if file_path.exists() and file_path.is_file():
        file_path.unlink()


def ensure_primary_image(images: list[dict]) -> list[dict]:
    """
    Ensure exactly one image is marked as primary.
    If no primary exists, mark first image as primary.
    If multiple primaries exist, keep only the first one.
    """
    if not images:
        return images

    primary_indices = [i for i, img in enumerate(images) if img.get("is_primary")]

    if not primary_indices:
        images[0]["is_primary"] = True
    elif len(primary_indices) > 1:
        for i in primary_indices[1:]:
            images[i]["is_primary"] = False

    return images


def reorder_images(
    *, current_images: list[dict], new_order: list[ProductImageSchema]
) -> list[dict]:
    """
    Reorder product images based on new order list.
    Validates that all images in new_order exist in current_images.
    """
    current_by_path = {img["path"]: img for img in current_images}

    for new_img in new_order:
        if new_img.path not in current_by_path:
            raise ValueError(f"Image not found: {new_img.path}")

    reordered = []
    for new_img in new_order:
        img_dict = {
            "path": new_img.path,
            "order": new_img.order,
            "is_primary": new_img.is_primary,
        }
        reordered.append(img_dict)

    return ensure_primary_image(reordered)
