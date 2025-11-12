-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: ya
-- ------------------------------------------------------
-- Server version	8.0.41

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
  PRIMARY KEY (`id_empleado`),
  KEY `fk_empleados_restaurante` (`id_restaurante`),
  CONSTRAINT `fk_empleados_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurante` (`id_restaurante`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `empleados`
--

LOCK TABLES `empleados` WRITE;
/*!40000 ALTER TABLE `empleados` DISABLE KEYS */;
INSERT INTO `empleados` VALUES (1,1,'Angel','Gerente',150000.00,'activo');
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
  `costo_unitario` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stock` decimal(10,2) NOT NULL DEFAULT '0.00',
  `estado` enum('activo','inactivo') NOT NULL DEFAULT 'activo',
  PRIMARY KEY (`id_ingrediente`),
  UNIQUE KEY `idx_restaurante_nombre_ing` (`id_restaurante`,`nombre`),
  CONSTRAINT `fk_ingredientes_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurante` (`id_restaurante`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ingredientes`
--

LOCK TABLES `ingredientes` WRITE;
/*!40000 ALTER TABLE `ingredientes` DISABLE KEYS */;
INSERT INTO `ingredientes` VALUES (1,1,'bistec','gr',30.00,900.00,'activo'),(2,1,'tortilla','gr',2.50,1970.00,'activo');
/*!40000 ALTER TABLE `ingredientes` ENABLE KEYS */;
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
  `rol` enum('dueño','cocinero') NOT NULL DEFAULT 'cocinero',
  `estado` enum('activo','inactivo') NOT NULL DEFAULT 'activo',
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `correo_usuario_UNIQUE` (`correo_usuario`),
  KEY `fk_usuarios_restaurante` (`id_restaurante`),
  CONSTRAINT `fk_usuarios_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurante` (`id_restaurante`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `m_usuarios`
--

LOCK TABLES `m_usuarios` WRITE;
/*!40000 ALTER TABLE `m_usuarios` DISABLE KEYS */;
INSERT INTO `m_usuarios` VALUES (1,1,'angel','hola@gmail.com','$2b$10$EE/JO6m5gtqJ2zTPmjc65.JpKSugGU9E8/.mrwXc4Bq9GRk7os4JO','dueño','activo');
/*!40000 ALTER TABLE `m_usuarios` ENABLE KEYS */;
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
  `monto` decimal(12,2) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_movimiento`),
  KEY `fk_movimientos_restaurante` (`id_restaurante`),
  CONSTRAINT `fk_movimientos_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurante` (`id_restaurante`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movimientos_financieros`
--

LOCK TABLES `movimientos_financieros` WRITE;
/*!40000 ALTER TABLE `movimientos_financieros` DISABLE KEYS */;
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
  PRIMARY KEY (`id_pedido_detalle`),
  UNIQUE KEY `idx_pedido_producto` (`id_pedido`,`id_producto`),
  KEY `fk_detalle_producto` (`id_producto`),
  CONSTRAINT `fk_detalle_pedido` FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id_pedido`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_detalle_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=126 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pedido_detalles`
--

LOCK TABLES `pedido_detalles` WRITE;
/*!40000 ALTER TABLE `pedido_detalles` DISABLE KEYS */;
INSERT INTO `pedido_detalles` VALUES (1,1,3,2,18.00),(2,1,2,1,25.00),(3,2,3,2,18.00),(4,2,2,2,25.00),(5,3,3,3,18.00),(6,3,2,1,25.00),(7,4,3,2,18.00),(8,4,2,1,25.00),(9,5,3,1,18.00),(10,5,2,2,25.00),(11,6,3,1,18.00),(12,6,2,2,25.00),(13,7,3,1,18.00),(14,7,2,2,25.00),(15,8,3,1,18.00),(16,8,2,2,25.00),(17,9,3,1,18.00),(18,9,2,2,25.00),(19,10,3,3,18.00),(20,10,2,2,25.00),(21,11,3,1,18.00),(22,11,2,2,25.00),(23,12,3,1,18.00),(24,12,2,1,25.00),(25,13,3,1,18.00),(26,13,2,1,25.00),(27,14,3,1,18.00),(28,14,2,1,25.00),(29,15,3,1,18.00),(30,15,2,1,25.00),(31,16,3,1,18.00),(32,16,2,2,25.00),(33,17,3,1,18.00),(34,17,2,1,25.00),(35,18,3,3,18.00),(36,18,2,2,25.00),(37,19,3,3,18.00),(38,19,2,1,25.00),(39,20,3,2,18.00),(40,20,2,1,25.00),(41,21,3,2,18.00),(42,21,2,2,25.00),(43,22,3,3,18.00),(44,22,2,1,25.00),(45,23,3,3,18.00),(46,23,2,2,25.00),(47,24,3,2,18.00),(48,24,2,1,25.00),(49,25,3,2,18.00),(50,25,2,1,25.00),(51,26,3,1,18.00),(52,26,2,1,25.00),(53,27,3,1,18.00),(54,27,2,1,25.00),(55,28,3,3,18.00),(56,28,2,1,25.00),(57,29,3,2,18.00),(58,29,2,1,25.00),(59,30,3,3,18.00),(60,30,2,2,25.00),(61,31,3,1,18.00),(62,31,2,2,25.00),(63,32,3,3,18.00),(64,32,2,2,25.00),(65,33,3,2,18.00),(66,33,2,1,25.00),(67,34,3,1,18.00),(68,34,2,2,25.00),(69,35,3,3,18.00),(70,35,2,1,25.00),(71,36,3,1,18.00),(72,36,2,1,25.00),(73,37,3,2,18.00),(74,37,2,2,25.00),(75,38,3,3,18.00),(76,38,2,1,25.00),(77,39,3,1,18.00),(78,39,2,2,25.00),(79,40,3,1,18.00),(80,40,2,2,25.00),(81,41,3,1,18.00),(82,41,2,1,25.00),(83,42,3,3,18.00),(84,42,2,1,25.00),(85,43,3,1,18.00),(86,43,2,1,25.00),(87,44,3,2,18.00),(88,44,2,2,25.00),(89,45,3,3,18.00),(90,45,2,2,25.00),(91,46,3,3,18.00),(92,46,2,1,25.00),(93,47,3,2,18.00),(94,47,2,1,25.00),(95,48,3,2,18.00),(96,48,2,1,25.00),(97,49,3,2,18.00),(98,49,2,1,25.00),(99,50,3,1,18.00),(100,50,2,1,25.00),(101,51,3,1,18.00),(102,51,2,1,25.00),(103,52,3,1,18.00),(104,52,2,1,25.00),(105,53,3,2,18.00),(106,53,2,1,25.00),(107,54,3,1,18.00),(108,54,2,2,25.00),(109,55,3,3,18.00),(110,55,2,1,25.00),(111,56,3,1,18.00),(112,56,2,1,25.00),(113,57,3,3,18.00),(114,57,2,2,25.00),(115,58,3,2,18.00),(116,58,2,2,25.00),(117,59,3,3,18.00),(118,59,2,2,25.00),(119,60,3,3,18.00),(120,60,2,1,25.00),(121,61,3,2,18.00),(122,61,2,2,25.00),(123,62,3,1,18.00),(124,63,3,20,18.00),(125,64,3,1,18.00);
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
  `estado` enum('sin ver','en proceso','completado','cancelado','inactivo') NOT NULL DEFAULT 'sin ver',
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pedido`),
  KEY `fk_pedidos_restaurante` (`id_restaurante`),
  CONSTRAINT `fk_pedidos_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurante` (`id_restaurante`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pedidos`
--

LOCK TABLES `pedidos` WRITE;
/*!40000 ALTER TABLE `pedidos` DISABLE KEYS */;
INSERT INTO `pedidos` VALUES (1,1,'Mesa 4','Cliente App',61.00,'inactivo','2025-11-10 14:30:00'),(2,1,'Mesa 6','Cliente de Prueba',86.00,'inactivo','2025-10-29 00:48:35'),(3,1,'Mesa 7','Cliente de Prueba',79.00,'inactivo','2025-10-16 23:48:35'),(4,1,'Mesa 6','Cliente de Prueba',61.00,'inactivo','2025-10-24 22:48:35'),(5,1,'Mesa 1','Cliente de Prueba',68.00,'inactivo','2025-11-03 20:48:35'),(6,1,'Mesa 5','Cliente de Prueba',68.00,'inactivo','2025-11-12 02:48:35'),(7,1,'Mesa 5','Cliente de Prueba',68.00,'inactivo','2025-10-20 16:48:35'),(8,1,'Mesa 10','Cliente de Prueba',68.00,'inactivo','2025-11-09 13:48:35'),(9,1,'Mesa 7','Cliente de Prueba',68.00,'inactivo','2025-10-18 23:48:35'),(10,1,'Mesa 7','Cliente de Prueba',104.00,'inactivo','2025-11-03 21:48:35'),(11,1,'Mesa 3','Cliente de Prueba',68.00,'inactivo','2025-11-01 17:48:35'),(12,1,'Mesa 2','Cliente de Prueba',43.00,'inactivo','2025-11-05 20:48:35'),(13,1,'Mesa 3','Cliente de Prueba',43.00,'inactivo','2025-10-25 00:48:35'),(14,1,'Mesa 7','Cliente de Prueba',43.00,'inactivo','2025-10-18 09:48:35'),(15,1,'Mesa 3','Cliente de Prueba',43.00,'inactivo','2025-10-29 02:48:35'),(16,1,'Mesa 9','Cliente de Prueba',68.00,'inactivo','2025-10-27 07:48:35'),(17,1,'Mesa 7','Cliente de Prueba',43.00,'inactivo','2025-10-28 08:48:35'),(18,1,'Mesa 7','Cliente de Prueba',104.00,'inactivo','2025-10-30 05:48:35'),(19,1,'Mesa 1','Cliente de Prueba',79.00,'inactivo','2025-10-19 22:48:35'),(20,1,'Mesa 4','Cliente de Prueba',61.00,'inactivo','2025-10-26 14:48:35'),(21,1,'Mesa 6','Cliente de Prueba',86.00,'inactivo','2025-10-26 23:48:35'),(22,1,'Mesa 8','Cliente de Prueba',79.00,'inactivo','2025-11-07 08:48:35'),(23,1,'Mesa 7','Cliente de Prueba',104.00,'inactivo','2025-11-08 04:48:35'),(24,1,'Mesa 10','Cliente de Prueba',61.00,'inactivo','2025-10-26 01:48:35'),(25,1,'Mesa 9','Cliente de Prueba',61.00,'inactivo','2025-11-07 03:48:35'),(26,1,'Mesa 9','Cliente de Prueba',43.00,'inactivo','2025-10-26 17:48:35'),(27,1,'Mesa 8','Cliente de Prueba',43.00,'inactivo','2025-10-23 21:48:35'),(28,1,'Mesa 10','Cliente de Prueba',79.00,'inactivo','2025-11-09 18:48:35'),(29,1,'Mesa 7','Cliente de Prueba',61.00,'inactivo','2025-11-02 21:48:35'),(30,1,'Mesa 3','Cliente de Prueba',104.00,'inactivo','2025-10-18 16:48:35'),(31,1,'Mesa 1','Cliente de Prueba',68.00,'inactivo','2025-11-03 14:48:35'),(32,1,'Mesa 1','Cliente de Prueba',104.00,'inactivo','2025-11-10 13:53:40'),(33,1,'Mesa 1','Cliente de Prueba',61.00,'inactivo','2025-11-03 19:53:40'),(34,1,'Mesa 6','Cliente de Prueba',68.00,'inactivo','2025-11-11 11:53:40'),(35,1,'Mesa 1','Cliente de Prueba',79.00,'inactivo','2025-10-15 05:53:40'),(36,1,'Mesa 4','Cliente de Prueba',43.00,'inactivo','2025-10-27 20:53:40'),(37,1,'Mesa 7','Cliente de Prueba',86.00,'inactivo','2025-11-10 20:53:40'),(38,1,'Mesa 3','Cliente de Prueba',79.00,'inactivo','2025-10-29 21:53:40'),(39,1,'Mesa 5','Cliente de Prueba',68.00,'inactivo','2025-10-23 07:53:40'),(40,1,'Mesa 2','Cliente de Prueba',68.00,'inactivo','2025-10-20 22:53:40'),(41,1,'Mesa 4','Cliente de Prueba',43.00,'inactivo','2025-11-04 14:53:40'),(42,1,'Mesa 5','Cliente de Prueba',79.00,'inactivo','2025-10-16 23:53:40'),(43,1,'Mesa 5','Cliente de Prueba',43.00,'inactivo','2025-10-25 23:53:40'),(44,1,'Mesa 2','Cliente de Prueba',86.00,'inactivo','2025-11-11 13:53:40'),(45,1,'Mesa 4','Cliente de Prueba',104.00,'inactivo','2025-10-22 17:53:40'),(46,1,'Mesa 8','Cliente de Prueba',79.00,'inactivo','2025-10-13 11:53:40'),(47,1,'Mesa 6','Cliente de Prueba',61.00,'inactivo','2025-10-24 07:53:40'),(48,1,'Mesa 10','Cliente de Prueba',61.00,'inactivo','2025-11-07 07:53:40'),(49,1,'Mesa 9','Cliente de Prueba',61.00,'inactivo','2025-11-07 03:53:40'),(50,1,'Mesa 2','Cliente de Prueba',43.00,'inactivo','2025-11-11 23:53:40'),(51,1,'Mesa 4','Cliente de Prueba',43.00,'inactivo','2025-10-24 13:53:40'),(52,1,'Mesa 8','Cliente de Prueba',43.00,'inactivo','2025-10-18 03:53:40'),(53,1,'Mesa 2','Cliente de Prueba',61.00,'inactivo','2025-11-08 17:53:40'),(54,1,'Mesa 3','Cliente de Prueba',68.00,'inactivo','2025-10-31 17:53:40'),(55,1,'Mesa 5','Cliente de Prueba',79.00,'inactivo','2025-10-23 07:53:40'),(56,1,'Mesa 7','Cliente de Prueba',43.00,'inactivo','2025-11-11 16:53:40'),(57,1,'Mesa 7','Cliente de Prueba',104.00,'inactivo','2025-10-25 12:53:40'),(58,1,'Mesa 1','Cliente de Prueba',86.00,'inactivo','2025-11-06 11:53:40'),(59,1,'Mesa 4','Cliente de Prueba',104.00,'inactivo','2025-10-28 00:53:40'),(60,1,'Mesa 3','Cliente de Prueba',79.00,'inactivo','2025-10-14 14:53:40'),(61,1,'Mesa 6','Cliente de Prueba',86.00,'inactivo','2025-10-14 07:53:40'),(62,1,'Mesa 7','Test Exitoso',18.00,'completado','2025-11-12 10:29:45'),(63,1,'Mesa 9','Test Fallido',360.00,'sin ver','2025-11-12 10:29:45'),(64,1,'Mesa 7','Test Exitoso',18.00,'completado','2025-11-12 10:34:46');
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
  PRIMARY KEY (`id_producto`),
  UNIQUE KEY `idx_restaurante_nombre_prod` (`id_restaurante`,`nombre`),
  CONSTRAINT `fk_productos_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurante` (`id_restaurante`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productos`
--

LOCK TABLES `productos` WRITE;
/*!40000 ALTER TABLE `productos` DISABLE KEYS */;
INSERT INTO `productos` VALUES (1,1,'Taco','taco sabroso',18.00,'platillo','inactivo'),(2,1,'agua de horchata','sin azucar',25.00,'bebida','activo'),(3,1,'taco de bistec','no hay salsa',18.00,'platillo','activo');
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
INSERT INTO `recetas` VALUES (3,1,100.00),(3,2,30.00);
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
  PRIMARY KEY (`id_restaurante`),
  UNIQUE KEY `nombre_restaurante_UNIQUE` (`nombre_restaurante`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `restaurante`
--

LOCK TABLES `restaurante` WRITE;
/*!40000 ALTER TABLE `restaurante` DISABLE KEYS */;
INSERT INTO `restaurante` VALUES (1,'angel\'s Restaurant');
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
INSERT INTO `sessions` VALUES ('nY6gURnqFcIK7IGd62K7fM0kTYiwMrwg',1763570322,'{\"cookie\":{\"originalMaxAge\":604800000,\"expires\":\"2025-11-19T15:14:09.540Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"userId\":1,\"restauranteId\":1,\"nombreUsuario\":\"angel\",\"rol\":\"dueño\"}'),('p_4296kHA6R8D2HjRQJpwgBAKWIM7BF9',1763570265,'{\"cookie\":{\"originalMaxAge\":604800000,\"expires\":\"2025-11-19T16:32:51.771Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"userId\":1,\"restauranteId\":1,\"nombreUsuario\":\"angel\",\"rol\":\"dueño\"}');
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

-- Dump completed on 2025-11-12 10:40:20
