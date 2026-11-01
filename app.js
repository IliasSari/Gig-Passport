/* --- Gig Passport App Script --- */

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
const modalTitle = document.querySelector('.modal-content h2');
const timeline = document.getElementById('timeline');
const totalGigsEl = document.getElementById('totalGigs');
const uniqueBandsEl = document.getElementById('uniqueBands');
const topVenueEl = document.getElementById('topVenue');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const searchInput = document.getElementById('searchInput');
const yearFilter = document.getElementById('yearFilter');

let editingGigId = null;
let allGigsCache = []; // Cache για γρήγορο φιλτράρισμα

// Load gigs and update UI on page load
window.addEventListener('DOMContentLoaded', () => {
    loadGigs();
});

// --- 1. Modal Toggle Handlers ---
openModalBtn.addEventListener('click', () => {
    editingGigId = null;
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
            await db.gigs.update(editingGigId, gigData);
        } else {
            await db.gigs.add(gigData);
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

// --- 3. Load Gigs & Update UI ---
async function loadGigs() {
    try {
        allGigsCache = await db.gigs.toArray();
        allGigsCache.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        updateStats(allGigsCache);
        populateYearDropdown(allGigsCache);
        filterAndRenderGigs();
    } catch (err) {
        console.error('Failed to load gigs:', err);
    }
}

// Populate Year Filter options dynamically
function populateYearDropdown(gigs) {
    const currentSelected = yearFilter.value;
    const years = [...new Set(gigs.map(g => g.date ? g.date.substring(0, 4) : '').filter(Boolean))];
    years.sort((a, b) => b - a);

    yearFilter.innerHTML = '<option value="all">All Years</option>';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });

    if (years.includes(currentSelected)) {
        yearFilter.value = currentSelected;
    }
}

// --- 4. Search & Filter Logic ---
searchInput.addEventListener('input', filterAndRenderGigs);
yearFilter.addEventListener('change', filterAndRenderGigs);

function filterAndRenderGigs() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedYear = yearFilter.value;

    const filtered = allGigsCache.filter(gig => {
        const band = (gig.bandName || '').toLowerCase();
        const venue = (gig.venueName || '').toLowerCase();
        const notes = (gig.notes || '').toLowerCase();
        const gigYear = gig.date ? gig.date.substring(0, 4) : '';

        const matchesSearch = band.includes(searchTerm) || venue.includes(searchTerm) || notes.includes(searchTerm);
        const matchesYear = selectedYear === 'all' || gigYear === selectedYear;

        return matchesSearch && matchesYear;
    });

    renderTimeline(filtered);
}

// --- 5. Statistics Calculation ---
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

// --- 6. Render Timeline ---
function renderTimeline(gigs) {
    if (!gigs || gigs.length === 0) {
        timeline.innerHTML = `
            <p style="text-align:center; color: var(--text-muted, #8b949e); padding: 2rem;">
                No entries found.
            </p>
        `;
        return;
    }

    timeline.innerHTML = '';
    gigs.forEach(gig => {
        const ratingNum = Number(gig.rating) || 5;
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

// --- 7. Edit & Delete Actions ---
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

// --- 8. Export to PDF ---
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