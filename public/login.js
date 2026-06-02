document.addEventListener('DOMContentLoaded', () => {
    // Referencias Gatekeeper
    const gatekeeperModal = document.getElementById('gatekeeperModal');
    const formGatekeeper = document.getElementById('formGatekeeper');
    const gatekeeperError = document.getElementById('gatekeeperError');
    
    // Referencias Login y Animaciones
    const signUpButton = document.getElementById('signUpBtn');
    const signInButton = document.getElementById('signInBtn');
    const container = document.getElementById('container');
    const formsesion = document.getElementById('formsesion');
    const loginerror = document.getElementById('loginerror');

    // --- 1. LÓGICA DEL GATEKEEPER ---
    formGatekeeper.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codigo = document.getElementById('inputCodigoRestaurante').value.trim();
        gatekeeperError.textContent = 'Verificando...';

        try {
            const res = await fetch('/api/auth/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo }),
                credentials: 'include' 
            });

            const data = await res.json();

            if (res.ok) {
                gatekeeperModal.classList.add('oculto');
                // ¡Línea que sobrescribía el "Bienvenido" eliminada!
            } else {
                gatekeeperError.textContent = data.message || 'Código incorrecto.';
            }
        } catch (error) {
            console.error(error);
            gatekeeperError.textContent = 'Error de conexión.';
        }
    });

    async function verificarContextoInicial() {
        try {
            const res = await fetch('/api/auth/status', { credentials: 'include' });
            const data = await res.json();

            // Redirección si ya está logueado
            if (res.ok && data.loggedIn) {
                if (data.rol === 'dueño') window.location.href = '/restaurante.html';
                else if (data.rol === 'cocinero') window.location.href = '/cocina.html';
                else if (data.rol === 'mesero') window.location.href = '/mesero.html';
                return;
            } 
        } catch (e) {
            console.log("Esperando código de restaurante...");
        }
    }
    verificarContextoInicial();

    // --- 2. ANIMACIONES DE LOS PANELES ---
    signUpButton.addEventListener('click', () => container.classList.add("rightpanelactive"));
    signInButton.addEventListener('click', () => container.classList.remove("rightpanelactive"));

    // --- 3. LÓGICA DE INICIO DE SESIÓN ---
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

    // --- 4. LÓGICA DEL TUTORIAL DE ROLES ---
    const infoRoles = {
        dueno: {
            titulo: "Administrador / Dueño",
            desc: "Control total del ecosistema: visualización de KPIs financieros en tiempo real, gráficas de tendencia, balances de pérdidas y gestión de personal.",
            color: "#2c3e50"
        },
        cocinero: {
            titulo: "Equipo de Cocina",
            desc: "Visualización limpia de comandas activas ordenadas por tiempo de espera. Acceso instantáneo al visor de recetas y blindaje de inventario automatizado.",
            color: "#e67e22"
        },
        mesero: {
            titulo: "Personal de Piso / Mesero",
            desc: "Gestión ágil del salón de comensales. Permite la apertura de mesas, generación de códigos PIN para los clientes y liberación de espacios.",
            color: "#2ecc71"
        }
    };

    document.querySelectorAll('.btn-rol').forEach(boton => {
        boton.addEventListener('click', () => {
            const rolSelected = boton.dataset.rol;
            const data = infoRoles[rolSelected];
            
            // Actualizar interfaz de texto
            const tituloEl = document.getElementById('tutorialRolTitulo');
            const descEl = document.getElementById('tutorialRolDesc');
            
            if (tituloEl && descEl) {
                tituloEl.textContent = data.titulo;
                descEl.textContent = data.desc;
                tituloEl.style.color = data.color;
            }
            
            // Cambiar estados visuales de los botones (Gris para los inactivos, color para el activo)
            document.querySelectorAll('.btn-rol').forEach(b => b.style.backgroundColor = '#7f8c8d');
            boton.style.backgroundColor = data.color;
        });
    });
});