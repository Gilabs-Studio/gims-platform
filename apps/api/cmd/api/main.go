package main

import (
	"context"
	"log"
	"net/http"
	"net/http/pprof"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/audit"
	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/config"
	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/database"
	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/events"
	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/redis"
	coreRouter "github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/router"
	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/security"
	"github.com/gilabs/crm-healthcare/api/internal/core/logger"
	"github.com/gilabs/crm-healthcare/api/internal/core/middleware"
	"github.com/gilabs/crm-healthcare/api/internal/core/response"
	"github.com/gilabs/crm-healthcare/api/seeders"

	authUsecase "github.com/gilabs/crm-healthcare/api/internal/auth/domain/usecase"
	authHandler "github.com/gilabs/crm-healthcare/api/internal/auth/presentation/handler"
	authRouter "github.com/gilabs/crm-healthcare/api/internal/auth/presentation/router"

	permissionRepo "github.com/gilabs/crm-healthcare/api/internal/permission/data/repositories"
	permissionUsecase "github.com/gilabs/crm-healthcare/api/internal/permission/domain/usecase"
	permissionHandler "github.com/gilabs/crm-healthcare/api/internal/permission/presentation/handler"
	permissionRouter "github.com/gilabs/crm-healthcare/api/internal/permission/presentation/router"

	refreshTokenRepo "github.com/gilabs/crm-healthcare/api/internal/refresh_token/data/repositories"
	refreshTokenWorker "github.com/gilabs/crm-healthcare/api/internal/refresh_token/worker"

	roleRepo "github.com/gilabs/crm-healthcare/api/internal/role/data/repositories"
	roleUsecase "github.com/gilabs/crm-healthcare/api/internal/role/domain/usecase"
	roleHandler "github.com/gilabs/crm-healthcare/api/internal/role/presentation/handler"
	roleRouter "github.com/gilabs/crm-healthcare/api/internal/role/presentation/router"

	userRepo "github.com/gilabs/crm-healthcare/api/internal/user/data/repositories"
	userUsecase "github.com/gilabs/crm-healthcare/api/internal/user/domain/usecase"
	userHandler "github.com/gilabs/crm-healthcare/api/internal/user/presentation/handler"
	userRouter "github.com/gilabs/crm-healthcare/api/internal/user/presentation/router"

	corePresentation "github.com/gilabs/crm-healthcare/api/internal/core/presentation"
	geographicPresentation "github.com/gilabs/crm-healthcare/api/internal/geographic/presentation"
	organizationPresentation "github.com/gilabs/crm-healthcare/api/internal/organization/presentation"
	productPresentation "github.com/gilabs/crm-healthcare/api/internal/product/presentation"
	salesPresentation "github.com/gilabs/crm-healthcare/api/internal/sales/presentation"
	supplierPresentation "github.com/gilabs/crm-healthcare/api/internal/supplier/presentation"
	warehousePresentation "github.com/gilabs/crm-healthcare/api/internal/warehouse/presentation"
)

