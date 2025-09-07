import { useEffect } from 'react';

const SubmitReview = () => {
  useEffect(() => {
    // Set the document title
    document.title = 'Submit Your Review';
  }, []);

  return (
    <div dangerouslySetInnerHTML={{
      __html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Submit Your Review</title>
    <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #ffffff;
            color: #000000;
            line-height: 1.6;
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 520px;
            margin: 0 auto;
            padding-top: 40px;
        }

        .header {
            text-align: center;
            margin-bottom: 48px;
        }

        .header h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 12px;
            color: #000000;
            letter-spacing: -0.025em;
        }

        .header p {
            font-size: 18px;
            color: #666666;
            font-weight: 400;
        }

        .progress-container {
            margin-bottom: 48px;
        }

        .progress-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .progress-step {
            font-size: 15px;
            font-weight: 600;
            color: #000000;
        }

        .progress-label {
            font-size: 14px;
            color: #666666;
            font-weight: 500;
        }

        .progress-bar {
            width: 100%;
            height: 6px;
            background: #f5f5f5;
            border-radius: 3px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #000000 0%, #333333 100%);
            transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            width: 16.66%;
        }

        .card {
            background: #ffffff;
            border: 1.5px solid #e8e8e8;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
        }

        .step {
            min-height: 480px;
            display: flex;
            flex-direction: column;
        }

        .step-hidden {
            display: none !important;
        }

        .step-header {
            text-align: center;
            margin-bottom: 40px;
        }

        .step-icon {
            width: 64px;
            height: 64px;
            background: #000000;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
        }

        .step-icon svg {
            width: 28px;
            height: 28px;
            color: #ffffff;
        }

        .step-title {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            color: #000000;
            letter-spacing: -0.025em;
        }

        .step-subtitle {
            font-size: 16px;
            color: #666666;
            font-weight: 500;
        }

        .form-group {
            margin-bottom: 32px;
        }

        .form-label {
            display: block;
            font-size: 15px;
            font-weight: 600;
            color: #000000;
            margin-bottom: 12px;
        }

        .form-input {
            width: 100%;
            padding: 16px 20px;
            border: 1.5px solid #e0e0e0;
            border-radius: 12px;
            font-size: 16px;
            color: #000000;
            background: #ffffff;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 500;
        }

        .form-input:focus {
            outline: none;
            border-color: #000000;
            box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
        }

        .form-help {
            font-size: 13px;
            color: #666666;
            margin-top: 8px;
            font-weight: 500;
        }

        .button-group {
            display: flex;
            gap: 16px;
            margin-top: auto;
        }

        .btn {
            flex: 1;
            padding: 16px 32px;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            letter-spacing: -0.025em;
        }

        .btn-primary {
            background: #000000;
            color: #ffffff;
        }

        .btn-primary:hover:not(:disabled) {
            background: #333333;
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .btn-secondary {
            background: #ffffff;
            color: #000000;
            border: 1.5px solid #e0e0e0;
        }

        .btn-secondary:hover {
            background: #fafafa;
            border-color: #d0d0d0;
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
        }

        .upload-area {
            border: 2px dashed #d4d4d4;
            border-radius: 12px;
            padding: 48px 24px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            margin-bottom: 24px;
            position: relative;
        }

        .upload-area:hover {
            border-color: #000000;
            background: #fafafa;
            transform: translateY(-2px);
        }

        .upload-area.dragover {
            border-color: #000000;
            background: #f5f5f5;
            transform: scale(1.02);
        }

        .upload-icon {
            width: 56px;
            height: 56px;
            margin: 0 auto 20px;
            opacity: 0.7;
        }

        .upload-text {
            font-size: 18px;
            font-weight: 600;
            color: #000000;
            margin-bottom: 8px;
        }

        .upload-subtext {
            font-size: 14px;
            color: #666666;
            font-weight: 500;
        }

        .upload-options {
            display: flex;
            gap: 12px;
            justify-content: center;
            margin-top: 20px;
        }

        .upload-option {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            background: #f8f8f8;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            color: #333333;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .upload-option:hover {
            background: #f0f0f0;
            border-color: #d0d0d0;
        }

        .upload-option svg {
            width: 16px;
            height: 16px;
        }

        .upload-progress-container {
            width: 100%;
            max-width: 300px;
            margin: 0 auto;
        }

        .upload-progress-bar {
            width: 100%;
            height: 8px;
            background: #f0f0f0;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 12px;
        }

        .upload-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #000000 0%, #333333 100%);
            transition: width 0.3s ease;
            width: 0%;
        }

        .upload-progress-text {
            text-align: center;
            font-size: 14px;
            color: #666666;
            font-weight: 500;
        }

        .recording-controls {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            margin-top: 24px;
        }

        .record-button {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            border: 4px solid #ff4444;
            background: #ffffff;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            position: relative;
        }

        .record-button:hover {
            transform: scale(1.05);
        }

        .record-button.recording {
            background: #ff4444;
            animation: pulse 1.5s infinite;
        }

        .record-button.recording::after {
            content: '';
            width: 24px;
            height: 24px;
            background: #ffffff;
            border-radius: 4px;
        }

        .record-button:not(.recording)::after {
            content: '';
            width: 32px;
            height: 32px;
            background: #ff4444;
            border-radius: 50%;
        }

        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.4); }
            70% { box-shadow: 0 0 0 20px rgba(255, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); }
        }

        .recording-time {
            font-size: 18px;
            font-weight: 600;
            color: #ff4444;
        }

        .preview-media {
            width: 100%;
            max-width: 280px;
            height: auto;
            border-radius: 12px;
            margin: 0 auto 20px;
            display: block;
        }

        .success-state {
            text-align: center;
        }

        .success-icon {
            width: 56px;
            height: 56px;
            background: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
        }

        .success-icon svg {
            width: 28px;
            height: 28px;
            color: #ffffff;
        }

        .success-text {
            font-size: 16px;
            font-weight: 600;
            color: #10b981;
        }

        .profile-section {
            text-align: center;
            margin-bottom: 40px;
        }

        .profile-preview {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid #e8e8e8;
            margin-bottom: 20px;
            transition: border-color 0.3s ease;
        }

        .profile-preview:hover {
            border-color: #000000;
        }

        .form-input.with-prefix {
            padding-left: 48px;
        }

        .input-wrapper {
            position: relative;
        }

        .input-prefix {
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            font-weight: 600;
            color: #666666;
            font-size: 16px;
        }

        .form-textarea {
            width: 100%;
            padding: 16px 20px;
            border: 1.5px solid #e0e0e0;
            border-radius: 12px;
            font-size: 16px;
            color: #000000;
            background: #ffffff;
            resize: vertical;
            min-height: 120px;
            font-family: inherit;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 500;
        }

        .form-textarea:focus {
            outline: none;
            border-color: #000000;
            box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
        }

        .char-count {
            font-size: 13px;
            color: #666666;
            text-align: right;
            margin-top: 8px;
            font-weight: 500;
        }

        .star-rating {
            display: flex;
            justify-content: center;
            gap: 12px;
            margin-bottom: 40px;
        }

        .star-rating input {
            display: none;
        }

        .star-rating label {
            font-size: 36px;
            color: #e0e0e0;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            user-select: none;
        }

        .star-rating label:hover,
        .star-rating label:hover ~ label,
        .star-rating input:checked ~ label {
            color: #ffc107;
            transform: scale(1.1);
        }

        .preview-card {
            background: #fafafa;
            border: 1.5px solid #e8e8e8;
            border-radius: 12px;
            padding: 32px;
            text-align: center;
            margin-bottom: 32px;
        }

        .preview-stars {
            font-size: 24px;
            color: #ffc107;
            margin-bottom: 16px;
        }

        .preview-text {
            font-size: 16px;
            color: #333333;
            margin-bottom: 20px;
            font-style: italic;
            line-height: 1.5;
        }

        .preview-user {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
        }

        .preview-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
        }

        .preview-handle {
            font-size: 16px;
            font-weight: 600;
            color: #000000;
        }

        .btn-upload {
            background: #f8f8f8;
            color: #000000;
            border: 1.5px solid #e0e0e0;
            padding: 12px 24px;
            font-size: 14px;
            font-weight: 600;
        }

        .btn-upload:hover {
            background: #f0f0f0;
            border-color: #d0d0d0;
        }

        .loading {
            display: inline-flex;
            align-items: center;
            gap: 12px;
        }

        .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid transparent;
            border-top: 2px solid currentColor;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
            backdrop-filter: blur(4px);
        }

        .modal-content {
            background: #ffffff;
            border-radius: 20px;
            padding: 40px;
            max-width: 420px;
            width: 100%;
            text-align: center;
        }

        .modal-icon {
            width: 64px;
            height: 64px;
            background: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
        }

        .modal-title {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 12px;
            color: #000000;
        }

        .modal-text {
            font-size: 16px;
            color: #666666;
            margin-bottom: 32px;
            font-weight: 500;
        }

        @media (max-width: 600px) {
            .container {
                padding: 20px 16px;
            }
            
            .card {
                padding: 32px 24px;
            }
            
            .header h1 {
                font-size: 28px;
            }
            
            .step-title {
                font-size: 24px;
            }

            .upload-options {
                flex-direction: column;
            }

            .button-group {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>Submit Your Review</h1>
            <p>Share your experience and help others make informed decisions</p>
        </div>

        <!-- Progress -->
        <div class="progress-container">
            <div class="progress-info">
                <span class="progress-step">Step <span id="current-step">1</span> of 6</span>
                <span class="progress-label" id="step-label">Email Verification</span>
            </div>
            <div class="progress-bar">
                <div id="progress-fill" class="progress-fill"></div>
            </div>
        </div>

        <!-- Form Card -->
        <div class="card">
            <form id="review-form">
                
                <!-- Step 1: Email Verification -->
                <div id="step-1" class="step">
                    <div class="step-header">
                        <div class="step-icon">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/>
                            </svg>
                        </div>
                        <h2 class="step-title">Email Verification</h2>
                        <p class="step-subtitle">Please provide your email address to begin the review submission</p>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <input type="email" id="user-email" class="form-input" 
                               placeholder="your@email.com" oninput="validateEmail()" required>
                        <div class="form-help">We'll use this to track your submission and send updates</div>
                    </div>
                    
                    <div class="button-group">
                        <button type="button" class="btn btn-primary" onclick="nextStep()" id="step1-next" disabled>
                            Continue
                        </button>
                    </div>
                </div>

                <!-- Step 2: Upload Media -->
                <div id="step-2" class="step step-hidden">
                    <div class="step-header">
                        <div class="step-icon">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                            </svg>
                        </div>
                        <h2 class="step-title">Upload Your Media</h2>
                        <p class="step-subtitle">Share a video, image, or GIF that showcases your experience</p>
                    </div>
                    
                    <div class="upload-area" id="media-upload-area">
                        <div id="upload-prompt">
                            <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                            </svg>
                            <div class="upload-text">Drop your file here or click to browse</div>
                            <div class="upload-subtext">JPG, PNG, GIF, MP4, MOV • Max 50MB</div>
                            
                            <div class="upload-options">
                                <div class="upload-option" onclick="document.getElementById('media-file').click()">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                                    </svg>
                                    Upload File
                                </div>
                                <div class="upload-option" onclick="startRecording()">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                    </svg>
                                    Record Video
                                </div>
                            </div>
                        </div>
                        
                        <div id="upload-progress" style="display: none;">
                            <div class="upload-progress-container">
                                <div class="upload-progress-bar">
                                    <div id="upload-progress-fill" class="upload-progress-fill"></div>
                                </div>
                                <div class="upload-progress-text">
                                    Uploading... <span id="upload-percent">0%</span>
                                </div>
                            </div>
                        </div>
                        
                        <div id="recording-interface" style="display: none;">
                            <video id="camera-preview" autoplay muted style="width: 100%; max-width: 300px; border-radius: 12px; margin-bottom: 20px;"></video>
                            <div class="recording-controls">
                                <div class="record-button" id="record-button" onclick="toggleRecording()"></div>
                                <div class="recording-time" id="recording-time" style="display: none;">00:00</div>
                                <div style="display: flex; gap: 12px;">
                                    <button type="button" class="btn btn-secondary" onclick="stopCamera()" style="flex: none; padding: 8px 16px;">Cancel</button>
                                    <button type="button" class="btn btn-primary" id="use-recording" onclick="useRecording()" style="flex: none; padding: 8px 16px; display: none;">Use Recording</button>
                                </div>
                            </div>
                        </div>
                        
                        <div id="upload-success" style="display: none;">
                            <div class="success-state">
                                <div class="success-icon">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                    </svg>
                                </div>
                                <div class="success-text">Media uploaded successfully!</div>
                                <video id="uploaded-preview" class="preview-media" style="display: none; margin-top: 16px;" muted controls></video>
                                <img id="uploaded-image" class="preview-media" style="display: none; margin-top: 16px;" alt="Uploaded media">
                            </div>
                        </div>
                    </div>
                    
                    <input type="file" id="media-file" accept="image/jpeg,image/jpg,image/png,image/gif,video/mp4,video/mov,video/quicktime" style="display: none;">
                    <input type="hidden" id="media-url">
                    <input type="hidden" id="media-type">
                    
                    <div class="button-group">
                        <button type="button" class="btn btn-secondary" onclick="prevStep()">
                            Back
                        </button>
                        <button type="button" class="btn btn-primary" onclick="nextStep()" id="step2-next" disabled>
                            Continue
                        </button>
                    </div>
                </div>

                <!-- Step 3: Profile Picture -->
                <div id="step-3" class="step step-hidden">
                    <div class="step-header">
                        <div class="step-icon">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                        </div>
                        <h2 class="step-title">Profile Picture</h2>
                        <p class="step-subtitle">Add your photo so people know who's behind this review</p>
                    </div>
                    
                    <div class="profile-section">
                        <img id="profile-preview" 
                             src="https://ui-avatars.com/api/?name=You&background=000000&color=ffffff&size=240" 
                             class="profile-preview" alt="Profile">
                        <div>
                            <button type="button" class="btn btn-upload" onclick="document.getElementById('profile-file').click()">
                                Choose Photo
                            </button>
                            <div class="form-help">JPG, PNG, or GIF • Max 5MB</div>
                        </div>
                    </div>
                    
                    <input type="file" id="profile-file" accept="image/jpeg,image/jpg,image/png,image/gif" style="display: none;">
                    <input type="hidden" id="profile-url">
                    
                    <div class="button-group">
                        <button type="button" class="btn btn-secondary" onclick="prevStep()">
                            Back
                        </button>
                        <button type="button" class="btn btn-primary" onclick="nextStep()" id="step3-next" disabled>
                            Continue
                        </button>
                    </div>
                </div>

                <!-- Step 4: Instagram Handle -->
                <div id="step-4" class="step step-hidden">
                    <div class="step-header">
                        <div class="step-icon">
                            <svg fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                        </div>
                        <h2 class="step-title">Instagram Handle</h2>
                        <p class="step-subtitle">Connect your review to your Instagram profile</p>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Instagram Username</label>
                        <div class="input-wrapper">
                            <div class="input-prefix">@</div>
                            <input type="text" id="instagram-handle" class="form-input with-prefix" 
                                   placeholder="yourusername" oninput="validateInstagram()">
                        </div>
                        <div class="form-help">Enter your username without the @ symbol</div>
                    </div>
                    
                    <div class="button-group">
                        <button type="button" class="btn btn-secondary" onclick="prevStep()">
                            Back
                        </button>
                        <button type="button" class="btn btn-primary" onclick="nextStep()" id="step4-next" disabled>
                            Continue
                        </button>
                    </div>
                </div>

                <!-- Step 5: Rating & Review -->
                <div id="step-5" class="step step-hidden">
                    <div class="step-header">
                        <div class="step-icon">
                            <svg fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                        </div>
                        <h2 class="step-title">Rate & Review</h2>
                        <p class="step-subtitle">Share your honest thoughts and experience</p>
                    </div>
                    
                    <div class="star-rating">
                        <input type="radio" id="star5" name="rating" value="5">
                        <label for="star5">★</label>
                        <input type="radio" id="star4" name="rating" value="4">
                        <label for="star4">★</label>
                        <input type="radio" id="star3" name="rating" value="3">
                        <label for="star3">★</label>
                        <input type="radio" id="star2" name="rating" value="2">
                        <label for="star2">★</label>
                        <input type="radio" id="star1" name="rating" value="1">
                        <label for="star1">★</label>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Your Review</label>
                        <textarea id="review-text" class="form-textarea" 
                                  placeholder="Tell us about your experience with our product. What did you love? How did it help you?" 
                                  oninput="validateReview()"></textarea>
                        <div class="char-count">
                            <span id="char-count">0</span> characters (minimum 10)
                        </div>
                    </div>
                    
                    <div class="button-group">
                        <button type="button" class="btn btn-secondary" onclick="prevStep()">
                            Back
                        </button>
                        <button type="button" class="btn btn-primary" onclick="nextStep()" id="step5-next" disabled>
                            Review & Submit
                        </button>
                    </div>
                </div>

                <!-- Step 6: Review & Submit -->
                <div id="step-6" class="step step-hidden">
                    <div class="step-header">
                        <div class="step-icon">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <h2 class="step-title">Review Your Submission</h2>
                        <p class="step-subtitle">Make sure everything looks perfect before submitting</p>
                    </div>
                    
                    <div class="preview-card">
                        <div id="review-preview">
                            <!-- Will be populated by JavaScript -->
                        </div>
                    </div>
                    
                    <div class="button-group">
                        <button type="button" class="btn btn-secondary" onclick="prevStep()">
                            Back
                        </button>
                        <button type="submit" class="btn btn-primary" id="submit-btn">
                            <span id="submit-text">Submit Review</span>
                            <span id="submit-loading" class="loading" style="display: none;">
                                <span class="spinner"></span>
                                Submitting...
                            </span>
                        </button>
                    </div>
                </div>

            </form>
        </div>
    </div>

    <!-- Success Modal -->
    <div id="success-modal" class="modal">
        <div class="modal-content">
            <div class="modal-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
            </div>
            <h3 class="modal-title">Review Submitted!</h3>
            <p class="modal-text">Thank you for sharing your experience. We'll review it and publish it soon.</p>
            <button class="btn btn-primary" onclick="resetForm()">Submit Another Review</button>
        </div>
    </div>

    <script>
        // Supabase Configuration
        const SUPABASE_URL = 'https://mixifcnokcmxarpzwfiy.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1peGlmY25va2NteGFycHp3Zml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NjYwNTEsImV4cCI6MjA2OTA0MjA1MX0.-4uIuzcHcDGS20-dtKbjVFOtpBSmwYhT9Bgt6KA-dXI';
        
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        let currentStep = 1;
        let mediaRecorder = null;
        let recordedChunks = [];
        let isRecording = false;
        let recordingTimer = null;
        let recordingSeconds = 0;
        let stream = null;

        const stepLabels = ['Email Verification', 'Upload Media', 'Profile Picture', 'Instagram Handle', 'Rate & Review', 'Submit'];

        // Email Validation
        function validateEmail() {
            const email = document.getElementById('user-email').value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isValid = emailRegex.test(email);
            document.getElementById('step1-next').disabled = !isValid;
        }

        // Navigation
        function nextStep() {
            if (currentStep < 6) {
                document.getElementById(\`step-\${currentStep}\`).classList.add('step-hidden');
                currentStep++;
                document.getElementById(\`step-\${currentStep}\`).classList.remove('step-hidden');
                updateProgress();
                if (currentStep === 6) generatePreview();
            }
        }

        function prevStep() {
            if (currentStep > 1) {
                document.getElementById(\`step-\${currentStep}\`).classList.add('step-hidden');
                currentStep--;
                document.getElementById(\`step-\${currentStep}\`).classList.remove('step-hidden');
                updateProgress();
            }
        }

        function updateProgress() {
            document.getElementById('current-step').textContent = currentStep;
            document.getElementById('step-label').textContent = stepLabels[currentStep - 1];
            document.getElementById('progress-fill').style.width = (currentStep / 6) * 100 + '%';
        }

        // Camera and Recording
        async function startRecording() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: 1280, height: 720 }, 
                    audio: true 
                });
                
                const video = document.getElementById('camera-preview');
                video.srcObject = stream;
                
                document.getElementById('upload-prompt').style.display = 'none';
                document.getElementById('recording-interface').style.display = 'block';
                
                mediaRecorder = new MediaRecorder(stream);
                recordedChunks = [];
                
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        recordedChunks.push(event.data);
                    }
                };
                
                mediaRecorder.onstop = () => {
                    const blob = new Blob(recordedChunks, { type: 'video/mp4' });
                    handleRecordedVideo(blob);
                };
                
            } catch (error) {
                alert('Camera access failed: ' + error.message);
            }
        }

        function toggleRecording() {
            if (!isRecording) {
                // Start recording
                mediaRecorder.start();
                isRecording = true;
                recordingSeconds = 0;
                
                document.getElementById('record-button').classList.add('recording');
                document.getElementById('recording-time').style.display = 'block';
                
                recordingTimer = setInterval(() => {
                    recordingSeconds++;
                    const minutes = Math.floor(recordingSeconds / 60);
                    const seconds = recordingSeconds % 60;
                    document.getElementById('recording-time').textContent = 
                        \`\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;
                }, 1000);
            } else {
                // Stop recording
                mediaRecorder.stop();
                isRecording = false;
                
                document.getElementById('record-button').classList.remove('recording');
                document.getElementById('recording-time').style.display = 'none';
                document.getElementById('use-recording').style.display = 'block';
                
                if (recordingTimer) {
                    clearInterval(recordingTimer);
                }
            }
        }

        async function handleRecordedVideo(blob) {
            const file = new File([blob], \`recorded_video_\${Date.now()}.mp4\`, { type: 'video/mp4' });
            await handleMediaUpload(file);
        }

        function useRecording() {
            stopCamera();
            document.getElementById('step2-next').disabled = false;
        }

        function stopCamera() {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            
            document.getElementById('upload-prompt').style.display = 'block';
            document.getElementById('recording-interface').style.display = 'none';
            document.getElementById('use-recording').style.display = 'none';
        }

        // File Upload Setup
        function setupFileUpload() {
            const uploadArea = document.getElementById('media-upload-area');
            const fileInput = document.getElementById('media-file');
            const profileInput = document.getElementById('profile-file');

            uploadArea.addEventListener('click', (e) => {
                if (e.target.closest('.upload-option')) return;
                fileInput.click();
            });
            
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            
            uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) handleMediaUpload(e.dataTransfer.files[0]);
            });

            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) handleMediaUpload(e.target.files[0]);
            });

            profileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) handleProfileUpload(e.target.files[0]);
            });
        }

        // Media Upload with Progress
        async function handleMediaUpload(file) {
            if (file.size > 50 * 1024 * 1024) {
                alert('File too large. Maximum size is 50MB.');
                return;
            }

            const allowedTypes = [
                'video/mp4', 'video/mov', 'video/quicktime',
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif'
            ];
            
            if (!allowedTypes.includes(file.type)) {
                alert('Invalid file type. Please use JPG, PNG, GIF, MP4, or MOV.');
                return;
            }

            document.getElementById('upload-prompt').style.display = 'none';
            document.getElementById('recording-interface').style.display = 'none';
            document.getElementById('upload-progress').style.display = 'block';

            try {
                const timestamp = Date.now();
                const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const fileName = \`media_\${timestamp}_\${cleanName}\`;
                
                // Simulate upload progress
                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress += Math.random() * 15;
                    if (progress > 85) progress = 85;
                    
                    document.getElementById('upload-progress-fill').style.width = progress + '%';
                    document.getElementById('upload-percent').textContent = Math.round(progress) + '%';
                }, 200);
                
                const { data, error } = await supabase.storage
                    .from('reviews')
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                clearInterval(progressInterval);
                
                // Complete progress
                document.getElementById('upload-progress-fill').style.width = '100%';
                document.getElementById('upload-percent').textContent = '100%';

                if (error) throw error;

                const { data: { publicUrl } } = supabase.storage
                    .from('reviews')
                    .getPublicUrl(fileName);

                document.getElementById('media-url').value = publicUrl;
                document.getElementById('media-type').value = file.type.startsWith('video') ? 'video' : 'image';
                
                setTimeout(() => {
                    document.getElementById('upload-progress').style.display = 'none';
                    document.getElementById('upload-success').style.display = 'block';
                    
                    // Show preview
                    if (file.type.startsWith('video')) {
                        const video = document.getElementById('uploaded-preview');
                        video.src = publicUrl;
                        video.style.display = 'block';
                    } else {
                        const img = document.getElementById('uploaded-image');
                        img.src = publicUrl;
                        img.style.display = 'block';
                    }
                    
                    document.getElementById('step2-next').disabled = false;
                }, 500);

            } catch (error) {
                clearInterval(progressInterval);
                alert('Upload failed: ' + error.message);
                document.getElementById('upload-progress').style.display = 'none';
                document.getElementById('upload-prompt').style.display = 'block';
            }
        }

        // Profile Upload
        async function handleProfileUpload(file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Profile picture too large. Maximum size is 5MB.');
                return;
            }

            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                alert('Please choose a JPG, PNG, or GIF file.');
                return;
            }

            try {
                const timestamp = Date.now();
                const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const fileName = \`profile_\${timestamp}_\${cleanName}\`;
                
                const { data, error } = await supabase.storage
                    .from('reviews')
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (error) throw error;

                const { data: { publicUrl } } = supabase.storage
                    .from('reviews')
                    .getPublicUrl(fileName);

                document.getElementById('profile-url').value = publicUrl;
                document.getElementById('profile-preview').src = publicUrl;
                document.getElementById('step3-next').disabled = false;

            } catch (error) {
                alert('Profile upload failed: ' + error.message);
            }
        }

        // Validation
        function validateInstagram() {
            const handle = document.getElementById('instagram-handle').value.trim();
            const isValid = handle.length >= 1 && handle.match(/^[a-zA-Z0-9._]+$/);
            document.getElementById('step4-next').disabled = !isValid;
        }

        function validateReview() {
            const text = document.getElementById('review-text').value.trim();
            const rating = document.querySelector('input[name="rating"]:checked');
            document.getElementById('char-count').textContent = text.length;
            document.getElementById('step5-next').disabled = !(text.length >= 10 && rating);
        }

        // Generate Preview
        function generatePreview() {
            const mediaUrl = document.getElementById('media-url').value;
            const mediaType = document.getElementById('media-type').value;
            const profileUrl = document.getElementById('profile-url').value;
            const instagram = document.getElementById('instagram-handle').value;
            const rating = document.querySelector('input[name="rating"]:checked')?.value || 0;
            const description = document.getElementById('review-text').value;

            const mediaHTML = mediaType === 'video' ? 
                \`<video src="\${mediaUrl}" class="preview-media" muted controls></video>\` :
                \`<img src="\${mediaUrl}" class="preview-media" alt="Review">\`;

            const starsHTML = '★'.repeat(rating) + '☆'.repeat(5 - rating);

            document.getElementById('review-preview').innerHTML = \`
                \${mediaHTML}
                <div class="preview-stars">\${starsHTML}</div>
                <div class="preview-text">"\${description}"</div>
                <div class="preview-user">
                    <img src="\${profileUrl}" class="preview-avatar" alt="Profile">
                    <div class="preview-handle">@\${instagram}</div>
                </div>
            \`;
        }

        // Form Submission
        async function handleSubmit(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submit-btn');
            const submitText = document.getElementById('submit-text');
            const submitLoading = document.getElementById('submit-loading');
            
            submitBtn.disabled = true;
            submitText.style.display = 'none';
            submitLoading.style.display = 'flex';

            try {
                const formData = {
                    user_email: document.getElementById('user-email').value.trim(),
                    media_url: document.getElementById('media-url').value,
                    media_type: document.getElementById('media-type').value === 'video' ? 'video' : 'image',
                    rating: parseFloat(document.querySelector('input[name="rating"]:checked').value),
                    description: document.getElementById('review-text').value.trim(),
                    user_avatar: document.getElementById('profile-url').value,
                    user_instagram_handle: '@' + document.getElementById('instagram-handle').value.trim(),
                    status: 'pending',
                    is_active: false,
                    sort_order: 0,
                    submitted_at: new Date().toISOString()
                };

                const { error } = await supabase.from('reviews').insert([formData]);
                if (error) throw error;

                document.getElementById('success-modal').style.display = 'flex';

            } catch (error) {
                alert('Submission failed: ' + error.message);
            } finally {
                submitBtn.disabled = false;
                submitText.style.display = 'inline';
                submitLoading.style.display = 'none';
            }
        }

        // Reset Form
        function resetForm() {
            document.getElementById('success-modal').style.display = 'none';
            document.getElementById('review-form').reset();
            
            document.querySelectorAll('.step').forEach(step => step.classList.add('step-hidden'));
            document.getElementById('step-1').classList.remove('step-hidden');
            currentStep = 1;
            updateProgress();
            
            // Reset upload states
            document.getElementById('upload-prompt').style.display = 'block';
            document.getElementById('upload-progress').style.display = 'none';
            document.getElementById('upload-success').style.display = 'none';
            document.getElementById('recording-interface').style.display = 'none';
            document.getElementById('uploaded-preview').style.display = 'none';
            document.getElementById('uploaded-image').style.display = 'none';
            
            document.getElementById('profile-preview').src = 'https://ui-avatars.com/api/?name=You&background=000000&color=ffffff&size=240';
            
            ['step1-next', 'step2-next', 'step3-next', 'step4-next', 'step5-next'].forEach(id => {
                document.getElementById(id).disabled = true;
            });
            
            document.getElementById('char-count').textContent = '0';
            
            // Stop camera if running
            stopCamera();
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            setupFileUpload();
            
            document.querySelectorAll('.star-rating input').forEach(input => {
                input.addEventListener('change', validateReview);
            });
            
            document.getElementById('review-text').addEventListener('input', validateReview);
            document.getElementById('review-form').addEventListener('submit', handleSubmit);
        });
    </script>
</body>
</html>`
    }} />
  );
};

export default SubmitReview;