"""
Google Drive utilities for photo uploads organized by client/folio/category
Uses OAuth 2.0 with user credentials for accessing Google Drive
"""
import os
import pickle
from pathlib import Path
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from googleapiclient.errors import HttpError
import io
from datetime import datetime

# Configuration
SCRIPT_DIR = Path(__file__).resolve().parent.parent.parent
LIB_DIR = SCRIPT_DIR / "lib"
OAUTH_CREDENTIALS_FILE = str(LIB_DIR / "oauth_credentials.json")
TOKEN_FILE = str(LIB_DIR / "token.pickle")

# Root folder ID for maintenance reports photos
ROOT_FOLDER_ID = "1go0dsxXDmJ5FyHiUmVa4oXwacIh690g5"

SCOPES = ["https://www.googleapis.com/auth/drive.file"]

def get_drive_service():
    """Initialize and return Google Drive service using OAuth 2.0."""
    print(f"🔐 Initializing Google Drive service with OAuth 2.0...")
    print(f"   Token file: {TOKEN_FILE}")

    try:
        creds = None

        # Load existing token if available
        if os.path.exists(TOKEN_FILE):
            with open(TOKEN_FILE, 'rb') as token:
                creds = pickle.load(token)
                print(f"   ✓ Loaded existing token")

        # If no valid credentials, need to login
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                print(f"   ⟳ Refreshing expired token...")
                creds.refresh(Request())
                print(f"   ✓ Token refreshed")
            else:
                if not os.path.exists(OAUTH_CREDENTIALS_FILE):
                    raise FileNotFoundError(
                        f"OAuth credentials not found at {OAUTH_CREDENTIALS_FILE}\n"
                        "Please create OAuth credentials in Google Cloud Console"
                    )

                print(f"   ⚠ No valid token found, authentication required")
                print(f"   Opening browser for authentication...")
                flow = InstalledAppFlow.from_client_secrets_file(
                    OAUTH_CREDENTIALS_FILE, SCOPES
                )
                creds = flow.run_local_server(port=0)
                print(f"   ✓ Authentication successful")

            # Save the credentials for next run
            with open(TOKEN_FILE, 'wb') as token:
                pickle.dump(creds, token)
                print(f"   ✓ Token saved")

        service = build('drive', 'v3', credentials=creds)
        print(f"✅ Google Drive service initialized successfully")
        return service

    except FileNotFoundError as e:
        print(f"❌ File not found: {e}")
        raise
    except Exception as e:
        print(f"❌ Error initializing Google Drive service: {e}")
        import traceback
        traceback.print_exc()
        raise

def get_or_create_folder(drive_service, parent_id: str, folder_name: str) -> str:
    """
    Get folder ID if exists, create it if not.
    
    Args:
        drive_service: Google Drive service instance
        parent_id: Parent folder ID
        folder_name: Name of folder to get/create
    
    Returns:
        Folder ID
    """
    try:
        # Search for existing folder
        query = f"'{parent_id}' in parents and name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        
        results = drive_service.files().list(
            q=query,
            fields="files(id, name)",
            spaces='drive',
            pageSize=10
        ).execute()
        
        files = results.get('files', [])
        
        if files:
            print(f"📁 Found existing folder: {folder_name} (ID: {files[0]['id']})")
            return files[0]['id']
        
        # Create folder if not exists
        file_metadata = {
            'name': folder_name,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [parent_id]
        }
        
        folder = drive_service.files().create(
            body=file_metadata,
            fields='id'
        ).execute()
        
        print(f"✅ Created new folder: {folder_name} (ID: {folder['id']})")
        return folder['id']
        
    except HttpError as error:
        print(f"❌ Error creating/getting folder {folder_name}: {error}")
        raise

