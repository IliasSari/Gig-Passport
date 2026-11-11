/* --- Main Application Controller --- */
import { getAllGigs, addGig, updateGig, deleteGigFromDb, getGigById, clearAndImportGigs } from './db.js';
import { updateStatsUI } from './stats.js';

const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const gigModal = document.getElementById('gigModal');
const gigForm = document.getElementById('gigForm');
const timeline = document.getElementById('timeline');
const searchInput = document.getElementById('searchInput');
const yearFilter = document.getElementById('yearFilter');

const exportMenuBtn = document.getElementById('exportMenuBtn');
const exportDropdown = document.getElementById('exportDropdown');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const importJsonBtn = document.getElementById('importJsonBtn');
const importFileInput = document.getElementById('importFileInput');
const exportPdfBtn = document.getElementById('exportPdfBtn');

const gigPosterFile = document.getElementById('gigPosterFile');
const imageModal = document.getElementById('imageModal');
const modalImagePreview = document.getElementById('modalImagePreview');
const closeImageModal = document.getElementById('closeImageModal');

let editingGigId = null;
let allGigsCache = [];
let currentPosterBase64 = '';

window.addEventListener('DOMContentLoaded', () => {
    loadData();
});

exportMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportDropdown.style.display = exportDropdown.style.display === 'block' ? 'none' : 'block';
});

window.addEventListener('click', () => {
    if (exportDropdown) exportDropdown.style.display = 'none';
});

openModalBtn.addEventListener('click', () => {
    editingGigId = null;
    currentPosterBase64 = '';
    gigForm.reset();
    document.getElementById('ticketPrice').value = '0';
    document.getElementById('gigRating').value = '5';
    gigModal.style.display = 'flex';
});

closeModalBtn.addEventListener('click', () => {
    gigModal.style.display = 'none';
    gigForm.reset();
    editingGigId = null;
});

// Convert uploaded image to Base64
gigPosterFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(uploadEvent) {
            currentPosterBase64 = uploadEvent.target.result;
        };
        reader.readAsDataURL(file);
    }
});

gigForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const bandNameInput = document.getElementById('bandName').value.trim();
    const venueNameInput = document.getElementById('venueName').value.trim();
    const dateInput = document.getElementById('gigDate').value;

    // Έλεγχος για διπλοεγγραφή (ίδια μπάντα την ίδια ημερομηνία)
    const isDuplicate = allGigsCache.some(gig => {
        if (editingGigId !== null && gig.id === editingGigId) return false;
        const sameBand = gig.bandName.toLowerCase() === bandNameInput.toLowerCase();
        const sameDate = gig.date === dateInput;
        return sameBand && sameDate;
    });

    if (isDuplicate) {
        const confirmDuplicate = await showConfirmDialog(
            `Υπάρχει ήδη καταχωρημένο live για τους "${bandNameInput}" στις ${dateInput}! Θέλετε σίγουρα να το προσθέσετε ξανά;`,
            "⚠️ Διπλοεγγραφή",
            "Προσθήκη",
            false
        );
        if (!confirmDuplicate) return; // Αν πατήσει "Άκυρο", σταματάει η αποθήκευση
    }

    const gigData = {
        bandName: bandNameInput,
        venueName: venueNameInput,
        date: dateInput,
        rating: parseInt(document.getElementById('gigRating').value, 10),
        ticketPrice: parseFloat(document.getElementById('ticketPrice').value) || 0,
        genre: document.getElementById('gigGenre').value,
        poster: currentPosterBase64,
        notes: document.getElementById('gigNotes').value.trim()
    };

    if (editingGigId !== null) {
        await updateGig(editingGigId, gigData);
    } else {
        await addGig(gigData);
    }

    gigForm.reset();
    currentPosterBase64 = '';
    gigModal.style.display = 'none';
    editingGigId = null;
    loadData();
});

async function loadData() {
    allGigsCache = await getAllGigs();
    updateStatsUI(allGigsCache);
    populateYearDropdown(allGigsCache);
    filterAndRenderGigs();
}

function populateYearDropdown(gigs) {
    const years = [...new Set(gigs.map(g => g.date ? g.date.substring(0, 4) : '').filter(Boolean))].sort((a, b) => b - a);
    yearFilter.innerHTML = '<option value="all">All Years</option>';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });
}

searchInput.addEventListener('input', filterAndRenderGigs);
yearFilter.addEventListener('change', filterAndRenderGigs);

function filterAndRenderGigs() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedYear = yearFilter.value;

    const filtered = allGigsCache.filter(gig => {
        const band = (gig.bandName || '').toLowerCase();
        const venue = (gig.venueName || '').toLowerCase();
        const genre = (gig.genre || '').toLowerCase();
        const gigYear = gig.date ? gig.date.substring(0, 4) : '';
        return (band.includes(searchTerm) || venue.includes(searchTerm) || genre.includes(searchTerm)) && (selectedYear === 'all' || gigYear === selectedYear);
    });

    renderTimeline(filtered);
}

