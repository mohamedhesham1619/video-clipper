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
	if downloadProcess.DownloadPath != "" {
		if err := os.Remove(downloadProcess.DownloadPath); err != nil && !os.IsNotExist(err) {
			slog.Error("Error removing downloaded file", "error", err, "filePath", downloadProcess.DownloadPath)
		}
	}

	// Remove the download process from the processes map
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
		return
	}

	downloadProcess.IsCancelled = true

	ffmpegProcess := downloadProcess.FFmpegProcess
	ytdlpProcess := downloadProcess.YtDlpProcess

	var wasFFmpegRunning, wasYtdlpRunning bool
	var err error

	if ffmpegProcess != nil {
		wasFFmpegRunning, err = stopProcessIfRunning(ffmpegProcess)
		if err != nil {
			slog.Error("Failed to stop ffmpeg process", "error", err, "processID", processID)
		}
	}

	if ytdlpProcess != nil {
		wasYtdlpRunning, err = stopProcessIfRunning(ytdlpProcess)
		if err != nil {
			slog.Error("Failed to stop yt-dlp process", "error", err, "processID", processID)
		}
	}

	// If either process was running and stopped successfully, it's a true cancellation, so clean up.
	// If neither was running, the download process was already complete, so we let the submit handler clean up.
	if wasFFmpegRunning || wasYtdlpRunning {
		s.cleanupDownloadProcess(processID)
		slog.Warn("Download process stopped and resources cleaned up", "processID", processID)
	} else {
		slog.Info("Download process already finished; no need to stop or clean up", "processID", processID)
	}

}

// StopProcessIfRunning stops the process if it is still running.
// Returns true and nil if the process was running and stopped successfully.
// Returns true and error if the process was running but could not be stopped.
// Returns false and nil if the process was not running (already finished or nil).
func stopProcessIfRunning(process *exec.Cmd) (bool, error) {
	if process == nil {
		return false, nil
	}
	if process.ProcessState == nil || !process.ProcessState.Exited() {
		if err := process.Process.Kill(); err != nil {
			// If we can't stop the process, return true and the error
			return true, err
		}

		// Reap the process to ensures we don't leave any zombie processes
		// We don't care about the error here since we killed it
		_ = process.Wait()

		return true, nil
	}

	return false, nil
}

var data = &sharedData{
	downloadProcesses: make(map[string]*models.DownloadProcess),
	mu:                sync.RWMutex{},
}
