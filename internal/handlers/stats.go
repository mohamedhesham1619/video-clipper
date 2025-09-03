package handlers

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"cloud.google.com/go/firestore"
)

func StatsHandler(w http.ResponseWriter, r *http.Request) {
	projectID := os.Getenv("GC_PROJECT_ID")
	firestoreClient, err := firestore.NewClient(r.Context(), projectID)

	if err != nil {
		slog.Error("Error creating Firestore client, cannot get stats", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer firestoreClient.Close()

	// get the clips count from firestore
	doc, err := firestoreClient.Collection("stats").Doc("clips").Get(r.Context())
	if err != nil {
		slog.Error("Error getting stats from Firestore", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	clipsCount := doc.Data()["count"].(int64)

	w.Header().Set("Content-Type", "application/json")

	// response struct for the dynamic badge displayed on the github readme.
	type response struct {
		SchemaVersion int    `json:"schemaVersion"`
		Label         string `json:"label"`
		Message       string `json:"message"`
		Color         string `json:"color"`
		Style         string `json:"style"`
		LabelColor    string `json:"labelColor"`
	}

	// send the response
	json.NewEncoder(w).Encode(response{SchemaVersion: 1, Label: "Created Clips", Message: fmt.Sprintf("%d", clipsCount), Color: "007bff", Style: "for-the-badge", LabelColor: "2c2f33"})
}