def create_folder_structure(drive_service, client_name: str, folio: str) -> dict:
    """
    Create the folder structure: Root / Client Name / Folio / PHOTOS / Categories
    
    Args:
        drive_service: Google Drive service instance
        client_name: Client name
        folio: Folio number
    
    Returns:
        Dictionary with folder IDs for each category
    """
    try:
        # Clean client name and folio for folder names
        clean_client = client_name.strip().replace('/', '-')
        clean_folio = folio.strip().replace('/', '-')
        
        # Create client folder
        client_folder_id = get_or_create_folder(drive_service, ROOT_FOLDER_ID, clean_client)
        
        # Create folio folder
        folio_folder_id = get_or_create_folder(drive_service, client_folder_id, clean_folio)
        
        # Create PHOTOS folder
        photos_folder_id = get_or_create_folder(drive_service, folio_folder_id, "PHOTOS")
        
        # Create category folders
        categories = [
            "ACEITE",
            "CONDICIONES_AMBIENTALES",
            "DISPLAY_HORAS",
            "PLACAS_EQUIPO",
            "TEMPERATURAS",
            "PRESIONES",
            "TANQUES",
            "MANTENIMIENTO",
            "OTROS"
        ]
        
        folder_structure = {
            "client_folder_id": client_folder_id,
            "folio_folder_id": folio_folder_id,
            "photos_folder_id": photos_folder_id,
            "categories": {}
        }
        
        for category in categories:
            category_folder_id = get_or_create_folder(drive_service, photos_folder_id, category)
            folder_structure["categories"][category] = category_folder_id
        
        return folder_structure
        
    except Exception as error:
        print(f"❌ Error creating folder structure: {error}")
        raise

def upload_photo(drive_service, file_content: bytes, filename: str, folder_id: str, mime_type: str = 'image/jpeg') -> dict:
    """
    Upload a photo to a specific folder in Google Drive.
    
    Args:
        drive_service: Google Drive service instance
        file_content: Photo file content (bytes)
        filename: Name for the file
        folder_id: Destination folder ID
        mime_type: MIME type of the file
    
    Returns:
        Dictionary with file ID and web view link
    """
    try:
        file_metadata = {
            'name': filename,
            'parents': [folder_id]
        }
        
        # Create media upload from bytes
        media = MediaIoBaseUpload(
            io.BytesIO(file_content),
            mimetype=mime_type,
            resumable=True
        )
        
        # Upload file
        file = drive_service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, name, webViewLink, webContentLink'
        ).execute()
        
        print(f"✅ Uploaded: {filename} (ID: {file['id']})")
        return {
            "file_id": file['id'],
            "name": file['name'],
            "web_view_link": file.get('webViewLink', ''),
            "web_content_link": file.get('webContentLink', '')
        }
        
    except HttpError as error:
        print(f"❌ Error uploading photo {filename}: {error}")
        raise

def upload_maintenance_photos(client_name: str, folio: str, photos_by_category: dict) -> dict:
    """
    Upload maintenance report photos organized by category.
    
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
        Dictionary with uploaded file IDs by category
    """
    try:
        drive_service = get_drive_service()
        
        # Create folder structure
        print(f"\n📁 Creating folder structure for {client_name} / {folio}")
        folder_structure = create_folder_structure(drive_service, client_name, folio)
        
        uploaded_files = {}
        
        # Upload photos to their respective categories
        for category, photos in photos_by_category.items():
            if not photos:
                continue
            
            category_key = category.upper().replace(" ", "_")
            
            # Map to standard category names
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
                "OTHER": "OTROS"
            }
            
            standard_category = category_map.get(category_key, "OTROS")
            
            if standard_category not in folder_structure["categories"]:
                print(f"⚠️ Category {standard_category} not found in folder structure, using OTROS")
                standard_category = "OTROS"
            
            folder_id = folder_structure["categories"][standard_category]
            uploaded_files[category] = []
            
            print(f"\n📤 Uploading {len(photos)} photo(s) to {standard_category}")
            
            for idx, (filename, file_content, mime_type) in enumerate(photos):
                # Add timestamp to filename to avoid duplicates
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                unique_filename = f"{folio}_{timestamp}_{idx}_{filename}"
                
                file_info = upload_photo(
                    drive_service,
                    file_content,
                    unique_filename,
                    folder_id,
                    mime_type
                )
                
                uploaded_files[category].append({
                    "file_id": file_info["file_id"],
                    "filename": unique_filename,
                    "category": standard_category,
                    "web_view_link": file_info.get("web_view_link", ""),
                    "web_content_link": file_info.get("web_content_link", "")
                })
        
        print(f"\n✅ Successfully uploaded all photos for folio {folio}")
        
        return {
            "success": True,
            "folder_structure": folder_structure,
            "uploaded_files": uploaded_files
        }
        
    except Exception as error:
        print(f"❌ Error uploading maintenance photos: {error}")
        return {
            "success": False,
            "error": str(error)
        }
