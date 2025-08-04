#!/usr/bin/env python3
"""
Script de diagnóstico para problemas de Google Drive API
"""

import os
import json
import sys

def check_credentials_file():
    """Verifica el archivo credentials.json"""
    creds_file = "credentials.json"
    
    print("🔍 Verificando archivo credentials.json...")
    
    if not os.path.exists(creds_file):
        print("❌ No se encontró credentials.json")
        print("💡 Descarga el archivo desde Google Cloud Console")
        return False
    
    try:
        with open(creds_file, 'r') as f:
            creds_data = json.load(f)
        
        # Verificar estructura del archivo
        if 'installed' in creds_data:
            client_type = "Aplicación de escritorio ✅"
            client_info = creds_data['installed']
        elif 'web' in creds_data:
            client_type = "Aplicación web ❌ (debería ser de escritorio)"
            client_info = creds_data['web']
        else:
            print("❌ Estructura de credentials.json no reconocida")
            return False
        
        print(f"✅ Archivo credentials.json encontrado")
        print(f"📋 Tipo de cliente: {client_type}")
        print(f"🆔 Client ID: {client_info.get('client_id', 'No encontrado')}")
        
        # Verificar redirect URIs si existen
        redirect_uris = client_info.get('redirect_uris', [])
        if redirect_uris:
            print(f"🔗 URIs de redirección configuradas:")
            for uri in redirect_uris:
                print(f"   - {uri}")
        else:
            print("ℹ️ No hay URIs de redirección configuradas (normal para aplicaciones de escritorio)")
        
        return 'installed' in creds_data
        
    except json.JSONDecodeError:
        print("❌ Error: credentials.json no es un JSON válido")
        return False
    except Exception as e:
        print(f"❌ Error leyendo credentials.json: {e}")
        return False

def check_token_file():
    """Verifica el archivo token.json"""
    token_file = "token.json"
    
    print("\n🔍 Verificando archivo token.json...")
    
    if not os.path.exists(token_file):
        print("ℹ️ No se encontró token.json (se creará durante la primera autenticación)")
        return True
    
    try:
        with open(token_file, 'r') as f:
            token_data = json.load(f)
        
        print("✅ Archivo token.json encontrado")
        
        # Verificar campos importantes
        required_fields = ['token', 'client_id', 'client_secret']
        for field in required_fields:
            if field in token_data:
                print(f"✅ {field}: presente")
            else:
                print(f"❌ {field}: faltante")
        
        return True
        
    except json.JSONDecodeError:
        print("❌ Error: token.json no es un JSON válido")
        print("💡 Elimina el archivo token.json y vuelve a autenticarte")
        return False
    except Exception as e:
        print(f"❌ Error leyendo token.json: {e}")
        return False

def provide_solutions():
    """Proporciona soluciones paso a paso"""
    print("\n🛠️ SOLUCIONES PARA ERROR 400: redirect_uri_mismatch")
    print("=" * 60)
    
    print("\n1️⃣ Verifica el tipo de aplicación:")
    print("   - Ve a Google Cloud Console > APIs y servicios > Credenciales")
    print("   - Tu OAuth 2.0 Client ID debe ser tipo 'Desktop application'")
    print("   - Si dice 'Web application', elimínalo y crea uno nuevo")
    
    print("\n2️⃣ Configura las URIs de redirección:")
    print("   - Edita tu OAuth 2.0 Client ID")
    print("   - En 'Authorized redirect URIs', agrega:")
    print("     • http://localhost:8080/")
    print("     • http://127.0.0.1:8080/")
    print("     • urn:ietf:wg:oauth:2.0:oob")
    
    print("\n3️⃣ Descarga nuevas credenciales:")
    print("   - Descarga el JSON actualizado")
    print("   - Reemplaza tu archivo credentials.json")
    
    print("\n4️⃣ Limpia archivos anteriores:")
    print("   - Elimina token.json si existe")
    print("   - Ejecuta el script de prueba nuevamente")
    
    print("\n5️⃣ Comandos para limpiar y probar:")
    print("   Remove-Item token.json -ErrorAction SilentlyContinue")
    print("   python test_google_drive.py")

def main():
    print("=" * 60)
    print("DIAGNÓSTICO DE GOOGLE DRIVE API")
    print("=" * 60)
    
    # Cambiar al directorio del script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    all_good = True
    
    # Verificar credentials.json
    if not check_credentials_file():
        all_good = False
    
    # Verificar token.json
    if not check_token_file():
        all_good = False
    
    if not all_good:
        provide_solutions()
    else:
        print("\n✅ Configuración parece correcta")
        print("💡 Si sigues teniendo problemas, ejecuta:")
        print("   Remove-Item token.json -ErrorAction SilentlyContinue")
        print("   python test_google_drive.py")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
