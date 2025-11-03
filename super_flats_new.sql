-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Nov 04, 2025 at 12:46 AM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `super_flats_new`
--

-- --------------------------------------------------------

--
-- Table structure for table `appointments`
--

CREATE TABLE `appointments` (
  `id` int(11) NOT NULL,
  `listing_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `company_id` int(11) NOT NULL,
  `employee_id` int(11) DEFAULT NULL,
  `scheduled_at` datetime NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'non_assigned',
  `feedback` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `appointments`
--

INSERT INTO `appointments` (`id`, `listing_id`, `user_id`, `company_id`, `employee_id`, `scheduled_at`, `status`, `feedback`, `created_at`, `updated_at`) VALUES
(2, 2, 10, 1, NULL, '2025-11-03 14:30:00', 'pending', NULL, '2025-10-28 09:32:19', '2025-10-28 09:32:19'),
(3, 3, 9, 1, NULL, '2025-11-04 09:15:00', 'pending', NULL, '2025-10-28 09:32:53', '2025-10-28 09:32:53'),
(4, 4, 8, 1, NULL, '2025-11-06 11:30:00', 'pending', NULL, '2025-10-28 09:34:39', '2025-10-28 09:34:39'),
(5, 6, 7, 1, NULL, '2025-11-07 18:00:00', 'pending', NULL, '2025-10-28 09:39:04', '2025-10-28 09:39:04'),
(6, 7, 6, 1, NULL, '2025-11-09 10:45:00', 'pending', NULL, '2025-10-28 09:39:41', '2025-10-28 09:39:41'),
(7, 8, 5, 1, NULL, '2025-11-11 17:30:00', 'pending', NULL, '2025-10-28 09:40:24', '2025-10-28 09:40:24'),
(8, 9, 4, 1, NULL, '2025-11-13 13:10:00', 'pending', NULL, '2025-10-28 09:40:57', '2025-10-28 09:40:57'),
(9, 10, 3, 1, NULL, '2025-11-15 19:00:00', 'pending', NULL, '2025-10-28 09:41:32', '2025-10-28 09:41:32'),
(10, 11, 2, 1, NULL, '2025-11-18 12:20:00', 'pending', NULL, '2025-10-28 09:42:56', '2025-10-28 09:42:56'),
(11, 12, 2, 1, NULL, '2025-11-20 09:50:00', 'pending', NULL, '2025-10-28 09:43:42', '2025-10-28 09:43:42'),
(12, 13, 2, 1, NULL, '2025-11-23 15:40:00', 'pending', NULL, '2025-10-28 09:43:56', '2025-10-28 09:43:56'),
(13, 14, 3, 1, NULL, '2025-11-27 16:10:00', 'pending', NULL, '2025-10-28 09:44:13', '2025-10-28 09:44:13'),
(14, 15, 6, 1, NULL, '2025-11-29 20:00:00', 'pending', NULL, '2025-10-28 09:44:33', '2025-10-28 09:44:33');

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` int(11) NOT NULL,
  `flat_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime DEFAULT NULL,
  `monthly_rent` decimal(12,2) NOT NULL,
  `security_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `security_type` enum('lease','deposit') NOT NULL DEFAULT 'deposit',
  `status` enum('active','ended','cancelled') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`id`, `flat_id`, `tenant_id`, `start_date`, `end_date`, `monthly_rent`, `security_amount`, `security_type`, `status`, `created_at`, `updated_at`) VALUES
(1, 11, 14, '2025-10-29 18:30:00', '2026-10-28 18:30:00', 20000.00, 50000.00, 'deposit', 'active', '2025-10-29 05:31:52', '2025-10-29 05:31:52'),
(2, 4, 1, '2025-10-30 18:30:00', '2026-10-30 18:30:00', 30000.00, 1000000.00, 'lease', 'active', '2025-10-29 05:39:28', '2025-10-29 05:39:28');

-- --------------------------------------------------------

--
-- Table structure for table `companies`
--

CREATE TABLE `companies` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `companies`
--

INSERT INTO `companies` (`id`, `name`, `created_at`, `updated_at`) VALUES
(1, 'Admin\'s Company', '2025-10-28 06:22:22', '2025-10-28 06:22:22');

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `company_id` int(11) NOT NULL,
  `joined_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`id`, `user_id`, `company_id`, `joined_at`, `created_at`, `updated_at`) VALUES
(1, 1, 1, '2025-10-28 06:22:22', '2025-10-28 06:22:22', '2025-10-28 06:22:22'),
(2, 12, 1, '2025-10-28 06:40:35', '2025-10-28 06:40:35', '2025-10-28 06:40:35'),
(3, 13, 1, '2025-10-28 06:40:44', '2025-10-28 06:40:44', '2025-10-28 06:40:44'),
(4, 14, 1, '2025-10-28 06:40:57', '2025-10-28 06:40:57', '2025-10-28 06:40:57'),
(5, 15, 1, '2025-10-28 06:41:05', '2025-10-28 06:41:05', '2025-10-28 06:41:05'),
(6, 16, 1, '2025-10-28 06:41:13', '2025-10-28 06:41:13', '2025-10-28 06:41:13'),
(7, 17, 1, '2025-10-28 06:41:27', '2025-10-28 06:41:27', '2025-10-28 06:41:27'),
(8, 18, 1, '2025-10-28 06:41:39', '2025-10-28 06:41:39', '2025-10-28 06:41:39'),
(9, 19, 1, '2025-10-28 06:41:46', '2025-10-28 06:41:46', '2025-10-28 06:41:46'),
(10, 20, 1, '2025-10-28 06:41:55', '2025-10-28 06:41:55', '2025-10-28 06:41:55'),
(11, 21, 1, '2025-10-28 06:42:03', '2025-10-28 06:42:03', '2025-10-28 06:42:03');

-- --------------------------------------------------------

--
-- Table structure for table `flats`
--

CREATE TABLE `flats` (
  `id` int(11) NOT NULL,
  `company_id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `unit_number` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `area_sqft` decimal(10,2) DEFAULT NULL,
  `flatStatus` enum('available','occupied','maintenance') DEFAULT 'available',
  `unique_amenities` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`unique_amenities`)),
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `flats`
--

