# Configuración de Google Drive API

Para que el script pueda subir PDFs semanales a Google Drive, necesitas configurar la API de Google Drive.

## Pasos para configurar:

### 1. Crear un proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. En el panel de navegación, ve a "APIs y servicios" > "Biblioteca"
4. Busca "Google Drive API" y habilítala

### 2. Crear credenciales

1. Ve a "APIs y servicios" > "Credenciales"
2. Haz clic en "Crear credenciales" > "ID de cliente de OAuth 2.0"
3. **IMPORTANTE**: Selecciona "Aplicación de escritorio" (NO aplicación web)
4. Dale un nombre (ej: "Ventologix PDF Uploader")
5. En "URIs de redirección autorizados", NO agregues nada (debe estar vacío para aplicaciones de escritorio)
6. Haz clic en "Crear"
7. Descarga el archivo JSON de credenciales

### 2.1. Solución para Error 400: redirect_uri_mismatch

Si obtienes el error "redirect_uri_mismatch", sigue estos pasos:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Navega a "APIs y servicios" > "Credenciales"
3. Encuentra tu ID de cliente OAuth 2.0 y haz clic en el ícono de edición (lápiz)
4. **Verifica que el tipo sea "Aplicación de escritorio"**
5. Si aparece como "Aplicación web", elimínalo y crea uno nuevo como "Aplicación de escritorio"
6. En la sección "URIs de redirección autorizados", agrega estas URIs una por una:
   - `http://localhost:8080/`
   - `http://127.0.0.1:8080/`
   - `urn:ietf:wg:oauth:2.0:oob`
7. Guarda los cambios
8. Descarga el nuevo archivo de credenciales

### 3. Configurar el archivo de credenciales

1. Renombra el archivo descargado a `credentials.json`
2. Colócalo en la carpeta `scripts/VM/` junto al archivo `automation.py`

### 4. Primera autenticación

La primera vez que ejecutes el script:

1. Se abrirá una ventana del navegador
2. Inicia sesión con tu cuenta de Google
3. Autoriza el acceso a Google Drive
4. Se creará automáticamente un archivo `token.json` para futuras ejecuciones

## Carpeta de destino

Los PDFs semanales se subirán a esta carpeta de Google Drive:
https://drive.google.com/drive/folders/19YM9co-kyogK7iXeJ-Wwq1VnrICr50Xk

## Estructura de archivos necesaria:

```
scripts/VM/
├── automation.py
├── credentials.json  (descargado de Google Cloud Console)
├── token.json        (se crea automáticamente después de la primera autenticación)
└── GOOGLE_DRIVE_SETUP.md
```

## Notas importantes:

- El archivo `credentials.json` contiene información sensible, no lo subas a repositorios públicos
- El archivo `token.json` también es sensible y se genera automáticamente
- Asegúrate de que la cuenta de Google tenga acceso de escritura a la carpeta de destino
