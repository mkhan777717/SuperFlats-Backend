-- Fix the property_id foreign key on the flats table
ALTER TABLE `flats`
    DROP FOREIGN KEY `flats_ibfk_2`;
ALTER TABLE `flats`
    ADD CONSTRAINT `flats_ibfk_2` 
    FOREIGN KEY (`property_id`) 
    REFERENCES `properties` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;
	
-- Fix the constrain on uploading photos
ALTER TABLE photos DROP FOREIGN KEY photos_ibfk_1;

-- Fix the company_id foreign key on the flats table
ALTER TABLE `flats`
    DROP FOREIGN KEY `flats_ibfk_1`;
ALTER TABLE `flats`
    ADD CONSTRAINT `flats_ibfk_1` 
    FOREIGN KEY (`company_id`) 
    REFERENCES `companies` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;