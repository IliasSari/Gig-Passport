/* --- Gig Passport App Script (With Edit, Delete & PDF Export) --- */

/* First step. Database Initialization, Modal Control & Gig Creation */

// Initialize Dexie database
const db = new Dexie('GigPassportDB');
db.version(1).stores({
    gigs: '++id, bandName, venueName, date, rating'
});

// DOM Elements
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const gigModal = document.getElementById('gigModal');
const gigForm = document.getElementById('gigForm');
const modalTitle = document.getElementById('modalTitle') || document.querySelector('.modal-content h2');
const timeline = document.getElementById('timeline');
const totalGigsEl = document.getElementById('totalGigs');
const uniqueBandsEl = document.getElementById('uniqueBands');
const topVenueEl = document.getElementById('topVenue');
const exportPdfBtn = document.getElementById('exportPdfBtn');

// Track if we are editing an existing gig
let editingGigId = null;

// Load gigs and update UI on page load
window.addEventListener('DOMContentLoaded', () => {
    loadGigs();
});

// --- 1. Modal Toggle Handlers ---
openModalBtn.addEventListener('click', () => {
    editingGigId = null; // Reset edit state
    gigForm.reset();
    if (modalTitle) modalTitle.textContent = 'Add New Live';
    gigModal.style.display = 'flex';
});

closeModalBtn.addEventListener('click', () => {
    gigModal.style.display = 'none';
    gigForm.reset();
    editingGigId = null;
});

window.addEventListener('click', (e) => {
    if (e.target === gigModal) {
        gigModal.style.display = 'none';
        gigForm.reset();
        editingGigId = null;
    }
});

// --- 2. Handle Form Submission (Add or Update) ---
gigForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const gigData = {
        bandName: document.getElementById('bandName').value.trim(),
        venueName: document.getElementById('venueName').value.trim(),
        date: document.getElementById('gigDate').value,
        rating: parseInt(document.getElementById('gigRating').value, 10),
        notes: document.getElementById('gigNotes').value.trim()
    };

    try {
        if (editingGigId !== null) {
            // Update existing gig
            await db.gigs.update(editingGigId, gigData);
            console.log('Gig updated successfully!', editingGigId);
        } else {
            // Add new gig
            await db.gigs.add(gigData);
            console.log('New gig added successfully!', gigData);
        }

        gigForm.reset();
        gigModal.style.display = 'none';
        editingGigId = null;
        
        loadGigs();
        
    } catch (err) {
        console.error('Failed to save gig: ', err);
        alert('There was a problem with saving.');
    }
});

/* Second step. Render Timeline & Update Statistics */

// --- 3. Render Timeline & Statistics ---
async function loadGigs() {
    try {
        const gigs = await db.gigs.toArray();
        gigs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        updateStats(gigs);
        renderTimeline(gigs);
    } catch (err) {
        console.error('Failed to load gigs:', err);
    }
}

function updateStats(gigs) {
    const totalGigs = gigs.length;
    totalGigsEl.textContent = totalGigs;

    if (totalGigs === 0) {
        uniqueBandsEl.textContent = '0';
        topVenueEl.textContent = '-';
        return;
    }

    const uniqueBands = new Set(gigs.map(gig => gig.bandName.toLowerCase())).size;
    uniqueBandsEl.textContent = uniqueBands;

    const venueCounts = {};
    gigs.forEach(gig => {
        const venue = (gig.venueName || '').trim();
        if (venue) {
            venueCounts[venue] = (venueCounts[venue] || 0) + 1;
        }
    });

    let topVenue = '-';
    let maxCount = 0;
    for (const [venue, count] of Object.entries(venueCounts)) {
        if (count > maxCount) {
            maxCount = count;
            topVenue = venue;
        }
    }
    topVenueEl.textContent = topVenue;
}

function renderTimeline(gigs) {
    if (!gigs || gigs.length === 0) {
        timeline.innerHTML = `
            <p style="text-align:center; color: var(--text-muted, #8b949e); padding: 2rem;">
                No entries yet. Add your first live!
            </p>
        `;
        return;
    }

    timeline.innerHTML = '';
    gigs.forEach(gig => {
        const ratingNum = Number(gig.rating) || 5;
        // Διόρθωση υπολογισμού αστεριών (Syntax Error Fix)
        const stars = '★'.repeat(ratingNum) + '☆'.repeat(Math.max(0, 5 - ratingNum));

        const card = document.createElement('div');
        card.className = 'gig-card';
        card.innerHTML = `
            <div class="gig-info" style="flex-grow: 1;">
                <h3>${escapeHTML(gig.bandName || '')}</h3>
                <div class="gig-meta">
                    <span>📍 ${escapeHTML(gig.venueName || '')}</span>
                    <span>📅 ${escapeHTML(gig.date || '')}</span>
                </div>
                ${gig.notes ? `<div class="gig-notes">"${escapeHTML(gig.notes)}"</div>` : ''}
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; gap: 10px;">
                <div class="gig-rating" title="${ratingNum} / 5">${stars}</div>
                <div class="card-actions" style="display: flex; gap: 6px;">
                    <button class="btn-icon edit-btn" onclick="editGig(${gig.id})" title="Edit" style="background:none; border:1px solid rgba(255,255,255,0.2); border-radius:4px; cursor:pointer; padding:4px 8px; color:var(--text-color, #fff);">✏️</button>
                    <button class="btn-icon delete-btn" onclick="deleteGig(${gig.id})" title="Delete" style="background:none; border:1px solid rgba(255,255,255,0.2); border-radius:4px; cursor:pointer; padding:4px 8px; color:#ff5555;">🗑️</button>
                </div>
            </div>
        `;
        timeline.appendChild(card);
    });
}

// --- 4. Edit & Delete Actions ---
window.editGig = async function(id) {
    try {
        const gig = await db.gigs.get(id);
        if (!gig) return;

        editingGigId = id;
        document.getElementById('bandName').value = gig.bandName || '';
        document.getElementById('venueName').value = gig.venueName || '';
        document.getElementById('gigDate').value = gig.date || '';
        document.getElementById('gigRating').value = gig.rating || 5;
        document.getElementById('gigNotes').value = gig.notes || '';

        if (modalTitle) modalTitle.textContent = 'Edit Live Entry';
        gigModal.style.display = 'flex';
    } catch (err) {
        console.error('Failed to load gig for editing:', err);
    }
};

window.deleteGig = async function(id) {
    if (confirm('Are you sure you want to delete this gig entry?')) {
        try {
            await db.gigs.delete(id);
            loadGigs();
        } catch (err) {
            console.error('Failed to delete gig:', err);
            alert('Could not delete the entry.');
        }
    }
};

// --- 5. Export to PDF (Native Print Dialog) ---
exportPdfBtn.addEventListener('click', () => {
    window.print();
});

// Helper for XSS protection
function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}