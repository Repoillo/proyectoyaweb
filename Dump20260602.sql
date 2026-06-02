-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: ya
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `chat_historial`
--

DROP TABLE IF EXISTS `chat_historial`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_historial` (
  `id_mensaje` int NOT NULL AUTO_INCREMENT,
  `id_restaurante` int NOT NULL,
  `id_usuario` int NOT NULL,
  `rol_mensaje` enum('user','model') NOT NULL,
  `contenido` text NOT NULL,
  `fecha_mensaje` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_mensaje`),
  KEY `fk_chat_restaurante` (`id_restaurante`),
  KEY `fk_chat_usuario` (`id_usuario`),
  CONSTRAINT `fk_chat_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurante` (`id_restaurante`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `m_usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_historial`
--

LOCK TABLES `chat_historial` WRITE;
/*!40000 ALTER TABLE `chat_historial` DISABLE KEYS */;
/*!40000 ALTER TABLE `chat_historial` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comentarios`
--

DROP TABLE IF EXISTS `comentarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comentarios` (
  `id_comentario` int NOT NULL AUTO_INCREMENT,
  `id_restaurante` int NOT NULL,
  `id_producto` int DEFAULT NULL COMMENT 'Sobre qué producto es el comentario',
  `calificacion` tinyint DEFAULT NULL COMMENT 'Ej: 1-5 estrellas',
  `comentario` text,
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_comentario`),
  KEY `fk_comentarios_restaurante` (`id_restaurante`),
  KEY `fk_comentarios_producto` (`id_producto`),
  CONSTRAINT `fk_comentarios_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_comentarios_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurante` (`id_restaurante`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comentarios`
--

LOCK TABLES `comentarios` WRITE;
/*!40000 ALTER TABLE `comentarios` DISABLE KEYS */;
/*!40000 ALTER TABLE `comentarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `config_gastos_diarios`
--

DROP TABLE IF EXISTS `config_gastos_diarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `config_gastos_diarios` (
  `id_gasto_fijo` int NOT NULL AUTO_INCREMENT,
  `id_restaurante` int NOT NULL,
  `concepto` varchar(100) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_gasto_fijo`),
  KEY `id_restaurante` (`id_restaurante`),
  CONSTRAINT `config_gastos_diarios_ibfk_1` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurante` (`id_restaurante`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `config_gastos_diarios`
--

LOCK TABLES `config_gastos_diarios` WRITE;
/*!40000 ALTER TABLE `config_gastos_diarios` DISABLE KEYS */;
INSERT INTO `config_gastos_diarios` VALUES (8,1,'Luz, Agua y Gas',250.00),(9,1,'Mantenimiento Sucursal',150.00);
/*!40000 ALTER TABLE `config_gastos_diarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `empleados`
--

DROP TABLE IF EXISTS `empleados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `empleados` (
  `id_empleado` int NOT NULL AUTO_INCREMENT,
  `id_restaurante` int NOT NULL,
  `nombre_empleado` varchar(60) NOT NULL,
  `rol` varchar(45) NOT NULL,
  `sueldo` decimal(10,2) NOT NULL,
  `estado` enum('activo','inactivo') NOT NULL DEFAULT 'activo',
  `id_usuario` int DEFAULT NULL,
  PRIMARY KEY (`id_empleado`),
  KEY `fk_empleados_restaurante` (`id_restaurante`),
  KEY `fk_empleados_usuario` (`id_usuario`),
  CONSTRAINT `fk_empleados_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurante` (`id_restaurante`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_empleados_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `m_usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `empleados`
--

LOCK TABLES `empleados` WRITE;
/*!40000 ALTER TABLE `empleados` DISABLE KEYS */;
INSERT INTO `empleados` VALUES (1,1,'Angel Cocinero','Cocinero',10000.00,'activo',2),(2,1,'Angel mesero','Mesero',10000.00,'activo',3);
/*!40000 ALTER TABLE `empleados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ingredientes`
--

DROP TABLE IF EXISTS `ingredientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ingredientes` (
  `id_ingrediente` int NOT NULL AUTO_INCREMENT,
  `id_restaurante` int NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `unidad_medida` varchar(20) NOT NULL COMMENT 'Ej: gr, ml, pza',
  `costo_unitario` decimal(15,6) NOT NULL DEFAULT '0.000000',
  `stock` decimal(10,2) NOT NULL DEFAULT '0.00',
  `estado` enum('activo','inactivo') NOT NULL DEFAULT 'activo',
  `cantidad_por_unidad` decimal(10,2) DEFAULT '1.00' COMMENT 'Cuanto trae el envase (ej. 3750 ml)',
  `dias_caducidad_estimado` int DEFAULT NULL COMMENT 'Días promedio que dura este producto para auto-calcular caducidad al comprar',
  PRIMARY KEY (`id_ingrediente`),
  UNIQUE KEY `idx_restaurante_nombre_ing` (`id_restaurante`,`nombre`),
  CONSTRAINT `fk_ingredientes_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurante` (`id_restaurante`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ingredientes`
--

LOCK TABLES `ingredientes` WRITE;
/*!40000 ALTER TABLE `ingredientes` DISABLE KEYS */;
INSERT INTO `ingredientes` VALUES (20,1,'Maíz Cacahuazintle','gr',0.050000,14750.00,'activo',5000.00,15),(21,1,'Carne de Cerdo (Maciza)','gr',0.120000,39850.00,'activo',5000.00,5),(22,1,'Masa de Maíz','gr',0.030000,8000.00,'activo',2000.00,3),(23,1,'Bistec de Res','gr',0.180000,8000.00,'activo',2000.00,4),(24,1,'Lechuga','gr',0.020000,2000.00,'activo',1000.00,6),(25,1,'Crema','ml',0.040000,3000.00,'activo',1000.00,14),(26,1,'Queso Rallado','gr',0.090000,7000.00,'activo',1000.00,20),(27,1,'Agua de Horchata','ml',0.015000,35000.00,'activo',4000.00,3),(28,1,'prueba','gr',1000.000000,0.00,'activo',1.00,1);
/*!40000 ALTER TABLE `ingredientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lotes_ingredientes`
--

DROP TABLE IF EXISTS `lotes_ingredientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lotes_ingredientes` (
  `id_lote` int NOT NULL AUTO_INCREMENT,
  `id_ingrediente` int NOT NULL,
  `id_restaurante` int NOT NULL,
  `cantidad_inicial` decimal(10,2) NOT NULL COMMENT 'Lo que se compró originalmente',
  `cantidad_actual` decimal(10,2) NOT NULL COMMENT 'Lo que queda de este lote',
  `fecha_compra` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_caducidad` date NOT NULL,
  `estado` enum('disponible','agotado','caducado','desechado') NOT NULL DEFAULT 'disponible',
  PRIMARY KEY (`id_lote`),
  KEY `fk_lote_ingrediente` (`id_ingrediente`),
  KEY `fk_lote_restaurante` (`id_restaurante`),
  CONSTRAINT `fk_lote_ingrediente` FOREIGN KEY (`id_ingrediente`) REFERENCES `ingredientes` (`id_ingrediente`) ON DELETE CASCADE,
  CONSTRAINT `fk_lote_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurante` (`id_restaurante`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lotes_ingredientes`
--

LOCK TABLES `lotes_ingredientes` WRITE;
/*!40000 ALTER TABLE `lotes_ingredientes` DISABLE KEYS */;
INSERT INTO `lotes_ingredientes` VALUES (8,21,1,5000.00,4850.00,'2026-05-30 13:00:01','2026-06-04','disponible'),(9,24,1,2000.00,2000.00,'2026-05-30 13:00:01','2026-06-05','disponible'),(10,21,1,5000.00,5000.00,'2026-06-01 09:43:07','2026-06-06','disponible'),(11,21,1,20000.00,20000.00,'2026-06-01 10:02:36','2026-06-06','disponible'),(12,28,1,1.00,1.00,'2026-06-01 10:13:17','2026-06-01','caducado'),(13,22,1,8000.00,8000.00,'2026-06-02 00:04:14','2026-06-09','disponible'),(14,23,1,8000.00,8000.00,'2026-06-02 00:04:22','2026-06-09','disponible'),(15,20,1,15000.00,14750.00,'2026-06-02 00:04:28','2026-06-10','disponible'),(16,25,1,3000.00,3000.00,'2026-06-02 00:04:36','2026-06-12','disponible'),(17,26,1,7000.00,7000.00,'2026-06-02 00:04:46','2026-06-08','disponible'),(18,27,1,36000.00,35000.00,'2026-06-02 00:04:56','2026-06-11','disponible'),(19,21,1,5000.00,5000.00,'2026-06-02 00:15:10','2026-06-07','disponible'),(20,21,1,5000.00,5000.00,'2026-06-02 00:15:26','2026-06-07','disponible');
/*!40000 ALTER TABLE `lotes_ingredientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `m_usuarios`
--

DROP TABLE IF EXISTS `m_usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `m_usuarios` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `id_restaurante` int NOT NULL,
  `nombre_usuario` varchar(50) NOT NULL,
  `correo_usuario` varchar(60) NOT NULL,
  `contra_hash` varchar(255) NOT NULL,
  `rol` enum('dueño','cocinero','mesero') NOT NULL DEFAULT 'cocinero',
  `estado` enum('activo','inactivo') NOT NULL DEFAULT 'activo',
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `correo_usuario_UNIQUE` (`correo_usuario`),
  KEY `fk_usuarios_restaurante` (`id_restaurante`),
  CONSTRAINT `fk_usuarios_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurante` (`id_restaurante`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `m_usuarios`
--

LOCK TABLES `m_usuarios` WRITE;
/*!40000 ALTER TABLE `m_usuarios` DISABLE KEYS */;
INSERT INTO `m_usuarios` VALUES (1,1,'angel','hola@gmail.com','$2b$10$EE/JO6m5gtqJ2zTPmjc65.JpKSugGU9E8/.mrwXc4Bq9GRk7os4JO','dueño','activo'),(2,1,'Angel Cocinero','angeltima2605@gmail.com','$2b$10$LHysPdpRApg2e/nj0BIMdu36BB1YaUKRG7oT.v/KQGRSBvk76C19W','cocinero','activo'),(3,1,'Angel mesero','tinoco.martinez.angel.alexander@gmail.com','$2b$10$ybU/RmFzpbnc1t73JMY4QeqtsRo42Wofji/xzhebX3vA4FQa9Ql5C','mesero','activo');
/*!40000 ALTER TABLE `m_usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mesas`
--

DROP TABLE IF EXISTS `mesas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mesas` (
  `id_mesa` int NOT NULL AUTO_INCREMENT,
  `id_restaurante` int NOT NULL,
  `numero_mesa` varchar(50) NOT NULL,
  `estado` enum('libre','ocupada') NOT NULL DEFAULT 'libre',
  `codigo_sesion` varchar(10) DEFAULT NULL,
  `id_mesero` int DEFAULT NULL,
  PRIMARY KEY (`id_mesa`),
  KEY `fk_mesas_restaurante` (`id_restaurante`),
  CONSTRAINT `fk_mesas_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurante` (`id_restaurante`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mesas`
--

LOCK TABLES `mesas` WRITE;
/*!40000 ALTER TABLE `mesas` DISABLE KEYS */;
INSERT INTO `mesas` VALUES (11,1,'Mesa 1','libre',NULL,NULL),(12,1,'Mesa 2','libre',NULL,NULL),(13,1,'Mesa 3','libre',NULL,NULL),(14,1,'Mesa 4','libre',NULL,NULL),(15,1,'Mesa 5','libre',NULL,NULL),(16,1,'Barra 1','libre',NULL,NULL),(17,1,'Barra 2','libre',NULL,NULL),(18,1,'Mesa 6','libre',NULL,NULL),(21,1,'mesa 12','libre',NULL,NULL),(22,1,'Mesa 13','libre',NULL,NULL),(23,1,'Mesa 14','libre',NULL,NULL),(24,1,'Mesa 15','libre',NULL,NULL),(25,1,'Mesa 16','libre',NULL,NULL),(26,1,'Mesa 17','libre',NULL,NULL),(27,1,'Barra 8','libre',NULL,NULL);
/*!40000 ALTER TABLE `mesas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movimientos_financieros`
--

DROP TABLE IF EXISTS `movimientos_financieros`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movimientos_financieros` (
  `id_movimiento` int NOT NULL AUTO_INCREMENT,
  `id_restaurante` int NOT NULL,
  `tipo` enum('ingreso','egreso') NOT NULL,
  `categoria` enum('nomina','insumos','servicios','otros','venta') DEFAULT 'otros',
  `monto` decimal(12,2) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_movimiento`),
  KEY `fk_movimientos_restaurante` (`id_restaurante`),
  CONSTRAINT `fk_movimientos_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurante` (`id_restaurante`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movimientos_financieros`
--

LOCK TABLES `movimientos_financieros` WRITE;
/*!40000 ALTER TABLE `movimientos_financieros` DISABLE KEYS */;
INSERT INTO `movimientos_financieros` VALUES (33,1,'ingreso','venta',292.00,'Cierre Mesa 1 (Ticket ORD-600)','2026-05-29 11:47:44'),(34,1,'ingreso','venta',247.00,'Cierre Mesa 3 (Ticket ORD-601)','2026-05-28 11:47:44'),(35,1,'ingreso','venta',168.00,'Cierre Barra 2 (Ticket ORD-602)','2026-05-27 11:47:44'),(36,1,'ingreso','venta',416.00,'Cierre Mesa 5 (Ticket ORD-603)','2026-05-26 11:47:44'),(37,1,'ingreso','venta',124.00,'Cierre Mesa 1 (Ticket ORD-604)','2026-05-25 11:47:44'),(38,1,'egreso','insumos',850.00,'Proveedor Central (Maíz y Maciza)','2026-05-27 11:47:44'),(39,1,'egreso','otros',1200.00,'Nómina Diaria (Automática)','2026-05-30 11:47:48'),(40,1,'egreso','otros',250.00,'Gasto Fijo: Luz, Agua y Gas','2026-05-30 11:47:48'),(41,1,'egreso','otros',150.00,'Gasto Fijo: Mantenimiento Sucursal','2026-05-30 11:47:48'),(42,1,'ingreso','venta',246.00,'Cierre Mesa 1 (Ticket ORD-700)','2026-05-30 12:40:00'),(43,1,'ingreso','venta',169.00,'Cierre Mesa 2 (Ticket ORD-701)','2026-05-30 13:50:00'),(44,1,'ingreso','venta',461.00,'Cierre Mesa 4 (Ticket ORD-702)','2026-05-30 15:10:00'),(45,1,'egreso','otros',14.00,'compra de tortillas','2026-05-30 12:53:37'),(46,1,'egreso','insumos',600.00,'Compra Stock IA: Carne de Cerdo (Maciza) (1 envases)','2026-05-30 13:00:01'),(47,1,'egreso','insumos',40.00,'Compra Stock IA: Lechuga (2 envases)','2026-05-30 13:00:01'),(48,1,'egreso','otros',120.00,'Servilletas','2026-05-30 13:00:01'),(49,1,'egreso','otros',12.00,'Shampoo','2026-05-30 13:00:01'),(50,1,'egreso','otros',50.00,'se rompio un plato nooo','2026-05-30 13:11:47'),(51,1,'egreso','otros',1200.00,'Nómina Diaria (Automática)','2026-06-01 09:42:47'),(52,1,'egreso','otros',250.00,'Gasto Fijo: Luz, Agua y Gas','2026-06-01 09:42:47'),(53,1,'egreso','otros',150.00,'Gasto Fijo: Mantenimiento Sucursal','2026-06-01 09:42:47'),(54,1,'egreso','insumos',600.00,'Compra Stock IA: Carne de Cerdo (Maciza) (1 envases)','2026-06-01 09:43:07'),(55,1,'egreso','insumos',2400.00,'Compra Stock IA: Carne de Cerdo (Maciza) (4 envases)','2026-06-01 10:02:36'),(56,1,'egreso','insumos',1000.00,'Compra Stock: prueba (1 envases)','2026-06-01 10:13:17'),(57,1,'ingreso','otros',356.00,'Cierre Mesa 1 (1 órdenes)','2026-06-01 23:52:55'),(58,1,'ingreso','otros',169.00,'Cierre Mesa 2 (1 órdenes)','2026-06-01 23:52:56'),(59,1,'egreso','insumos',240.00,'Compra Stock: Masa de Maíz (4 envases)','2026-06-02 00:04:14'),(60,1,'egreso','insumos',1440.00,'Compra Stock: Bistec de Res (4 envases)','2026-06-02 00:04:22'),(61,1,'egreso','insumos',750.00,'Compra Stock: Maíz Cacahuazintle (3 envases)','2026-06-02 00:04:28'),(62,1,'egreso','insumos',120.00,'Compra Stock: Crema (3 envases)','2026-06-02 00:04:36'),(63,1,'egreso','insumos',630.00,'Compra Stock: Queso Rallado (7 envases)','2026-06-02 00:04:46'),(64,1,'egreso','insumos',540.00,'Compra Stock: Agua de Horchata (9 envases)','2026-06-02 00:04:56'),(65,1,'ingreso','otros',169.00,'Cierre Mesa 1 (1 órdenes)','2026-06-02 00:05:17'),(66,1,'egreso','insumos',600.00,'Compra Stock IA: Carne de Cerdo (Maciza) (1 envases)','2026-06-02 00:15:10'),(67,1,'egreso','otros',20.00,'Servilletas','2026-06-02 00:15:10'),(68,1,'egreso','insumos',600.00,'Compra Stock IA: Carne de Cerdo (Maciza) (1 envases)','2026-06-02 00:15:26'),(69,1,'egreso','otros',20.00,'Servilletas','2026-06-02 00:15:26');
/*!40000 ALTER TABLE `movimientos_financieros` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pedido_detalles`
--

DROP TABLE IF EXISTS `pedido_detalles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedido_detalles` (
  `id_pedido_detalle` int NOT NULL AUTO_INCREMENT,
  `id_pedido` int NOT NULL,
  `id_producto` int DEFAULT NULL,
  `cantidad` int NOT NULL DEFAULT '1',
  `precio_en_pedido` decimal(10,2) NOT NULL COMMENT 'Congela el precio al momento de la compra',
  `notas_adicionales` text,
  `ingredientes_excluidos` text COMMENT 'Almacena los ID de ingredientes que no se quieren, separados por comas (Ej: "1,4")',
  PRIMARY KEY (`id_pedido_detalle`),
  UNIQUE KEY `idx_pedido_producto` (`id_pedido`,`id_producto`),
  KEY `fk_detalle_producto` (`id_producto`),
  CONSTRAINT `fk_detalle_pedido` FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id_pedido`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_detalle_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pedido_detalles`
--

LOCK TABLES `pedido_detalles` WRITE;
/*!40000 ALTER TABLE `pedido_detalles` DISABLE KEYS */;
INSERT INTO `pedido_detalles` VALUES (10,600,200,1,124.00,NULL,NULL),(11,600,201,1,123.00,NULL,NULL),(12,600,203,1,45.00,NULL,NULL),(13,601,201,1,123.00,NULL,NULL),(14,601,200,1,124.00,NULL,NULL),(15,602,201,1,123.00,NULL,NULL),(16,602,203,1,45.00,NULL,NULL),(17,603,200,2,124.00,NULL,NULL),(18,603,201,1,123.00,NULL,NULL),(19,603,203,1,45.00,NULL,NULL),(20,604,200,1,124.00,NULL,NULL),(21,700,201,2,123.00,NULL,NULL),(22,701,200,1,124.00,NULL,NULL),(23,701,203,1,45.00,NULL,NULL),(24,702,200,2,124.00,NULL,NULL),(25,702,201,1,123.00,NULL,NULL),(26,702,203,2,45.00,NULL,NULL),(27,703,201,2,123.00,NULL,NULL),(28,703,202,1,110.00,NULL,NULL),(29,704,200,1,124.00,'Sin cebolla y el caldo muy caliente por favor.','24'),(30,704,203,1,45.00,NULL,NULL),(31,705,200,1,124.00,'Sin cebolla y el caldo muy caliente por favor.','24'),(32,705,203,1,45.00,NULL,NULL);
/*!40000 ALTER TABLE `pedido_detalles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pedidos`
--

DROP TABLE IF EXISTS `pedidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedidos` (
  `id_pedido` int NOT NULL AUTO_INCREMENT,
  `id_restaurante` int NOT NULL,
  `mesa` varchar(50) NOT NULL,
  `responsable_pedido` varchar(100) DEFAULT NULL COMMENT 'Nombre del cliente',
  `total_calculado` decimal(10,2) NOT NULL,
  `estado` enum('sin ver','en proceso','completado','por_pagar','cancelado','inactivo','archivado') NOT NULL DEFAULT 'sin ver',
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `solicito_pago` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 si el cliente ya aviso que pago',
  `metodo_pago` enum('efectivo','tarjeta') DEFAULT NULL COMMENT 'Se llena cuando el cliente pide la cuenta',
  `fecha_en_proceso` datetime DEFAULT NULL COMMENT 'Cuando el cocinero empieza',
  `fecha_completado` datetime DEFAULT NULL COMMENT 'Cuando el plato está listo',
  `fecha_pago` datetime DEFAULT NULL COMMENT 'Cuando el cliente paga',
  `id_mesero` int DEFAULT NULL,
  PRIMARY KEY (`id_pedido`),
  KEY `fk_pedidos_restaurante` (`id_restaurante`),
  KEY `fk_pedidos_mesero` (`id_mesero`),
  CONSTRAINT `fk_pedidos_mesero` FOREIGN KEY (`id_mesero`) REFERENCES `m_usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_pedidos_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurante` (`id_restaurante`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=706 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pedidos`
--

LOCK TABLES `pedidos` WRITE;
/*!40000 ALTER TABLE `pedidos` DISABLE KEYS */;
INSERT INTO `pedidos` VALUES (600,1,'Mesa 1','App Cliente',292.00,'inactivo','2026-05-29 11:43:21',0,NULL,'2026-05-29 11:43:21','2026-05-29 11:57:21','2026-05-29 12:28:21',NULL),(601,1,'Mesa 3','App Cliente',247.00,'inactivo','2026-05-28 11:43:21',0,NULL,'2026-05-28 11:43:21','2026-05-28 12:00:21','2026-05-28 12:33:21',NULL),(602,1,'Barra 2','App Cliente',168.00,'inactivo','2026-05-27 11:43:21',0,NULL,'2026-05-27 11:43:21','2026-05-27 11:58:21','2026-05-27 12:23:21',NULL),(603,1,'Mesa 5','App Cliente',416.00,'inactivo','2026-05-26 11:43:21',0,NULL,'2026-05-26 11:43:21','2026-05-26 12:01:21','2026-05-26 12:43:21',NULL),(604,1,'Mesa 1','App Cliente',124.00,'inactivo','2026-05-25 11:43:21',0,NULL,'2026-05-25 11:43:21','2026-05-25 11:56:21','2026-05-25 12:18:21',NULL),(700,1,'Mesa 1','App Cliente',246.00,'inactivo','2026-05-30 12:00:00',0,NULL,'2026-05-30 12:02:00','2026-05-30 12:12:00','2026-05-30 12:40:00',NULL),(701,1,'Mesa 2','App Cliente',169.00,'inactivo','2026-05-30 13:00:00',0,NULL,'2026-05-30 13:03:00','2026-05-30 13:18:00','2026-05-30 13:50:00',NULL),(702,1,'Mesa 4','App Cliente',461.00,'inactivo','2026-05-30 14:00:00',0,NULL,'2026-05-30 14:05:00','2026-05-30 14:30:00','2026-05-30 15:10:00',NULL),(703,1,'Mesa 1','App Cliente',356.00,'inactivo','2026-06-01 23:43:13',0,NULL,NULL,NULL,'2026-06-01 23:52:55',NULL),(704,1,'Mesa 2','App Cliente',169.00,'inactivo','2026-06-01 23:50:36',0,NULL,NULL,NULL,'2026-06-01 23:52:56',NULL),(705,1,'Mesa 1','App Cliente',169.00,'inactivo','2026-06-02 00:05:07',0,NULL,'2026-06-02 00:05:07','2026-06-02 00:05:13','2026-06-02 00:05:17',3);
/*!40000 ALTER TABLE `pedidos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `productos`
--

DROP TABLE IF EXISTS `productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productos` (
  `id_producto` int NOT NULL AUTO_INCREMENT,
  `id_restaurante` int NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `descripcion` text,
  `precio_venta` decimal(10,2) NOT NULL,
  `tipo` enum('platillo','bebida','postre') NOT NULL,
  `estado` enum('activo','inactivo') NOT NULL DEFAULT 'activo',
  `imagen` longtext,
  PRIMARY KEY (`id_producto`),
  UNIQUE KEY `idx_restaurante_nombre_prod` (`id_restaurante`,`nombre`),
  CONSTRAINT `fk_productos_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurante` (`id_restaurante`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=204 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productos`
--

LOCK TABLES `productos` WRITE;
/*!40000 ALTER TABLE `productos` DISABLE KEYS */;
INSERT INTO `productos` VALUES (200,1,'Pozole Rojo (Maciza)','Maíz, caldo y proteína, se envían acompañamientos separados.',124.00,'platillo','activo',NULL),(201,1,'Orden de Flautas','3 flautas crujientes con crema, queso y lechuga.',123.00,'platillo','activo',NULL),(202,1,'Sope con Bistec','Se envía preparado con frijol, lechuga, queso y bistec (100gr).',110.00,'platillo','activo',NULL),(203,1,'Agua de Horchata','Agua fresca tradicional (1 litro).',45.00,'bebida','activo',NULL);
/*!40000 ALTER TABLE `productos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recetas`
--

DROP TABLE IF EXISTS `recetas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recetas` (
  `id_producto` int NOT NULL,
  `id_ingrediente` int NOT NULL,
  `cantidad_usada` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_producto`,`id_ingrediente`),
  KEY `fk_receta_ingrediente` (`id_ingrediente`),
  CONSTRAINT `fk_receta_ingrediente` FOREIGN KEY (`id_ingrediente`) REFERENCES `ingredientes` (`id_ingrediente`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_receta_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recetas`
--

LOCK TABLES `recetas` WRITE;
/*!40000 ALTER TABLE `recetas` DISABLE KEYS */;
INSERT INTO `recetas` VALUES (200,20,250.00),(200,21,150.00),(200,24,50.00),(201,21,100.00),(201,22,150.00),(201,24,40.00),(201,25,40.00),(201,26,30.00),(202,22,100.00),(202,23,100.00),(202,25,20.00),(202,26,15.00),(203,27,1000.00);
/*!40000 ALTER TABLE `recetas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `restaurante`
--

DROP TABLE IF EXISTS `restaurante`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `restaurante` (
  `id_restaurante` int NOT NULL AUTO_INCREMENT,
  `nombre_restaurante` varchar(100) NOT NULL,
  `codigo_acceso` varchar(20) DEFAULT 'YaYoungFuture5',
  `direccion` varchar(255) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `rfc` varchar(20) DEFAULT NULL,
  `porcentaje_iva` decimal(5,2) DEFAULT '16.00',
  PRIMARY KEY (`id_restaurante`),
  UNIQUE KEY `nombre_restaurante_UNIQUE` (`nombre_restaurante`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `restaurante`
--

LOCK TABLES `restaurante` WRITE;
/*!40000 ALTER TABLE `restaurante` DISABLE KEYS */;
INSERT INTO `restaurante` VALUES (1,'La Casa de Toño','CasaTono2026','Calle Salvador Díaz Mirón 398, Un Hogar Para Nosotros, Miguel Hidalgo, 11330 Ciudad de México, CDMX','55-5555-5555','CATO000101XYZ',16.00);
/*!40000 ALTER TABLE `restaurante` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
INSERT INTO `sessions` VALUES ('4xd5zpghfCjjMPpcf1jppobbdy7ofWYQ',1780383694,'{\"cookie\":{\"originalMaxAge\":604800000,\"expires\":\"2026-05-29T19:04:45.902Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"restauranteContexto\":1,\"nombreRestauranteContexto\":\"angel\'s Restaurant\",\"userId\":1,\"restauranteId\":1,\"nombreUsuario\":\"angel\",\"rol\":\"dueño\"}'),('F88vwkZn72kJeiq-6KySOcW0iKI51eiO',1780986122,'{\"cookie\":{\"originalMaxAge\":604800000,\"expires\":\"2026-06-09T05:28:53.296Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"restauranteContexto\":1,\"nombreRestauranteContexto\":\"La Casa de Toño\",\"userId\":1,\"restauranteId\":1,\"nombreUsuario\":\"angel\",\"rol\":\"dueño\"}'),('KMroGOAM3hoc5-2cLgqpg_U_jMInWrJw',1780986763,'{\"cookie\":{\"originalMaxAge\":604800000,\"expires\":\"2026-06-09T05:40:16.814Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"restauranteContexto\":1,\"nombreRestauranteContexto\":\"La Casa de Toño\",\"userId\":3,\"restauranteId\":1,\"nombreUsuario\":\"Angel mesero\",\"rol\":\"mesero\"}'),('aR_hxb5qxUd_iuT1FHRHdxMObgMjYdwe',1780383297,'{\"cookie\":{\"originalMaxAge\":604799999,\"expires\":\"2026-05-26T15:53:17.688Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"restauranteContexto\":1,\"nombreRestauranteContexto\":\"angel\'s Restaurant\",\"userId\":1,\"restauranteId\":1,\"nombreUsuario\":\"angel\",\"rol\":\"dueño\"}'),('gFAfR9MF4mQ046-rtGTs2tuSeGgPpSqs',1780770441,'{\"cookie\":{\"originalMaxAge\":604800000,\"expires\":\"2026-06-06T18:27:19.754Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"restauranteContexto\":1,\"nombreRestauranteContexto\":\"La Casa de Toño\",\"userId\":1,\"restauranteId\":1,\"nombreUsuario\":\"angel\",\"rol\":\"dueño\"}'),('xsdkAXFKIK6ZblXuRktSceC72a4S7dMa',1780986763,'{\"cookie\":{\"originalMaxAge\":604800000,\"expires\":\"2026-06-09T05:29:29.785Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"restauranteContexto\":1,\"nombreRestauranteContexto\":\"La Casa de Toño\",\"userId\":2,\"restauranteId\":1,\"nombreUsuario\":\"Angel Cocinero\",\"rol\":\"cocinero\"}');
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'ya'
--

--
-- Dumping routines for database 'ya'
--
/*!50003 DROP PROCEDURE IF EXISTS `sp_InsertarPedidosDePrueba2` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_InsertarPedidosDePrueba2`(IN num_pedidos INT)
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE total_tacos INT;
    DECLARE total_aguas INT;
    DECLARE precio_taco DECIMAL(10,2) DEFAULT 18.00;
    DECLARE precio_agua DECIMAL(10,2) DEFAULT 25.00;
    DECLARE total_calculado_pedido DECIMAL(10,2);
    DECLARE pedido_id INT;
    DECLARE dias_aleatorios INT;
    DECLARE horas_aleatorias INT;
    DECLARE mesa_aleatoria INT;

    WHILE i < num_pedidos DO
        -- 1. Generar datos aleatorios
        SET dias_aleatorios = FLOOR(RAND() * 30); -- Pedidos en los últimos 30 días
        SET horas_aleatorias = FLOOR(RAND() * 24);
        SET mesa_aleatoria = FLOOR(1 + RAND() * 10); -- Mesas 1 a 10
        SET total_tacos = FLOOR(1 + RAND() * 3); -- 1, 2, o 3 tacos
        SET total_aguas = FLOOR(1 + RAND() * 2); -- 1 o 2 aguas
        SET total_calculado_pedido = (total_tacos * precio_taco) + (total_aguas * precio_agua);

        -- 2. Insertar el pedido principal
        INSERT INTO pedidos (
            id_restaurante, 
            mesa, 
            responsable_pedido, 
            total_calculado, 
            estado, 
            fecha_creacion
        ) 
        VALUES (
            1,                                  -- id_restaurante
            CONCAT('Mesa ', mesa_aleatoria),    -- Mesa (ej: 'Mesa 5')
            'Cliente de Prueba',                -- responsable
            total_calculado_pedido,             -- total
            'completado',                       -- estado
            NOW() - INTERVAL dias_aleatorios DAY - INTERVAL horas_aleatorias HOUR -- fecha
        );

        -- 3. Obtener el ID del pedido que acabamos de crear
        SET pedido_id = LAST_INSERT_ID();

        -- 4. Insertar los detalles
        -- Tacos (id_producto = 3)
        INSERT INTO pedido_detalles (id_pedido, id_producto, cantidad, precio_en_pedido)
        VALUES (pedido_id, 3, total_tacos, precio_taco);

        -- Aguas (id_producto = 2)
        INSERT INTO pedido_detalles (id_pedido, id_producto, cantidad, precio_en_pedido)
        VALUES (pedido_id, 2, total_aguas, precio_agua);

        SET i = i + 1;
    END WHILE;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-02  0:32:52
