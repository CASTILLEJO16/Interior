// Vista de Usuario Estándar - Solo registro de artículos
class RegistroApp {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.init();
    }

    init() {
        this.loadUserSession();
        this.setupEventListeners();
        this.setDefaultDate();
    }

    loadUserSession() {
        this.token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (!this.token || !userData) {
            window.location.href = '/login.html';
            return;
        }

        try {
            this.currentUser = JSON.parse(userData);
            
            // Si es admin, redirigir al dashboard
            if (this.currentUser.rol === 'admin') {
                window.location.href = '/dashboard_secretarias.html';
                return;
            }
            
            document.getElementById('userName').textContent = this.currentUser.nombre_completo || this.currentUser.usuario;
        } catch (error) {
            console.error('Error loading user session:', error);
            this.logout();
        }
    }

    setupEventListeners() {
        const form = document.getElementById('inventoryForm');
        const imageInput = document.getElementById('imagen');

        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        if (imageInput) {
            imageInput.addEventListener('change', (e) => this.handleImagePreview(e));
        }
    }

    setDefaultDate() {
        const fechaAlta = document.getElementById('fechaAlta');
        if (fechaAlta) {
            fechaAlta.value = new Date().toISOString().split('T')[0];
        }
    }

    handleImagePreview(e) {
        const file = e.target.files[0];
        const preview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');
        
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            preview.style.display = 'none';
            previewImg.src = '';
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        
        try {
            const formData = new FormData(form);
            
            const response = await fetch('/api/inventario', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Artículo registrado exitosamente', 'success');
                this.resetForm();
            } else {
                this.showToast(result.message || 'Error al registrar el artículo', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showToast('Error de conexión', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    resetForm() {
        const form = document.getElementById('inventoryForm');
        if (form) {
            form.reset();
            this.setDefaultDate();
            
            const preview = document.getElementById('imagePreview');
            const previewImg = document.getElementById('previewImg');
            if (preview && previewImg) {
                preview.style.display = 'none';
                previewImg.src = '';
            }
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 
                     type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    logout() {
        localStorage.clear();
        window.location.href = '/login.html';
    }
}

// Global function for logout
window.logout = function() {
    localStorage.clear();
    window.location.href = '/login.html';
};

// Global function for reset
window.resetForm = function() {
    const app = window.registroApp;
    if (app) {
        app.resetForm();
    }
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.registroApp = new RegistroApp();
});
