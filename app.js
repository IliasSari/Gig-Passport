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

// --- 1. Modal Toggle Handlers ---
openModalBtn.addEventListener('click', () => {
    gigModal.style.display = 'flex';
});

closeModalBtn.addEventListener('click', () => {
    gigModal.style.display = 'none';
    gigForm.reset();
});

// Close modal if clicking outside the modal content box
window.addEventListener('click', (e) => {
    if (e.target === gigModal) {
        gigModal.style.display = 'none';
        gigForm.reset();
    }
});

// --- 2. Handle New Gig Form Submission ---
gigForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent page reload

    // Collect values from form inputs
    const newGig = {
        bandName: document.getElementById('bandName').value.trim(),
        venueName: document.getElementById('venueName').value.trim(),
        date: document.getElementById('gigDate').value,
        rating: parseInt(document.getElementById('gigRating').value, 10),
        notes: document.getElementById('gigNotes').value.trim()
    };

    try {
        // Save the gig into IndexedDB via Dexie
        await db.gigs.add(newGig);
        console.log('Gig successfully saved to local database!', newGig);

        // Reset form, close modal, and refresh UI
        gigForm.reset();
        gigModal.style.display = 'none';

        // Placeholder alert until we render the timeline in Step 3
        alert('The live was successfully saved locally to your database.!');
        
    } catch (err) {
        console.error('Failed to save gig: ', err);
        alert('There was a problem with saving.');
    }
});