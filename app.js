/* --- Main Application Controller --- */
import { getAllGigs, addGig, updateGig, deleteGigFromDb, getGigById } from './db.js';
import { updateStatsUI } from './stats.js';

const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const gigModal = document.getElementById('gigModal');
const gigForm = document.getElementById('gigForm');
const timeline = document.getElementById('timeline');
const searchInput = document.getElementById('searchInput');
const yearFilter = document.getElementById('yearFilter');

let editingGigId = null;
let allGigsCache = [];

window.addEventListener('DOMContentLoaded', () => {
    loadData();
});

openModalBtn.addEventListener('click', () => {
    editingGigId = null;
    gigForm.reset();
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
        timeline.innerHTML = '<p style="text-align:center; padding: 2rem;">No entries found.</p>';
        return;
    }
    timeline.innerHTML = '';
    gigs.forEach(gig => {
        const card = document.createElement('div');
        card.className = 'gig-card';
        card.innerHTML = `
            <h3>${gig.bandName}</h3>
            <p>📍 ${gig.venueName} | 📅 ${gig.date}</p>
        `;
        timeline.appendChild(card);
    });
}