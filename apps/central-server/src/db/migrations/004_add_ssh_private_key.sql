-- Migration 004: Add ssh_private_key column to pi_nodes
-- Allows each Pi to have its own SSH private key

ALTER TABLE pi_nodes ADD COLUMN ssh_private_key TEXT;
