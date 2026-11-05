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

let editingGigId = null;
let allGigsCache = [];

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

gigForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const gigData = {
        bandName: document.getElementById('bandName').value.trim(),
        venueName: document.getElementById('venueName').value.trim(),
        date: document.getElementById('gigDate').value,
        rating: parseInt(document.getElementById('gigRating').value, 10),
        ticketPrice: parseFloat(document.getElementById('ticketPrice').value) || 0,
        notes: document.getElementById('gigNotes').value.trim()
    };

    if (editingGigId !== null) {
        await updateGig(editingGigId, gigData);
    } else {
        await addGig(gigData);
    }

    gigForm.reset();
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
        const gigYear = gig.date ? gig.date.substring(0, 4) : '';
        return (band.includes(searchTerm) || venue.includes(searchTerm)) && (selectedYear === 'all' || gigYear === selectedYear);
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
        const notesHtml = gig.notes ? `<div class="gig-notes">${escapeHtml(gig.notes)}</div>` : '';

        card.innerHTML = `
            <div style="flex-grow: 1;">
                <h3>${escapeHtml(gig.bandName)}</h3>
                <div class="gig-meta">
                    <span>📍 ${escapeHtml(gig.venueName)}</span>
                    <span>📅 ${gig.date || ''}</span>
                    <span class="gig-rating">${stars}</span>
                    <span>${priceText}</span>
                </div>
                ${notesHtml}
            </div>
            <div class="card-actions">
                <button onclick="window.editGig(${gig.id})" title="Edit">✏️</button>
                <button class="delete-btn" onclick="window.deleteGig(${gig.id})" title="Delete">🗑️</button>
            </div>
        `;
        timeline.appendChild(card);
    });
}

function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

window.editGig = async function(id) {
    const gig = await getGigById(id);
    if (!gig) return;
    editingGigId = id;
    document.getElementById('bandName').value = gig.bandName || '';
    document.getElementById('venueName').value = gig.venueName || '';
    document.getElementById('gigDate').value = gig.date || '';
    document.getElementById('gigRating').value = gig.rating || 5;
    document.getElementById('ticketPrice').value = gig.ticketPrice || 0;
    document.getElementById('gigNotes').value = gig.notes || '';
    document.querySelector('#gigForm h2') ? document.querySelector('#gigForm h2').textContent = 'Edit Live' : null;
    gigModal.style.display = 'flex';
};

function showConfirmDialog(message) {
    return new Promise((resolve) => {
        const confirmModal = document.getElementById('confirmModal');
        const confirmMessage = document.getElementById('confirmMessage');
        const confirmOkBtn = document.getElementById('confirmOkBtn');
        const confirmCancelBtn = document.getElementById('confirmCancelBtn');

        confirmMessage.textContent = message;
        confirmModal.style.display = 'flex';

        const newOkBtn = confirmOkBtn.cloneNode(true);
        const newCancelBtn = confirmCancelBtn.cloneNode(true);
        confirmOkBtn.parentNode.replaceChild(newOkBtn, confirmOkBtn);
        confirmCancelBtn.parentNode.replaceChild(newCancelBtn, confirmCancelBtn);

        document.getElementById('confirmOkBtn').addEventListener('click', () => {
            confirmModal.style.display = 'none';
            resolve(true);
        });

        document.getElementById('confirmCancelBtn').addEventListener('click', () => {
            confirmModal.style.display = 'none';
            resolve(false);
        });

        window.onclick = (e) => {
            if (e.target === confirmModal) {
                confirmModal.style.display = 'none';
                resolve(false);
            }
        };
    });
}

window.deleteGig = async function(id) {
    const confirmed = await showConfirmDialog('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την καταχώρηση;');
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