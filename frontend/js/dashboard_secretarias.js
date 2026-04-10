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
        this.loadUserSession();
        this.setupEventListeners();
        this.setupSidebar();
        await this.loadDashboardData();
        this.showSection('inicio');
    }

    loadUserSession() {
        this.token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (!this.token || !userData) {
            window.location.href = '/';
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
            document.getElementById('currentDate').textContent = new Date().toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
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

    logout() {
        localStorage.clear();
        window.location.href = '/';
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

        try {
            const response = await fetch(url, finalOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error en la solicitud');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            this.showToast(error.message || 'Error de conexión', 'error');
            throw error;
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
