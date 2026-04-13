// Dashboard con Secretarías - Sistema de Inventario
class DashboardSecretariasApp {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.searchTerm = '';
        this.secretariaFilter = '';
        this.init();
    }

    async init() {
        // Verificar si es una nueva pestaña (versión simple para Chrome)
        if (this.isNewTab()) {
            console.log('Nueva pestaña detectada, forzando login...');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return;
        }

        // Verificación normal
        if (!this.isAuthenticated()) {
            console.log('No autenticado, redirigiendo al login...');
            window.location.href = '/login.html';
            return;
        }

        // Si está autenticado, cargar todo de una vez
        try {
            this.loadUserSession();
            this.setupEventListeners();
            this.setupSidebar();
            
            // Verificar sesión cada 30 segundos
            this.setupSessionCheck();
            
            await this.loadDashboardData();
            this.showSection('inicio');
            
            // Mostrar dashboard
            this.showDashboard();
        } catch (error) {
            console.error('Error al cargar el dashboard:', error);
            window.location.href = '/login.html';
        }
    }

    isNewTab() {
        // Verificar si viene de un login exitoso
        const fromLogin = sessionStorage.getItem('coming_from_login');
        if (fromLogin === 'true') {
            // Limpiar la marca y no considerar como nueva pestaña
            sessionStorage.removeItem('coming_from_login');
            return false;
        }

        // Versión simple para Chrome - usar timestamp
        const sessionKey = 'dashboard_tab_opened';
        const existingTime = sessionStorage.getItem(sessionKey);
        
        if (!existingTime) {
            // Primera vez en esta pestaña
            sessionStorage.setItem(sessionKey, Date.now().toString());
            return true;
        }
        
        // Si ya existe, verificar si es una recarga real o nueva pestaña
        const timeDiff = Date.now() - parseInt(existingTime);
        if (timeDiff > 1000) { // Más de 1 segundo, probablemente nueva pestaña
            sessionStorage.setItem(sessionKey, Date.now().toString());
            return true;
        }
        
        return false;
    }

    isAuthenticated() {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (!token || !userData) {
            return false;
        }

        try {
            const user = JSON.parse(userData);
            return user && token.length > 0;
        } catch (error) {
            console.error('Error checking authentication:', error);
            return false;
        }
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
            this.updateUserInfo();
        } catch (error) {
            console.error('Error loading user session:', error);
            this.logout();
        }
    }

    updateUserInfo() {
        document.getElementById('userName').textContent = this.currentUser.nombre_completo || this.currentUser.usuario;
        document.getElementById('userRole').textContent = this.currentUser.rol === 'admin' ? 'Administrador' : 'Usuario';
        
        const avatar = document.getElementById('userAvatar');
        const initials = this.currentUser.nombre_completo 
            ? this.currentUser.nombre_completo.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : this.currentUser.usuario.slice(0, 2).toUpperCase();
        avatar.textContent = initials;
        
        // Establecer automáticamente la secretaría del usuario en el formulario
        this.setUserSecretaria();
    }

    setUserSecretaria() {
        const secretariaField = document.getElementById('secretaria');
        if (secretariaField && this.currentUser.secretaria) {
            secretariaField.value = this.currentUser.secretaria;
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                if (section) {
                    this.showSection(section);
                }
            });
        });

        // Menu toggle
        document.getElementById('menuToggle').addEventListener('click', () => {
            this.toggleSidebar();
        });

        // Logout
        document.getElementById('btnLogout').addEventListener('click', () => {
            this.logout();
        });

        // Form submission
        const form = document.getElementById('inventoryForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit(e);
            });
        }

        // Edit form submission
        const editForm = document.getElementById('editForm');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEditSubmit(e);
            });
        }

        // Image preview
        const imageInput = document.getElementById('imagen');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                this.handleImagePreview(e);
            });
        }

        // User form submission
        const userForm = document.getElementById('userForm');
        if (userForm) {
            userForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUserFormSubmit(e);
            });
        }
    }

    setupSidebar() {
        // Sidebar functionality
    }

    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('collapsed');
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Show selected section
        const selectedSection = document.getElementById(sectionName + '-section');
        if (selectedSection) {
            selectedSection.style.display = 'block';
        }
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
        
        // Update title
        this.updatePageTitle(sectionName);
        
        // Load section data
        this.loadSectionData(sectionName);
    }

    updatePageTitle(sectionName) {
        const titles = {
            inicio: 'Dashboard',
            organizacion: 'Organización',
            finanzas: 'Finanzas',
            'asuntos-legales': 'Asuntos Legales',
            transparencia: 'Transparencia',
            'fomento-deporte': 'Fomento al Deporte',
            'fomento-ahorro': 'Fomento al Ahorro',
            pensiones: 'Pensiones y Jubilaciones',
            'oficialia-mayor': 'Oficialía Mayor',
            'actas-acuerdos': 'Actas y Acuerdos',
            interior: 'De Interior',
            prensa: 'Prensa y Propaganda',
            trabajo: 'Trabajo y Conflictos',
            patrimonio: 'Patrimonio',
            vivienda: 'Fomento a la Vivienda',
            educacion: 'Educación y Cultura',
            auditoria: 'Auditoría',
            'accion-social': 'Acción Social',
            agregar: 'Agregar Artículo',
            reportes: 'Reportes',
            usuarios: 'Gestión de Usuarios'
        };
        
        document.getElementById('pageTitle').textContent = titles[sectionName] || 'Dashboard';
    }

    async loadSectionData(sectionName) {
        switch (sectionName) {
            case 'inicio':
                await this.loadDashboardData();
                break;
            case 'organizacion':
                await this.loadSecretariaData('Organización', 'organizacion');
                break;
            case 'finanzas':
                await this.loadSecretariaData('Finanzas', 'finanzas');
                break;
            case 'asuntos-legales':
                await this.loadSecretariaData('Asuntos Legales', 'asuntos-legales');
                break;
            case 'transparencia':
                await this.loadSecretariaData('Transparencia', 'transparencia');
                break;
            case 'fomento-deporte':
                await this.loadSecretariaData('Fomento al Deporte', 'fomento-deporte');
                break;
            case 'fomento-ahorro':
                await this.loadSecretariaData('Fomento al Ahorro', 'fomento-ahorro');
                break;
            case 'pensiones':
                await this.loadSecretariaData('Pensiones y Jubilaciones', 'pensiones');
                break;
            case 'oficialia-mayor':
                await this.loadSecretariaData('Oficialía Mayor', 'oficialia-mayor');
                break;
            case 'actas-acuerdos':
                await this.loadSecretariaData('Actas y Acuerdos', 'actas-acuerdos');
                break;
            case 'interior':
                await this.loadSecretariaData('De Interior', 'interior');
                break;
            case 'prensa':
                await this.loadSecretariaData('Prensa y Propaganda', 'prensa');
                break;
            case 'trabajo':
                await this.loadSecretariaData('Trabajo y Conflictos', 'trabajo');
                break;
            case 'patrimonio':
                await this.loadSecretariaData('Patrimonio', 'patrimonio');
                break;
            case 'vivienda':
                await this.loadSecretariaData('Fomento a la Vivienda', 'vivienda');
                break;
            case 'educacion':
                await this.loadSecretariaData('Educación y Cultura', 'educacion');
                break;
            case 'auditoria':
                await this.loadSecretariaData('Auditoría', 'auditoria');
                break;
            case 'accion-social':
                await this.loadSecretariaData('Acción Social', 'accion-social');
                break;
            case 'usuarios':
                await this.loadUsuariosData();
                break;
            case 'reportes':
                await this.loadReportesData();
                break;
        }
    }

    async loadDashboardData() {
        try {
            const response = await this.apiCall('/api/estadisticas');
            const stats = response.data;

            // Update stats cards
            document.getElementById('totalArticulos').textContent = stats.generales.total_articulos || 0;
            document.getElementById('articulosActivos').textContent = stats.generales.articulos_activos || 0;
            document.getElementById('articulosMantenimiento').textContent = stats.generales.articulos_mantenimiento || 0;
            document.getElementById('valorTotal').textContent = this.formatCurrency(stats.generales.valor_total_inventario || 0);

            // Load recent items
            await this.loadRecentItems();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    async loadSecretariaData(secretariaName, sectionId) {
        try {
            console.log(`Cargando datos de secretaría: ${secretariaName}, sectionId: ${sectionId}`);
            const url = `/api/inventario?secretaria=${encodeURIComponent(secretariaName)}&limit=100`;
            console.log(`URL de la API: ${url}`);
            
            const response = await this.apiCall(url);
            const items = response.data;
            
            console.log(`Artículos recibidos para ${secretariaName}:`, items);
            console.log(`Número de artículos: ${items.length}`);

            // Update stats
            const totalElement = document.getElementById(`${sectionId}-total`);
            const valorElement = document.getElementById(`${sectionId}-valor`);
            
            console.log(`Elementos DOM encontrados: total=${!!totalElement}, valor=${!!valorElement}`);
            
            if (totalElement) {
                totalElement.textContent = items.length || 0;
                console.log(`Total actualizado: ${items.length}`);
            }
            
            if (valorElement) {
                const totalValue = items.reduce((sum, item) => sum + parseFloat(item.costo || 0), 0);
                valorElement.textContent = this.formatCurrency(totalValue);
                console.log(`Valor actualizado: ${this.formatCurrency(totalValue)}`);
            }

            // Load table
            this.loadSecretariaTable(items, sectionId);
        } catch (error) {
            console.error(`Error loading ${secretariaName} data:`, error);
        }
    }

    loadSecretariaTable(items, sectionId) {
        console.log(`Cargando tabla para sectionId: ${sectionId} con ${items.length} artículos`);
        const tbody = document.getElementById(`${sectionId}-body`);
        console.log(`Elemento tbody encontrado: ${!!tbody}`);
        
        if (!tbody) {
            console.error(`No se encontró el elemento tbody para sectionId: ${sectionId}`);
            return;
        }

        tbody.innerHTML = '';

        if (items.length === 0) {
            console.log('No hay artículos, mostrando mensaje vacío');
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay artículos registrados</td></tr>';
            return;
        }

        console.log('Procesando artículos para la tabla:');
        items.forEach((item, index) => {
            console.log(`Artículo ${index}:`, item);
            const row = this.createSecretariaRow(item);
            tbody.appendChild(row);
        });
        
        console.log(`Tabla cargada con ${items.length} filas`);
    }

    createSecretariaRow(item) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.numero_inventario}</td>
            <td>${item.descripcion.substring(0, 50)}${item.descripcion.length > 50 ? '...' : ''}</td>
            <td>${item.resguardante}</td>
            <td>${this.formatCurrency(item.costo)}</td>
            <td><span class="status-badge ${item.estatus}">${this.formatStatus(item.estatus)}</span></td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewDetails(${item.id})" title="Ver Detalles">
                    <i class="fas fa-file-alt"></i>
                </button>
                <button class="btn btn-sm btn-primary" onclick="editItem(${item.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteItem(${item.id})" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        return row;
    }

    async loadRecentItems() {
        try {
            const response = await this.apiCall(`/api/inventario?limit=5`);
            const items = response.data;

            const tbody = document.getElementById('recentItemsBody');
            tbody.innerHTML = '';

            if (!items || items.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay artículos registrados</td></tr>';
                return;
            }

            items.forEach(item => {
                const row = this.createRecentItemRow(item);
                tbody.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading recent items:', error);
            const tbody = document.getElementById('recentItemsBody');
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Error al cargar artículos</td></tr>';
        }
    }

    createRecentItemRow(item) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.numero_inventario}</td>
            <td>${item.descripcion.substring(0, 50)}${item.descripcion.length > 50 ? '...' : ''}</td>
            <td>${item.secretaria}</td>
            <td>${item.resguardante}</td>
            <td>${this.formatCurrency(item.costo)}</td>
            <td>${this.formatDate(item.fecha_registro)}</td>
        `;
        return row;
    }

    // Métodos de gestión de usuarios
    async loadUsuariosData() {
        try {
            const response = await this.apiCall('/api/usuarios');
            const users = response.data;
            
            // Actualizar estadísticas
            const totalUsers = users.length;
            const totalAdmins = users.filter(u => u.rol === 'admin').length;
            const totalStandards = users.filter(u => u.rol === 'usuario').length;
            
            document.getElementById('total-usuarios').textContent = totalUsers;
            document.getElementById('total-admins').textContent = totalAdmins;
            document.getElementById('total-standards').textContent = totalStandards;
            
            // Cargar tabla
            this.loadUsuariosTable(users);
        } catch (error) {
            console.error('Error loading usuarios data:', error);
        }
    }

    loadUsuariosTable(users) {
        const tbody = document.getElementById('usuarios-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No hay usuarios registrados</td></tr>';
            return;
        }
        
        users.forEach(user => {
            const row = this.createUsuarioRow(user);
            tbody.appendChild(row);
        });
    }

    createUsuarioRow(user) {
        const row = document.createElement('tr');
        const isActive = user.activo === 1;
        const statusClass = isActive ? 'success' : 'error';
        const statusText = isActive ? 'Activo' : 'Inactivo';
        
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.usuario}</td>
            <td>${user.nombre_completo}</td>
            <td>${user.email || 'N/A'}</td>
            <td><span class="status-badge ${user.rol}">${user.rol === 'admin' ? 'Admin' : 'Usuario'}</span></td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${this.formatDate(user.fecha_registro)}</td>
            <td>${user.ultimo_acceso ? this.formatDate(user.ultimo_acceso) : 'Nunca'}</td>
            <td>
                <button class="btn btn-sm ${isActive ? 'btn-danger' : 'btn-success'}" 
                        onclick="toggleUserStatus(${user.id}, ${!isActive})" 
                        ${user.id === this.currentUser.id ? 'disabled title="No puede desactivar su propia cuenta"' : ''}>
                    <i class="fas ${isActive ? 'fa-ban' : 'fa-check'}"></i>
                    ${isActive ? 'Desactivar' : 'Activar'}
                </button>
            </td>
        `;
        return row;
    }

    async handleUserFormSubmit(e) {
        e.preventDefault();
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
        
        try {
            const userData = {
                usuario: document.getElementById('newUsername').value,
                contraseña: document.getElementById('newPassword').value,
                nombre_completo: document.getElementById('newFullName').value,
                email: document.getElementById('newEmail').value,
                rol: document.getElementById('newRol').value,
                secretaria: document.getElementById('newSecretaria').value
            };
            
            const response = await fetch('/api/usuarios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(userData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Usuario creado exitosamente', 'success');
                this.resetUserForm();
                this.loadUsuariosData(); // Recargar tabla
            } else {
                this.showToast(result.message || 'Error al crear usuario', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showToast('Error de conexión', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    resetUserForm() {
        const form = document.getElementById('userForm');
        if (form) {
            form.reset();
        }
    }

    async toggleUserStatus(userId, activate) {
        try {
            const response = await fetch(`/api/usuarios/${userId}/estado`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ activo: activate })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast(result.message, 'success');
                this.loadUsuariosData(); // Recargar tabla
            } else {
                this.showToast(result.message || 'Error al cambiar estado', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showToast('Error de conexión', 'error');
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

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        
        console.log("TOKEN:", localStorage.getItem('token'));
        try {
            const response = await fetch('/api/inventario', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Artículo agregado exitosamente', 'success');
                this.resetForm();
                
                // Go back to the relevant secretaria section
                const secretariaSelect = document.getElementById('secretaria');
                const secretaria = secretariaSelect ? secretariaSelect.value : '';
                
                const sectionMap = {
                    'Organización': 'organizacion',
                    'Finanzas': 'finanzas',
                    'Asuntos Legales': 'asuntos-legales',
                    'Transparencia': 'transparencia',
                    'Fomento al Deporte': 'fomento-deporte',
                    'Fomento al Ahorro': 'fomento-ahorro',
                    'Pensiones y Jubilaciones': 'pensiones',
                    'Oficialía Mayor': 'oficialia-mayor',
                    'Actas y Acuerdos': 'actas-acuerdos',
                    'De Interior': 'interior',
                    'Prensa y Propaganda': 'prensa',
                    'Trabajo y Conflictos': 'trabajo',
                    'Patrimonio': 'patrimonio',
                    'Fomento a la Vivienda': 'vivienda',
                    'Educación y Cultura': 'educacion',
                    'Auditoría': 'auditoria',
                    'Acción Social': 'accion-social'
                };
                
                const section = sectionMap[secretaria] || 'inicio';
                setTimeout(() => {
                    this.showSection(section);
                }, 2000);
            } else {
                this.showToast(result.message || 'Error al agregar el artículo', 'error');
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
            document.getElementById('imagePreview').style.display = 'none';
            document.getElementById('previewImg').src = '';
            
            // Set current date
            const fechaAlta = document.getElementById('fechaAlta');
            if (fechaAlta) {
                fechaAlta.value = new Date().toISOString().split('T')[0];
            }
        }
    }

    addArticleToSecretaria(secretaria) {
        this.showSection('agregar');
        setTimeout(() => {
            const secretariaSelect = document.getElementById('secretaria');
            if (secretariaSelect) {
                secretariaSelect.value = secretaria;
            }
        }, 100);
    }

    editItem(id) {
        this.loadItemForEdit(id);
    }

    deleteItem(id) {
        this.showDeleteConfirmation(id);
    }

    viewDetails(id) {
        this.showDetailsModal(id);
    }

    async showDetailsModal(id) {
        try {
            const response = await this.apiCall(`/api/inventario/${id}`);
            const item = response.data;
            
            // Populate details modal
            document.getElementById('detailsNumero').textContent = item.numero_inventario;
            document.getElementById('detailsSecretaria').textContent = item.secretaria;
            document.getElementById('detailsFecha').textContent = this.formatDate(item.fecha_alta);
            document.getElementById('detailsDescripcion').textContent = item.descripcion;
            document.getElementById('detailsCosto').textContent = this.formatCurrency(item.costo);
            document.getElementById('detailsResguardante').textContent = item.resguardante;
            document.getElementById('detailsEstatus').textContent = this.formatStatus(item.estatus);
            document.getElementById('detailsFechaRegistro').textContent = this.formatDate(item.fecha_registro);
            document.getElementById('detailsUsuarioRegistro').textContent = item.nombre_registro || 'N/A';
            
            // Show image if exists
            const detailsImage = document.getElementById('detailsImage');
            const detailsImageContainer = document.getElementById('detailsImageContainer');
            
            if (item.imagen) {
                detailsImage.src = item.imagen;
                detailsImageContainer.style.display = 'block';
            } else {
                detailsImageContainer.style.display = 'none';
            }
            
            // Show current date
            const now = new Date();
            const formattedDate = now.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const formattedDateTime = now.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            document.getElementById('currentDate').textContent = formattedDate;
            document.getElementById('documentDate').textContent = `Fecha y hora: ${formattedDateTime}`;
            
            // Show modal
            const modal = document.getElementById('detailsModal');
            modal.style.display = 'flex';
            modal.classList.add('active');
            
        } catch (error) {
            console.error('Error loading item details:', error);
            this.showToast('Error al cargar los detalles del artículo', 'error');
        }
    }

    async loadItemForEdit(id) {
        try {
            const response = await this.apiCall(`/api/inventario/${id}`);
            const item = response.data;
            
            // Populate edit form
            document.getElementById('editId').value = item.id;
            document.getElementById('editNumero').value = item.numero_inventario;
            document.getElementById('editSecretaria').value = item.secretaria;
            document.getElementById('editFecha').value = item.fecha_alta;
            document.getElementById('editCosto').value = item.costo;
            document.getElementById('editResguardante').value = item.resguardante;
            document.getElementById('editEstatus').value = item.estatus;
            document.getElementById('editDescripcion').value = item.descripcion;
            
            // Show modal
            const modal = document.getElementById('editModal');
            modal.style.display = 'flex';
            modal.classList.add('active');
            
        } catch (error) {
            console.error('Error loading item for edit:', error);
            this.showToast('Error al cargar el artículo para editar', 'error');
        }
    }

    showDeleteConfirmation(id) {
        // Store the item ID for deletion
        this.deleteItemId = id;
        
        // Disable delete button to prevent double clicks
        const deleteBtn = document.querySelector(`button[onclick="deleteItem(${id})"]`);
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
        
        // Load item info for display
        this.apiCall(`/api/inventario/${id}`).then(response => {
            const item = response.data;
            document.getElementById('deleteItemInfo').textContent = 
                `${item.numero_inventario} - ${item.descripcion.substring(0, 50)}...`;
        }).catch(error => {
            console.error('Error loading item for delete:', error);
            this.showToast('Error al cargar información del artículo', 'error');
            this.closeDeleteModal();
            // Re-enable button if error occurs
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            }
        });
        
        // Show modal
        const modal = document.getElementById('deleteModal');
        modal.style.display = 'flex';
        modal.classList.add('active');
    }

    async handleEditSubmit(e) {
        e.preventDefault();
        
        const itemId = document.getElementById('editId').value;
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
        
        try {
            const response = await fetch(`/api/inventario/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    numero_inventario: document.getElementById('editNumero').value,
                    secretaria: document.getElementById('editSecretaria').value,
                    fecha_alta: document.getElementById('editFecha').value,
                    descripcion: document.getElementById('editDescripcion').value,
                    costo: parseFloat(document.getElementById('editCosto').value),
                    resguardante: document.getElementById('editResguardante').value,
                    estatus: document.getElementById('editEstatus').value
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Artículo actualizado exitosamente', 'success');
                this.closeEditModal();
                
                // Reload current section
                const currentSection = document.querySelector('.content-section.active').id.replace('-section', '');
                this.loadSectionData(currentSection);
            } else {
                this.showToast(result.message || 'Error al actualizar el artículo', 'error');
            }
            
        } catch (error) {
            console.error('Error:', error);
            this.showToast('Error de conexión', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    async confirmDelete() {
        if (!this.deleteItemId) return;
        
        try {
            console.log(`Confirmando eliminación del artículo ID: ${this.deleteItemId}`);
            
            const response = await fetch(`/api/inventario/${this.deleteItemId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const result = await response.json();
            console.log('Respuesta del servidor:', result);
            
            if (result.success) {
                this.showToast('Artículo eliminado exitosamente', 'success');
                this.closeDeleteModal();
                
                // Reload current section after a brief delay
                setTimeout(() => {
                    const currentSection = document.querySelector('.content-section.active').id.replace('-section', '');
                    console.log(`Recargando sección: ${currentSection}`);
                    this.loadSectionData(currentSection);
                }, 500);
            } else {
                this.showToast(result.message || 'Error al eliminar el artículo', 'error');
                // Close modal and re-enable button if article not found
                if (result.message && result.message.includes('no encontrado')) {
                    this.closeDeleteModal();
                    // Reload section to update the UI
                    setTimeout(() => {
                        const currentSection = document.querySelector('.content-section.active').id.replace('-section', '');
                        this.loadSectionData(currentSection);
                    }, 500);
                }
            }
            
        } catch (error) {
            console.error('Error al eliminar:', error);
            this.showToast('Error de conexión', 'error');
            this.closeDeleteModal();
        }
    }

    closeEditModal() {
        const modal = document.getElementById('editModal');
        modal.style.display = 'none';
        modal.classList.remove('active');
        document.getElementById('editForm').reset();
    }

    closeDeleteModal() {
        const modal = document.getElementById('deleteModal');
        modal.style.display = 'none';
        modal.classList.remove('active');
        this.deleteItemId = null;
    }

    closeDetailsModal() {
        const modal = document.getElementById('detailsModal');
        modal.style.display = 'none';
        modal.classList.remove('active');
    }

    setupSessionCheck() {
        // Verificar sesión cada 30 segundos
        setInterval(async () => {
            if (!this.isAuthenticated()) {
                console.log('Sesión expirada, redirigiendo al login...');
                this.logout();
                return;
            }

            // Opcional: verificar token con el servidor
            try {
                const response = await fetch('/api/verify-token', {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                if (!response.ok) {
                    console.log('Token inválido, redirigiendo al login...');
                    this.logout();
                }
            } catch (error) {
                console.error('Error verificando token:', error);
                // Si hay error de red, no cerrar sesión automáticamente
            }
        }, 30000); // 30 segundos
    }

    showDashboard() {
        const wrapper = document.getElementById('dashboardWrapper');
        if (wrapper) {
            wrapper.classList.add('authenticated');
        }
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
                <button class="toast-close" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    resetForm() {
        const form = document.getElementById('inventoryForm');
        if (form) {
            form.reset();
            
            // Reset image preview
            const preview = document.getElementById('imagePreview');
            const previewImg = document.getElementById('previewImg');
            if (preview && previewImg) {
                preview.style.display = 'none';
                previewImg.src = '';
            }
        }
    }

    // API Call function
    async apiCall(url, options = {}) {
        // Obtener token desde localStorage
        const token = localStorage.getItem('token');
        
        // Verificar si hay token
        if (!token) {
            console.error('No hay token en localStorage');
            this.showToast('Sesión expirada. Por favor inicia sesión nuevamente.', 'error');
            window.location.href = '/login.html';
            return;
        }
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const finalOptions = { ...defaultOptions, ...options };

        if (options.body && !(options.body instanceof FormData)) {
            finalOptions.body = JSON.stringify(options.body);
        }

        const maxRetries = 3;
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                const response = await fetch(url, {
                    ...finalOptions,
                    signal: AbortSignal.timeout(10000) // 10 segundos timeout
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Error en la solicitud');
                }

                return data;
            } catch (error) {
                retryCount++;
                console.error(`API Error (intento ${retryCount}/${maxRetries}):`, error);
                
                if (retryCount >= maxRetries) {
                    // Si falla después de todos los intentos
                    if (error.name === 'AbortError') {
                        this.showToast('Tiempo de espera agotado. Verifica tu conexión.', 'error');
                    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                        this.showToast('Error de conexión. El servidor puede estar inaccesible.', 'error');
                    } else {
                        this.showToast(error.message || 'Error de conexión', 'error');
                    }
                    throw error;
                }
                
                // Esperar antes de reintentar (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
        }
    }

    // Utility functions
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount || 0);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX');
    }

    formatStatus(status) {
        const statusMap = {
            'activo': 'Activo',
            'dado_de_baja': 'Dado de Baja',
            'en_mantenimiento': 'En Mantenimiento'
        };
        return statusMap[status] || status;
    }

    async loadReportesData() {
        try {
            // Mostrar mensaje de carga
            const reportesSection = document.getElementById('reportes-section');
            if (reportesSection) {
                reportesSection.innerHTML = `
                    <div class="section-header">
                        <h2>Reportes</h2>
                        <p>Generación de reportes y estadísticas del sistema</p>
                    </div>
                    <div class="reportes-container">
                        <div class="reporte-card">
                            <h3>Reporte General de Inventario</h3>
                            <p>Reporte completo de todos los artículos del sistema</p>
                            <button class="btn btn-primary" onclick="dashboardApp.generarReporteGeneral()">
                                <i class="fas fa-file-pdf"></i> Generar PDF
                            </button>
                        </div>
                        <div class="reporte-card">
                            <h3>Reporte por Secretaría</h3>
                            <p>Reporte filtrado por secretaría específica</p>
                            <select id="secretariaReporte" class="form-control">
                                <option value="">Seleccione una secretaría</option>
                                <option value="Organización">Organización</option>
                                <option value="Finanzas">Finanzas</option>
                                <option value="Asuntos Legales">Asuntos Legales</option>
                                <option value="Transparencia">Transparencia</option>
                                <option value="Fomento al Deporte">Fomento al Deporte</option>
                                <option value="Fomento al Ahorro">Fomento al Ahorro</option>
                                <option value="Pensiones y Jubilaciones">Pensiones y Jubilaciones</option>
                                <option value="Oficialía Mayor">Oficialía Mayor</option>
                                <option value="Actas y Acuerdos">Actas y Acuerdos</option>
                                <option value="De Interior">De Interior</option>
                                <option value="Prensa y Propaganda">Prensa y Propaganda</option>
                                <option value="Trabajo y Conflictos">Trabajo y Conflictos</option>
                                <option value="Patrimonio">Patrimonio</option>
                                <option value="Fomento a la Vivienda">Fomento a la Vivienda</option>
                                <option value="Educación y Cultura">Educación y Cultura</option>
                                <option value="Auditoría">Auditoría</option>
                                <option value="Acción Social">Acción Social</option>
                            </select>
                            <button class="btn btn-primary" onclick="dashboardApp.generarReporteSecretaria()">
                                <i class="fas fa-file-pdf"></i> Generar PDF
                            </button>
                        </div>
                        <div class="reporte-card">
                            <h3>Reporte de Activos vs Mantenimiento</h3>
                            <p>Comparación entre artículos activos y en mantenimiento</p>
                            <button class="btn btn-primary" onclick="dashboardApp.generarReporteEstados()">
                                <i class="fas fa-chart-bar"></i> Generar Reporte
                            </button>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading reportes data:', error);
            this.showToast('Error al cargar reportes', 'error');
        }
    }

    async generarReporteGeneral() {
        try {
            this.showToast('Generando reporte general...', 'info');
            
            // Obtener datos del inventario
            const response = await this.apiCall('/api/inventario');
            const items = response.data;
            
            // Generar PDF
            await this.generatePDFReport(items, 'Reporte General de Inventario');
            
            this.showToast('Reporte general generado exitosamente', 'success');
        } catch (error) {
            console.error('Error generating reporte general:', error);
            this.showToast('Error al generar reporte', 'error');
        }
    }

    async generarReporteSecretaria() {
        const secretaria = document.getElementById('secretariaReporte').value;
        if (!secretaria) {
            this.showToast('Seleccione una secretaría', 'warning');
            return;
        }
        
        try {
            this.showToast(`Generando reporte de ${secretaria}...`, 'info');
            
            // Obtener todos los datos y filtrar por secretaría
            const response = await this.apiCall('/api/inventario');
            const allItems = response.data;
            const filteredItems = allItems.filter(item => item.secretaria === secretaria);
            
            // Generar PDF filtrado
            await this.generatePDFReport(filteredItems, `Reporte de ${secretaria}`);
            
            this.showToast(`Reporte de ${secretaria} generado exitosamente`, 'success');
        } catch (error) {
            console.error('Error generating reporte secretaria:', error);
            this.showToast('Error al generar reporte', 'error');
        }
    }

    async generarReporteEstados() {
        try {
            this.showToast('Generando reporte de estados...', 'info');
            
            // Obtener datos del inventario
            const response = await this.apiCall('/api/inventario');
            const items = response.data;
            
            // Generar PDF de estados
            await this.generateEstadoReport(items, 'Reporte de Estados del Inventario');
            
            this.showToast('Reporte de estados generado exitosamente', 'success');
        } catch (error) {
            console.error('Error generating reporte estados:', error);
            this.showToast('Error al generar reporte', 'error');
        }
    }

    async generatePDFReport(items, title) {
        try {
            // Inicializar jsPDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Configurar fuentes
            doc.setFont("helvetica");
            
            // Título
            doc.setFontSize(20);
            doc.text(title, 105, 20, { align: 'center' });
            
            // Información del header
            doc.setFontSize(10);
            doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-MX')}`, 105, 30, { align: 'center' });
            doc.text(`Total de artículos: ${items.length}`, 105, 35, { align: 'center' });
            
            // Preparar datos para la tabla
            const tableData = items.map(item => [
                item.numero_inventario,
                item.descripcion,
                item.secretaria,
                item.resguardante,
                this.formatCurrency(item.costo),
                this.formatStatus(item.estatus),
                this.formatDate(item.fecha_alta)
            ]);
            
            // Generar tabla con autoTable
            doc.autoTable({
                head: [
                    ['Número', 'Descripción', 'Secretaría', 'Resguardante', 'Costo', 'Estado', 'Fecha Alta']
                ],
                body: tableData,
                startY: 45,
                styles: {
                    font: 'helvetica',
                    fontSize: 8,
                    cellPadding: 3
                },
                headStyles: {
                    fillColor: [44, 62, 80],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                columnStyles: {
                    0: { cellWidth: 20 }, // Número
                    1: { cellWidth: 40 }, // Descripción
                    2: { cellWidth: 25 }, // Secretaría
                    3: { cellWidth: 25 }, // Resguardante
                    4: { cellWidth: 20 }, // Costo
                    5: { cellWidth: 20 }, // Estado
                    6: { cellWidth: 20 }  // Fecha
                }
            });
            
            // Totales
            const finalY = doc.lastAutoTable.finalY || 45;
            const valorTotal = items.reduce((sum, item) => sum + (item.costo || 0), 0);
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text(`Total de artículos: ${items.length}`, 20, finalY + 10);
            doc.text(`Valor total: ${this.formatCurrency(valorTotal)}`, 20, finalY + 15);
            
            // Guardar el PDF
            doc.save(`${title}_${new Date().toISOString().split('T')[0]}.pdf`);
            
        } catch (error) {
            console.error('Error generating PDF report:', error);
            throw error;
        }
    }

    async generateEstadoReport(items, title) {
        try {
            // Inicializar jsPDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Configurar fuentes
            doc.setFont("helvetica");
            
            // Título
            doc.setFontSize(20);
            doc.text(title, 105, 20, { align: 'center' });
            
            // Información del header
            doc.setFontSize(10);
            doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-MX')}`, 105, 30, { align: 'center' });
            doc.text(`Total de artículos: ${items.length}`, 105, 35, { align: 'center' });
            
            // Agrupar por estado
            const estados = items.reduce((acc, item) => {
                const estado = item.estatus || 'sin_estado';
                if (!acc[estado]) acc[estado] = [];
                acc[estado].push(item);
                return acc;
            }, {});
            
            // Resumen por estado
            let currentY = 45;
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Resumen por Estado:', 20, currentY);
            currentY += 10;
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            Object.keys(estados).forEach(estado => {
                const count = estados[estado].length;
                const valor = estados[estado].reduce((sum, item) => sum + (item.costo || 0), 0);
                doc.text(`${this.formatStatus(estado)}: ${count} artículos (Valor: ${this.formatCurrency(valor)})`, 25, currentY);
                currentY += 7;
            });
            
            currentY += 10;
            
            // Tablas por estado
            Object.keys(estados).forEach((estado, index) => {
                // Verificar si necesitamos nueva página
                if (currentY > 250) {
                    doc.addPage();
                    currentY = 20;
                }
                
                // Título del estado
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text(`${this.formatStatus(estado)} (${estados[estado].length} artículos)`, 20, currentY);
                currentY += 10;
                
                // Preparar datos para la tabla
                const tableData = estados[estado].map(item => [
                    item.numero_inventario,
                    item.descripcion,
                    item.secretaria,
                    item.resguardante,
                    this.formatCurrency(item.costo)
                ]);
                
                // Generar tabla
                doc.autoTable({
                    head: [['Número', 'Descripción', 'Secretaría', 'Resguardante', 'Costo']],
                    body: tableData,
                    startY: currentY,
                    styles: {
                        font: 'helvetica',
                        fontSize: 8,
                        cellPadding: 2
                    },
                    headStyles: {
                        fillColor: [52, 152, 219],
                        textColor: 255,
                        fontStyle: 'bold'
                    },
                    alternateRowStyles: {
                        fillColor: [245, 245, 245]
                    },
                    columnStyles: {
                        0: { cellWidth: 20 },
                        1: { cellWidth: 45 },
                        2: { cellWidth: 25 },
                        3: { cellWidth: 25 },
                        4: { cellWidth: 20 }
                    }
                });
                
                currentY = doc.lastAutoTable.finalY + 10;
            });
            
            // Guardar el PDF
            doc.save(`${title}_${new Date().toISOString().split('T')[0]}.pdf`);
            
        } catch (error) {
            console.error('Error generating estado report:', error);
            throw error;
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardApp = new DashboardSecretariasApp();
});

// Global functions for onclick handlers
window.addArticleToSecretaria = function(secretaria) {
    window.dashboardApp.addArticleToSecretaria(secretaria);
};

window.editItem = function(id) {
    window.dashboardApp.editItem(id);
};

window.deleteItem = function(id) {
    window.dashboardApp.deleteItem(id);
};

window.viewDetails = function(id) {
    window.dashboardApp.viewDetails(id);
};

window.closeEditModal = function() {
    window.dashboardApp.closeEditModal();
};

window.closeDeleteModal = function() {
    window.dashboardApp.closeDeleteModal();
};

window.closeDetailsModal = function() {
    window.dashboardApp.closeDetailsModal();
};

window.confirmDelete = function() {
    window.dashboardApp.confirmDelete();
};

window.showSection = function(sectionName) {
    window.dashboardApp.showSection(sectionName);
};

window.resetForm = function() {
    window.dashboardApp.resetForm();
};

window.resetUserForm = function() {
    window.dashboardApp.resetUserForm();
};

window.toggleUserStatus = function(userId, activate) {
    window.dashboardApp.toggleUserStatus(userId, activate);
};
