'use client'

import layout from

const Login = () => {
    const [mail, setMail] = useState("");
    const [password, setPassword] = useState("");
    return (  
        <form className="form">
            <h1>Ingresa</h1>
            <label>Correo</label>
            <input type="text"/>

            <label>Contraseña</label>
            <input type="text"/>

            <button>Acceder</button>
        </form>
    );
}
 
export default Login;