function renderTimeline(gigs) {
    if (!gigs.length) {
        timeline.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 2rem;">No entries found.</p>';
        return;
    }
    timeline.innerHTML = '';
    gigs.forEach(gig => {
        const card = document.createElement('div');
        card.className = 'gig-card';
        
        const stars = '★'.repeat(gig.rating || 5) + '☆'.repeat(5 - (gig.rating || 5));
        const priceText = gig.ticketPrice ? ` | 💶 ${gig.ticketPrice.toFixed(2)}€` : '';
        const genreBadge = gig.genre ? `<span class="genre-badge">${escapeHtml(gig.genre)}</span>` : '';
        const notesHtml = gig.notes ? `<div class="gig-notes">${escapeHtml(gig.notes)}</div>` : '';
        
        const posterThumbHtml = gig.poster 
            ? `<img src="${gig.poster}" class="gig-poster-thumb" onclick="window.showImageModal('${gig.poster}')" title="View Ticket/Poster">` 
            : '';

        card.innerHTML = `
            <div class="card-main-content">
                <div style="flex-grow: 1;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.3rem;">
                        <h3>${escapeHtml(gig.bandName)}</h3>
                        ${genreBadge}
                    </div>
                    <div class="gig-meta">
                        <span>📍 ${escapeHtml(gig.venueName)}</span>
                        <span>📅 ${gig.date || ''}</span>
                        <span class="gig-rating">${stars}</span>
                        <span>${priceText}</span>
                    </div>
                    ${notesHtml}
                </div>
                ${posterThumbHtml}
            </div>
            <div class="card-actions" style="margin-top: 0.75rem; justify-content: flex-end;">
                <button onclick="window.editGig(${gig.id})" title="Edit">✏️</button>
                <button class="delete-btn" onclick="window.deleteGig(${gig.id})" title="Delete">🗑️</button>
            </div>
        `;
        timeline.appendChild(card);
    });
}

function escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// Image modal helpers
window.showImageModal = function(src) {
    modalImagePreview.src = src;
    imageModal.style.display = 'flex';
};

if (closeImageModal) {
    closeImageModal.addEventListener('click', () => {
        imageModal.style.display = 'none';
    });
}

window.addEventListener('click', (e) => {
    if (e.target === imageModal) {
        imageModal.style.display = 'none';
    }
});

window.editGig = async function(id) {
    const gig = await getGigById(id);
    if (!gig) return;
    editingGigId = id;
    currentPosterBase64 = gig.poster || '';
    document.getElementById('bandName').value = gig.bandName || '';
    document.getElementById('venueName').value = gig.venueName || '';
    document.getElementById('gigDate').value = gig.date || '';
    document.getElementById('gigRating').value = gig.rating || 5;
    document.getElementById('ticketPrice').value = gig.ticketPrice || 0;
    document.getElementById('gigGenre').value = gig.genre || 'Rock';
    document.getElementById('gigNotes').value = gig.notes || '';
    gigModal.style.display = 'flex';
};

function showConfirmDialog(message, title = "Επιβεβαίωση", okText = "Επιβεβαίωση", isDanger = true) {
    return new Promise((resolve) => {
        const confirmModal = document.getElementById('confirmModal');
        const confirmTitle = document.getElementById('confirmTitle');
        const confirmMessage = document.getElementById('confirmMessage');
        const confirmOkBtn = document.getElementById('confirmOkBtn');
        const confirmCancelBtn = document.getElementById('confirmCancelBtn');

        if (confirmTitle) confirmTitle.textContent = title;
        if (confirmMessage) confirmMessage.textContent = message;
        if (confirmOkBtn) {
            confirmOkBtn.textContent = okText;
            if (isDanger) {
                confirmOkBtn.style.background = 'var(--danger, #ef4444)';
                confirmOkBtn.style.color = '#fff';
            } else {
                confirmOkBtn.style.background = 'linear-gradient(135deg, var(--accent-gold), #d99f22)';
                confirmOkBtn.style.color = '#04060b';
            }
        }

        if (confirmModal) confirmModal.style.display = 'flex';

        // Ασφαλής αντικατάσταση για καθαρισμό παλιών listeners
        const newOkBtn = confirmOkBtn.cloneNode(true);
        const newCancelBtn = confirmCancelBtn.cloneNode(true);
        confirmOkBtn.parentNode.replaceChild(newOkBtn, confirmOkBtn);
        confirmCancelBtn.parentNode.replaceChild(newCancelBtn, confirmCancelBtn);

        document.getElementById('confirmOkBtn').addEventListener('click', () => {
            if (confirmModal) confirmModal.style.display = 'none';
            resolve(true);
        }, { once: true });

        document.getElementById('confirmCancelBtn').addEventListener('click', () => {
            if (confirmModal) confirmModal.style.display = 'none';
            resolve(false);
        }, { once: true });

        window.onclick = (e) => {
            if (e.target === confirmModal) {
                confirmModal.style.display = 'none';
                resolve(false);
            }
        };
    });
}

window.deleteGig = async function(id) {
    const confirmed = await showConfirmDialog('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την καταχώρηση;', 'Διαγραφή Live', 'Διαγραφή', true);
    if (confirmed) {
        try {
            await deleteGigFromDb(id);
            loadData();
        } catch (err) {
            console.error('Failed to delete gig:', err);
        }
    }
};

exportJsonBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allGigsCache, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `gig_passport_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
});

importJsonBtn.addEventListener('click', () => {
    importFileInput.click();
});

importFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
            if (Array.isArray(importedData)) {
                await clearAndImportGigs(importedData);
                loadData();
                alert('Backup restored successfully!');
            } else {
                alert('Invalid JSON format.');
            }
        } catch (err) {
            console.error('Import failed:', err);
            alert('Failed to parse JSON file.');
        }
    };
    reader.readAsText(file);
    importFileInput.value = '';
});

exportPdfBtn.addEventListener('click', () => {
    window.print();
});