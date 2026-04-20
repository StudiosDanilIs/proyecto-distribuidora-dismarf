# Sistema de Monitoreo de Cadena de Frío - Distribuidora Dismarf ❄️

Este proyecto consiste en una plataforma integral de monitoreo predictivo y trazabilidad para cavas cuarto industriales. [cite_start]Utiliza una arquitectura de microservicios desacoplados para garantizar alta disponibilidad y persistencia políglota[cite: 77, 83].

## 🏗️ Arquitectura del Sistema
El sistema se divide en tres capas principales:
1. [cite_start]**Capa de Hardware (IoT):** Nodos sensores basados en ESP32 que recolectan temperatura, humedad y estado de puertas[cite: 79, 122].
2. [cite_start]**Capa de Backend:** Microservicios en Node.js que gestionan la lógica de negocio, seguridad e ingesta de datos masivos[cite: 84].
3. [cite_start]**Capa de Frontend:** Aplicación móvil en React Native con arquitectura Offline-First[cite: 88, 90].

## 🛠️ Stack Tecnológico
- [cite_start]**Core API:** Node.js + Express + PostgreSQL (Datos transaccionales)[cite: 101, 106].
- [cite_start]**IoT API:** Node.js + MongoDB (Telemetría de sensores)[cite: 108].
- [cite_start]**Enrutamiento:** API Gateway personalizado en Node.js[cite: 103].
- [cite_start]**Hardware:** ESP32, DHT22, Sensor Magnético Reed Switch.

## 📁 Estructura del Repositorio
/dismarf-core-service      # Gestión de usuarios y cavas (PostgreSQL)
/dismarf-telemetry-service # Ingesta de datos de sensores (MongoDB)
/dismarf-api-gateway       # Puerta de enlace unificada (Puerto 4000)
/dismarf-mobile-app        # Aplicación React Native
/dismarf-hardware-iot      # Código C++ para ESP32
