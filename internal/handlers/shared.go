package handlers

import (
	"clipper/internal/models"
	"log/slog"
	"os"
	"os/exec"
	"sync"
)

type sharedData struct {

	// downloadProcesses maps a unique process ID to the download process struct.
	downloadProcesses map[string]*models.DownloadProcess

	// mu protects concurrent access to downloadProcesses.
	mu sync.RWMutex
}

func (s *sharedData) addDownloadProcess(processID string, downloadProcess *models.DownloadProcess) {
	s.mu.Lock()
	s.downloadProcesses[processID] = downloadProcess
	s.mu.Unlock()
}

func (s *sharedData) getDownloadProcess(processID string) (*models.DownloadProcess, bool) {
	s.mu.RLock()
	downloadProcess, exists := s.downloadProcesses[processID]
	s.mu.RUnlock()
	return downloadProcess, exists
}

func (s *sharedData) removeDownloadProcess(processID string) {
	s.mu.Lock()
	delete(s.downloadProcesses, processID)
	s.mu.Unlock()
}

func (s *sharedData) notifyWatcher(processID string) {
	s.mu.RLock()
	downloadProcess, exists := s.downloadProcesses[processID]
	s.mu.RUnlock()
	if exists {
		// Closing the channel will notify the watcher that is listening for the channel
		close(downloadProcess.Watcher)
	}
}

// StopDownloadProcessAndCleanUp stops the download process if it is still running and cleans up all associated resources.
func (s *sharedData) stopDownloadProcessAndCleanUp(processID string) {
	downloadProcess, exists := s.getDownloadProcess(processID)
	if !exists {
		slog.Warn("Couldn't stop download process because it doesn't exist", "processID", processID)
		return
	}
	ffmpegProcess := downloadProcess.FFmpegProcess
	ytdlpProcess := downloadProcess.YtDlpProcess

	if err := stopProcessIfRunning(ffmpegProcess); err != nil {
		slog.Error("Failed to stop ffmpeg process", "error", err, "processID", processID)
	}
	if err := stopProcessIfRunning(ytdlpProcess); err != nil {
		slog.Error("Failed to stop yt-dlp process", "error", err, "processID", processID)
	}
	s.cleanUp(processID) // Clean up all resources associated with this process
	slog.Warn("Download process stopped and resources cleaned up", "processID", processID)
}

// StopProcessIfRunning stops the process if it is still running.
// If the process already finished or is nil, it does nothing.
func stopProcessIfRunning(process *exec.Cmd) error {
	if process == nil {
		return nil
	}
	if process.ProcessState == nil || !process.ProcessState.Exited() {
		return process.Process.Kill()
	}
	return nil
}

func (s *sharedData) cleanUp(processID string) {
	downloadProcess, exists := s.getDownloadProcess(processID)
	if exists {
		if downloadProcess.FilePath != "" {
			err := os.Remove(downloadProcess.FilePath)
			if err != nil {
				slog.Error("Failed to remove file", "error", err, "processID", processID, "filePath", downloadProcess.FilePath)
			}
		}
		s.removeDownloadProcess(processID)
		slog.Info("Download process cleaned up", "processID", processID)
	}
}

var data = &sharedData{
	downloadProcesses: make(map[string]*models.DownloadProcess),
	mu:                sync.RWMutex{},
}
