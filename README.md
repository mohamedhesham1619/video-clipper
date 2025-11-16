<div align="center">
  <h1 >✂️ Video Clipper</h1>
</div>

<p align="center">
  Simple tool to download only the parts you need from online videos.<br>
  Just paste a link, choose your timestamps, and let it handle the rest.
</p>

<p align="center">
  <a href="https://videoclipper.online">
    <img src="https://img.shields.io/badge/Start%20Clipping-%236f42c1?style=for-the-badge&logo=rocket&logoColor=white&labelColor=2c2f33" alt="Start Clipping" style="border-radius: 30px;"/>
  </a>
</p>

<p align="center">
  <img 
    src="https://img.shields.io/endpoint?url=https%3A%2F%2Fvideoclipper.online%2Fapi%2Fstats%2Fclips" 
    alt="Clips Created" 
  />
</p>

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Workflow Diagram](#system-workflow-diagram)
- [Infrastructure & Scaling](#infrastructure--scaling)
- [Key Design Decisions](#key-design-decisions)
  - [How rate limiting is implemented?](#how-rate-limiting-is-implemented)
  - [How `yt-dlp` frequent updates are handled?](#how-yt-dlp-frequent-updates-are-handled)



## Features
- **Clip Downloader** -  Extract and download any part of an online video by selecting start and end times.

- **GIF Maker** -  Select any part of an online video and download it as a GIF with adjustable width, FPS, speed, and loop count.

- **Wide Platform Support** - Works with [1000+ video sites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)

- **Live Progress Tracking** –  See real-time progress as your clip or GIF is being processed.  

- **Video Quality Options** – Choose from 480p up to 2K.  


## Tech Stack

- **UI Design**: [Visily](https://www.visily.ai/)
- **Frontend**: AI-Generated (HTML/CSS/JS)
- **Backend**: Go
- **Video Processing**: [yt-dlp](https://github.com/yt-dlp/yt-dlp), [ffmpeg](https://ffmpeg.org/)
- **Real-time Communication**: Server-Sent Events (SSE)
- **Infrastructure**: Docker, Amazon EC2, nginx, Let's Encrypt
- **CDN**: Cloudflare (caching & security), CloudFront (video delivery)
- **Data Storage**: Firestore (tracks created clips count)
- **Analytics**: Google Analytics and Microsoft Clarity


## System Workflow Diagram

The following diagram illustrates the end-to-end flow, from client submission to file download.

<br>

```mermaid
sequenceDiagram
  participant Client as Client
  participant Backend as Backend
  participant In-Memory Store as In-Memory Store

  %% Submit Phase
  Client ->> Backend: POST /submit (URL, start, end, quality)
  Backend -->> Backend: Start downloading & processing (yt-dlp + ffmpeg)
  Backend ->> In-Memory Store: Store process {ID, progress channel, file path}
  Backend ->> Client: Return { process ID }

  %% Progress Phase (SSE stream)
  Client ->> Backend: GET /progress/{process ID} (SSE)
  Backend ->> In-Memory Store: Read from process's progress channel

  %% SSE Events
  Backend -->> Client: SSE event: progress (periodic percentage updates)

  %% Completion / Error
  Backend -->> Client: SSE event: complete (includes download url)
  Backend -->> Client: SSE event: error (if any error occurred)

  
 
  %% Client Download
  Client ->> Backend: GET /download/{process ID}
  Backend ->> In-Memory Store: Get file path
  Backend ->> Client: Serve file for download

  Backend ->> In-Memory Store: Clean up resources

```

## Infrastructure & Scaling

Since launching in **July 2025**, the app has **gained users steadily**, requiring the **infrastructure to evolve to handle increasing traffic while minimizing costs by leveraging free tier resources**. This evolution occurred in multiple phases, each designed to meet the app’s needs at that stage.

<br>

### Phase 1 – Google Cloud Run
*Free tier: 50 CPU hours, 1 GB outbound data per month*  
<br>
The app initially ran on **Cloud Run** using autoscaling with a maximum of one instance, handling all tasks including downloading, serving, and cleaning up videos. 

This setup was sufficient for the first month’s traffic **(43 users)**, but as traffic increased in August **(246 users)**, data transfer grew significantly, **exceeding Cloud Run’s 1 GB outbound data limit** and leading to the transition to the next phase.

> **Note:** "Outbound data" refers to the amount of data sent from the server to users.

---

### Phase 2 – Cloud Run + Cloud Storage
*Free tier: Cloud Run (50 CPU hours, 1 GB outbound data) + Cloud Storage (100 GB outbound data) per month*  
<br>
To handle the increasing data transfer, **Cloud Storage was integrated alongside Cloud Run** to offload downloads and reduce bandwidth usage. The backend uploaded processed videos to Cloud Storage and returned their download URLs to clients, allowing them to download directly from Cloud Storage instead of through Cloud Run.

This setup took advantage of **Cloud Storage’s 100 GB of free outbound data**, which effectively handled bandwidth needs for September’s **942 users**. However, after 23 days, **CPU usage on Cloud Run exceeded the free tier limit**, prompting the transition to the next phase.


---

### Phase 3 – Amazon EC2 + CloudFront
*Free tier: EC2 (750 hours, 100 GB outbound data) + CloudFront (1 TB outbound data) per month*  
<br>
This is the **current phase of the project**. After exceeding **Cloud Run’s CPU time limit**, the backend was **migrated to Amazon EC2** to gain more control and avoid the execution time restrictions of serverless environments.  

**EC2 migration** solved execution limits, but **October traffic** **(3.5K users)** introduced **high outbound data demands**, which led to **CloudFront integration**.

While **CloudFront** provides multiple benefits—such as caching and faster content delivery to users—its primary benefit is **1 TB of free outbound data per month**, which effectively handles **bandwidth needs** for the growing traffic.

<br>

## Key Design Decisions

### How rate limiting is implemented?

The app initially used **IP-based rate limiting** to prevent abuse and control bandwidth usage, limiting each IP to **4 requests every 2 hours**.

However, testing showed that IP-based rate limiting alone is insufficient. For example, in this case, the user was able to bypass the limit, making **11 requests for the same video URL within 30 minutes using 3 different IPs**.

![Rate limit bypass example](https://res.cloudinary.com/ddozq3vu5/image/upload/q_auto/v1760038360/Screenshot_from_2025-10-09_21-52-09_ap973z.png)

<br>

To address this, a second layer of protection using a **browser fingerprint** was added:

- The fingerprint is generated from stable device and browser information, saved in the browser’s **local storage** and sent with each submit request.

- Each request must pass **both layers**:
  1. **IP layer**: checks if the client's IP has exceeded the rate limit.
  2. **Fingerprint layer**: checks if the device/browser fingerprint has exceeded the rate limit.

<br>

Here’s how the new setup behaves when a user has already reached the rate limit:

- **Case 1: Using a different browser on the same device**  
  → **Detected** by the **IP layer**  
  
  All browsers on the same network share the same public IP address, so even if the user switches browsers, the IP limit still applies.

- **Case 2: Changing IP (e.g., using a VPN) while using the same browser**  
  → **Detected** by the **fingerprint layer**  
  
  The fingerprint identifies the same device/browser regardless of IP, preventing users from bypassing the limit by switching networks or using a VPN.

- **Case 3: Changing both IP and browser**  
  → **Not fully detected**  
  
  The fingerprint is generated from browser-specific information, and different browsers on the same device can produce different fingerprints. This makes it appear as a new user.  
  This limitation is acceptable, as this case is relatively rare compared to the first two.

  <br>

While this **two-layer rate limit** effectively prevents abuse and helps control **bandwidth costs**, it applies the same restriction to all users — even those downloading very short clips.  


To make the system **fairer and more bandwidth-aware**, a **daily credit-based quota** was introduced.

Each user (tracked by both IP and fingerprint) now receives a **daily allowance of 30 credits**, refreshed every 24 hours. Credits are consumed based on the **duration and quality** of the requested clip:

| Quality | Cost per minute |
|:---------|:----------------|
| 480p | 0.25 credits |
| 720p | 0.5 credits |
| 1080p | 1.0 credit |
| 1440p (2K) | 2.0 credits |


The credit system merges the reliability of the old IP and fingerprint checks with a fairer, bandwidth-aware quota model — achieving the best of both worlds.

---

### How `yt-dlp` frequent updates are handled?

`yt-dlp` updates often to adapt to changes on video platforms, and an outdated version can cause downloads to fail. To handle this:

- The **Dockerfile always downloads the latest** `yt-dlp` when building the container.

- The system includes a **function responsible for managing `yt-dlp` updates**:
  - It **checks if a newer version is available**, and if so, **installs the update** to keep the local `yt-dlp` version updated.
  - It is **called after each failed download**, since a failure might be caused by an outdated version.
  - It is also **executed daily through an internal ticker**, ensuring regular updates even when no failures occur.


This setup ensures the **system automatically stays up-to-date with `yt-dlp`**, minimizing downtime caused by outdated versions.


