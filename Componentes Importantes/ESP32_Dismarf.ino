/*
 * =========================================================
 * DISMARF - MÓDULO IoT DE TELEMETRÍA
 * Ingeniería y Desarrollo: Studios Daniels
 * Arquitectura: Non-blocking, Auto-Reconnect, Fallback Auth
 * =========================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// 1. CONFIGURACIÓN DEL HARDWARE
#define DHTPIN 4          
#define DHTTYPE DHT11     
DHT dht(DHTPIN, DHTTYPE);

// 2. CONFIGURACIÓN DE RED Y BACKEND
const char* ssid = "Daniel";
const char* password = "0987654321";

const char* backendURL = "http://IP-DEL-DISPOSITIVO:3001/api/telemetry/ingest";

// MAC del Ardunio a regsitrar
const String MAC_ESP32 = "AAA-BBB-CCCC-DDDD"; 

// 3. VARIABLES DE TIEMPO (NON-BLOCKING)
unsigned long tiempoUltimaLectura = 0;
const unsigned long INTERVALO_LECTURA = 10000;

unsigned long tiempoUltimoReintentoWifi = 0;
const unsigned long INTERVALO_REINTENTO_WIFI = 15000;

void setup() {
  Serial.begin(115200);
  delay(100);

  Serial.println("\n=====================================");
  Serial.println("  SISTEMA DISMARF - INICIO SEGURO    ");
  Serial.println("=====================================");

  dht.begin();
  
  WiFi.mode(WIFI_STA);
  conectarWiFi();
}

void loop() {
  unsigned long tiempoActual = millis();

  if (WiFi.status() != WL_CONNECTED) {
    if (tiempoActual - tiempoUltimoReintentoWifi >= INTERVALO_REINTENTO_WIFI) {
      Serial.println("[WIFI] Se perdió la conexión. Intentando reconectar...");
      WiFi.disconnect();
      WiFi.reconnect();
      tiempoUltimoReintentoWifi = tiempoActual;
    }
  }

  if (tiempoActual - tiempoUltimaLectura >= INTERVALO_LECTURA) {
    tiempoUltimaLectura = tiempoActual;

    procesarTelemetria();
  }
}

// FUNCIONES NUCLEO
void procesarTelemetria() {
  float humedad = dht.readHumidity();
  float temperatura = dht.readTemperature();

  // VALIDACIÓN DE ERROR DEL SENSOR
  bool errorSensor = false;
  if (isnan(humedad) || isnan(temperatura)) {
    Serial.println("[HARDWARE ERROR] No se detecta el sensor DHT11.");
    errorSensor = true;
    
    temperatura = 999.0;
    humedad = 0.0;
  } else {
    Serial.printf("[SENSOR] Cava: %s | Temp: %.1f °C | Humedad: %.1f %%\n", MAC_ESP32.c_str(), temperatura, humedad);
  }

  // ENVÍO AL BACKEND SOLO SI HAY WI-FI
  if (WiFi.status() == WL_CONNECTED) {
    enviarDatosAlServidor(temperatura, humedad, errorSensor);
  } else {
    Serial.println("[WARNING] Datos leídos pero sin conexión a Internet. Se perderá este paquete.");
  }
}

void enviarDatosAlServidor(float temp, float hum, bool errorSensor) {
  HTTPClient http;
  
  // Configuramos tiempo de espera máximo de 5 segundos para que la red no trabe al ESP32
  http.setTimeout(5000); 
  http.begin(backendURL);
  http.addHeader("Content-Type", "application/json");

  // Serializamos el JSON (MongoDB Mongoose usa esta estructura estricta)
  StaticJsonDocument<256> doc;
  doc["mac_esp32"] = MAC_ESP32; 
  doc["temperatura"] = temp;
  doc["humedad"] = hum;
  
  doc["puerta_abierta"] = false;

  String requestBody;
  serializeJson(doc, requestBody);

  int httpResponseCode = http.POST(requestBody);

  if (httpResponseCode > 0) {
    Serial.printf("[MONGODB] Enviado con éxito. Status: %d\n", httpResponseCode);
  } else {
    Serial.printf("[ERROR HTTP] Fallo al enviar: %s\n", http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}

void conectarWiFi() {
  Serial.printf("[RED] Conectando a %s ", ssid);
  WiFi.begin(ssid, password);
  
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 30) {
    delay(500);
    Serial.print(".");
    intentos++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[OK] Conectado. IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[ERROR] El Wi-Fi no respondió a tiempo. Operando en modo Offline hasta recuperación.");
  }
}