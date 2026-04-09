/**
 * MomCareAI — Frontend JavaScript
 * Handles: voice input/output, API calls, UI updates, reminders
 */

// ═══════════════════════════════════════════════════════════
// CONSTANTS & STATE
// ═══════════════════════════════════════════════════════════
const API_BASE = 'https://hack.onrender.com';

let state = {
    isListening: false,
    recognition: null,
    synthesis: window.speechSynthesis,
    lastAnalysis: null,
    reminderInterval: null,
    chart: null,
    currentPage: 'dashboard'
};

const SAMPLE_PRESCRIPTIONS = {
    basic: `Dr. Sarah Johnson - City Medical Center
Patient: Jane Doe | Age: 28
Date: ${new Date().toLocaleDateString()}
Diagnosis: Upper Respiratory Infection + Iron Deficiency Anemia

1. Amoxicillin 500mg - Three times daily after meal for 7 days
2. Paracetamol 500mg - Twice daily after food for 5 days
3. Iron 325mg - Once daily before meal for 30 days
4. Vitamin C 500mg - Once daily with food for 30 days

Instructions: Take all medicines with plenty of water.
Avoid alcohol. Return for follow-up in 7 days.`,

    pregnancy: `Dr. Priya Sharma - Women's Health Clinic
Patient: Mary Smith | Pregnancy Week: 12
Date: ${new Date().toLocaleDateString()}
Diagnosis: Pregnancy Care - First Trimester

1. Folic Acid 5mg - Once daily with food for 90 days
2. Iron 325mg - Once daily before meal for 90 days
3. Calcium 500mg - Twice daily after food for 90 days
4. Vitamin D 1000IU - Once daily with meal for 90 days
5. Vitamin B12 1000mcg - Once daily in the morning for 60 days

Instructions: Avoid raw fish and unpasteurized dairy.
Next appointment in 4 weeks. Drink 8-10 glasses of water daily.`,

    bp: `Dr. Kumar - Cardiology Clinic
Patient: Susan Lee | Age: 45
Date: ${new Date().toLocaleDateString()}
Diagnosis: Hypertension Stage 1

1. Amlodipine 5mg - Once daily in morning for 30 days
2. Losartan 50mg - Once daily after meal for 30 days
3. Aspirin 75mg - Once daily after meal for 30 days
4. Omeprazole 20mg - Once daily before breakfast for 30 days

Instructions: Monitor BP daily. Low-sodium diet essential.
Reduce stress. Exercise 30 minutes daily. No smoking.
Return in 30 days with BP diary.`
};

// ═══════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    console.log('🌸 MomCareAI Initializing...');
    
    // Initialize voice recognition
    initVoiceRecognition();
    
    // Request notification permission
    requestNotificationPermission();
    
    // Load initial data
    loadDashboard();
    
    // Start medication reminder polling (every 5 minutes)
    startReminderPolling();
    
    // Start alert count refresh (every minute)
    setInterval(refreshAlertCount, 60000);
    
    console.log('✅ MomCareAI Ready!');
});

// ═══════════════════════════════════════════════════════════
// PAGE NAVIGATION
// ═══════════════════════════════════════════════════════════

function switchPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    
    // Show target page
    const page = document.getElementById(`page-${pageName}`);
    const tab = document.getElementById(`tab-${pageName}`);
    
    if (page) page.classList.add('active');
    if (tab) tab.classList.add('active');
    
    state.currentPage = pageName;
    
    // Load page-specific data
    switch(pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'voice':
            loadRecentLogs();
            break;
        case 'medications':
            loadMedications();
            break;
        case 'analysis':
            loadAnalysis();
            loadAlerts();
            break;
        case 'summary':
            loadSummary();
            break;
    }
}

// ═══════════════════════════════════════════════════════════
// VOICE RECOGNITION
// ═══════════════════════════════════════════════════════════

function initVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.warn('Speech Recognition not supported in this browser');
        document.getElementById('voice-btn').title = 'Voice not supported — use text input';
        return;
    }
    
    state.recognition = new SpeechRecognition();
    state.recognition.continuous = false;
    state.recognition.interimResults = true;
    state.recognition.lang = 'en-US';
    
    state.recognition.onstart = () => {
        state.isListening = true;
        updateVoiceUI(true);
        console.log('🎙️ Listening started...');
    };
    
    state.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        document.getElementById('text-input').value = transcript;
    };
    
    state.recognition.onend = () => {
        state.isListening = false;
        updateVoiceUI(false);
        
        const transcript = document.getElementById('text-input').value.trim();
        if (transcript) {
            sendText();
        }
    };
    
    state.recognition.onerror = (event) => {
        state.isListening = false;
        updateVoiceUI(false);
        console.error('Voice error:', event.error);
        
        if (event.error === 'not-allowed') {
            showToast('❌ Microphone access denied. Please allow microphone permission.', 'error');
        }
    };
}

