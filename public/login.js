document.addEventListener('DOMContentLoaded', () => {
    // Referencias Gatekeeper
    const gatekeeperModal = document.getElementById('gatekeeperModal');
    const formGatekeeper = document.getElementById('formGatekeeper');
    const gatekeeperError = document.getElementById('gatekeeperError');
    
    // Referencias Login/Registro
    const signUpButton = document.getElementById('signUpBtn');
    const signInButton = document.getElementById('signInBtn');
    const container = document.getElementById('container');
    const formsesion = document.getElementById('formsesion');
    const formcuenta = document.getElementById('formcuenta');
    const loginerror = document.getElementById('loginerror');
    const registererror = document.getElementById('registererror');

    // --- 1. LÓGICA DEL GATEKEEPER ---
    
    // Función para manejar el envío del código
    formGatekeeper.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codigo = document.getElementById('inputCodigoRestaurante').value.trim();
        gatekeeperError.textContent = 'Verificando...';

        try {
            const res = await fetch('/api/auth/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo }),
                credentials: 'include' // Importante para guardar la cookie de sesión
            });

            const data = await res.json();

            if (res.ok) {
                // Éxito: Ocultamos el modal y mostramos el nombre del local si quieres
                gatekeeperModal.classList.add('oculto');
                // Opcional: poner el nombre del restaurante en algún lado
                document.querySelector('.overlaypanel h1').innerText = `¡Hola, equipo de ${data.nombre}!`;
            } else {
                gatekeeperError.textContent = data.message || 'Código incorrecto.';
            }
        } catch (error) {
            console.error(error);
            gatekeeperError.textContent = 'Error de conexión.';
        }
    });

    // --- 2. VERIFICAR SI YA HAY CONTEXTO AL CARGAR ---
    // Si el usuario refresca la página, no queremos que le pida el código otra vez si la sesión sigue viva.
    async function verificarContextoInicial() {
        try {
            // Usamos el endpoint de status. Si devuelveloggedIn o al menos contexto, pasamos.
            // Nota: He modificado el endpoint status en app.js para devolver info aunque no esté logueado usuario,
            // pero si tiene contexto de restaurante. Si no, dará error y mostramos modal.
            
            // Truco: Intentamos verificar sesión. Si falla (401), el modal se queda.
            // Si funciona, se quita.
            const res = await fetch('/api/auth/status', { credentials: 'include' });
            const data = await res.json();

            // Si ya está logueado como usuario, redirigir
            if (res.ok && data.loggedIn) {
                if (data.rol === 'dueño') window.location.href = '/restaurante.html';
                else if (data.rol === 'cocinero') window.location.href = '/cocina.html';
                else if (data.rol === 'mesero') window.location.href = '/mesero.html';
                return;
            } 
            
            // Si no está logueado pero la sesión tiene restauranteContexto (verificamos si hay cookie válida)
            // Esto es difícil de saber sin un endpoint específico, así que por seguridad:
            // SIEMPRE mostramos el modal al cargar index.html, a menos que el login automático salte.
            // PERO, si el usuario acaba de meter el código, no recargamos.
            
            // Simplificación: El modal empieza visible (sin clase oculto).
            // Solo si el status devuelve que hay un usuario activo, redirigimos.
            
        } catch (e) {
            console.log("Esperando código de restaurante...");
        }
    }
    verificarContextoInicial();

    signUpButton.addEventListener('click', () => container.classList.add("rightpanelactive"));
    signInButton.addEventListener('click', () => container.classList.remove("rightpanelactive"));

    formcuenta.addEventListener('submit', async (e) => {
        e.preventDefault();
        registererror.textContent = '';
        
        const nombre = document.getElementById('registername').value;
        const correo = document.getElementById('registeremail').value;
        const contrasena = document.getElementById('registerpassword').value;
        const rol = document.getElementById('registerrol').value;

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre_usuario: nombre, correo_usuario: correo, contra: contrasena, rol: rol }),
                credentials: 'include'
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            
            alert('Usuario creado en este restaurante.');
            formcuenta.reset();
            container.classList.remove("rightpanelactive");
        } catch (error) {
            registererror.textContent = error.message;
        }
    });

    formsesion.addEventListener('submit', async (e) => {
        e.preventDefault();
        const correo = document.getElementById('loginemail').value;
        const contrasena = document.getElementById('loginpassword').value;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo_usuario: correo, contra: contrasena }),
                credentials: 'include'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            if (data.rol === 'dueño') window.location.href = '/restaurante.html';
            else if (data.rol === 'cocinero') window.location.href = '/cocina.html';
            else if (data.rol === 'mesero') window.location.href = '/mesero.html';

        } catch (error) {
            loginerror.textContent = error.message;
        }
    });
});