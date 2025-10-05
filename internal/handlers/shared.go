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

func (s *sharedData) cleanupDownloadProcess(processID string) {
	
	downloadProcess, exists := s.getDownloadProcess(processID)
	if !exists {
		slog.Warn("Couldn't cleanup download process because it doesn't exist", "processID", processID)
		return
	}

	// Remove the downloaded file
	if err := os.Remove(downloadProcess.DownloadPath); err != nil {
		slog.Error("Error removing download file", "error", err, "filePath", downloadProcess.DownloadPath)
	}
	
	s.mu.Lock()
	delete(s.downloadProcesses, processID)
	s.mu.Unlock()
}

// NotifyWatcher notifies the watcher that is listening for the channel
// Returns true if the watcher was already notified
func (s *sharedData) notifyWatcher(processID string) (alreadyNotified bool) {
	s.mu.RLock()
	downloadProcess, exists := s.downloadProcesses[processID]
	s.mu.RUnlock()

	// Only close the channel if it exists and is not already closed
	if exists && downloadProcess.Watcher != nil {
		// Closing the channel will notify the watcher that is listening for the channel
		close(downloadProcess.Watcher)

		// Set the watcher to nil so if the function is called again we know the watcher has already been notified
		// This prevents panic if the function is called more than once
		downloadProcess.Watcher = nil

		return false
	}
	
	return true
}

// StopDownloadProcessAndCleanUp stops the download process if it is still running and cleans up all associated resources.
// This function is called when the client disconnects (for example, if the user closes the browser tab)
// Users can close the browser tab while the process is still running or after the process has finished.
// If the download process is running, it will be stopped and all associated resources will be cleaned up.
// If the download process is finished, it will leave the cleanup to the submit handler to ensure that the file is not deleted before the user can download it.
func (s *sharedData) stopDownloadProcessAndCleanUp(processID string) {
	downloadProcess, exists := s.getDownloadProcess(processID)
	if !exists {
		slog.Warn("Couldn't stop download process because it doesn't exist", "processID", processID)
		return
	}

	downloadProcess.IsCancelled = true
	ffmpegProcess := downloadProcess.FFmpegProcess
	ytdlpProcess := downloadProcess.YtDlpProcess

	ffmpegStopped, err := stopProcessIfRunning(ffmpegProcess)
	if err != nil {
		slog.Error("Failed to stop ffmpeg process", "error", err, "processID", processID)
	}

	ytdlpStopped, err := stopProcessIfRunning(ytdlpProcess)
	if err != nil {
		slog.Error("Failed to stop yt-dlp process", "error", err, "processID", processID)
	}

	// If either process was running and was stopped, it's a true cancellation, so clean up.
	// If neither was running, the download process was already complete, so we let the submit handler clean up.
	if ffmpegStopped || ytdlpStopped {
		s.cleanupDownloadProcess(processID)
		slog.Warn("Download process stopped and resources cleaned up", "processID", processID)
	} else {
		slog.Info("Download process already finished; no need to stop or clean up", "processID", processID)
	}

}

// StopProcessIfRunning stops the process if it is still running.
// Returns true if the process was running and was stopped.
// Returns false if the process was not running (already finished or nil).
func stopProcessIfRunning(process *exec.Cmd) (bool, error) {
	if process == nil {
		return false, nil
	}
	if process.ProcessState == nil || !process.ProcessState.Exited() {
		return true, process.Process.Kill()
	}
	return false, nil
}

var data = &sharedData{
	downloadProcesses: make(map[string]*models.DownloadProcess),
	mu:                sync.RWMutex{},
}
