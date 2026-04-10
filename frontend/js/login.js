// Login JavaScript - Sistema de Inventario
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('contraseña');
    const usuarioInput = document.getElementById('usuario');

    // Crear partículas animadas
    function createParticles() {
        const particlesContainer = document.getElementById('particles');
        const particleCount = 20;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Tamaño aleatorio
            const size = Math.random() * 4 + 2;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            
            // Posición aleatoria
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            
            // Retraso de animación aleatorio
            particle.style.animationDelay = Math.random() * 15 + 's';
            particle.style.animationDuration = (Math.random() * 10 + 15) + 's';
            
            particlesContainer.appendChild(particle);
        }
    }

    // Toggle contraseña
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        const icon = this.querySelector('i');
        icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    });

    // Mostrar mensaje de error
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
        
        // Auto ocultar después de 5 segundos
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }

    // Mostrar mensaje de éxito
    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    }

    // Validar formulario
    function validateForm() {
        const usuario = usuarioInput.value.trim();
        const contraseña = passwordInput.value.trim();

        if (!usuario) {
            showError('El campo usuario es requerido');
            usuarioInput.focus();
            return false;
        }

        if (!contraseña) {
            showError('El campo contraseña es requerido');
            passwordInput.focus();
            return false;
        }

        if (usuario.length < 3) {
            showError('El usuario debe tener al menos 3 caracteres');
            usuarioInput.focus();
            return false;
        }

        if (contraseña.length < 6) {
            showError('La contraseña debe tener al menos 6 caracteres');
            passwordInput.focus();
            return false;
        }

        return true;
    }

    // Manejar envío del formulario
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const formData = new FormData(loginForm);
        const data = {
            usuario: formData.get('usuario'),
            contraseña: formData.get('contraseña'),
            tipo_usuario: formData.get('tipo_usuario')
        };

        // Mostrar estado de carga
        loginBtn.classList.add('loading');
        loginBtn.querySelector('.btn-text').textContent = 'Iniciando sesión...';
        loginBtn.disabled = true;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                // Guardar token y usuario en localStorage
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                
                showSuccess('Inicio de sesión exitoso. Redirigiendo...');
                
                // Redirigir según el rol del usuario
                setTimeout(() => {
                    if (result.user.rol === 'admin') {
                        window.location.href = '/dashboard_secretarias.html';
                    } else {
                        window.location.href = '/registro.html';
                    }
                }, 1500);
            } else {
                showError(result.message || 'Error al iniciar sesión');
            }
        } catch (error) {
            console.error('Error en el login:', error);
            showError('Error de conexión. Por favor, intente nuevamente.');
        } finally {
            // Restaurar estado del botón
            loginBtn.classList.remove('loading');
            loginBtn.querySelector('.btn-text').textContent = 'Iniciar Sesión';
            loginBtn.disabled = false;
        }
    });

    // Limpiar mensajes al escribir
    usuarioInput.addEventListener('input', function() {
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
    });

    passwordInput.addEventListener('input', function() {
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
    });

    // Prevenir envío con Enter sin validar
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            loginForm.dispatchEvent(new Event('submit'));
        }
    });

    // Verificar si ya hay una sesión activa
    function checkExistingSession() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (token && user) {
            // Verificar si el token es válido
            fetch('/api/verify-token', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    const userData = JSON.parse(user);
                    // Redirigir según el rol
                    if (userData.rol === 'admin') {
                        window.location.href = '/dashboard';
                    } else {
                        window.location.href = '/registro.html';
                    }
                } else {
                    // Token inválido, limpiar localStorage
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            })
            .catch(() => {
                // Error en la verificación, limpiar localStorage
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            });
        }
    }

    // Animación de entrada para los campos
    function animateFormElements() {
        const elements = loginForm.querySelectorAll('.form-group, .btn-login');
        elements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                element.style.transition = 'all 0.5s ease';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    // Inicializar
    createParticles();
    animateFormElements();
    checkExistingSession();

    // Enfocar el campo de usuario al cargar
    setTimeout(() => {
        usuarioInput.focus();
    }, 500);
});
