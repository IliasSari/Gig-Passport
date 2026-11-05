/* --- Stats & Charts Module --- */

let myChart = null;

function formatVenueName(name) {
    if (!name) return '';
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export function updateStatsUI(gigs) {
    const totalGigsEl = document.getElementById('totalGigs');
    const uniqueBandsEl = document.getElementById('uniqueBands');
    const totalSpentEl = document.getElementById('totalSpent');
    const topVenueEl = document.getElementById('topVenue');
    const moneyBreakdownEl = document.getElementById('moneyBreakdown');
    const venueBreakdownEl = document.getElementById('venueBreakdown');

    const totalGigs = gigs.length;
    totalGigsEl.textContent = totalGigs;

    if (totalGigs === 0) {
        uniqueBandsEl.textContent = '0';
        totalSpentEl.textContent = '0€';
        topVenueEl.textContent = '-';
        moneyBreakdownEl.innerHTML = '<p style="color: #9ca3af;">No data yet.</p>';
        venueBreakdownEl.innerHTML = '<p style="color: #9ca3af;">No data yet.</p>';
        renderChart([]);
        return;
    }

    const uniqueBandsSet = new Set(gigs.map(gig => gig.bandName.trim().toLowerCase()));
    uniqueBandsEl.textContent = uniqueBandsSet.size;

    let totalSpent = 0;
    const spentPerYear = {};
    const venuesPerYear = {};
    const venueGlobalCounts = {};

    gigs.forEach(gig => {
        const price = Number(gig.ticketPrice) || 0;
        totalSpent += price;

        const rawVenue = (gig.venueName || '').trim();
        if (rawVenue) {
            const venueKey = rawVenue.toLowerCase();
            const cleanVenueName = formatVenueName(rawVenue);

            venueGlobalCounts[venueKey] = (venueGlobalCounts[venueKey] || { count: 0, name: cleanVenueName });
            venueGlobalCounts[venueKey].count += 1;

            if (gig.date) {
                const year = gig.date.substring(0, 4);
                spentPerYear[year] = (spentPerYear[year] || 0) + price;

                if (!venuesPerYear[year]) venuesPerYear[year] = {};
                venuesPerYear[year][venueKey] = (venuesPerYear[year][venueKey] || { count: 0, name: cleanVenueName });
                venuesPerYear[year][venueKey].count += 1;
            }
        }
    });

    totalSpentEl.textContent = `${totalSpent.toFixed(2)}€`;

    let topVenue = '-';
    let maxCount = 0;
    for (const data of Object.values(venueGlobalCounts)) {
        if (data.count > maxCount) {
            maxCount = data.count;
            topVenue = data.name;
        }
    }
    topVenueEl.textContent = topVenue;

    let moneyHtml = '<div class="breakdown-content" style="display: flex; flex-direction: column; gap: 6px;">';
    moneyHtml += `<div style="display:flex; justify-content:space-between; font-weight:600; color:#fff;"><span>Total Spent:</span> <span>${totalSpent.toFixed(2)}€</span></div>`;
    moneyHtml += '<div style="height:1px; background:rgba(255,255,255,0.08); margin:4px 0;"></div>';
    
    for (const [year, amount] of Object.entries(spentPerYear).sort().reverse()) {
        moneyHtml += `<div style="display:flex; justify-content:space-between; color:#d1d5db;"><span>📅 Year ${year}:</span> <span style="color:#f0b429; font-weight:600;">${amount.toFixed(2)}€</span></div>`;
    }
    moneyHtml += '</div>';
    moneyBreakdownEl.innerHTML = moneyHtml;

    let venueHtml = '<div class="breakdown-content" style="display: flex; flex-direction: column; gap: 8px;">';
    for (const [year, venuesObj] of Object.entries(venuesPerYear).sort().reverse()) {
        venueHtml += `<div><span style="color:#fff; font-weight:600;">📅 ${year}</span>`;
        for (const vData of Object.values(venuesObj)) {
            venueHtml += `<div style="display:flex; justify-content:space-between; padding-left: 10px; color: #9ca3af; font-size:0.8rem;"><span>• ${vData.name}</span> <span>${vData.count} time${vData.count > 1 ? 's' : ''}</span></div>`;
        }
        venueHtml += `</div>`;
    }
    venueHtml += '</div>';
    venueBreakdownEl.innerHTML = venueHtml;

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

    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(240, 180, 41, 0.85)');
    gradient.addColorStop(1, 'rgba(240, 180, 41, 0.15)');

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years.length > 0 ? years : ['No Data'],
            datasets: [{
                label: 'Concerts',
                data: years.length > 0 ? counts : [0],
                backgroundColor: gradient,
                borderColor: '#f0b429',
                borderWidth: 1.5,
                borderRadius: 6,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#111827',
                    titleColor: '#f0b429',
                    bodyColor: '#f3f4f6',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, color: '#9ca3af', font: { size: 11 } },
                    grid: { color: 'rgba(255,255,255,0.04)' }
                },
                x: {
                    ticks: { color: '#9ca3af', font: { size: 11 } },
                    grid: { display: false }
                }
            }
        }
    });
}