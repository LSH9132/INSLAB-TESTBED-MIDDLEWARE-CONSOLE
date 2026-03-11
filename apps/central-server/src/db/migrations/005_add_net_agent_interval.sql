-- Migration 005: Add per-PI net-agent sample interval
ALTER TABLE pi_nodes ADD COLUMN net_agent_sample_interval_sec INTEGER DEFAULT 5;
