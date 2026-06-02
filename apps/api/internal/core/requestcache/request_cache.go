package requestcache

import (
	"context"
	"sync"
)

type requestCacheKeyType struct{}

var RequestCacheKey = requestCacheKeyType{}

type RequestCache struct {
	mu   sync.RWMutex
	data map[string]interface{}
}

func NewRequestCache() *RequestCache {
	return &RequestCache{
		data: make(map[string]interface{}),
	}
}

func (c *RequestCache) Get(key string) (interface{}, bool) {
	if c == nil {
		return nil, false
	}
	c.mu.RLock()
	defer c.mu.RUnlock()
	val, ok := c.data[key]
	return val, ok
}

func (c *RequestCache) Set(key string, val interface{}) {
	if c == nil {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data[key] = val
}

// Get retrieves the RequestCache from context
func Get(ctx context.Context) *RequestCache {
	if ctx == nil {
		return nil
	}
	if cache, ok := ctx.Value(RequestCacheKey).(*RequestCache); ok {
		return cache
	}
	return nil
}

// WithRequestCache returns a new context with a new RequestCache if not already present
func WithRequestCache(ctx context.Context) context.Context {
	if ctx == nil {
		return nil
	}
	if Get(ctx) != nil {
		return ctx
	}
	return context.WithValue(ctx, RequestCacheKey, NewRequestCache())
}