INSERT INTO `flats` (`id`, `company_id`, `property_id`, `title`, `description`, `unit_number`, `type`, `area_sqft`, `flatStatus`, `unique_amenities`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'A-101', 'Bright 2BHK with balcony', 'A101', '1BHK', 850.00, 'available', '[\"balcony\",\"sea_view\"]', '2025-10-28 08:56:00', '2025-10-28 08:56:00'),
(3, 1, 1, 'A-102', 'Compact studio perfect for students', 'A102', '1RK', 400.00, 'occupied', '[\"modular_kitchen\"]', '2025-10-28 08:56:59', '2025-10-28 08:56:59'),
(4, 1, 1, 'A-103', 'Spacious 2BHK with private parking', 'A103', '2BHK', 900.00, 'occupied', '[\"parking\",\"storage_room\"]', '2025-10-28 08:57:14', '2025-10-29 05:39:28'),
(5, 1, 2, 'B-201', 'Premium 3BHK with open kitchen design', 'B201', '3BHK', 1250.00, 'available', '[\"open_kitchen\",\"corner_unit\"]', '2025-10-28 08:57:29', '2025-10-28 08:57:29'),
(6, 1, 2, 'B-202', '1BHK budget-friendly apartment', 'B202', '1BHK', 600.00, 'occupied', '[\"cctv_access\"]', '2025-10-28 08:57:38', '2025-10-28 08:57:38'),
(7, 1, 2, 'B-203', '2BHK with separate study room', 'B203', '2BHK', 1450.00, 'available', '[\"study_room\",\"large_balcony\"]', '2025-10-28 08:58:22', '2025-10-28 08:58:22'),
(8, 1, 3, 'C-301', 'Modern 2BHK with balcony garden', 'C301', '2BHK', 880.00, 'occupied', '[\"balcony_garden\"]', '2025-10-28 08:58:53', '2025-10-28 08:58:53'),
(9, 1, 3, 'C-302', 'Corner 1RK unit with extra storage', 'C302', '1RK', 420.00, 'available', '[\"extra_storage\"]', '2025-10-28 08:59:00', '2025-10-28 08:59:00'),
(10, 1, 3, 'C-303', 'Family-friendly 2BHK near park', 'C303', '2BHK', 910.00, 'available', '[\"green_view\",\"kids_play_area\"]', '2025-10-28 08:59:07', '2025-10-28 08:59:07'),
(11, 1, 4, 'D-101', 'Compact 1BHK with lift access', 'D101', '1BHK', 580.00, 'occupied', '[\"lift_access\"]', '2025-10-28 08:59:24', '2025-10-29 05:31:52'),
(12, 1, 4, 'D-102', '3BHK with dedicated utility area', 'D102', '3BHK', 1200.00, 'occupied', '[\"utility_area\"]', '2025-10-28 08:59:33', '2025-10-28 08:59:33'),
(13, 1, 4, 'D-103', 'Stylish 1BHK with bright interiors', 'D103', '1BHK', 410.00, 'maintenance', '[\"bright_interiors\"]', '2025-10-28 09:00:02', '2025-10-28 09:00:02'),
(14, 1, 5, 'E-401', 'Penthouse style 3BHK rooftop space', 'E401', '3BHK', 1600.00, 'available', '[\"rooftop_access\",\"panoramic_view\"]', '2025-10-28 09:00:52', '2025-10-28 09:00:52'),
(15, 1, 5, 'E-402', 'Modern 2BHK with smart home features', 'E402', '2BHK', 950.00, 'occupied', '[\"smart_locks\",\"voice_assist\"]', '2025-10-28 09:01:02', '2025-10-28 09:01:02'),
(16, 1, 5, 'E-403', 'Luxury 1BHK with premium fittings', 'E403', '1BHK', 720.00, 'available', '[\"premium_fittings\",\"walk_in_wardrobe\"]', '2025-10-28 09:01:08', '2025-10-28 09:01:08');

-- --------------------------------------------------------

--
-- Table structure for table `listings`
--