function toggleVoice() {
    if (!state.recognition) {
        showToast('⚠️ Voice not supported. Please use text input.', 'error');
        return;
    }
    
    if (state.isListening) {
        state.recognition.stop();
    } else {
        state.recognition.start();
    }
}

function updateVoiceUI(isListening) {
    const btn = document.getElementById('voice-btn');
    const status = document.getElementById('voice-status');
    
    if (isListening) {
        btn.innerHTML = '⏹️';
        btn.classList.add('listening');
        status.textContent = '🔴 Listening... Speak now!';
        status.classList.add('listening');
    } else {
        btn.innerHTML = '🎙️';
        btn.classList.remove('listening');
        status.textContent = 'Click microphone to start speaking';
        status.classList.remove('listening');
    }
}

// ═══════════════════════════════════════════════════════════
// TEXT-TO-SPEECH
// ═══════════════════════════════════════════════════════════

function speak(text) {
    if (!state.synthesis) return;
    
    // Cancel any ongoing speech
    state.synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    // Try to use a female voice
    const voices = state.synthesis.getVoices();
    const femaleVoice = voices.find(v => 
        v.name.toLowerCase().includes('female') ||
        v.name.toLowerCase().includes('zira') ||
        v.name.toLowerCase().includes('samantha') ||
        v.name.toLowerCase().includes('victoria') ||
        (v.name.toLowerCase().includes('google') && v.name.toLowerCase().includes('us'))
    );
    
    if (femaleVoice) utterance.voice = femaleVoice;
    
    state.synthesis.speak(utterance);
}

// ═══════════════════════════════════════════════════════════
// CONVERSATION
// ═══════════════════════════════════════════════════════════

