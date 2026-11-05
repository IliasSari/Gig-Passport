/* --- Database Module (Dexie.js) --- */
export const db = new Dexie('GigPassportDB');

db.version(1).stores({
    gigs: '++id, bandName, venueName, date, rating'
});

export async function getAllGigs() {
    const gigs = await db.gigs.toArray();
    gigs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return gigs;
}

export async function addGig(gigData) {
    return await db.gigs.add(gigData);
}

export async function updateGig(id, gigData) {
    return await db.gigs.update(id, gigData);
}

export async function deleteGigFromDb(id) {
    return await db.gigs.delete(id);
}

export async function getGigById(id) {
    return await db.gigs.get(id);
}