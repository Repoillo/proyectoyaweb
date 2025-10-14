document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos para la animación ---
    const signUpButton = document.getElementById('signUpBtn');
    const signInButton = document.getElementById('signInBtn');
    const container = document.getElementById('container');

    // --- Elementos para los formularios ---
    const formsesion = document.getElementById('formsesion');
    const formcuenta = document.getElementById('formcuenta');
    const loginerror = document.getElementById('loginerror');
    const registererror = document.getElementById('registererror');

    // --- Lógica de Animación ---
    signUpButton.addEventListener('click', () => {
        container.classList.add("rightpanelactive");
    });

    signInButton.addEventListener('click', () => {
        container.classList.remove("rightpanelactive");
    });

    // --- Lógica para enviar el formulario de Registro ---
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

    // --- Lógica para enviar el formulario de Inicio de Sesión ---
    formsesion.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginerror.textContent = '';

        const correo = document.getElementById('loginemail').value;
        const contrasena = document.getElementById('loginpassword').value;
        
        const datos = {
            correo_usuario: correo,
            contra: contrasena
        };

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Credenciales incorrectas.');
            }
            if (data.token) {
                localStorage.setItem('authToken', data.token);
                window.location.href = '/restaurante.html';
            } else {
                 throw new Error('No se recibió un token de autenticación.');
            }
        } catch (error) {
            loginerror.textContent = error.message;
        }
    });
});