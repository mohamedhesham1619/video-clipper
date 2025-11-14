package models

import "os/exec"

type DownloadProcess struct {
	ID            string
	DownloadPath  string
	ProgressChan  chan ProgressEvent
	Watcher       chan struct{}
	YtDlpProcess  *exec.Cmd
	FFmpegProcess *exec.Cmd
	IsCancelled   bool
	NeededCredits float64
	UserIP        string
	UserFP        string
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

type ClipRequest struct {
	VideoURL  string `json:"videoUrl"`
	ClipStart string `json:"clipStart"`
	ClipEnd   string `json:"clipEnd"`
	Quality   int    `json:"quality"`
}

type GIFRequest struct {
	VideoURL   string  `json:"videoUrl"`
	VideoStart string  `json:"videoStart"`
	VideoEnd   string  `json:"videoEnd"`
	Width      int     `json:"width"`
	FPS        int     `json:"fps"`
	Loops      int     `json:"loops"`
	Speed      float64 `json:"speed"`
}