function addMessage(text, sender) {
    const box = document.getElementById('conversation-box');
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    
    const label = sender === 'user' ? '👤 You' : '💗 MomCareAI';
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    div.innerHTML = `
        <div class="message-label">${label} • ${time}</div>
        <div class="message-bubble">${text}</div>
    `;
    
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function handleKeyPress(event) {
    if (event.key === 'Enter') sendText();
}

function fillPrompt(text) {
    document.getElementById('text-input').value = text;
    document.getElementById('text-input').focus();
}

async function sendText() {
    const input = document.getElementById('text-input');
    const text = input.value.trim();
    
    if (!text) return;
    
    // Show user message
    addMessage(text, 'user');
    input.value = '';
    
    try {
        // Show typing indicator
        const typingId = showTypingIndicator();
        
        // Send to AI
        const response = await fetch(`${API_BASE}/voice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        
        const data = await response.json();
        removeTypingIndicator(typingId);
        
        if (data.success) {
            state.lastAnalysis = data;
            
            // Show AI response
            addMessage(data.ai_response, 'ai');
            speak(data.ai_response);
            
            // Show follow-up question
            setTimeout(() => {
                addMessage(`❓ ${data.follow_up_question}`, 'ai');
                speak(data.follow_up_question);
            }, 1500);
            
            // Show immediate alerts
            if (data.immediate_alerts && data.immediate_alerts.length > 0) {
                data.immediate_alerts.forEach(alert => {
                    showToast(alert.message, alert.severity === 'critical' ? 'error' : 'warning');
                    setTimeout(() => {
                        addMessage(`⚠️ ALERT: ${alert.message}`, 'ai');
                        speak(alert.message);
                    }, 3000);
                });
            }
            
            // Auto-populate form with detected vitals
            if (data.analysis) {
                autoFillForm(data.analysis, text);
            }
        } else {
            addMessage('I had trouble processing that. Please try again.', 'ai');
        }
    } catch (error) {
        console.error('Error:', error);
        addMessage('Connection error. Please check if the server is running.', 'ai');
    }
}

function showTypingIndicator() {
    const box = document.getElementById('conversation-box');
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.className = 'message ai';
    div.id = id;
    div.innerHTML = `
        <div class="message-label">💗 MomCareAI</div>
        <div class="message-bubble">
            <span style="color:var(--text-light)">Analyzing your health data...</span>
            <span class="spinner" style="display:inline-block; width:12px; height:12px; margin-left:8px;"></span>
        </div>
    `;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function autoFillForm(analysis, rawText) {
    const vitals = analysis.vitals || {};
    
    if (vitals.blood_pressure) document.getElementById('form-bp').value = vitals.blood_pressure;
    if (vitals.temperature) document.getElementById('form-temp').value = vitals.temperature;
    if (vitals.sleep_hours) document.getElementById('form-sleep').value = vitals.sleep_hours;
    if (vitals.pain_level) document.getElementById('form-pain').value = vitals.pain_level;
    
    if (analysis.symptoms && analysis.symptoms.length > 0) {
        document.getElementById('form-symptoms').value = analysis.symptoms.join(', ');
    }
    
    document.getElementById('form-notes').value = rawText;
}

// ═══════════════════════════════════════════════════════════
// HEALTH LOG SAVE
// ═══════════════════════════════════════════════════════════

async function saveHealthLog() {
    const symptoms = document.getElementById('form-symptoms').value;
    const mood = document.getElementById('form-mood').value;
    const pain = document.getElementById('form-pain').value;
    const sleep = document.getElementById('form-sleep').value;
    const bp = document.getElementById('form-bp').value;
    const temp = document.getElementById('form-temp').value;
    const notes = document.getElementById('form-notes').value;
    
    if (!symptoms && !mood && !pain && !sleep && !bp && !notes) {
        showToast('Please fill in at least one health detail before saving.', 'warning');
        return;
    }
    
    // Determine category and severity from AI analysis if available
    let category = 'general';
    let severity = 'mild';
    
    if (state.lastAnalysis && state.lastAnalysis.analysis) {
        category = state.lastAnalysis.analysis.primary_category || 'general';
        severity = state.lastAnalysis.analysis.severity || 'mild';
    }
    
    const logData = {
        symptoms: symptoms,
        mood: mood,
        pain_level: parseInt(pain) || 0,
        sleep_hours: parseFloat(sleep) || 0,
        blood_pressure: bp,
        temperature: temp ? parseFloat(temp) : null,
        notes: notes,
        category: category,
        severity: severity,
        raw_input: notes || symptoms
    };
    
    try {
        const response = await fetch(`${API_BASE}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('✅ Health log saved successfully!', 'success');
            
            // Show confirmation
            const confirmDiv = document.getElementById('save-confirmation');
            confirmDiv.style.display = 'block';
            confirmDiv.innerHTML = `
                <div class="alert-item good">
                    <div class="alert-icon">✅</div>
                    <div class="alert-content">
                        <div class="alert-message">Health log saved at ${new Date().toLocaleTimeString()}</div>
                        <div class="alert-recommendation">Symptoms: ${symptoms || 'None recorded'} | Pain: ${pain || 0}/10 | Sleep: ${sleep || 0}hrs</div>
                    </div>
                </div>
            `;
            
            // Handle any alerts from save
            if (data.alerts && data.alerts.length > 0) {
                data.alerts.forEach(alert => {
                    showToast(alert.message, alert.severity === 'critical' ? 'error' : 'warning');
                });
            }
            
            // Refresh logs table
            loadRecentLogs();
            
            // Add voice feedback
            speak(`Health data saved. ${pain >= 8 ? 'I notice you have high pain levels. Please consider consulting a doctor.' : 'Great job tracking your health today!'}`);
            
        } else {
            showToast('❌ Error saving data: ' + data.error, 'error');
        }
    } catch (error) {
        showToast('❌ Connection error. Is the server running?', 'error');
    }
}

function clearForm() {
    ['form-symptoms', 'form-mood', 'form-pain', 'form-sleep', 'form-bp', 'form-temp', 'form-notes'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('save-confirmation').style.display = 'none';
    state.lastAnalysis = null;
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════

async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/dashboard`);
        const data = await response.json();
        
        if (data.success) {
            const d = data.dashboard;
            
            // Update metrics
            document.getElementById('metric-today').textContent = d.today_logs_count;
            document.getElementById('metric-week').textContent = d.week_logs_count;
            document.getElementById('metric-meds').textContent = d.active_medications;
            document.getElementById('metric-alerts').textContent = d.unread_alerts;
            document.getElementById('metric-sleep').textContent = 
                d.chart_data.sleep.length > 0 
                    ? (d.chart_data.sleep.reduce((a,b) => a+b, 0) / d.chart_data.sleep.filter(s => s > 0).length || 0).toFixed(1)
                    : '—';
            
            // Update header stats
            document.getElementById('header-logs').textContent = d.total_logs;
            document.getElementById('header-meds').textContent = d.active_medications;
            document.getElementById('header-alerts').textContent = d.unread_alerts;
            
            if (d.unread_alerts > 0) {
                document.getElementById('alert-badge').style.display = 'inline-flex';
                document.getElementById('alert-badge').textContent = d.unread_alerts;
            }
            
            // Update chart
            renderHealthChart(d.chart_data);
            
            // Update today's logs
            renderTodayLogs(d.today_logs);
            
            // Update medications
            renderDashboardMeds(d.medications);
        }
    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}

function renderTodayLogs(logs) {
    const container = document.getElementById('today-logs-container');
    
    if (!logs || logs.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding:20px;">
                <div class="empty-icon">📋</div>
                <p>No logs today yet. Start logging your health!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = logs.slice(0, 3).map(log => `
        <div class="alert-item info" style="margin-bottom:8px;">
            <div class="alert-icon">📝</div>
            <div class="alert-content">
                <div class="alert-message">${log.symptoms || 'General log'}</div>
                <div class="alert-recommendation">
                    ${log.mood ? `Mood: ${log.mood}` : ''} 
                    ${log.pain_level > 0 ? `| Pain: ${log.pain_level}/10` : ''}
                    ${log.sleep_hours > 0 ? `| Sleep: ${log.sleep_hours}hrs` : ''}
                    | ${new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                </div>
            </div>
        </div>
    `).join('');
}

function renderDashboardMeds(medications) {
    const container = document.getElementById('dashboard-meds-container');
    
    if (!medications || medications.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding:20px;">
                <div class="empty-icon">💊</div>
                <p>No active medications. Upload a prescription to get started!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="medication-grid">
            ${medications.slice(0, 4).map(med => `
                <div class="medication-card">
                    <div class="med-header">
                        <div class="med-icon">💊</div>
                        <div>
                            <div class="med-name">${med.name}</div>
                            <div class="med-dosage">${med.dosage || ''}</div>
                        </div>
                    </div>
                    <div class="reminder-times">
                        ${(med.reminder_times || ['08:00']).map(t => `
                            <span class="time-badge">⏰ ${t}</span>
                        `).join('')}
                    </div>
                    <div style="font-size:12px; color:var(--text-light);">${med.meal_instruction || 'after meal'}</div>
                    <div style="margin-top:10px;">
                        <button class="btn btn-success btn-sm" onclick="markMedicationTaken(${med.id}, '${med.name}', '')">
                            ✓ Mark as Taken
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderHealthChart(chartData) {
    const ctx = document.getElementById('health-chart');
    if (!ctx) return;
    
    if (state.chart) {
        state.chart.destroy();
    }
    
    state.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels.map(d => {
                const date = new Date(d);
                return date.toLocaleDateString('en', {month:'short', day:'numeric'});
            }),
            datasets: [
                {
                    label: 'Sleep (hours)',
                    data: chartData.sleep,
                    borderColor: '#7c4dff',
                    backgroundColor: 'rgba(124, 77, 255, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#7c4dff',
                    pointRadius: 5
                },
                {
                    label: 'Pain Level (1-10)',
                    data: chartData.pain,
                    borderColor: '#e91e8c',
                    backgroundColor: 'rgba(233, 30, 140, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#e91e8c',
                    pointRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 12,
                    grid: { color: '#f5f5f5' }
                },
                x: { grid: { color: '#f5f5f5' } }
            }
        }
    });
}

// ═══════════════════════════════════════════════════════════
// RECENT LOGS
// ═══════════════════════════════════════════════════════════

async function loadRecentLogs() {
    try {
        const response = await fetch(`${API_BASE}/logs?days=7`);
        const data = await response.json();
        
        const tbody = document.getElementById('logs-table-body');
        
        if (!data.logs || data.logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <div class="empty-icon">📋</div>
                            <p>No health logs yet. Start by telling MomCareAI how you feel!</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = data.logs.map(log => `
            <tr>
                <td>${new Date(log.timestamp).toLocaleString([], {
                    month:'short', day:'numeric',
                    hour:'2-digit', minute:'2-digit'
                })}</td>
                <td>${log.symptoms || '<span style="color:#ccc">—</span>'}</td>
                <td>${log.mood || '<span style="color:#ccc">—</span>'}</td>
                <td>${log.pain_level > 0 ? `<strong>${log.pain_level}</strong>/10` : '<span style="color:#ccc">—</span>'}</td>
                <td>${log.sleep_hours > 0 ? `${log.sleep_hours}hrs` : '<span style="color:#ccc">—</span>'}</td>
                <td>${log.blood_pressure || '<span style="color:#ccc">—</span>'}</td>
                <td>
                    <span class="severity-badge ${log.severity || 'mild'}">
                        ${log.severity || 'mild'}
                    </span>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading logs:', error);
    }
}

// ═══════════════════════════════════════════════════════════
// PRESCRIPTION
// ═══════════════════════════════════════════════════════════

function loadSamplePrescription(type) {
    const textarea = document.getElementById('prescription-text');
    textarea.value = SAMPLE_PRESCRIPTIONS[type] || '';
    textarea.focus();
}

async function uploadPrescription() {
    const text = document.getElementById('prescription-text').value.trim();
    
    if (!text || text.length < 20) {
        showToast('⚠️ Please enter a valid prescription with medicine details.', 'warning');
        return;
    }
    
    const resultsDiv = document.getElementById('prescription-results');
    resultsDiv.innerHTML = '<div class="loading"><div class="spinner"></div> Analyzing prescription with AI...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/prescription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prescription_text: text })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`✅ Found ${data.total_medicines} medication(s)! Reminders set.`, 'success');
            speak(`I found ${data.total_medicines} medications in your prescription and set up reminders for all of them.`);
            
            renderPrescriptionResults(data);
            
            // Refresh medications tab
            loadMedications();
        } else {
            resultsDiv.innerHTML = `
                <div class="alert-item warning">
                    <div class="alert-icon">⚠️</div>
                    <div class="alert-content">
                        <div class="alert-message">Could not fully parse prescription</div>
                        <div class="alert-recommendation">${data.error || 'Try adding more medicine details with dosage and frequency.'}</div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        showToast('❌ Error processing prescription.', 'error');
        console.error('Prescription error:', error);
    }
}

function renderPrescriptionResults(data) {
    const resultsDiv = document.getElementById('prescription-results');
    
    if (!data.medicines || data.medicines.length === 0) {
        resultsDiv.innerHTML = `
            <div class="empty-state">
                <p>No medicines could be automatically extracted. Please check the prescription format.</p>
            </div>
        `;
        return;
    }
    
    resultsDiv.innerHTML = `
        <div class="alert-item good" style="margin-bottom:16px;">
            <div class="alert-icon">✅</div>
            <div class="alert-content">
                <div class="alert-message">Prescription Processed Successfully!</div>
                <div class="alert-recommendation">
                    Doctor: ${data.doctor_name || 'Not specified'} | 
                    Patient: ${data.patient_name || 'Not specified'} |
                    Diagnosis: ${data.diagnosis || 'Not specified'}
                </div>
            </div>
        </div>
        
        <h4 style="margin-bottom:12px; color:var(--primary-dark);">
            💊 ${data.total_medicines} Medication(s) Found:
        </h4>
        
        <div class="medication-grid">
            ${data.medicines.map(med => `
                <div class="medication-card">
                    <div class="med-header">
                        <div class="med-icon">💊</div>
                        <div>
                            <div class="med-name">${med.medicine_name}</div>
                            <div class="med-dosage">${med.dosage || 'As prescribed'}</div>
                        </div>
                    </div>
                    <div class="med-details">
                        <div class="med-detail">
                            <div class="med-detail-label">Frequency</div>
                            <div class="med-detail-value">${med.frequency || 'Once daily'}</div>
                        </div>
                        <div class="med-detail">
                            <div class="med-detail-label">Duration</div>
                            <div class="med-detail-value">${med.duration_days} days</div>
                        </div>
                        <div class="med-detail">
                            <div class="med-detail-label">When to take</div>
                            <div class="med-detail-value">${med.meal_instruction}</div>
                        </div>
                        <div class="med-detail">
                            <div class="med-detail-label">Ends</div>
                            <div class="med-detail-value">${med.end_date || 'N/A'}</div>
                        </div>
                    </div>
                    <div style="font-size:12px; color:var(--text-light); margin-bottom:8px;">⏰ Reminders set for:</div>
                    <div class="reminder-times">
                        ${(typeof med.reminder_times === 'string' 
                            ? JSON.parse(med.reminder_times) 
                            : med.reminder_times || ['08:00']
                          ).map(t => `<span class="time-badge">${t}</span>`).join('')}
                    </div>
                    <span class="med-status active">✅ Active & Scheduled</span>
                </div>
            `).join('')}
        </div>
        
        <div style="margin-top:16px; padding:12px; background:#e3f2fd; border-radius:10px; font-size:13px; color:#1565c0;">
            ℹ️ <strong>Reminders are now active!</strong> You'll receive browser notifications when it's time to take each medication.
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════
// MEDICATIONS
// ═══════════════════════════════════════════════════════════

async function loadMedications() {
    try {
        const response = await fetch(`${API_BASE}/medications`);
        const data = await response.json();
        
        const container = document.getElementById('medications-container');
        
        if (!data.medications || data.medications.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💊</div>
                    <h3>No Active Medications</h3>
                    <p>Upload a doctor's prescription to automatically schedule medication reminders.</p>
                    <button class="btn btn-primary" onclick="switchPage('prescription')" style="margin-top:16px;">
                        📋 Upload Prescription
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="medication-grid">
                ${data.medications.map(med => `
                    <div class="medication-card">
                        <div class="med-header">
                            <div class="med-icon">💊</div>
                            <div>
                                <div class="med-name">${med.name}</div>
                                <div class="med-dosage">${med.dosage || 'As prescribed'}</div>
                            </div>
                        </div>
                        <div class="med-details">
                            <div class="med-detail">
                                <div class="med-detail-label">Frequency</div>
                                <div class="med-detail-value">${med.frequency || 'Once daily'}</div>
                            </div>
                            <div class="med-detail">
                                <div class="med-detail-label">Per Day</div>
                                <div class="med-detail-value">${med.times_per_day}x daily</div>
                            </div>
                            <div class="med-detail">
                                <div class="med-detail-label">Instructions</div>
                                <div class="med-detail-value">${med.meal_instruction}</div>
                            </div>
                            <div class="med-detail">
                                <div class="med-detail-label">Duration</div>
                                <div class="med-detail-value">${med.duration}</div>
                            </div>
                            <div class="med-detail">
                                <div class="med-detail-label">Start Date</div>
                                <div class="med-detail-value">${med.start_date || 'Today'}</div>
                            </div>
                            <div class="med-detail">
                                <div class="med-detail-label">End Date</div>
                                <div class="med-detail-value">${med.end_date || 'N/A'}</div>
                            </div>
                        </div>
                        <div style="font-size:12px; color:var(--text-light); margin-bottom:8px;">⏰ Scheduled times:</div>
                        <div class="reminder-times">
                            ${(med.reminder_times || ['08:00']).map(t => `
                                <span class="time-badge">${t}</span>
                            `).join('')}
                        </div>
                        <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
                            <span class="med-status active">✅ Active</span>
                            <button class="btn btn-success btn-sm" onclick="markMedicationTaken(${med.id}, '${med.name}', '${med.next_reminder}')">
                                💊 Mark Taken
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading medications:', error);
    }
}

async function markMedicationTaken(medId, medName, scheduledTime) {
    try {
        const response = await fetch(`${API_BASE}/medication/taken`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                medication_id: medId,
                scheduled_time: scheduledTime
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`✅ ${medName} marked as taken! 💊`, 'success');
            speak(`Great job! ${medName} has been marked as taken.`);
        }
    } catch (error) {
        showToast('Error updating medication status.', 'error');
    }
}

// ═══════════════════════════════════════════════════════════
// ANALYSIS
// ═══════════════════════════════════════════════════════════

async function loadAnalysis() {
    const days = document.getElementById('analysis-days')?.value || 7;
    
    try {
        const response = await fetch(`${API_BASE}/analysis?days=${days}`);
        const data = await response.json();
        
        renderPatterns(data.patterns);
        renderStatistics(data.statistics);
        
    } catch (error) {
        console.error('Error loading analysis:', error);
    }
}

function renderPatterns(patterns) {
    const container = document.getElementById('patterns-container');
    
    if (!patterns || patterns.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>No Patterns Detected Yet</h3>
                <p>Log your health data for at least 3 days to see AI-detected patterns and insights.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = patterns.map(pattern => {
        const severityClass = pattern.severity || 'info';
        const icons = {
            recurring_symptom: '🔄',
            sleep_deficit: '😴',
            good_sleep: '✅',
            pain_escalation: '📈',
            low_mood: '💙',
            default: '📊'
        };
        const icon = icons[pattern.type] || icons.default;
        
        return `
            <div class="alert-item ${severityClass}">
                <div class="alert-icon">${icon}</div>
                <div class="alert-content">
                    <div class="alert-message">${pattern.message}</div>
                    <div class="alert-recommendation">💡 ${pattern.recommendation}</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderStatistics(stats) {
    const container = document.getElementById('statistics-container');
    
    if (!stats) return;
    
    container.innerHTML = `
        <div class="form-grid">
            <div class="summary-item">
                <span class="summary-key">📝 Total Logs in Period</span>
                <span class="summary-value">${stats.total_logs || 0}</span>
            </div>
            <div class="summary-item">
                <span class="summary-key">📅 Period Analyzed</span>
                <span class="summary-value">${stats.period_days || 7} days</span>
            </div>
            <div class="summary-item">
                <span class="summary-key">😴 Average Sleep</span>
                <span class="summary-value">${stats.avg_sleep ? stats.avg_sleep + ' hours' : 'Not recorded'}</span>
            </div>
            <div class="summary-item">
                <span class="summary-key">😣 Average Pain Level</span>
                <span class="summary-value">${stats.avg_pain ? stats.avg_pain + '/10' : 'Not recorded'}</span>
            </div>
            <div class="summary-item">
                <span class="summary-key">🏷️ Most Common Category</span>
                <span class="summary-value">${stats.most_common_category || 'general'}</span>
            </div>
        </div>
    `;
}

async function loadAlerts() {
    try {
        const response = await fetch(`${API_BASE}/alerts`);
        const data = await response.json();
        
        const container = document.getElementById('alerts-container');
        
        if (!data.alerts || data.alerts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎉</div>
                    <h3>No Active Alerts</h3>
                    <p>Your health looks good! No critical alerts at this time.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = data.alerts.map(alert => `
            <div class="alert-item ${alert.severity}" id="alert-${alert.id}">
                <div class="alert-icon">
                    ${alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️'}
                </div>
                <div class="alert-content">
                    <div class="alert-message">${alert.message}</div>
                    <div class="alert-recommendation" style="font-size:11px;">${alert.timestamp}</div>
                </div>
                <button class="alert-dismiss" onclick="dismissAlert(${alert.id})">✕</button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

async function dismissAlert(alertId) {
    await fetch(`${API_BASE}/alerts/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alertId })
    });
    
    const el = document.getElementById(`alert-${alertId}`);
    if (el) el.remove();
    
    refreshAlertCount();
}

async function refreshAlertCount() {
    try {
        const response = await fetch(`${API_BASE}/alerts`);
        const data = await response.json();
        const count = data.count || 0;
        
        document.getElementById('header-alerts').textContent = count;
        document.getElementById('metric-alerts').textContent = count;
        
        const badge = document.getElementById('alert-badge');
        if (count > 0) {
            badge.style.display = 'inline-flex';
            badge.textContent = count;
        } else {
            badge.style.display = 'none';
        }
    } catch (error) {}
}

// ═══════════════════════════════════════════════════════════
// DOCTOR SUMMARY
// ═══════════════════════════════════════════════════════════

async function loadSummary() {
    const days = document.getElementById('summary-days')?.value || 7;
    
    const container = document.getElementById('summary-container');
    container.innerHTML = '<div class="loading"><div class="spinner"></div> Generating doctor summary...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/summary?days=${days}`);
        const data = await response.json();
        
        if (data.success) {
            renderSummary(data.summary);
        } else {
            container.innerHTML = `<div class="alert-item warning"><div class="alert-icon">⚠️</div><div class="alert-content"><div class="alert-message">${data.error || 'Could not generate summary'}</div></div></div>`;
        }
    } catch (error) {
        container.innerHTML = '<div class="alert-item warning"><div>Connection error</div></div>';
    }
}

function renderSummary(summary) {
    const container = document.getElementById('summary-container');
    
    container.innerHTML = `
        <!-- Summary Header -->
        <div style="background: linear-gradient(135deg, var(--primary), var(--secondary)); 
                    color: white; padding: 24px; border-radius: 16px; margin-bottom: 24px;">
            <div style="font-size: 22px; font-weight: 800; margin-bottom: 8px;">
                💗 MomCareAI Health Report
            </div>
            <div style="opacity: 0.9; font-size: 14px;">
                Generated: ${summary.report_date} | Period: ${summary.period_days} | 
                Total Entries: ${summary.total_logs}
            </div>
            <div style="margin-top: 12px; font-size: 12px; opacity: 0.8;">
                This report is generated by MomCareAI and is intended to assist your healthcare provider.
                It does not constitute medical advice.
            </div>
        </div>
        
        <div class="two-col">
            <!-- Symptoms Summary -->
            <div class="summary-section">
                <h3>🩺 Top Reported Symptoms</h3>
                ${summary.top_symptoms && summary.top_symptoms.length > 0 
                    ? summary.top_symptoms.map(s => `
                        <div class="symptom-frequency">
                            <span style="min-width: 100px; font-size:13px; font-weight:600;">${s.symptom}</span>
                            <div class="freq-bar">
                                <div class="freq-fill" style="width: ${Math.min(100, (s.frequency / summary.total_logs) * 100)}%"></div>
                            </div>
                            <span style="font-size:12px; color:var(--text-light); min-width:30px;">${s.frequency}x</span>
                        </div>
                    `).join('')
                    : '<p style="color:var(--text-light);">No symptoms recorded</p>'
                }
            </div>
            
            <!-- Vitals Summary -->
            <div class="summary-section">
                <h3>📊 Vitals Overview</h3>
                <div class="summary-item">
                    <span class="summary-key">😴 Average Sleep</span>
                    <span class="summary-value">
                        ${summary.vitals_summary.avg_sleep !== 'Not recorded' 
                            ? summary.vitals_summary.avg_sleep + ' hours' 
                            : 'Not recorded'}
                    </span>
                </div>
                <div class="summary-item">
                    <span class="summary-key">😣 Average Pain Level</span>
                    <span class="summary-value">
                        ${summary.vitals_summary.avg_pain !== 'Not recorded' 
                            ? summary.vitals_summary.avg_pain + '/10' 
                            : 'Not recorded'}
                    </span>
                </div>
                <div class="summary-item">
                    <span class="summary-key">❤️ Blood Pressure Readings</span>
                    <span class="summary-value">
                        ${Array.isArray(summary.vitals_summary.bp_readings) && summary.vitals_summary.bp_readings.length > 0
                            ? summary.vitals_summary.bp_readings.join(', ')
                            : 'Not recorded'}
                    </span>
                </div>
            </div>
        </div>
        
        <!-- Medications -->
        <div class="summary-section">
            <h3>💊 Current Medications</h3>
            ${summary.medications && summary.medications.length > 0
                ? `<table class="logs-table">
                    <thead>
                        <tr>
                            <th>Medicine</th>
                            <th>Dosage</th>
                            <th>Frequency</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${summary.medications.map(med => `
                            <tr>
                                <td><strong>${med.name}</strong></td>
                                <td>${med.dosage || 'As prescribed'}</td>
                                <td>${med.frequency || 'Once daily'}</td>
                                <td><span class="med-status active">${med.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                  </table>`
                : '<div class="alert-item info"><div class="alert-icon">ℹ️</div><div class="alert-content"><div class="alert-message">No medications currently recorded</div></div></div>'
            }
        </div>
        
        <!-- Detected Patterns -->
        <div class="summary-section">
            <h3>🔍 AI-Detected Patterns</h3>
            ${summary.detected_patterns && summary.detected_patterns.length > 0
                ? summary.detected_patterns.map(p => `
                    <div class="alert-item ${p.severity || 'info'}">
                        <div class="alert-icon">📊</div>
                        <div class="alert-content">
                            <div class="alert-message">${p.message}</div>
                            <div class="alert-recommendation">Recommendation: ${p.recommendation}</div>
                        </div>
                    </div>
                `).join('')
                : '<p style="color:var(--text-light);">No significant patterns detected in this period. Continue logging for better insights.</p>'
            }
        </div>
        
        <!-- Recommendation -->
        <div style="background: var(--primary-light); border: 2px solid var(--primary); 
                    border-radius: 12px; padding: 20px; margin-top: 16px;">
            <h3 style="color: var(--primary-dark); margin-bottom: 12px;">
                📋 Doctor's Notes Section
            </h3>
            <p style="font-size: 13px; color: var(--text-light); margin-bottom: 16px;">
                [Space for doctor to add notes during consultation]
            </p>
            <div style="border: 1px dashed var(--primary); border-radius: 8px; 
                        padding: 12px; min-height: 80px; background: white;">
                &nbsp;
            </div>
            <p style="font-size: 11px; color: var(--text-light); margin-top: 12px;">
                ${summary.generated_by} | Report Date: ${summary.report_date}
            </p>
        </div>
    `;
}

function printSummary() {
    window.print();
}

// ═══════════════════════════════════════════════════════════
// MEDICATION REMINDERS
// ═══════════════════════════════════════════════════════════

async function requestNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission !== 'granted') {
            await Notification.requestPermission();
        }
    }
}

function startReminderPolling() {
    // Check reminders immediately
    checkMedicationReminders();
    
    // Then check every 5 minutes
    state.reminderInterval = setInterval(checkMedicationReminders, 5 * 60 * 1000);
}

async function checkMedicationReminders() {
    try {
        const response = await fetch(`${API_BASE}/reminders/check`);
        const data = await response.json();
        
        if (data.due_medications && data.due_medications.length > 0) {
            data.due_medications.forEach(med => {
                // Show toast notification
                showToast(med.message, 'medication');
                
                // Show browser notification
                showBrowserNotification(
                    '💊 Medication Reminder — MomCareAI',
                    med.message
                );
                
                // Speak the reminder
                speak(`Reminder! It is time to take ${med.medicine_name}. ${med.meal_instruction}.`);
            });
        }
    } catch (error) {
        // Silent fail for reminder polling
    }
}

function showBrowserNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body: body,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="80" font-size="80">💊</text></svg>',
            tag: 'momcareai-reminder',
            requireInteraction: true
        });
        
        notification.onclick = () => {
            window.focus();
            switchPage('medications');
            notification.close();
        };
    }
}

// ═══════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const id = 'toast-' + Date.now();
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        medication: '💊',
        info: 'ℹ️'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.id = id;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-text">
            <div class="toast-title">MomCareAI</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="removeToast('${id}')">✕</button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => removeToast(id), 5000);
}

function removeToast(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => el.remove(), 300);
    }
}