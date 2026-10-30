/* First step Database Initialization (IndexedDB via Dexie) */

// Initialize Dexie database
const db = new Dexie('GigPassportDB');

// Define database schema / tables and fields
db.version(1).stores({
    gigs: '++id, bandName, venueName, date, rating'
});

// Test database connection / log state on load
db.open().then(() => {
    console.log('Database successfully initialized and connected!');
}).catch(err => {
    console.error('Failed to open database: ', err);
});