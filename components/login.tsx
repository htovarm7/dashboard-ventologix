'use client'

const Login = () => {
    return (  
        <div className="login-container centered">
            <form className="login-form">
            <h1 className="login-title">Ingresa</h1>
            <div className="form-group">
                <label htmlFor="email" className="form-label">Correo</label>
                <input type="email" id="email" name="email" className="form-input" />
            </div>
            <div className="form-group">
                <label htmlFor="password" className="form-label">Contraseña</label>
                <input type="password" id="password" name="password" className="form-input" />
            </div>
            <button type="submit" className="form-button">Acceder</button>
            </form>
        </div>
    );
}
 
export default Login;