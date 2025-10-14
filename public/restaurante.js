const logoutButton = document.querySelector('.logout-button');

logoutButton.addEventListener('click', () => {
    // 1. Ejecuta la acción de borrar el token
    localStorage.removeItem('authToken');

    // 2. Navega a la página de inicio
    window.location.href = '/index.html';
});