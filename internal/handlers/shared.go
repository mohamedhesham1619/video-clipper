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
	ffmpegProcess := downloadProcess.FFmpegProcess
	ytdlpProcess := downloadProcess.YtDlpProcess

	stopped, err := stopProcessIfRunning(ffmpegProcess)
	if !stopped {
		slog.Warn("Couldn't stop ffmpeg process, process is already finished or nil", "error", err, "processID", processID)
		return // Don't clean up resources if the process is already finished or nil
	}else if err != nil {
		slog.Error("Failed to stop ffmpeg process", "error", err, "processID", processID)
	}
	
	stopped, err = stopProcessIfRunning(ytdlpProcess)
	if !stopped {
		slog.Warn("Couldn't stop yt-dlp process, process is already finished or nil", "error", err, "processID", processID)
		return // Don't clean up resources if the process is already finished or nil
	}else if err != nil {
		slog.Error("Failed to stop yt-dlp process", "error", err, "processID", processID)
	}
	
	// If both processes were running and were stopped, clean up resources.
	s.cleanUp(processID) 
	slog.Warn("Download process stopped and resources cleaned up", "processID", processID)
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
