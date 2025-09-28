package models

import "os/exec"

type DownloadProcess struct {
	DownloadPath  string
	ProgressChan  chan ProgressEvent
	Watcher       chan struct{}
	YtDlpProcess  *exec.Cmd
	FFmpegProcess *exec.Cmd
	IsCancelled   bool
}

type EventName string

const (
	EventTypeTitle    EventName = "title"
	EventTypeProgress EventName = "progress"
	EventTypeComplete EventName = "complete"
	EventTypeError    EventName = "error"
)

type ProgressEvent struct {
	Event EventName
	Data  map[string]string
}

type VideoRequest struct {
	VideoURL  string `json:"videoUrl"`
	ClipStart string `json:"clipStart"`
	ClipEnd   string `json:"clipEnd"`
	Quality   string `json:"quality"`
}

type FeedbackRequest struct {
	Message string `json:"message"`
	Email   string `json:"email,omitempty"`
}

type FeedbackResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}
