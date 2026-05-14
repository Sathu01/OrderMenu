package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"bar-pos-backend/config"
	"bar-pos-backend/db"
	"bar-pos-backend/router"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env (ignored in production where real env vars are set).
	if err := godotenv.Load(); err != nil {
		log.Println("ℹ️  No .env file found — using system environment variables")
	}

	cfg := config.Load()

	// ── Connect to MongoDB ───────────────────────────────────────────────────
	connCtx, connCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer connCancel()

	mongoClient, err := db.Connect(connCtx, cfg.MongoURI)
	if err != nil {
		log.Fatalf("❌ MongoDB connection failed: %v", err)
	}

	database := mongoClient.Database(cfg.DBName)

	// ── Ensure all indexes exist ─────────────────────────────────────────────
	idxCtx, idxCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer idxCancel()

	if err := db.EnsureIndexes(idxCtx, database); err != nil {
		// Log but don't crash — indexes may already exist.
		log.Printf("⚠️  Index creation warning: %v", err)
	}

	// ── Build the Gin router ─────────────────────────────────────────────────
	r := router.SetupRouter(database)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// ── Start server in a goroutine so we can listen for shutdown signals ────
	go func() {
		log.Printf("🍺 Bar POS backend running on http://localhost:%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// ── Graceful shutdown ────────────────────────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("🛑 Shutdown signal received — draining connections...")

	shutCtx, shutCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutCancel()

	if err := srv.Shutdown(shutCtx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}
	if err := mongoClient.Disconnect(shutCtx); err != nil {
		log.Printf("MongoDB disconnect error: %v", err)
	}

	log.Println("✅ Server exited cleanly")
}