CREATE TABLE `listings` (
  `id` int(11) NOT NULL,
  `flat_id` int(11) NOT NULL,
  `lister_id` int(11) NOT NULL,
  `company_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `monthly_rent` decimal(12,2) DEFAULT NULL,
  `security_amount` decimal(12,2) DEFAULT NULL,
  `security_type` enum('lease','deposit') NOT NULL DEFAULT 'deposit',
  `status` enum('active','closed','pending') NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `listings`
--

INSERT INTO `listings` (`id`, `flat_id`, `lister_id`, `company_id`, `title`, `description`, `monthly_rent`, `security_amount`, `security_type`, `status`, `created_at`, `updated_at`) VALUES
(2, 3, 1, 1, 'Budget 1BHK with Road View', 'Simple 1BHK with good ventilation and lift access.', 12000.00, 30000.00, 'deposit', 'active', '2025-10-28 09:13:31', '2025-10-28 09:13:31'),
(3, 4, 1, 1, 'Premium 3BHK with Open Kitchen', 'Ideal for families — near schools and parks.', 35000.00, 90000.00, 'deposit', 'active', '2025-10-28 09:13:59', '2025-10-28 09:13:59'),
(4, 5, 1, 1, 'Compact 1BHK with CCTV', 'Secure building with 24/7 monitoring.', 11000.00, 25000.00, 'deposit', 'active', '2025-10-28 09:14:06', '2025-10-28 09:14:06'),
(5, 16, 1, 1, 'Spacious 2BHK Family Home', 'Peaceful neighborhood and balcony overlooking greenery.', 22000.00, 50000.00, 'deposit', 'active', '2025-10-28 09:14:17', '2025-10-28 09:14:17'),
(6, 6, 1, 1, '3BHK+ with Study Room', 'Large apartment with flexible working space.', 42000.00, 100000.00, 'deposit', 'active', '2025-10-28 09:14:39', '2025-10-28 09:14:39'),
(7, 7, 1, 1, 'Modern 2BHK with Balcony Garden', 'Eco-friendly with fresh greenery.', 24000.00, 60000.00, 'deposit', 'active', '2025-10-28 09:14:45', '2025-10-28 09:14:45'),
(8, 8, 1, 1, '1RK Corner Unit', 'Extra storage and good privacy.', 9500.00, 20000.00, 'deposit', 'active', '2025-10-28 09:14:51', '2025-10-28 09:14:51'),
(9, 9, 1, 1, '2BHK Near Park', 'Perfect for small families, kids play area nearby.', 21000.00, 50000.00, 'deposit', 'active', '2025-10-28 09:14:57', '2025-10-28 09:14:57'),
(10, 10, 1, 1, '1BHK with Lift Access', 'Accessible and well-lit apartment.', 13000.00, 30000.00, 'deposit', 'active', '2025-10-28 09:15:04', '2025-10-28 09:15:04'),
(11, 11, 1, 1, '3BHK with Utility Space', 'Large kitchen with separate cleaning area.', 32000.00, 80000.00, 'deposit', 'active', '2025-10-28 09:15:10', '2025-10-28 09:15:10'),
(12, 12, 1, 1, 'Stylish 1RK', 'Bright décor and prime location for IT professionals.', 10000.00, 25000.00, 'deposit', 'closed', '2025-10-28 09:15:19', '2025-10-30 08:00:23'),
(13, 13, 1, 1, 'Penthouse 3BHK+ Rooftop', 'Luxurious lifestyle with panoramic city views.', 50000.00, 150000.00, 'deposit', 'active', '2025-10-28 09:15:28', '2025-10-28 09:15:28'),
(14, 14, 1, 1, 'Smart 2BHK Tech Enabled', 'Smart locks and voice-controlled lights.', 28000.00, 70000.00, 'deposit', 'active', '2025-10-28 09:15:35', '2025-10-28 09:15:35'),
(15, 15, 1, 1, 'Luxury 1BHK with Walk-in Wardrobe', 'Premium interiors, ideal for couples.', 19000.00, 45000.00, 'deposit', 'active', '2025-10-28 09:15:42', '2025-10-28 09:15:42');

-- --------------------------------------------------------

--
-- Table structure for table `photos`
--

CREATE TABLE `photos` (
  `id` int(11) NOT NULL,
  `imageable_id` int(11) NOT NULL,
  `imageable_type` varchar(255) NOT NULL,
  `photo_url` text NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `photos`
--

INSERT INTO `photos` (`id`, `imageable_id`, `imageable_type`, `photo_url`, `name`, `is_primary`, `created_at`, `updated_at`) VALUES
(1, 1, 'Property', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761641506326-1.jpeg.webp?alt=media&token=60dff847-d26e-4015-859f-5caf7e03539f', NULL, 1, '2025-10-28 08:51:47', '2025-10-28 08:51:47'),
(2, 2, 'Property', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761641518504-2.jpg.webp?alt=media&token=1b1b8c0b-c1ce-4fe0-aca7-69ff99ed60dd', NULL, 1, '2025-10-28 08:51:59', '2025-10-28 08:51:59'),
(3, 3, 'Property', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761641529912-3.jpg.webp?alt=media&token=9e26e917-6f5e-425a-9a01-eac54b2316b8', NULL, 1, '2025-10-28 08:52:10', '2025-10-28 08:52:10'),
(4, 4, 'Property', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761641537899-4.jpg.webp?alt=media&token=cf7b7849-dd20-4b19-94c8-0a81e52dc51f', NULL, 1, '2025-10-28 08:52:19', '2025-10-28 08:52:19'),
(5, 5, 'Property', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761641550164-5.jpg.webp?alt=media&token=b0242f91-0f71-4ddb-bccd-93fa0b6de9cf', NULL, 1, '2025-10-28 08:52:31', '2025-10-28 08:52:31'),
(6, 6, 'Property', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761641560468-6.jpg.webp?alt=media&token=8064d5fe-9126-45ac-8cb8-1eb2789ab8ee', NULL, 1, '2025-10-28 08:52:41', '2025-10-28 08:52:41'),
(7, 7, 'Property', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761641571010-7.jpg.webp?alt=media&token=07a4d8a2-288b-4a53-b0ad-f623d8092b56', NULL, 1, '2025-10-28 08:52:51', '2025-10-28 08:52:51'),
(8, 8, 'Property', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761641583527-8.jpg.webp?alt=media&token=1bf61159-dac2-4149-9591-c93f7ae9a11c', NULL, 1, '2025-10-28 08:53:05', '2025-10-28 08:53:05'),
(9, 9, 'Property', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761641616365-9.jpg.webp?alt=media&token=bbefae86-10c1-4798-a7b4-eba0a4970454', NULL, 1, '2025-10-28 08:53:37', '2025-10-28 08:53:37'),
(10, 10, 'Property', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761641626572-10.jpeg.webp?alt=media&token=e31e2358-bf60-4305-8620-673a5329a694', NULL, 1, '2025-10-28 08:53:47', '2025-10-28 08:53:47'),
(11, 11, 'Property', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761641634678-1.jpeg.webp?alt=media&token=c60d7f38-40da-4ddf-ba8f-67fb96a728c9', NULL, 1, '2025-10-28 08:53:56', '2025-10-28 08:53:56'),
(12, 1, 'Flat', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761642122194-1.jpeg.webp?alt=media&token=e8888623-f38f-4c2c-b69d-5d9a0da60d31', NULL, 1, '2025-10-28 09:02:03', '2025-10-28 09:02:03'),
(13, 3, 'Flat', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761642146981-2.jpg.webp?alt=media&token=56a75e2d-2ed6-443d-816e-c6320949a236', NULL, 1, '2025-10-28 09:02:29', '2025-10-28 09:02:29'),
(14, 4, 'Flat', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761642159577-3.jpg.webp?alt=media&token=04281457-d7f0-45b0-bd77-74848ad405bc', NULL, 1, '2025-10-28 09:02:40', '2025-10-28 09:02:40'),
(15, 5, 'Flat', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761642169658-4.jpg.webp?alt=media&token=8c5e5928-a580-4d7f-8897-cccacb83aead', NULL, 1, '2025-10-28 09:02:51', '2025-10-28 09:02:51'),
(16, 6, 'Flat', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761642180783-5.jpg.webp?alt=media&token=bd2f9b82-a4f9-45e2-914c-20ef3851ba84', NULL, 1, '2025-10-28 09:03:01', '2025-10-28 09:03:01'),
(17, 7, 'Flat', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761642190586-6.jpg.webp?alt=media&token=86cafe33-f1ad-4152-aca0-398f3c7dceb8', NULL, 1, '2025-10-28 09:03:12', '2025-10-28 09:03:12'),
(18, 8, 'Flat', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761642254984-7.jpg.webp?alt=media&token=a06b5b10-1c85-4a85-a6e1-b8d1b8a49739', NULL, 1, '2025-10-28 09:04:16', '2025-10-28 09:04:16'),
(19, 9, 'Flat', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761642267422-8.jpg.webp?alt=media&token=0ad60e53-e829-4d9b-aa24-20c3219c4173', NULL, 1, '2025-10-28 09:04:28', '2025-10-28 09:04:28'),
(20, 10, 'Flat', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761642279264-9.jpeg.webp?alt=media&token=4c7a3a84-b800-45c7-967a-e68ca9defe63', NULL, 1, '2025-10-28 09:04:40', '2025-10-28 09:04:40'),
(21, 11, 'Flat', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761642294878-10.jpeg.webp?alt=media&token=95377fde-9603-42cc-9d9d-76d48231b5a8', NULL, 1, '2025-10-28 09:04:56', '2025-10-28 09:04:56'),
(22, 12, 'Flat', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761642305722-11.jpeg.webp?alt=media&token=7490a0d8-5386-49cf-91bc-370758f1802b', NULL, 1, '2025-10-28 09:05:07', '2025-10-28 09:05:07'),
(23, 13, 'Flat', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761642316921-12.jpeg.webp?alt=media&token=3f24f04a-b90d-42b5-b42e-2e4094b193eb', NULL, 1, '2025-10-28 09:05:18', '2025-10-28 09:05:18'),
(24, 14, 'Flat', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761642375358-13.jpeg.webp?alt=media&token=f659c39e-530b-49cf-8c87-2a06ed8a2a65', NULL, 1, '2025-10-28 09:06:17', '2025-10-28 09:06:17'),
(25, 15, 'Flat', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761642387370-14.jpeg.webp?alt=media&token=0921094b-aec7-4e75-b628-2f7367ad7b6a', NULL, 1, '2025-10-28 09:06:28', '2025-10-28 09:06:28'),
(26, 16, 'Flat', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761642398773-1.jpeg.webp?alt=media&token=16d0a17e-4900-4799-846b-b7d4ff98d943', NULL, 1, '2025-10-28 09:06:40', '2025-10-28 09:06:40'),
(27, 28, 'Tenant', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761716483179-image-picker-7C71EB23-2537-49DB-8903-0A584E74B1EB-15201-0000001DCD453BCD.jpg.webp?alt=media&token=ac699de7-04bc-4ee9-80b4-ee0eb0e0a8fe', 'PAN', 0, '2025-10-29 05:41:24', '2025-10-29 05:41:24'),
(28, 30, 'Tenant', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761716648652-image-picker-2A17DE11-B827-4616-9690-DA7B2008A59D-15201-0000001E9DAFD320.png.webp?alt=media&token=ddc0772a-ff59-4567-8429-3410f77b6a34', 'DL Card', 0, '2025-10-29 05:44:09', '2025-10-29 05:44:09'),
(29, 30, 'Tenant', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761716649944-image-picker-198C8E70-7FFA-4F7E-ABF5-C008B2E295F2-15201-0000001EBA4F5153.jpg.webp?alt=media&token=289e3ec2-05fc-4a0c-8d9c-3c3f2669b4cf', 'voter ID', 0, '2025-10-29 05:44:12', '2025-10-29 05:44:12'),
(30, 20, 'Tenant', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761716672449-image-picker-248E0595-592F-4ED6-AF96-A2575AD0ABE0-15201-0000001EDEAE901A.jpg.webp?alt=media&token=8435dd47-2f81-4f97-a72d-c61e8f9cbebb', 'adhar', 0, '2025-10-29 05:44:34', '2025-10-29 05:44:34'),
(31, 23, 'Tenant', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761716696317-image-picker-240AC6C8-7016-400A-B5C6-2D4F761229A4-15201-0000001EFF6358EF.png.webp?alt=media&token=184414ed-5aea-4a98-af8f-0ad4e5312feb', 'DL Card', 0, '2025-10-29 05:44:58', '2025-10-29 05:44:58'),
(32, 17, 'Tenant', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761716737222-image-picker-CDFE2989-716E-4DEE-A686-8814F591BE0B-15201-0000001F1B122A6A.jpg.webp?alt=media&token=e85f57cb-f52f-4a73-ad5a-1e579cd11731', 'Adhar card', 0, '2025-10-29 05:45:39', '2025-10-29 05:45:39'),
(33, 17, 'Tenant', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761716739323-image-picker-D68DEAF2-B6C6-4FB8-B642-499C5A109395-15201-0000001F34B351AC.jpg.webp?alt=media&token=2b474a2b-fc3b-4174-802a-05d148133719', 'PAN Card', 0, '2025-10-29 05:45:40', '2025-10-29 05:45:40');

-- --------------------------------------------------------

--
-- Table structure for table `properties`
--

CREATE TABLE `properties` (
  `id` int(11) NOT NULL,
  `company_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `address` varchar(255) NOT NULL,
  `city` varchar(255) NOT NULL,
  `state` varchar(255) NOT NULL,
  `zipcode` varchar(255) NOT NULL,
  `count_1rk` int(11) NOT NULL DEFAULT 0,
  `count_1bhk` int(11) NOT NULL DEFAULT 0,
  `count_2bhk` int(11) NOT NULL DEFAULT 0,
  `count_3bhk` int(11) NOT NULL DEFAULT 0,
  `count_3bhk_plus` int(11) NOT NULL DEFAULT 0,
  `area_sqft` decimal(10,2) DEFAULT NULL,
  `parking` tinyint(1) DEFAULT NULL,
  `amenities` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`amenities`)),
  `is_managed` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `properties`
