# Ventas 7 Lunas

**Ventas 7 Lunas** es un MVP de plataforma e-commerce diseñada para organizar y optimizar la venta de productos dentro de un grupo de WhatsApp de tu comunidad. Permite a los vendedores publicar, gestionar y destacar sus productos de forma ordenada, y a los compradores navegar por categorías, consultar detalles y realizar pedidos.

---

## 📋 Descripción general
- **Objetivo**: Sustituir la desorganización de un grupo de WhatsApp por una plataforma estructurada.  
- **Público**: Vendedores locales y compradores de la comunidad.  
- **Modelo de negocio**: Suscripción mensual con 3 planes: Básico (gratuito 1 mes), Preferido y Premium.

---

## 🚀 Características principales

1. **Planes de suscripción**  
   - **Básico**: Gratis 1 mes, hasta 5 productos.  
   - **Preferido**: 30.000 COP/mes, hasta 15 productos + destacado en inicio.  
   - **Premium**: 50.000 COP/mes, productos ilimitados + 1 destacado + posicionamiento en búsquedas.

2. **Perfil de vendedor**  
   - Página pública con:  
     - Información del negocio.  
     - Productos más vendidos (mini sección destacados).  
     - Redes sociales.  
     - Sección de comentarios.

3. **Panel privado (login requerido para vendedores)**  
   - Gestión de productos.  
   - Visualización de ventas mediante diagramas.

4. **Catálogo para compradores**  
   - Listado de productos por categoría.  
   - Banners promocionales entre resultados.  
   - Filtro y búsqueda.  
   - Detalle de producto con similares y más del mismo vendedor.

5. **Carrito de compras**  
   - Órdenes agrupadas por vendedor.  
   - Visualización de cantidades, precio unitario y total.  
   - Finalizar compra.

---

## 🛠️ Tecnologías

- **Frontend**:  
  - Angular 19 (Standalone Components)  
  - PrimeNG 19 (tema Aura)  
  - Tailwind CSS  

- **Backend**:  
  - Java (Spring Boot)  
  - Base de datos: PostgreSQL / MySQL  
  - REST API  

- **DevOps**:  
  - Git/GitHub  
  - CI/CD en Azure DevOps  

---

## ⚙️ Instalación y configuración

1. **Clonar repositorio**  
   ```bash
   git clone https://github.com/tu-org/ventas-7-lunas.git
   cd ventas-7-lunas
   ```

2. **Backend**  
   - Configurar variables de entorno en `application.properties`:
     ```properties
     spring.datasource.url=jdbc:postgresql://localhost:5432/ventas
     spring.datasource.username=usuario
     spring.datasource.password=contraseña
     ```
   - Ejecutar:
     ```bash
     ./mvnw spring-boot:run
     ```

3. **Frontend**  
   - Instalar dependencias:
     ```bash
     cd frontend
     npm install
     ```
   - Configurar `environment.ts` con la URL del backend:
     ```ts
     export const environment = {
       production: false,
       apiUrl: 'http://localhost:8080/api'
     };
     ```
   - Ejecutar:
     ```bash
     ng serve
     ```

---

## 🚧 Estructura del proyecto

```
├── backend
│   ├── src/main/java/com/ventas7lunas
│   ├── src/main/resources
│   └── pom.xml
└── frontend
    ├── src/app
    │   ├── core/      # Servicios, interceptores, modelos
    │   ├── features/  # Componentes por funcionalidades (productos, carrito, perfil)
    │   ├── shared/    # Componentes, Pipes y Directivas compartidas
    │   ├── assets/
    │   └── styles/
    ├── angular.json
    └── package.json
```

---

## 🎯 Roadmap (MVP)
1. Configuración inicial de proyecto.  
2. CRUD de productos y autenticación de vendedores.  
3. Implementación de planes de suscripción.  
4. Catálogo de compradores y filtros.  
5. Carrito y proceso de compra.  
6. Dashboard de ventas y diagramas.  
7. Pruebas unitarias e integración.

---

## 🤝 Contribuciones
¡Todas las contribuciones son bienvenidas! Por favor:  
1. Abre un *issue* describiendo tu propuesta.  
2. Crea un *fork* y realiza tus cambios en una rama.  
3. Haz un *pull request*.

---

## 📄 Licencia
Este proyecto está bajo la licencia MIT. Ve el archivo [LICENSE](LICENSE) para más detalles.

---

## 📬 Contacto
Desarrollador: Deyson Estrada  
Correo: tu-email@dominio.com