func main() {
	// Initialize logger
	logger.Init()

	// Load configuration
	if err := config.Load(); err != nil {
		log.Fatal("Failed to load config:", err)
	}

	// Connect to database
	if err := database.Connect(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer database.Close()

	// Connect to Redis
	if err := redis.InitRedis(config.AppConfig); err != nil {
		log.Printf("Warning: Redis connection failed: %v", err)
	}
	defer redis.Close()

	// Run migrations
	if config.AppConfig.Startup.RunMigrations {
		if err := database.AutoMigrate(); err != nil {
			log.Fatal("Failed to run migrations:", err)
		}
	} else {
		log.Println("Skipping migrations (RUN_MIGRATIONS=false)")
	}

	// Seed data
	if config.AppConfig.Startup.RunSeeders {
		if err := seeders.SeedAll(); err != nil {
			log.Fatal("Failed to seed data:", err)
		}
	} else {
		log.Println("Skipping seeders (RUN_SEEDERS=false)")
	}

	// Setup JWT Manager
	accessSecret := config.AppConfig.JWT.AccessSecretKey
	refreshSecret := config.AppConfig.JWT.RefreshSecretKey
	if accessSecret == "" {
		accessSecret = config.AppConfig.JWT.SecretKey
	}
	if refreshSecret == "" {
		refreshSecret = config.AppConfig.JWT.SecretKey
	}

	accessKeys := jwt.ParseKeyRing(config.AppConfig.JWT.AccessKeysRaw)
	refreshKeys := jwt.ParseKeyRing(config.AppConfig.JWT.RefreshKeysRaw)
	accessKID := config.AppConfig.JWT.AccessKID
	refreshKID := config.AppConfig.JWT.RefreshKID

	// If an active kid is set and exists in the ring, prefer it for signing.
	if accessKID != "" {
		if s, ok := accessKeys[accessKID]; ok && s != "" {
			accessSecret = s
		}
	}
	if refreshKID != "" {
		if s, ok := refreshKeys[refreshKID]; ok && s != "" {
			refreshSecret = s
		}
	}

	jwtManager := jwt.NewJWTManager(jwt.Options{
		AccessSecretKey:  accessSecret,
		RefreshSecretKey: refreshSecret,
		AccessKeys:       accessKeys,
		RefreshKeys:      refreshKeys,
		AccessKID:        accessKID,
		RefreshKID:       refreshKID,
		Issuer:           config.AppConfig.JWT.Issuer,
		AccessTokenTTL:   time.Duration(config.AppConfig.JWT.AccessTokenTTL) * time.Hour,
		RefreshTokenTTL:  time.Duration(config.AppConfig.JWT.RefreshTokenTTL) * 24 * time.Hour,
	})

	// Setup repositories
	refreshTokenRepository := refreshTokenRepo.NewRefreshTokenRepository(database.DB)
	userRepository := userRepo.NewUserRepository(database.DB)
	roleRepository := roleRepo.NewRoleRepository(database.DB)
	permissionRepository := permissionRepo.NewPermissionRepository(database.DB)
	menuRepository := permissionRepo.NewMenuRepository(database.DB)
	_ = menuRepository // potentially unused in main, but good to init if needed later

	// Setup Services
	permissionService := security.NewPermissionService(database.DB)
	auditService := audit.NewAuditService(database.DB)

	// Setup Event Publisher (NoOp for now - logs events to stdout)
	// Replace with Kafka publisher when Kafka is configured
	eventPublisher := events.NewNoOpEventPublisher(true) // Enable logging for development

	// Setup Usecases
	authUC := authUsecase.NewAuthUsecase(database.DB, userRepository, refreshTokenRepository, jwtManager, eventPublisher)
	userUC := userUsecase.NewUserUsecase(userRepository, roleRepository, auditService, eventPublisher, redis.GetClient())
	roleUC := roleUsecase.NewRoleUsecase(roleRepository, eventPublisher, redis.GetClient())
	permissionUC := permissionUsecase.NewPermissionUsecase(permissionRepository, userRepository)

	// Setup Handlers
	authH := authHandler.NewAuthHandler(authUC)
	userH := userHandler.NewUserHandler(userUC)
	roleH := roleHandler.NewRoleHandler(roleUC)
	permissionH := permissionHandler.NewPermissionHandler(permissionUC)

	// Setup refresh token cleanup worker
	// Run every 24 hours to clean up expired refresh tokens
	rtWorker := refreshTokenWorker.NewRefreshTokenCleanupWorker(
		refreshTokenRepository,
		24*time.Hour,
	)
	rtWorker.Start()

	// Setup Router
	r := coreRouter.NewEngine(jwtManager)

	// Metrics (counts/avg latency). Endpoint is token-gated and only enabled via env.
	r.Use(middleware.MetricsMiddleware())
	if config.AppConfig.Observability.MetricsEnabled {
		r.GET("/metrics", middleware.MetricsHandler())
		log.Println("Metrics enabled at /metrics (token required)")
	}

	// pprof (debugging). Token-gated and only enabled via env (non-prod enforced in config).
	if config.AppConfig.Observability.PprofEnabled {
		pp := r.Group("/debug/pprof")
		pp.Use(func(c *gin.Context) {
			if c.GetHeader("X-Internal-Token") != config.AppConfig.Observability.PprofToken {
				c.AbortWithStatus(http.StatusNotFound)
				return
			}
			c.Next()
		})
		pp.GET("/", gin.WrapF(pprof.Index))
		pp.GET("/cmdline", gin.WrapF(pprof.Cmdline))
		pp.GET("/profile", gin.WrapF(pprof.Profile))
		pp.POST("/symbol", gin.WrapF(pprof.Symbol))
		pp.GET("/symbol", gin.WrapF(pprof.Symbol))
		pp.GET("/trace", gin.WrapF(pprof.Trace))
		pp.GET("/allocs", gin.WrapH(pprof.Handler("allocs")))
		pp.GET("/block", gin.WrapH(pprof.Handler("block")))
		pp.GET("/goroutine", gin.WrapH(pprof.Handler("goroutine")))
		pp.GET("/heap", gin.WrapH(pprof.Handler("heap")))
		pp.GET("/mutex", gin.WrapH(pprof.Handler("mutex")))
		pp.GET("/threadcreate", gin.WrapH(pprof.Handler("threadcreate")))
		log.Println("pprof enabled at /debug/pprof (token required)")
	}

	// Health check endpoints
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "API is running",
		})
	})

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "pong",
		})
	})



	// Serve static files from uploads directory
	r.Static("/uploads", config.AppConfig.Storage.UploadDir)

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		v1.GET("/", func(c *gin.Context) {
			response.SuccessResponse(c, gin.H{
				"message": "API v1",
				"version": "1.0.0",
			}, nil)
		})

		authRouter.RegisterAuthRoutes(v1, authH, jwtManager, permissionService)
		userRouter.RegisterUserRoutes(v1, userH, permissionH, jwtManager, permissionService)
		roleRouter.RegisterRoleRoutes(v1, roleH, jwtManager, permissionService)
		permissionRouter.RegisterPermissionRoutes(v1, permissionH, jwtManager, permissionService)
		coreRouter.RegisterUploadRoutes(v1, jwtManager, permissionService)

		// Geographic module (Sprint 1)
		geographicPresentation.RegisterRoutes(r, v1, database.DB, jwtManager, permissionService)

		// Organization module (Sprint 2)
		organizationPresentation.RegisterRoutes(r, v1, database.DB, jwtManager, permissionService)

		// Supplier module (Sprint 4)
		supplierPresentation.RegisterRoutes(r, v1, database.DB, jwtManager, permissionService)

		// Product module (Sprint 4)
		productPresentation.RegisterRoutes(r, v1, database.DB, jwtManager, permissionService)

		// Warehouse module (Sprint 4)
		warehousePresentation.RegisterRoutes(r, v1, database.DB, jwtManager, permissionService)

		// Core Master Data (Sprint 4 - PaymentTerms, CourierAgency, SOSource, LeaveType)
		corePresentation.RegisterMasterDataRoutes(r, v1, database.DB, jwtManager, permissionService)

		// Sales module (Sprint 5 - Sales Quotation)
		salesPresentation.RegisterRoutes(r, v1, database.DB, jwtManager, permissionService)
	}

	// Run server with explicit timeouts and graceful shutdown
	port := config.AppConfig.Server.Port
	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           r,
		ReadHeaderTimeout: time.Duration(config.AppConfig.Server.ReadHeaderTimeoutSec) * time.Second,
		ReadTimeout:       time.Duration(config.AppConfig.Server.ReadTimeoutSec) * time.Second,
		WriteTimeout:      time.Duration(config.AppConfig.Server.WriteTimeoutSec) * time.Second,
		IdleTimeout:       time.Duration(config.AppConfig.Server.IdleTimeoutSec) * time.Second,
		MaxHeaderBytes:    config.AppConfig.Server.MaxHeaderBytes,
	}

	serverErr := make(chan error, 1)
	go func() {
		log.Printf("Server starting on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			serverErr <- err
		}
	}()

	// Wait for shutdown signal or server error
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	select {
	case sig := <-quit:
		log.Printf("Shutdown signal received: %v", sig)
	case err := <-serverErr:
		log.Printf("Server error: %v", err)
	}

	// Stop background worker before shutting down server/resources
	rtWorker.Stop()

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(config.AppConfig.Server.ShutdownTimeoutSec)*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Graceful shutdown failed: %v", err)
		_ = srv.Close()
	}
	log.Println("Server stopped")
}