--

INSERT INTO `properties` (`id`, `company_id`, `name`, `description`, `address`, `city`, `state`, `zipcode`, `count_1rk`, `count_1bhk`, `count_2bhk`, `count_3bhk`, `count_3bhk_plus`, `area_sqft`, `parking`, `amenities`, `is_managed`, `created_at`, `updated_at`) VALUES
(1, 1, 'Luxury Central Towers', 'A newly built luxury residential project located in the heart of the city, featuring high-end amenities and modern design. Perfect for young professionals and families.', '101 Grand Boulevard, Block C', 'Bengaluru', 'Karnataka', '560001', 2, 3, 3, 5, 2, 185000.00, 1, '\"[\\\"Pool\\\",\\\"Gym\\\",\\\"Clubhouse\\\",\\\"24/7 Security\\\"]\"', 1, '2025-10-28 08:49:17', '2025-10-28 08:57:14'),
(2, 1, 'Maple Heights', 'A cozy 4-floor apartment ideal for young professionals. Close to metro and tech parks.', '14 Maple Street, HSR Layout', 'Bengaluru', 'Karnataka', '560102', 2, 2, 2, 0, 0, 45000.00, 1, '\"[\\\"Lift\\\",\\\"CCTV\\\"]\"', 1, '2025-10-28 08:49:41', '2025-10-28 08:58:22'),
(3, 1, 'Orchid Nest', 'Modern low-rise apartments offering peaceful living near JP Nagar parks.', '22 Orchid Road, JP Nagar 5th Phase', 'Bengaluru', 'Karnataka', '560078', 0, 4, 0, 1, 0, 38000.00, 1, '\"[\\\"Lift\\\",\\\"Power Backup\\\"]\"', 0, '2025-10-28 08:49:54', '2025-10-28 08:59:07'),
(4, 1, 'Green Leaf Residency', 'Compact and eco-friendly building with rooftop solar panels.', '89 Central Street, Koramangala 4th Block', 'Bengaluru', 'Karnataka', '560034', 0, 3, 2, 0, 0, 50000.00, 1, '\"[\\\"Solar Rooftop\\\",\\\"CCTV\\\"]\"', 1, '2025-10-28 08:50:08', '2025-10-28 09:00:02'),
(5, 1, 'Vista Pearl', 'Premium small apartment building with balconies overlooking the neighborhood.', '17 Lake View Road, BTM Layout', 'Bengaluru', 'Karnataka', '560076', 1, 2, 2, 0, 0, 48000.00, 1, '\"[\\\"Lift\\\",\\\"24/7 Security\\\"]\"', 1, '2025-10-28 08:50:20', '2025-10-28 09:01:08'),
(6, 1, 'Sunrise Enclave', 'Quiet community living near Electronic City with easy access to tech hubs.', '56 Beta Block, Electronic City Phase 1', 'Bengaluru', 'Karnataka', '560100', 2, 4, 2, 0, 0, 35000.00, 0, '\"[\\\"CCTV\\\"]\"', 0, '2025-10-28 08:50:31', '2025-10-28 08:50:31'),
(7, 1, 'Bluebell Habitat', 'Stylish apartments with compact units for budget-friendly living.', '7 Rose Garden Road, HBR Layout', 'Bengaluru', 'Karnataka', '560043', 3, 4, 1, 0, 0, 30000.00, 0, '\"[\\\"Lift\\\"]\"', 0, '2025-10-28 08:50:40', '2025-10-28 08:50:40'),
(8, 1, 'Silver Park', 'Low-rise building offering spacious 2BHK units near Yeshwanthpur.', '34 Silver Lane, Yeshwanthpur', 'Bengaluru', 'Karnataka', '560022', 0, 2, 4, 1, 0, 52000.00, 1, '\"[\\\"Lift\\\",\\\"Rainwater Harvesting\\\"]\"', 1, '2025-10-28 08:50:50', '2025-10-28 08:50:50'),
(9, 1, 'Harmony Heights', 'Small gated apartments with family-friendly design and green spaces.', '102 Temple Road, Malleshwaram', 'Bengaluru', 'Karnataka', '560003', 1, 3, 3, 1, 0, 46000.00, 1, '\"[\\\"Garden\\\",\\\"CCTV\\\"]\"', 1, '2025-10-28 08:50:58', '2025-10-28 08:50:58'),
(10, 1, 'Urban Crest', 'Minimalist modern apartments popular among IT workers.', '19 Tech Park Road, Whitefield', 'Bengaluru', 'Karnataka', '560066', 2, 3, 2, 1, 0, 42000.00, 1, '\"[\\\"Lift\\\",\\\"Power Backup\\\"]\"', 1, '2025-10-28 08:51:09', '2025-10-28 08:51:09'),
(11, 1, 'Serene Homes', 'Peaceful living in a compact apartment near Indiranagar cafes and shops.', '3 Cafe Street, Indiranagar', 'Bengaluru', 'Karnataka', '560038', 0, 4, 3, 1, 0, 51000.00, 1, '\"[\\\"Lift\\\",\\\"CCTV\\\"]\"', 0, '2025-10-28 08:51:19', '2025-10-28 08:51:19');

