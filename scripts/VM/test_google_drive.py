"""
Script de prueba para verificar la configuración de Google Drive API
"""

import os
import sys
from datetime import datetime

# Agregar el directorio padre al path para importar el módulo automation
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from automation import authenticate_google_drive, upload_to_google_drive, GOOGLE_DRIVE_FOLDER_ID
except ImportError as e:
    print(f"Error importando automation.py: {e}")
    sys.exit(1)

def test_google_drive_connection():
    """Prueba la conexión con Google Drive"""
    print("🔍 Probando autenticación con Google Drive...")
    
    # Probar autenticación
    creds = authenticate_google_drive()
    if not creds:
        print("❌ Error en la autenticación con Google Drive")
        return False
    
    print("✅ Autenticación exitosa con Google Drive")
    
    # Crear un archivo de prueba
    test_file = "test_ventologix.txt"
    with open(test_file, 'w') as f:
        f.write(f"Archivo de prueba creado el {datetime.now()}\n")
        f.write("Este archivo fue subido por el script de Ventologix\n")
    
    print(f"📄 Archivo de prueba creado: {test_file}")
    
    # Probar subida
    print(f"📤 Subiendo archivo a Google Drive (Folder ID: {GOOGLE_DRIVE_FOLDER_ID})...")
    success = upload_to_google_drive(test_file, GOOGLE_DRIVE_FOLDER_ID)
    
    # Limpiar archivo de prueba
    try:
        os.remove(test_file)
        print(f"🗑️ Archivo de prueba eliminado localmente")
    except Exception as e:
        print(f"⚠️ No se pudo eliminar el archivo de prueba: {e}")
    
    if success:
        print("✅ Prueba completada exitosamente!")
        print("El sistema está listo para subir PDFs semanales a Google Drive")
        return True
    else:
        print("❌ Error en la subida del archivo de prueba")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("PRUEBA DE CONFIGURACIÓN DE GOOGLE DRIVE API")
    print("=" * 60)
    
    if test_google_drive_connection():
        print("\n🎉 Configuración exitosa!")
        print("Ahora puedes ejecutar automation.py para generar y subir PDFs semanales")
    else:
        print("\n💡 Revisa el archivo GOOGLE_DRIVE_SETUP.md para ver las instrucciones de configuración")
    
    print("=" * 60)
