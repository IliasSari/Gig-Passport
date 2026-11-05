/* --- Stats & Charts Module --- */
let myChart = null;

export function updateStatsUI(gigs) {
    const totalGigsEl = document.getElementById('totalGigs');
    const uniqueBandsEl = document.getElementById('uniqueBands');
    const topVenueEl = document.getElementById('topVenue');

    const totalGigs = gigs.length;
    totalGigsEl.textContent = totalGigs;

    if (totalGigs === 0) {
        uniqueBandsEl.textContent = '0';
        topVenueEl.textContent = '-';
        renderChart([]);
        return;
    }

    const uniqueBandsSet = new Set(gigs.map(gig => gig.bandName.trim().toLowerCase()));
    uniqueBandsEl.textContent = uniqueBandsSet.size;

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

    renderChart(gigs);
}

function renderChart(gigs) {
    const canvas = document.getElementById('gigsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const yearCounts = {};
    gigs.forEach(gig => {
        if (gig.date) {
            const year = gig.date.substring(0, 4);
            yearCounts[year] = (yearCounts[year] || 0) + 1;
        }
    });

    const years = Object.keys(yearCounts).sort();
    const counts = years.map(y => yearCounts[y]);

    if (myChart) {
        myChart.destroy();
    }

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years.length > 0 ? years : ['No Data'],
            datasets: [{
                label: 'Concerts',
                data: years.length > 0 ? counts : [0],
                backgroundColor: 'rgba(240, 180, 41, 0.6)',
                borderColor: '#f0b429',
                borderWidth: 1
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}