document.addEventListener('DOMContentLoaded', () => {
    const signUpButton = document.getElementById('signUpBtn');
    const signInButton = document.getElementById('signInBtn');
    const container = document.getElementById('container');
    const formsesion = document.getElementById('formsesion');
    const formcuenta = document.getElementById('formcuenta');
    const loginerror = document.getElementById('loginerror');
    const registererror = document.getElementById('registererror');

    // --- VERIFICAR SESIÓN AL CARGAR ---
    async function verificarSesion() {
        try {
            const respuesta = await fetch('/api/auth/status', {credentials: 'include'}); // Include credentials for cookies
            if (respuesta.ok) {
                // Si la sesión es válida, redirige al dashboard
                window.location.href = '/restaurante.html';
            }
            // Si no está ok (401), no hace nada y muestra el login
        } catch (error) {
            console.error('Error verificando sesión:', error);
            // Podrías mostrar un mensaje si falla la conexión con el servidor
        }
    }
    verificarSesion(); // Llama a la función al cargar la página

    // --- Lógica de Animación --- (sin cambios)
    signUpButton.addEventListener('click', () => container.classList.add("rightpanelactive"));
    signInButton.addEventListener('click', () => container.classList.remove("rightpanelactive"));

    formcuenta.addEventListener('submit', async (e) => {
        e.preventDefault();
        registererror.textContent = '';

        const nombre = document.getElementById('registername').value;
        const correo = document.getElementById('registeremail').value;
        const contrasena = document.getElementById('registerpassword').value;
        const rol = document.getElementById('registerrol').value; // Nuevo campo
        
        // El 'nombre_restaurante' ya no es necesario
        const datos = {
            nombre_usuario: nombre,
            correo_usuario: correo,
            contra: contrasena,
            rol: rol
        };

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Error en el registro.');
            }
            alert('¡Cuenta de empleado creada! Ahora puedes iniciar sesión.');
            formcuenta.reset();
            container.classList.remove("rightpanelactive"); 
        } catch (error) {
            registererror.textContent = error.message;
        }
    });

    // --- Formulario de Inicio de Sesión (Actualizado con Redirección por Rol) ---
    formsesion.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginerror.textContent = '';
        const correo = document.getElementById('loginemail').value;
        const contrasena = document.getElementById('loginpassword').value;
        const datos = { correo_usuario: correo, contra: contrasena };
        
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos),
                credentials: 'include' 
            });

            const data = await res.json(); // data = { message: '...', rol: '...' }
            
            if (!res.ok) {
                throw new Error(data.message || 'Credenciales incorrectas.');
            }

            if (data.rol === 'dueño') {
                window.location.href = '/restaurante.html';
            } else if (data.rol === 'cocinero') {
                window.location.href = '/cocina.html';
            } else if (data.rol === 'mesero') {
                window.location.href = '/mesero.html'; // Nueva página
            } 

        } catch (error) {
            loginerror.textContent = error.message;
        }
    });
});