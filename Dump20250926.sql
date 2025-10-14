-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: localhost    Database: ya
-- ------------------------------------------------------
-- Server version	8.0.40

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
-- Table structure for table `bebida_ingredientes`
--

DROP TABLE IF EXISTS `bebida_ingredientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bebida_ingredientes` (
  `id_bebida` int NOT NULL,
  `id_ing` int NOT NULL,
  `cant_ing_bebida` decimal(10,2) NOT NULL DEFAULT '1.00',
  PRIMARY KEY (`id_bebida`,`id_ing`),
  KEY `id_ing` (`id_ing`),
  CONSTRAINT `bebida_ingredientes_ibfk_1` FOREIGN KEY (`id_bebida`) REFERENCES `ebebidas` (`id_bebida`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `bebida_ingredientes_ibfk_2` FOREIGN KEY (`id_ing`) REFERENCES `eingredientes` (`id_ing`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bebida_ingredientes`
--

LOCK TABLES `bebida_ingredientes` WRITE;
/*!40000 ALTER TABLE `bebida_ingredientes` DISABLE KEYS */;
/*!40000 ALTER TABLE `bebida_ingredientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `boveda`
--

DROP TABLE IF EXISTS `boveda`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `boveda` (
  `id_total` int NOT NULL,
  `total` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id_total`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `boveda`
--

LOCK TABLES `boveda` WRITE;
/*!40000 ALTER TABLE `boveda` DISABLE KEYS */;
INSERT INTO `boveda` VALUES (1,920.00);
/*!40000 ALTER TABLE `boveda` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `configuracion_renta`
--

DROP TABLE IF EXISTS `configuracion_renta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuracion_renta` (
  `id_config` int NOT NULL,
  `porcentaje_impuesto` decimal(5,2) NOT NULL,
  PRIMARY KEY (`id_config`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracion_renta`
--

LOCK TABLES `configuracion_renta` WRITE;
/*!40000 ALTER TABLE `configuracion_renta` DISABLE KEYS */;
/*!40000 ALTER TABLE `configuracion_renta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dventas`
--

DROP TABLE IF EXISTS `dventas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dventas` (
  `id_venta` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `fecha_venta` datetime NOT NULL,
  `total_venta` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_venta`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `dventas_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `m_usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dventas`
--

LOCK TABLES `dventas` WRITE;
/*!40000 ALTER TABLE `dventas` DISABLE KEYS */;
/*!40000 ALTER TABLE `dventas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ebebidas`
--

DROP TABLE IF EXISTS `ebebidas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ebebidas` (
  `id_bebida` int NOT NULL AUTO_INCREMENT,
  `nombre_bebida` varchar(50) NOT NULL,
  `descripcion` text,
  `costo_bebida` decimal(10,2) NOT NULL,
  `id_usuario` int NOT NULL,
  `ingredientes` text,
  `id_restaurante` int DEFAULT NULL,
  `requiere_ingredientes` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_bebida`),
  UNIQUE KEY `nombre_bebida` (`nombre_bebida`),
  KEY `id_usuario` (`id_usuario`),
  KEY `fk_bebidas_restaurante` (`id_restaurante`),
  CONSTRAINT `ebebidas_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `m_usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_bebidas_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurantes` (`id_restaurante`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ebebidas`
--

LOCK TABLES `ebebidas` WRITE;
/*!40000 ALTER TABLE `ebebidas` DISABLE KEYS */;
INSERT INTO `ebebidas` VALUES (4,'Agua de Horchata','Tremenda Agua de Horchata',40.00,3,'[{\"nombre\":\"Leche\",\"cantidad\":250.0},{\"nombre\":\"Canela\",\"cantidad\":10.0},{\"nombre\":\"Extracto de Horchata\",\"cantidad\":100.0},{\"nombre\":\"Azucar\",\"cantidad\":12.0}]',3,1);
/*!40000 ALTER TABLE `ebebidas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `eingredientes`
--

DROP TABLE IF EXISTS `eingredientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eingredientes` (
  `id_ing` int NOT NULL AUTO_INCREMENT,
  `nombre_ing` varchar(50) NOT NULL,
  `unidad_medida` varchar(20) DEFAULT NULL,
  `costo_ing` decimal(10,2) NOT NULL,
  `cantidad_disponible` double NOT NULL DEFAULT '0',
  `id_restaurante` int DEFAULT NULL,
  PRIMARY KEY (`id_ing`),
  UNIQUE KEY `nombre_por_restaurante` (`nombre_ing`,`id_restaurante`),
  KEY `fk_ingredientes_restaurante` (`id_restaurante`),
  CONSTRAINT `fk_ingredientes_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurantes` (`id_restaurante`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `eingredientes`
--

LOCK TABLES `eingredientes` WRITE;
/*!40000 ALTER TABLE `eingredientes` DISABLE KEYS */;
/*!40000 ALTER TABLE `eingredientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `empleados`
--

DROP TABLE IF EXISTS `empleados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `empleados` (
  `id_empleado` int NOT NULL AUTO_INCREMENT,
  `nombre_empleado` varchar(60) NOT NULL,
  `rol` enum('chef','mesero') NOT NULL,
  `sueldo` decimal(10,2) NOT NULL,
  `id_restaurante` int DEFAULT NULL,
  PRIMARY KEY (`id_empleado`),
  KEY `fk_empleados_restaurante` (`id_restaurante`),
  CONSTRAINT `fk_empleados_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurantes` (`id_restaurante`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `empleados`
--

LOCK TABLES `empleados` WRITE;
/*!40000 ALTER TABLE `empleados` DISABLE KEYS */;
/*!40000 ALTER TABLE `empleados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `epedidos`
--

DROP TABLE IF EXISTS `epedidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `epedidos` (
  `id_pedido` int NOT NULL AUTO_INCREMENT,
  `id_restaurante` int NOT NULL,
  `mesa` varchar(50) NOT NULL,
  `platillos` json NOT NULL,
  PRIMARY KEY (`id_pedido`),
  KEY `id_restaurante` (`id_restaurante`),
  CONSTRAINT `epedidos_ibfk_1` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurantes` (`id_restaurante`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `epedidos`
--

LOCK TABLES `epedidos` WRITE;
/*!40000 ALTER TABLE `epedidos` DISABLE KEYS */;
INSERT INTO `epedidos` VALUES (1,3,'2','[{\"id\": 15, \"tipo\": \"platillo\", \"nombre\": \"Enchiladas Verdes\", \"precio\": 65, \"cantidad\": 1}]');
/*!40000 ALTER TABLE `epedidos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `eplatillos`
--

DROP TABLE IF EXISTS `eplatillos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eplatillos` (
  `id_platillo` int NOT NULL AUTO_INCREMENT,
  `nombre_platillo` varchar(50) NOT NULL,
  `descripcion` text,
  `costo_platillo` decimal(10,2) NOT NULL,
  `id_usuario` int NOT NULL,
  `ingredientes` text,
  `id_restaurante` int DEFAULT NULL,
  `requiere_ingredientes` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_platillo`),
  UNIQUE KEY `nombre_platillo` (`nombre_platillo`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `eplatillos_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `m_usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `eplatillos`
--

LOCK TABLES `eplatillos` WRITE;
/*!40000 ALTER TABLE `eplatillos` DISABLE KEYS */;
INSERT INTO `eplatillos` VALUES (4,'Tacos de suadero','Orden de 5 tacos',85.00,1,'Tortilla, cilantro, cebolla y suadero',1,1),(9,'Malteada','Malamalteada Especial',160.00,5,'Leche de burro, Canela',5,1),(15,'Enchiladas Verdes','Ricas enchiladas',65.00,3,'[{\"nombre\":\"Carne de res\",\"cantidad\":20.0},{\"nombre\":\"Pollo\",\"cantidad\":30.0},{\"nombre\":\"Crema\",\"cantidad\":10.0}]',3,1),(16,'Taco de bistec','Taco de bistec',25.00,4,'[{\"nombre\":\"Tortilla\",\"cantidad\":20.0},{\"nombre\":\"Bistec\",\"cantidad\":30.0}]',4,1),(17,'Pollo','Pollo frito con verduras',120.00,3,'[{\"nombre\":\"Pollo\",\"cantidad\":280.0}]',3,1);
/*!40000 ALTER TABLE `eplatillos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `epostres`
--

DROP TABLE IF EXISTS `epostres`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `epostres` (
  `id_postre` int NOT NULL AUTO_INCREMENT,
  `nombre_postre` varchar(50) NOT NULL,
  `descripcion` text,
  `costo_postre` decimal(10,2) NOT NULL,
  `id_usuario` int NOT NULL,
  `ingredientes` text,
  `id_restaurante` int DEFAULT NULL,
  `requiere_ingredientes` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_postre`),
  UNIQUE KEY `nombre_postre` (`nombre_postre`),
  KEY `id_usuario` (`id_usuario`),
  KEY `fk_postres_restaurante` (`id_restaurante`),
  CONSTRAINT `epostres_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `m_usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_postres_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurantes` (`id_restaurante`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `epostres`
--

LOCK TABLES `epostres` WRITE;
/*!40000 ALTER TABLE `epostres` DISABLE KEYS */;
INSERT INTO `epostres` VALUES (4,'Panna Cotta','Panna Cotta',70.00,3,'[{\"nombre\":\"Leche\",\"cantidad\":500.0},{\"nombre\":\"Crema\",\"cantidad\":300.0}]',3,1);
/*!40000 ALTER TABLE `epostres` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `m_usuarios`
--

DROP TABLE IF EXISTS `m_usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `m_usuarios` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `nombre_usuario` varchar(50) NOT NULL,
  `correo_usuario` varchar(60) NOT NULL,
  `contra_hash` varchar(255) NOT NULL,
  `id_restaurante` int DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `correo_usuario` (`correo_usuario`),
  KEY `id_restaurante` (`id_restaurante`),
  CONSTRAINT `m_usuarios_ibfk_1` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurantes` (`id_restaurante`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `m_usuarios`
--

LOCK TABLES `m_usuarios` WRITE;
/*!40000 ALTER TABLE `m_usuarios` DISABLE KEYS */;
/*!40000 ALTER TABLE `m_usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu_item_ingredients`
--

DROP TABLE IF EXISTS `menu_item_ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_item_ingredients` (
  `id_item` int NOT NULL,
  `id_ing` int NOT NULL,
  `cant_ing_item` decimal(10,2) NOT NULL DEFAULT '1.00',
  PRIMARY KEY (`id_item`,`id_ing`),
  KEY `id_ing` (`id_ing`),
  CONSTRAINT `menu_item_ingredients_ibfk_1` FOREIGN KEY (`id_item`) REFERENCES `menu_items` (`id_item`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `menu_item_ingredients_ibfk_2` FOREIGN KEY (`id_ing`) REFERENCES `eingredientes` (`id_ing`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_item_ingredients`
--

LOCK TABLES `menu_item_ingredients` WRITE;
/*!40000 ALTER TABLE `menu_item_ingredients` DISABLE KEYS */;
/*!40000 ALTER TABLE `menu_item_ingredients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu_items`
--

DROP TABLE IF EXISTS `menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_items` (
  `id_item` int NOT NULL AUTO_INCREMENT,
  `nombre_item` varchar(50) NOT NULL,
  `descripcion` text,
  `costo_item` decimal(10,2) NOT NULL,
  `tipo_item` enum('platillo','bebida','postre') NOT NULL,
  `id_restaurante` int DEFAULT NULL,
  PRIMARY KEY (`id_item`),
  UNIQUE KEY `nombre_por_restaurante` (`nombre_item`,`id_restaurante`),
  KEY `fk_menu_items_restaurante` (`id_restaurante`),
  CONSTRAINT `fk_menu_items_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurantes` (`id_restaurante`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_items`
--

LOCK TABLES `menu_items` WRITE;
/*!40000 ALTER TABLE `menu_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `menu_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movimientos_boveda`
--

DROP TABLE IF EXISTS `movimientos_boveda`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movimientos_boveda` (
  `id_movimiento` int NOT NULL AUTO_INCREMENT,
  `id_restaurante` int NOT NULL,
  `tipo` enum('ingreso','egreso') NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `monto` decimal(12,2) NOT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_movimiento`),
  KEY `fk_movimientos_restaurante` (`id_restaurante`),
  CONSTRAINT `fk_movimientos_restaurante` FOREIGN KEY (`id_restaurante`) REFERENCES `restaurantes` (`id_restaurante`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movimientos_boveda`
--

LOCK TABLES `movimientos_boveda` WRITE;
/*!40000 ALTER TABLE `movimientos_boveda` DISABLE KEYS */;
/*!40000 ALTER TABLE `movimientos_boveda` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pedidos`
--

DROP TABLE IF EXISTS `pedidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedidos` (
  `id_pedido` int NOT NULL AUTO_INCREMENT,
  `descripcion` text,
  `monto` decimal(10,2) DEFAULT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  `estado` enum('pendiente','en camino','entregado') DEFAULT 'pendiente',
  `id_restaurante` int NOT NULL,
  `nombre_platillo` varchar(100) DEFAULT NULL,
  `ingredientes` text,
  `mesa` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id_pedido`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pedidos`
--

LOCK TABLES `pedidos` WRITE;
/*!40000 ALTER TABLE `pedidos` DISABLE KEYS */;
/*!40000 ALTER TABLE `pedidos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `platillo_ingredientes`
--

DROP TABLE IF EXISTS `platillo_ingredientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `platillo_ingredientes` (
  `id_platillo` int NOT NULL,
  `id_ing` int NOT NULL,
  `cant_ing_platillo` decimal(10,2) NOT NULL DEFAULT '1.00',
  PRIMARY KEY (`id_platillo`,`id_ing`),
  KEY `id_ing` (`id_ing`),
  CONSTRAINT `platillo_ingredientes_ibfk_1` FOREIGN KEY (`id_platillo`) REFERENCES `eplatillos` (`id_platillo`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `platillo_ingredientes_ibfk_2` FOREIGN KEY (`id_ing`) REFERENCES `eingredientes` (`id_ing`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platillo_ingredientes`
--

LOCK TABLES `platillo_ingredientes` WRITE;
/*!40000 ALTER TABLE `platillo_ingredientes` DISABLE KEYS */;
/*!40000 ALTER TABLE `platillo_ingredientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `postre_ingredientes`
--

DROP TABLE IF EXISTS `postre_ingredientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `postre_ingredientes` (
  `id_postre` int NOT NULL,
  `id_ing` int NOT NULL,
  `cant_ing_postre` decimal(10,2) NOT NULL DEFAULT '1.00',
  PRIMARY KEY (`id_postre`,`id_ing`),
  KEY `id_ing` (`id_ing`),
  CONSTRAINT `postre_ingredientes_ibfk_1` FOREIGN KEY (`id_postre`) REFERENCES `epostres` (`id_postre`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `postre_ingredientes_ibfk_2` FOREIGN KEY (`id_ing`) REFERENCES `eingredientes` (`id_ing`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `postre_ingredientes`
--

LOCK TABLES `postre_ingredientes` WRITE;
/*!40000 ALTER TABLE `postre_ingredientes` DISABLE KEYS */;
/*!40000 ALTER TABLE `postre_ingredientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `restaurantes`
--

DROP TABLE IF EXISTS `restaurantes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `restaurantes` (
  `id_restaurante` int NOT NULL AUTO_INCREMENT,
  `nombre_restaurante` varchar(100) NOT NULL,
  PRIMARY KEY (`id_restaurante`),
  UNIQUE KEY `nombre_restaurante` (`nombre_restaurante`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `restaurantes`
--

LOCK TABLES `restaurantes` WRITE;
/*!40000 ALTER TABLE `restaurantes` DISABLE KEYS */;
/*!40000 ALTER TABLE `restaurantes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'ya'
--

--
-- Dumping routines for database 'ya'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-26 19:29:49
