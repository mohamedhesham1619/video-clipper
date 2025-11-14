package credits

import (
	"fmt"
	"log/slog"
	"sync"
	"time"
)

// CreditsInfo holds the credit information for a user
type CreditsInfo struct {
	CreditsLeft float64
	ResetTime   time.Time
}

// HasEnoughCredits checks if the user has enough credits to perform the requested operation
func (ci *CreditsInfo) HasEnoughCredits(creditsCost float64) bool {
	return ci.CreditsLeft >= creditsCost
}


// CreditsStore holds the credit information for all users
type CreditsStore struct {
	// ipMap maps an IP address to its credits info
	ipMap map[string]CreditsInfo

	// fpMap maps a fingerprint to its credits info
	fpMap map[string]CreditsInfo

	// mu protects concurrent access to ipMap and fpMap
	mu sync.RWMutex

	// maxCredits is the maximum number of credits a user can have
	maxCredits float64

	// resetDuration is the duration after which credits reset
	resetDuration time.Duration
}

// NewCreditStore creates a new credit store
func NewCreditStore(maxCredits float64, resetDuration time.Duration) *CreditsStore {
	return &CreditsStore{
		ipMap:         make(map[string]CreditsInfo),
		fpMap:         make(map[string]CreditsInfo),
		maxCredits:    maxCredits,
		resetDuration: resetDuration,
	}
}

// GetUserCredits returns the credit info for an IP address or fingerprint if it exists
// If it doesn't exist, it will create a new user with the max credits and a proper reset time
func (cs *CreditsStore) GetUserCredits(ip string, fp string) CreditsInfo {

	creditsInfo, exists := cs.getIPCredits(ip)
	if exists {
		if creditsInfo.ResetTime.Before(time.Now()) {
			creditsInfo = cs.addNewUserCredits(ip, fp)
		}
		return creditsInfo
	}
	creditsInfo, exists = cs.getFPCredits(fp)
	if exists {
		if creditsInfo.ResetTime.Before(time.Now()) {
			creditsInfo = cs.addNewUserCredits(ip, fp)
		}
		return creditsInfo
	}
	creditsInfo = cs.addNewUserCredits(ip, fp)
	return creditsInfo
}

// getIPCredits returns the credit info for an IP address if it exists
// If it doesn't exist, it returns an empty CreditsInfo and false
func (cs *CreditsStore) getIPCredits(ip string) (CreditsInfo, bool) {
	cs.mu.RLock()
	creditsInfo, exists := cs.ipMap[ip]
	cs.mu.RUnlock()
	if !exists {
		return CreditsInfo{}, false
	}
	return creditsInfo, true
}

// getFPCredits returns the credit info for a fingerprint if it exists
// If it doesn't exist, it returns an empty CreditsInfo and false
func (cs *CreditsStore) getFPCredits(fp string) (CreditsInfo, bool) {
	cs.mu.RLock()
	creditsInfo, exists := cs.fpMap[fp]
	cs.mu.RUnlock()
	if !exists {
		return CreditsInfo{}, false
	}
	return creditsInfo, true
}

// addNewUserCredits adds new user credits for an IP and fingerprint
func (cs *CreditsStore) addNewUserCredits(ip string, fp string) CreditsInfo {

	creditInfo := CreditsInfo{
		CreditsLeft: cs.maxCredits,
		ResetTime:   time.Now().Add(cs.resetDuration),
	}

	cs.mu.Lock()
	cs.ipMap[ip] = creditInfo
	cs.fpMap[fp] = creditInfo
	cs.mu.Unlock()

	return creditInfo
}

// updateUserCredits updates the credit info for the user in both ip and fingerprint maps
func (cs *CreditsStore) updateUserCredits(ip string, fp string, creditInfo CreditsInfo) {
	cs.mu.Lock()
	cs.ipMap[ip] = creditInfo
	cs.fpMap[fp] = creditInfo
	cs.mu.Unlock()
}

func (cs *CreditsStore) DeductCredits(ip string, fp string, creditsCost float64) error {

	// Get user credits
	userCreditInfo := cs.GetUserCredits(ip, fp)
	if !userCreditInfo.HasEnoughCredits(creditsCost) {
		return fmt.Errorf("insufficient credits")
	}

	// Deduct credits
	userCreditInfo.CreditsLeft -= creditsCost

	// Update user credits in both ip and fingerprint maps
	cs.updateUserCredits(ip, fp, userCreditInfo)

	return nil
}

func (cs *CreditsStore) cleanUpExpiredCredits() {
	cs.mu.Lock()
	defer cs.mu.Unlock()

	now := time.Now()

	// Clean up expired credits from ip map
	for ip, creditInfo := range cs.ipMap {
		if creditInfo.ResetTime.Before(now) {
			delete(cs.ipMap, ip)
		}
	}

	// Clean up expired credits from fingerprint map
	for fp, creditInfo := range cs.fpMap {
		if creditInfo.ResetTime.Before(now) {
			delete(cs.fpMap, fp)
		}
	}
}

func (cs *CreditsStore) StartExpiredCreditsCleaner(interval time.Duration) {
	slog.Info("Cleaning up expired credits ... ")
	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			cs.cleanUpExpiredCredits()
		}
	}()
}
