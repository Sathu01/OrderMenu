package config

import "os"

// Config holds all application configuration loaded from environment variables.
type Config struct {
	MongoURI string
	DBName   string
	Port     string
}

// Load reads environment variables and returns a Config.
// Falls back to sane defaults for local development.
func Load() *Config {
	return &Config{
		MongoURI: getEnv("MONGO_URI", "mongodb://localhost:27017"),
		DBName:   getEnv("DB_NAME", "bar_pos_system"),
		Port:     getEnv("PORT", "8080"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
