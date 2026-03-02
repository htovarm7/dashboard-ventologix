"""
Google Cloud Storage utilities for photo uploads organized by client/folio/category.
Uses Service Account credentials (gcs-storage-key.json).
"""
import sys
from pathlib import Path
from google.cloud import storage
from google.oauth2 import service_account
from datetime import datetime

# Configure UTF-8 encoding for Windows console
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

# Configuration
SCRIPT_DIR = Path(__file__).resolve().parent.parent.parent
LIB_DIR = SCRIPT_DIR / "lib"
GCS_KEY_FILE = str(LIB_DIR / "gcs-storage-key.json")

BUCKET_NAME = "vento-save-archive"


def get_gcs_client():
    """Initialize and return a GCS Storage client using service account credentials."""
    credentials = service_account.Credentials.from_service_account_file(GCS_KEY_FILE)
    return storage.Client(credentials=credentials, project=credentials.project_id)


def get_bucket():
    """Return the GCS bucket instance."""
    return get_gcs_client().bucket(BUCKET_NAME)


def _make_public_url(blob_name: str) -> str:
    return f"https://storage.googleapis.com/{BUCKET_NAME}/{blob_name}"


def upload_photo(bucket, file_content: bytes, blob_name: str, mime_type: str = 'image/jpeg') -> dict:
    """
    Upload a single photo to GCS and return its public URL.

    Args:
        bucket: GCS bucket instance
        file_content: Photo file content (bytes)
        blob_name: Full GCS object path
        mime_type: MIME type of the file

    Returns:
        Dictionary with blob_name and public_url
    """
    try:
        blob = bucket.blob(blob_name)
        blob.upload_from_string(file_content, content_type=mime_type)
        try:
            blob.make_public()
        except Exception:
            pass  # Bucket may use uniform access; URL works if bucket is publicly readable

        public_url = _make_public_url(blob_name)
        print(f"✅ Uploaded: {blob_name}")
        return {"blob_name": blob_name, "public_url": public_url}

    except Exception as error:
        print(f"❌ Error uploading {blob_name}: {error}")
        raise


def upload_maintenance_photos(client_name: str, folio: str, photos_by_category: dict) -> dict:
    """
    Upload maintenance report photos organized by category to GCS.

    Path structure: {client_name}/{folio}/PHOTOS/{category}/{unique_filename}

    Args:
        client_name: Client name
        folio: Folio number
        photos_by_category: Dict with format:
            {
                "ACEITE": [(filename, file_content, mime_type), ...],
                "CONDICIONES_AMBIENTALES": [...],
                ...
            }

    Returns:
        Dictionary with uploaded file URLs by category
    """
    category_map = {
        "ACEITE": "ACEITE",
        "OIL": "ACEITE",
        "CONDICIONES_AMBIENTALES": "CONDICIONES_AMBIENTALES",
        "ENVIRONMENTAL": "CONDICIONES_AMBIENTALES",
        "DISPLAY": "DISPLAY_HORAS",
        "DISPLAY_HORAS": "DISPLAY_HORAS",
        "PLACAS": "PLACAS_EQUIPO",
        "PLACAS_EQUIPO": "PLACAS_EQUIPO",
        "TEMPERATURAS": "TEMPERATURAS",
        "TEMPERATURES": "TEMPERATURAS",
        "PRESIONES": "PRESIONES",
        "PRESSURES": "PRESIONES",
        "TANQUES": "TANQUES",
        "TANKS": "TANQUES",
        "MANTENIMIENTO": "MANTENIMIENTO",
        "MAINTENANCE": "MANTENIMIENTO",
        "OTROS": "OTROS",
        "OTHER": "OTROS",
    }

    try:
        bucket = get_bucket()
        now = datetime.now()
        year = now.strftime("%Y")
        month = now.strftime("%m")
        clean_client = client_name.strip().replace('/', '-')
        clean_folio = folio.strip().replace('/', '-')
        # Path: mantenimiento/{year}/{month}/{client_name}/{folio}/{category}/{filename}
        base_prefix = f"mantenimiento/{year}/{month}/{clean_client}/{clean_folio}"

        uploaded_files = {}

        for category, photos in photos_by_category.items():
            if not photos:
                continue

            category_key = category.upper().replace(" ", "_")
            standard_category = category_map.get(category_key, "OTROS")
            uploaded_files[category] = []

            print(f"\n📤 Uploading {len(photos)} photo(s) to {standard_category}")

            for idx, (filename, file_content, mime_type) in enumerate(photos):
                timestamp = now.strftime("%Y%m%d_%H%M%S")
                unique_filename = f"{clean_folio}_{timestamp}_{idx}_{filename}"
                blob_name = f"{base_prefix}/{standard_category}/{unique_filename}"

                file_info = upload_photo(bucket, file_content, blob_name, mime_type)

                uploaded_files[category].append({
                    "blob_name": file_info["blob_name"],
                    "filename": unique_filename,
                    "category": standard_category,
                    "public_url": file_info["public_url"],
                })

        print(f"\n✅ Successfully uploaded all photos for folio {folio}")
        return {
            "success": True,
            "gcs_prefix": base_prefix,
            "bucket": BUCKET_NAME,
            "uploaded_files": uploaded_files,
        }

    except Exception as error:
        print(f"❌ Error uploading maintenance photos: {error}")
        return {"success": False, "error": str(error)}


def list_gcs_photos_by_folio(client_name: str, folio: str) -> dict:
    """
    List photos from GCS organized by category for a given client/folio.

    Path structure: mantenimiento/{year}/{month}/{client_name}/{folio}/{category}/{filename}
    Searches across all year/month combinations under mantenimiento/.

    Returns:
        {
            "by_category": {"ACEITE": ["url1", ...], ...},
            "flat": ["url1", "url2", ...]
        }
    """
    try:
        client = get_gcs_client()
        clean_client = client_name.strip().replace('/', '-')
        clean_folio = folio.strip().replace('/', '-')

        # Search under mantenimiento/ and match /{client_name}/{folio}/ anywhere in path
        target_segment = f"/{clean_client}/{clean_folio}/"
        blobs = client.list_blobs(BUCKET_NAME, prefix="mantenimiento/")

        by_category = {}
        flat = []

        for blob in blobs:
            if target_segment not in blob.name:
                continue

            # Extract category: everything after {folio}/
            after_folio = blob.name.split(target_segment, 1)[1]
            parts = after_folio.split('/', 1)
            if len(parts) < 2 or not parts[1]:
                continue

            category = parts[0]
            public_url = _make_public_url(blob.name)
            by_category.setdefault(category, []).append(public_url)
            flat.append(public_url)

        return {"by_category": by_category, "flat": flat}

    except Exception as error:
        print(f"⚠️ Could not list GCS photos: {error}")
        return {"by_category": {}, "flat": []}
