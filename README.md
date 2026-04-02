# 🧊 Plataforma IoT de Trazabilidad: Distribuidora Dismarf
**Sistema Distribuido Offline-First para el Monitoreo Predictivo de Cadena de Frío**

![Banner del Proyecto](https://via.placeholder.com/1000x300?text=Banner+del+Proyecto+Dismarf+-+Sube+una+foto+de+la+App+o+Hardware)

> **🚀 Studios Daniels** | Proyecto Sociotecnológico IV - UPTAIET (San Cristóbal, Táchira).

---

## 📖 Acerca del Proyecto

En los almacenes de distribución alimentaria, la inestabilidad eléctrica y las fallas de equipos de refrigeración ponen en riesgo constante la viabilidad y calidad de productos perecederos. 

Esta plataforma resuelve esta problemática comunitaria y empresarial mediante la implementación de **nodos sensores IoT** de ultra bajo costo (ESP32) instalados en cavas cuarto. Los datos de telemetría fluyen hacia una **arquitectura de microservicios políglota**, permitiendo al personal de logística auditar el inventario y recibir alertas predictivas mediante una **aplicación móvil Offline-First**, garantizando la operatividad incluso ante la caída total del internet local.

## ✨ Características Principales

* 📡 **Telemetría IoT en Tiempo Real:** Monitoreo ininterrumpido de temperatura, humedad y estado de puertas mediante hardware dedicado.
* 🔋 **Resiliencia Eléctrica:** Nodos autónomos con respaldo UPS (Li-ion) y modo *Deep Sleep*.
* 📴 **Arquitectura Offline-First:** App móvil que permite registrar inspecciones de calidad sin conexión, con un *Sync Engine* de resolución de conflictos (*Last Write Wins*) al reconectar.
* 🚨 **Alertas Inteligentes:** Notificaciones push en tiempo real a través de Redis Message Broker ante excursiones de temperatura o fallas de suministro eléctrico.
* 🐳 **Infraestructura Contenerizada:** Despliegue modular en Linux Ubuntu garantizado mediante Docker.

---

## 🛠️ Stack Tecnológico

El proyecto está diseñado bajo una arquitectura de microservicios estrictamente desacoplada:

### ⚙️ Hardware (Edge Computing)
* **Microcontrolador:** ESP32 (Wi-Fi integrado)
* **Sensores:** DHT22 (Temperatura/Humedad), Sensor Magnético de Puerta (Reed Switch).
* **Módulo de Energía:** TP4056 + Batería 18650 (3000mAh)
* **Programación:** C/C++ (Arduino IDE)

### 🧠 Backend & Microservicios
* **Core:** Node.js (Express)
* **API Gateway:** Nginx / Kong
* **Autenticación:** JWT / OAuth2

### 🗄️ Bases de Datos (Arquitectura Políglota)
* **PostgreSQL:** Sistema transaccional ACID (Inventario, Usuarios, Roles).
* **MongoDB:** Almacenamiento masivo y flexible de telemetría de sensores.
* **Redis:** Caché de alta velocidad y Broker de Mensajería asíncrona.

### 📱 Frontend Móvil
* **Framework:** React Native
* **Almacenamiento Local:** WatermelonDB / SQLite (Soporte Offline)

---

## 🗺️ Arquitectura del Sistema

![Diagrama de Arquitectura](https://via.placeholder.com/800x400?text=Sube+Aca+Tu+Diagrama+De+Arquitectura+C4)

*(Reemplazar con el diagrama de despliegue UML o C4 del proyecto).*

---

## 🚀 Guía de Inicio Rápido (Desarrollo Local)

Para clonar y correr este proyecto en un entorno local, asegúrate de tener instalados **Docker**, **Docker Compose**, y **Node.js LTS**.

**1. Clonar el repositorio:**
```bash
git clone [https://github.com/tu-usuario/dismarf-iot-platform.git](https://github.com/tu-usuario/dismarf-iot-platform.git)
cd dismarf-iot-platform

2. Levantar la Infraestructura de Bases de Datos:
cd infraestructura
docker-compose up -d
(Esto encenderá automáticamente PostgreSQL, MongoDB y Redis en contenedores aislados).

3. Iniciar el Microservicio de Telemetría:
cd ../backend
npm install
node server.js