-- --------------------------------------------------------

--
-- Table structure for table `rent_bills`
--

CREATE TABLE `rent_bills` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `bill_month` date NOT NULL COMMENT 'The first day of the month this bill applies to.',
  `is_paid` tinyint(1) NOT NULL DEFAULT 0,
  `payment_date` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tenants`
--

CREATE TABLE `tenants` (
  `id` int(11) NOT NULL,
  `company_id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone_number` varchar(255) NOT NULL,
  `status` enum('available','occupied') NOT NULL DEFAULT 'available',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tenants`
--

INSERT INTO `tenants` (`id`, `company_id`, `property_id`, `name`, `phone_number`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'Mohammed', '9663034115', 'occupied', '2025-10-28 09:18:13', '2025-10-29 05:39:28'),
(2, 1, 1, 'Ahmed', '9665012341', 'available', '2025-10-28 09:18:27', '2025-10-28 09:18:27'),
(3, 1, 1, 'Salman', '9665559872', 'available', '2025-10-28 09:18:39', '2025-10-28 09:18:39'),
(4, 1, 1, 'Tariq', '9665048763', 'available', '2025-10-28 09:19:01', '2025-10-28 09:19:01'),
(5, 1, 1, 'Khalid', '9665033214', 'available', '2025-10-28 09:19:47', '2025-10-28 09:19:47'),
(6, 1, 1, 'Yasir', '9665054421', 'available', '2025-10-28 09:20:00', '2025-10-28 09:20:00'),
(7, 1, 2, 'Yasir', '9665054421', 'available', '2025-10-28 09:20:05', '2025-10-28 09:20:05'),
(8, 1, 2, 'Hassan', '9665523412', 'available', '2025-10-28 09:20:31', '2025-10-28 09:20:31'),
(9, 1, 2, 'Ibrahim', '9665578910', 'available', '2025-10-28 09:20:50', '2025-10-28 09:20:50'),
(10, 1, 2, 'Saad', '9665332109', 'available', '2025-10-28 09:21:17', '2025-10-28 09:21:17'),
(11, 1, 3, 'Rashid', '9665501234', 'available', '2025-10-28 09:21:29', '2025-10-28 09:21:29'),
(12, 1, 3, 'Majed', '9665045328', 'available', '2025-10-28 09:21:47', '2025-10-28 09:21:47'),
(13, 1, 4, 'Zaid', '9665067811', 'available', '2025-10-28 09:22:00', '2025-10-28 09:22:00'),
(14, 1, 4, 'Fahad', '9665087654', 'occupied', '2025-10-28 09:22:10', '2025-10-29 05:31:52'),
(15, 1, 5, 'Anas', '9665099843', 'available', '2025-10-28 09:22:22', '2025-10-28 09:22:22'),
(16, 1, 6, 'Nawaf', '9665112345', 'available', '2025-10-28 09:22:35', '2025-10-28 09:22:35'),
(17, 1, 7, 'Talal', '9665223456', 'available', '2025-10-28 09:22:48', '2025-10-28 09:22:48'),
(18, 1, 8, 'Talal', '9665223456', 'available', '2025-10-28 09:22:57', '2025-10-28 09:22:57'),
(19, 1, 11, 'Talal', '9665223456', 'available', '2025-10-28 09:23:02', '2025-10-28 09:23:02'),
(20, 1, 9, 'Sami', '9665334567', 'available', '2025-10-28 09:23:13', '2025-10-28 09:23:13'),
(21, 1, 10, 'Sami', '9665334567', 'available', '2025-10-28 09:23:17', '2025-10-28 09:23:17'),
(22, 1, 8, 'Sami', '9665334567', 'available', '2025-10-28 09:23:22', '2025-10-28 09:23:22'),
(23, 1, 7, 'Bader', '9665445678', 'available', '2025-10-28 09:23:44', '2025-10-28 09:23:44'),
(24, 1, 5, 'Bader', '9665445678', 'available', '2025-10-28 09:23:49', '2025-10-28 09:23:49'),
(25, 1, 4, 'Bader', '9665445678', 'available', '2025-10-28 09:23:55', '2025-10-28 09:23:55'),
(26, 1, 5, 'Wael', '9665556789', 'available', '2025-10-28 09:24:11', '2025-10-28 09:24:11'),
(27, 1, 6, 'Wael', '9665556789', 'available', '2025-10-28 09:24:15', '2025-10-28 09:24:15'),
(28, 1, 7, 'Wael', '9665556789', 'available', '2025-10-28 09:24:19', '2025-10-28 09:24:19'),
(29, 1, 8, 'Wael', '9665556789', 'available', '2025-10-28 09:24:23', '2025-10-28 09:24:23'),
(30, 1, 9, 'Wael', '9665556789', 'available', '2025-10-28 09:24:27', '2025-10-28 09:24:27'),
(31, 1, 10, 'Wael', '9665556789', 'available', '2025-10-28 09:24:32', '2025-10-28 09:24:32'),
(32, 1, 11, 'Wael', '9665556789', 'available', '2025-10-28 09:24:35', '2025-10-28 09:24:35');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `company_id` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone_number` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(255) NOT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `company_id`, `name`, `email`, `phone_number`, `password`, `role`, `profile_image`, `created_at`, `updated_at`) VALUES
(1, 1, 'Admin', 'admin.example@example.com', '9663034110', '$2b$10$m9imSSKruiNIY/WFiwTp0uVMGjE805lxPIlZ7oiROVut.gzgjf3re', 'admin', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761637033912-6.webp.webp?alt=media&token=34e49dbc-a5ab-4316-9e30-d6fb3f047526', '2025-10-28 06:22:22', '2025-10-28 07:37:15'),
(2, NULL, 'Taha', 'client.example@example.com', '9663034113', '$2b$10$07pNZc//1.1mG4JN4B8WFeWGpurHEfEQRtGyd6tE2UPKP2xU8LRy6', 'client', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761636978371-5.jpeg.webp?alt=media&token=c877935a-dd9e-430d-a48a-db101ef277a7', '2025-10-28 06:27:31', '2025-10-28 07:36:20'),
(3, NULL, 'Aarav', 'aarav.kar@examplestore.com', '918045612309', '$2b$10$2MhHIGak4hoXSuTZEIzMHuwZrBFgyFQs1opbFrrSnVdNwHZDOEAeu', 'client', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761636940375-4.jpeg.webp?alt=media&token=5e5f9444-b2dd-46f0-8f25-4c042714e2cf', '2025-10-28 06:29:41', '2025-10-28 07:35:42'),
(4, NULL, 'Priya', 'priya.r@client.example.com', '919876543210', '$2b$10$GLJA7iNLhJp65TbacopplOxc8gf2lsLLSW3N0oxzu9pSdOrNb688S', 'client', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761636882996-5.jpg.webp?alt=media&token=cacf28a8-029e-4a98-8b94-66120de80d3b', '2025-10-28 06:29:51', '2025-10-28 07:34:43'),
(5, NULL, 'Kavya', 'kavya.nagar@example.com', '919448112233', '$2b$10$JbR.pEE3ofKWNU69Hgh2COggUkZsfod1xjUZfB4EkNfTlFAAuqgm.', 'client', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761636810611-4.jpg.webp?alt=media&token=e8ec279e-ad26-4c42-ae8d-e06c46b890c2', '2025-10-28 06:35:27', '2025-10-28 07:33:31'),
(6, NULL, 'Rahul', 'rahul.joshi@example.com', '917023334455', '$2b$10$bbE/dlEUgUaaTdSk/1Xod.5rwcL.ayz8Ki5Peh1L/zzPLSFmqfBRe', 'client', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761636720104-3.jpeg.webp?alt=media&token=70c576b8-17e0-4465-ae42-89b658c7c096', '2025-10-28 06:35:36', '2025-10-28 07:32:01'),
(7, NULL, 'Sneha', 'sneha.m@example.org', '919665554443', '$2b$10$W2rv7g0O7XBvRLy.mPiCRuZpoVmq1589YJe6ogHPfJCdTYyqt58.e', 'client', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761636684235-3.jpg.webp?alt=media&token=06766c4c-1761-4cd8-a7d0-970bf09bf97a', '2025-10-28 06:35:52', '2025-10-28 07:31:26'),
(8, NULL, 'Anil', 'anil.rao@example.com', '919988776655', '$2b$10$JvdWj3Alb9qz0kKah8h5meNrayZ24gJnlc4tG2utqmoNWEdQ7dIAy', 'client', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761636610612-2.jpeg.webp?alt=media&token=10eb0d6c-d8d5-4f8a-9bdc-fd24cc19768a', '2025-10-28 06:36:02', '2025-10-28 07:30:11'),
(9, NULL, 'Meera', 'meera.s@bengaluru.com', '919733221100', '$2b$10$cRtETPR1UPiych/ker5RpuOulPFXXdh.OuS0pdGC/6fy1PhlBjc46', 'client', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761636534679-2.jpg.webp?alt=media&token=988b2013-11d2-44e5-9cc6-c96f1d212987', '2025-10-28 06:36:35', '2025-10-28 07:28:55'),
(10, NULL, 'Rohan', 'rohan.patil@example.com', '918067890123', '$2b$10$XT8v63OfeiwaodFg.gjxPOEinShlCb5MIlo7yUrK8omPoy1.fSCGW', 'client', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761636479071-1.jpg.webp?alt=media&token=375f5e34-5b1d-4cd4-bbf7-1724c734e445', '2025-10-28 06:36:49', '2025-10-28 07:28:00'),
(11, NULL, 'Divya', 'divya.k@example.com', '919412009988', '$2b$10$ubOC9TOQxQTU8GXNGsg88ezgs0RaaCxNtCB8jEEJqs6zczgiS2k.u', 'client', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761636432709-1.jpg.webp?alt=media&token=92214002-04ae-4308-8a6d-132a510a4452', '2025-10-28 06:36:56', '2025-10-28 07:27:13'),
(12, 1, 'Ali Taha', 'new.employee@example.com', '9663034116', '$2b$10$xvnuTYkoZ9atWtHzRkYFOOkM/swkBO40sc5I9QqYNjP62GClvlsx6', 'admin', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761637141152-7.webp.webp?alt=media&token=3c107bf6-d44a-4a9a-9337-10d400c2581c', '2025-10-28 06:40:35', '2025-10-29 13:53:28'),
(13, 1, 'Ravi Kumar', 'ravi.kumar@example.com', '918045612311', '$2b$10$Fte4FltpDitqMQJClyL/gu1cZqbSN6C9yD5TSCR31x8Slb56XOyXW', 'agent', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761637194905-1.jpg.webp?alt=media&token=d70f62c4-aca5-4016-8c19-a1bbf5863aec', '2025-10-28 06:40:44', '2025-10-28 07:39:56'),
(14, 1, 'Priya Menon', 'priya.menon@example.com', '919876543215', '$2b$10$XWPovvOXW.NCmxcIrG7vGuegV5QqJjAXPtFAtV2UT9AmFbfDYcN.q', 'agent', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761637381317-6.jpg.webp?alt=media&token=b70bf6fa-075e-4aa2-8e3f-f24c31255b47', '2025-10-28 06:40:57', '2025-10-28 07:43:03'),
(15, 1, 'Arjun Reddy', 'arjun.reddy@example.com', '919448112239', '$2b$10$HJOmN/3kTzywVNXW3YsgyO77I1TyNpvJ958q4JdZJyJbm1RoF4jva', 'agent', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761637225962-2.jpeg.webp?alt=media&token=a9c2025f-4258-4c6e-b67f-20961f50b98d', '2025-10-28 06:41:05', '2025-10-28 07:40:26'),
(16, 1, 'Kavya Sharma', 'kavya.sharma@example.com', '917023334459', '$2b$10$IsqfHGKQ0tbML8TXzaVUz.4VdDNDX6K9KmCFQMQs0fe1pHLRINTha', 'agent', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761637414413-7.webp.webp?alt=media&token=6d4cddce-611e-4a59-b762-38281ee0f35e', '2025-10-28 06:41:13', '2025-10-28 07:43:35'),
(17, 1, 'Sneha Patel', 'sneha.patel@example.com', '919665554449', '$2b$10$C0z713qcow.WRSl1Il5K3OVQ3vt9g6762X72tt1M5e21cxRFZC8wS', 'agent', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761637448822-1.jpg.webp?alt=media&token=8a8d5f26-82a1-4064-a630-ac5da082f26f', '2025-10-28 06:41:27', '2025-10-28 07:44:10'),
(18, 1, 'Rohan Das', 'rohan.das@example.com', '919988776659', '$2b$10$7iBjp9qNga7mCEAEUo8Fwebodemw3KY2x0roqWOZUNJddTfXm1O3e', 'agent', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761637271520-3.jpeg.webp?alt=media&token=94e0a8b6-44bb-41cb-927f-1b4280ab6365', '2025-10-28 06:41:39', '2025-10-28 07:41:12'),
(19, 1, 'Anil Varma', 'anil.varma@example.com', '919733221109', '$2b$10$y/Z2V4Icl9q0IDBbZdLQEe.rpWR7SlZZuqJj1HHFG2oGEVjOGCWmK', 'agent', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761637304515-4.jpeg.webp?alt=media&token=8f2fc676-516b-43a0-b747-ffd9ff1cccde', '2025-10-28 06:41:46', '2025-10-28 07:41:46'),
(20, 1, 'Meera Iyer', 'meera.iyer@example.com', '918067890129', '$2b$10$8IJJwTh6kHYVxnKtqrA9iuGOLCfaadWvEfG06M5.wvVPvPI/RHJha', 'admin', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761637502918-2.jpg.webp?alt=media&token=c3111aaf-0011-4c15-9999-6f30db6b7307', '2025-10-28 06:41:55', '2025-10-28 07:45:03'),
(21, 1, 'Rahul Nair', 'rahul.nair@example.com', '919412009989', '$2b$10$9yqNViUL7npM4YWV07DL4uAn8dopSGNvAObCDMz2CH6qQtyR3FRrC', 'admin', 'https://firebasestorage.googleapis.com/v0/b/super-flats.firebasestorage.app/o/1761637333176-4.jpeg.webp?alt=media&token=711d6c15-e16a-445e-8472-0d6cc812d0e4', '2025-10-28 06:42:03', '2025-10-28 07:42:14');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `appointments`
--
ALTER TABLE `appointments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `appointments_listing_id_scheduled_at` (`listing_id`,`scheduled_at`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `company_id` (`company_id`),
  ADD KEY `employee_id` (`employee_id`);

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `flat_id` (`flat_id`),
  ADD KEY `tenant_id` (`tenant_id`);

--
-- Indexes for table `companies`
--
ALTER TABLE `companies`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `company_id` (`company_id`);

--
-- Indexes for table `flats`
--
ALTER TABLE `flats`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `flats_property_id_unit_number` (`property_id`,`unit_number`),
  ADD KEY `flats_ibfk_1` (`company_id`);

--
-- Indexes for table `listings`
--
ALTER TABLE `listings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `flat_id` (`flat_id`),
  ADD KEY `lister_id` (`lister_id`),
  ADD KEY `company_id` (`company_id`);

--
-- Indexes for table `photos`
--
ALTER TABLE `photos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_imageable` (`imageable_id`,`imageable_type`);

--
-- Indexes for table `properties`
--
ALTER TABLE `properties`
  ADD PRIMARY KEY (`id`),
  ADD KEY `company_id` (`company_id`);

--
-- Indexes for table `rent_bills`
--
ALTER TABLE `rent_bills`
  ADD PRIMARY KEY (`id`),
  ADD KEY `booking_id` (`booking_id`),
  ADD KEY `tenant_id` (`tenant_id`);

--
-- Indexes for table `tenants`
--
ALTER TABLE `tenants`
  ADD PRIMARY KEY (`id`),
  ADD KEY `company_id` (`company_id`),
  ADD KEY `property_id` (`property_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `company_id` (`company_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `appointments`
--
ALTER TABLE `appointments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `companies`
--
ALTER TABLE `companies`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `flats`
--
ALTER TABLE `flats`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `listings`
--
ALTER TABLE `listings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `photos`
--
ALTER TABLE `photos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `properties`
--
ALTER TABLE `properties`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `rent_bills`
--
ALTER TABLE `rent_bills`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tenants`
--
ALTER TABLE `tenants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `appointments`
--
ALTER TABLE `appointments`
  ADD CONSTRAINT `appointments_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `appointments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `appointments_ibfk_3` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `appointments_ibfk_4` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`flat_id`) REFERENCES `flats` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `employees_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `employees_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `flats`
--
ALTER TABLE `flats`
  ADD CONSTRAINT `flats_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `flats_ibfk_2` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `listings`
--
ALTER TABLE `listings`
  ADD CONSTRAINT `listings_ibfk_1` FOREIGN KEY (`flat_id`) REFERENCES `flats` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `listings_ibfk_2` FOREIGN KEY (`lister_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `listings_ibfk_3` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `properties`
--
ALTER TABLE `properties`
  ADD CONSTRAINT `properties_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `rent_bills`
--
ALTER TABLE `rent_bills`
  ADD CONSTRAINT `rent_bills_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `rent_bills_ibfk_2` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tenants`
--
ALTER TABLE `tenants`
  ADD CONSTRAINT `tenants_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tenants_ibfk_2` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
