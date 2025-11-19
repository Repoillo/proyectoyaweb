document.addEventListener('DOMContentLoaded', () => {
    const signUpButton = document.getElementById('signUpBtn');
    const signInButton = document.getElementById('signInBtn');
    const container = document.getElementById('container');
    const formsesion = document.getElementById('formsesion');
    const formcuenta = document.getElementById('formcuenta');
    const loginerror = document.getElementById('loginerror');
    const registererror = document.getElementById('registererror');

    // --- 1. VERIFICAR SESIÓN INTELIGENTE AL CARGAR ---
    async function verificarSesion() {
        try {
            const respuesta = await fetch('/api/auth/status', {credentials: 'include'});
            if (respuesta.ok) {
                const data = await respuesta.json();
                // Redirección basada en el rol, no genérica
                if (data.rol === 'dueño') window.location.href = '/restaurante.html';
                else if (data.rol === 'cocinero') window.location.href = '/cocina.html';
                else if (data.rol === 'mesero') window.location.href = '/mesero.html';
            }
        } catch (error) {
            console.error('Error verificando sesión:', error);
        }
    }
    verificarSesion(); 

    // --- Lógica de Animación --- 
    signUpButton.addEventListener('click', () => container.classList.add("rightpanelactive"));
    signInButton.addEventListener('click', () => container.classList.remove("rightpanelactive"));

    // --- Registro ---
    formcuenta.addEventListener('submit', async (e) => {
        e.preventDefault();
        registererror.textContent = '';

        const nombre = document.getElementById('registername').value;
        const correo = document.getElementById('registeremail').value;
        const contrasena = document.getElementById('registerpassword').value;
        const rol = document.getElementById('registerrol').value;
        
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
            alert('¡Cuenta creada! Ahora puedes iniciar sesión.');
            formcuenta.reset();
            container.classList.remove("rightpanelactive"); 
        } catch (error) {
            registererror.textContent = error.message;
        }
    });

    // --- Inicio de Sesión ---
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

            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.message || 'Credenciales incorrectas.');
            }

            // Redirección explícita tras login exitoso
            if (data.rol === 'dueño') {
                window.location.href = '/restaurante.html';
            } else if (data.rol === 'cocinero') {
                window.location.href = '/cocina.html';
            } else if (data.rol === 'mesero') {
                window.location.href = '/mesero.html';
            } 

        } catch (error) {
            loginerror.textContent = error.message;
        }
    });
});