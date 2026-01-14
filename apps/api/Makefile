.PHONY: build run test clean docker-build docker-run docker-up docker-down migrate seed deps

# Build the application
build:
	go build -o server ./cmd/api/main.go

# Run the application
run:
	go run cmd/api/main.go

# Run migrations (explicit, does not start server)
migrate:
	go run ./cmd/tools/migrate

# Run seeders (explicit, does not start server)
seed:
	go run ./cmd/tools/seed

# Run tests
test:
	go test ./...

# Clean build artifacts
clean:
	rm -f server
	go clean

# Build Docker image
docker-build:
	docker build -t crm-healthcare-api .

# Run Docker container
docker-run:
	docker run -p 8080:8080 crm-healthcare-api

# Start with docker-compose
docker-up:
	docker-compose up --build

# Stop docker-compose
docker-down:
	docker-compose down

# Download dependencies
deps:
	go mod download
	go mod tidy

