package handlers

import (
	"clipper/internal/models"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"sync"
)

type sharedData struct {

	// fileIDs maps a unique process ID to the full path of the downloaded file.
	fileIDs map[string]string

	// progressTracker maps process IDs to their progress channels
	progressTracker map[string]chan models.ProgressEvent

	// processes maps process IDs to their ffmpeg *exec.Cmd
	// it is used to stop the ffmpeg process if the client disconnects
	processes map[string]*exec.Cmd

	// watcher will be used to see if the client is still connected and want to receive updates.
	// The watcher will be created in the submit handler and will be notified in the progress handler.
	// If the submit handler does not receive a notification from the progress handler within a certain time, it will assume that the client has disconnected and stop the download process.
	watcher map[string]chan struct{}

	// mu protects concurrent access to fileIDs, progressTracker, and processes.
	mu sync.RWMutex
}

func (s *sharedData) addFileID(fileID, filePath string) {
	s.mu.Lock()
	s.fileIDs[fileID] = filePath
	s.mu.Unlock()
}

func (s *sharedData) getFilePath(fileID string) (string, bool) {
	s.mu.RLock()
	filePath, exists := s.fileIDs[fileID]
	s.mu.RUnlock()
	return filePath, exists
}

func (s *sharedData) addWatcher(fileID string) {
	s.mu.Lock()
	s.watcher[fileID] = make(chan struct{})
	s.mu.Unlock()
}

func (s *sharedData) getWatcher(fileID string) (chan struct{}, bool) {
	s.mu.RLock()
	watcher, exists := s.watcher[fileID]
	s.mu.RUnlock()
	return watcher, exists
}

func (s *sharedData) notifyWatcher(fileID string) {
	s.mu.RLock()
	watcher, exists := s.watcher[fileID]
	s.mu.RUnlock()
	if exists {
		// Closing the channel will notify the watcher that is listening for the channel
		close(watcher)
	}
}

func (s *sharedData) removeWatcher(fileID string) {
	s.mu.Lock()
	delete(s.watcher, fileID)
	s.mu.Unlock()
}

func (s *sharedData) addProgressChannel(fileID string, channel chan models.ProgressEvent) {
	s.mu.Lock()
	s.progressTracker[fileID] = channel
	s.mu.Unlock()
}

func (s *sharedData) getProgressChannel(fileID string) (chan models.ProgressEvent, bool) {
	s.mu.RLock()
	channel, exists := s.progressTracker[fileID]
	s.mu.RUnlock()
	return channel, exists
}

func (s *sharedData) removeProgressChannel(fileID string) {
	s.mu.Lock()
	delete(s.progressTracker, fileID)
	s.mu.Unlock()
}

func (s *sharedData) removeFileID(fileID string) {
	s.mu.Lock()
	delete(s.fileIDs, fileID)
	s.mu.Unlock()
}

func (s *sharedData) addDownloadProcess(fileID string, cmd *exec.Cmd) {
	s.mu.Lock()
	s.processes[fileID] = cmd
	s.mu.Unlock()
}

func (s *sharedData) getDownloadProcess(fileID string) (*exec.Cmd, bool) {
	s.mu.RLock()
	cmd, exists := s.processes[fileID]
	s.mu.RUnlock()
	return cmd, exists
}

// StopDownloadProcessAndCleanUp stops the download process if it is still running and cleans up all associated resources.
// If the download process is not running, it does nothing.
func (s *sharedData) stopDownloadProcessAndCleanUp(fileID string) error {
	s.mu.RLock()
	cmd, exists := s.processes[fileID]
	s.mu.RUnlock()
	if exists {
		if cmd.ProcessState == nil || !cmd.ProcessState.Exited() {
			if err := cmd.Process.Kill(); err != nil {
				return fmt.Errorf("failed to kill process for fileID %s: %w", fileID, err)
			}
			s.cleanupAll(fileID) // Clean up all resources associated with this process
			slog.Warn("Download process stopped and resources cleaned up", "fileID", fileID)
		}
	}
	return nil
}

func (s *sharedData) removeDownloadProcess(fileID string) {
	s.mu.Lock()
	delete(s.processes, fileID)
	s.mu.Unlock()
}

func (s *sharedData) cleanupAll(fileID string) {
	filePath, _ := s.getFilePath(fileID)
	os.Remove(filePath)
	s.removeFileID(fileID)
	s.removeProgressChannel(fileID)
	s.removeDownloadProcess(fileID)
	s.removeWatcher(fileID)
}

var data = &sharedData{
	fileIDs:         make(map[string]string),
	progressTracker: make(map[string]chan models.ProgressEvent),
	processes:       make(map[string]*exec.Cmd),
	watcher:         make(map[string]chan struct{}),
	mu:              sync.RWMutex{},
}
