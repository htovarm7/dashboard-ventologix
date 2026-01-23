"""
Setup script for Google Drive OAuth 2.0 authentication
This script helps you:
1. Create OAuth credentials in Google Cloud Console
2. Authenticate with your Google account
3. Generate the token for accessing Google Drive
"""
import sys
import os

def print_instructions():
    print("=" * 70)
    print("Google Drive OAuth 2.0 Setup")
    print("=" * 70)
    print()
    print("STEP 1: Create OAuth Credentials in Google Cloud Console")
    print("-" * 70)
    print("1. Go to: https://console.cloud.google.com/apis/credentials?project=kpm37prueba")
    print()
    print("2. Click 'CREATE CREDENTIALS' -> 'OAuth client ID'")
    print()
    print("3. If prompted to configure OAuth consent screen:")
    print("   a. Click 'CONFIGURE CONSENT SCREEN'")
    print("   b. Select 'External' (or 'Internal' if you have Workspace)")
    print("   c. Fill in:")
    print("      - App name: 'Dashboard Ventologix'")
    print("      - User support email: your email")
    print("      - Developer contact: your email")
    print("   d. Click 'SAVE AND CONTINUE' through all steps")
    print("   e. Go back to Credentials page")
    print()
    print("4. Create OAuth Client ID:")
    print("   a. Application type: 'Desktop app'")
    print("   b. Name: 'Dashboard Ventologix OAuth'")
    print("   c. Click 'CREATE'")
    print()
    print("5. Click 'DOWNLOAD JSON' button")
    print()
    print("6. Save the downloaded file as:")
    print("   'oauth_credentials.json' in the 'lib/' folder")
    print()
    print("=" * 70)
    print()

    response = input("Have you completed Step 1? (yes/no): ").strip().lower()
    if response != 'yes':
        print("\nPlease complete Step 1 first, then run this script again.")
        return False

    return True

def check_oauth_file():
    oauth_file = os.path.join(os.path.dirname(__file__), 'lib', 'oauth_credentials.json')

    if not os.path.exists(oauth_file):
        print()
        print("❌ ERROR: oauth_credentials.json not found!")
        print(f"   Expected location: {oauth_file}")
        print()
        print("Please download the OAuth credentials from Google Cloud Console")
        print("and save it as 'oauth_credentials.json' in the 'lib/' folder.")
        return False

    print()
    print(f"✅ Found OAuth credentials: {oauth_file}")
    return True

def generate_token():
    print()
    print("=" * 70)
    print("STEP 2: Generate OAuth Token")
    print("=" * 70)
    print()
    print("This will open a browser window for authentication.")
    print("You'll need to:")
    print("1. Sign in with your Google account")
    print("2. Grant access to Google Drive")
    print("3. The token will be saved automatically")
    print()

    input("Press ENTER to continue...")

    try:
        # Import here to avoid errors if dependencies not installed
        from scripts.api.drive_utils import get_drive_service

        print()
        print("Initializing Google Drive service...")
        print("(A browser window should open shortly)")
        print()

        service = get_drive_service()

        # Test the connection
        print()
        print("Testing connection...")
        about = service.about().get(fields="user").execute()
        user_email = about['user']['emailAddress']

        print()
        print("=" * 70)
        print("✅ SUCCESS! OAuth setup complete!")
        print("=" * 70)
        print(f"Authenticated as: {user_email}")
        print()
        print("Your token has been saved and will be used for future uploads.")
        print("You're ready to upload photos to Google Drive!")
        print()

        return True

    except Exception as e:
        print()
        print("=" * 70)
        print("❌ ERROR during authentication")
        print("=" * 70)
        print(f"Error: {e}")
        print()
        import traceback
        traceback.print_exc()
        return False

def main():
    print()

    # Step 1: Show instructions
    if not print_instructions():
        sys.exit(1)

    # Step 2: Check if OAuth credentials file exists
    if not check_oauth_file():
        sys.exit(1)

    # Step 3: Generate token
    if not generate_token():
        sys.exit(1)

    print()
    print("Setup complete! You can now use the photo upload functionality.")
    print()

if __name__ == "__main__":
    main()
