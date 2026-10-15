-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 09-09-2026 a las 21:51:41
-- Versión del servidor: 10.4.28-MariaDB
-- Versión de PHP: 8.0.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `basedb`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `mensaje` text DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`id`, `nombre`, `mensaje`, `fecha`) VALUES
(2, 'hola sofia ', 'soy sofia espitia', '2026-05-19 19:09:10'),
(4, 'Sofia ', 'Hola Sofia ', '2026-05-19 20:14:57'),
(5, 'hola sofia ', 'soy sofia espitia', '2026-05-19 20:15:54'),
(6, 'hola sofia ', 'soy sofia espitia', '2026-05-19 20:15:57'),
(7, 'hola sofia ', 'soy sofia espitia', '2026-05-19 20:15:57'),
(8, 'hola sofia ', 'soy sofia espitia', '2026-05-19 20:15:58'),
(9, 'hola sofia ', 'soy sofia espitia', '2026-05-19 20:15:58'),
(10, 'hola sofia ', 'soy sofia espitia', '2026-05-19 20:15:58'),
(11, 'hola sofia ', 'soy sofia espitia', '2026-05-19 20:15:58'),
(12, 'hola sofia ', 'soy sofia espitia', '2026-05-19 20:15:59'),
(13, 'hola sofia ', 'soy sofia espitia', '2026-05-19 20:15:59'),
(14, 'hola sofia ', 'soy sofia espitia', '2026-05-19 20:15:59'),
(15, 'hola sofia ', 'soy sofia espitia', '2026-05-19 20:15:59'),
(16, 'hola sofia ', 'soy sofia espitia', '2026-05-19 20:16:00'),
(17, 'hola sofia ', 'soy sofia espitia', '2026-05-19 20:16:20'),
(18, 'hola sofia ', 'soy sofia espitia', '2026-05-19 20:16:26'),
(19, 'hola sofia ', 'soy sofia espitia', '2026-05-19 20:16:27'),
(20, 'hola sofia ', 'soy sofia espitia', '2026-05-19 20:17:59'),
(21, 'hola sofia ', 'soy sofia espitia', '2026-05-19 20:18:45'),
(22, 'hola sofia ', 'soy sofia espitia', '2026-05-19 20:18:48'),
(23, 'Jesus Espitia', 'Hola ', '2026-05-19 20:20:55');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `identificacion` varchar(20) NOT NULL,
  `nombres` varchar(50) DEFAULT NULL,
  `apellidos` varchar(50) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `correo` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `direccion` varchar(255) NOT NULL,
  `icono` varchar(50) DEFAULT 'perfil1',
  `tema` varchar(20) DEFAULT 'oscuro',
  `notificaciones_rutina` tinyint(1) DEFAULT 1,
  `notificaciones_alimentacion` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`identificacion`, `nombres`, `apellidos`, `fecha_nacimiento`, `telefono`, `correo`, `password`, `direccion`, `icono`, `tema`, `notificaciones_rutina`, `notificaciones_alimentacion`) VALUES
('1010010101', 'Santiaga', 'MESSI', '2000-01-01', '301030131', 'correo@gmail.com', '717171', 'ssas', 'perfil1', 'oscuro', 1, 1),
('1015073', 'sofia', 'usuga', '2009-12-25', '3028273632', 'laureajksh|@gmail.com', '12345', '', 'perfil1', 'oscuro', 1, 1),
('1038', 'yo', 'yop', '3000-03-09', '30282736', 'nuevo@gmail.com', '12345', '', '🔥', 'claro', 1, 1),
('10382728203', 'qwwq', 'gamboa ', '2014-12-01', '3028273632', 'laureajksh|@gmail.com', 'wqwqw', '', 'perfil1', 'oscuro', 1, 1),
('1111', 'ww', 'ww', '0022-12-12', '3028273632', 'laureajksh|@gmail.com', 'fff', '', 'perfil1', 'oscuro', 1, 1),
('111144', 'ww', 'ww', '0022-12-12', '3028273632', 'laureajksh|@gmail.com', 'cc444', '', 'perfil1', 'oscuro', 1, 1),
('12', 'diana', 'gamboa', '2222-02-12', '302', 'dianis@gmail.com', '1234567', 'jshgpñsmd', 'perfil1', 'oscuro', 1, 1),
('123', 'juan', 'gomez', '2001-01-01', '3028273632', '11@23.co', '1234', '', 'perfil1', 'oscuro', 1, 1),
('153', 'Magali', 'Montoya', '2222-02-12', '0372', 'maga@gmail.com', '123456', 'fdaxs', 'perfil1', 'oscuro', 1, 1),
('1972', 'hadwin', 'Andres', '9000-02-15', '3028222222', 'hadwin@gmail.com', '0987', '', 'perfil1', 'oscuro', 1, 1),
('888888888', 'jd', 'es', '2000-12-12', '3028273632', 'iesg2011@gmail.com', '00000000', '', 'perfil1', 'oscuro', 1, 1),
('98638331', 'jaime', 'gomez', '1979-10-01', '3001234567', 'jaimegomez@elpoli.edu.co', '1234', '', 'perfil1', 'oscuro', 1, 1);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`identificacion`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
