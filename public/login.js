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
        
        // El nombre del restaurante lo pediremos después o lo asignaremos por defecto
        const datos = {
            nombre_usuario: nombre,
            nombre_restaurante: `${nombre}'s Restaurant`, // Placeholder
            correo_usuario: correo,
            contra: contrasena
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
            alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
            formcuenta.reset();
            // Cambiamos al panel de inicio de sesión
            container.classList.remove("rightpanelactive"); 
        } catch (error) {
            registererror.textContent = error.message;
        }
    });

    // --- Formulario de Inicio de Sesión (Actualizado) ---
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
                credentials: 'include' // Importante para enviar/recibir cookies
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Credenciales incorrectas.');
            }
            // SI EL LOGIN ES EXITOSO, REDIRIGE AL DASHBOARD
            window.location.href = '/restaurante.html';

        } catch (error) {
            loginerror.textContent = error.message;
        }
    });
});