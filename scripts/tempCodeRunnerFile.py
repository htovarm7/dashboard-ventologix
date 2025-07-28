    try:
        with smtplib.SMTP(smtp_server, smtp_port) as smtp:
            smtp.set_debuglevel(1)  # 🔍 VER MÁS DETALLES
            smtp.starttls()
            smtp.login(from_address, smtp_password)
            smtp.send_message(msg)
        print(f"Correo enviado con {os.path.basename(pdf_file_path)}")
    except Exception as e:
        print(f"❌ Error al enviar el correo: {e}")