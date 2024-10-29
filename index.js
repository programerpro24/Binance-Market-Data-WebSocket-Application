let chart; // Chart.js instance
let ws; // WebSocket instance
const chartData = { ETH: [], BNB: [], DOT: [] }; // Store data for each coin

// Function to generate WebSocket URL dynamically based on coin and interval
function getWebSocketURL(coin, interval) {
    return `wss://stream.binance.com:9443/ws/${coin.toLowerCase()}usdt@kline_${interval}`;
}

// Function to initialize the candlestick chart
function initChart() {
    const ctx = document.getElementById('chart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'candlestick', // candlestick type from chartjs-chart-financial
        data: {
            datasets: [{
                label: 'Candlestick Chart',
                data: [] // Will be updated with real-time data
            }]
        },
        options: {
            plugins: {
                legend: {
                    display: false 
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute',
                        tooltipFormat: 'MMM dd, hh:mm a' // Format for time on x-axis
                    },
                    ticks: {
                        source: 'auto',
                        maxRotation: 0,
                        autoSkip: true
                    }
                },
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Price (USDT)'
                    }
                }
            }
        }
    });
}


// Function to update the chart with new data
function updateChart(coin) {
    console.log('Updating chart with data:', chartData[coin]); // Debug log
    chart.data.datasets[0].data = chartData[coin]; // Set chart data to the selected coin's data
    chart.update();
}

// Function to open a WebSocket connection for the selected coin and interval
function openWebSocket(coin, interval) {
    const wsURL = getWebSocketURL(coin, interval);
    if (ws) {
        ws.close(); // Close any previous WebSocket connection
    }
    ws = new WebSocket(wsURL);

    ws.onopen = () => {
        console.log(`WebSocket connected for ${coin} at ${interval} interval`);
    };

    ws.onmessage = (event) => {
        console.log('Received message:', event.data); // Debug log
        handleWebSocketMessage(event, coin);
    };

    ws.onerror = (error) => {
        console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
        console.log("WebSocket connection closed");
    };
}

// Function to handle incoming WebSocket messages and update the chart data
function handleWebSocketMessage(event, coin) {
    const message = JSON.parse(event.data);

    if (message.k) { // If the message contains candlestick data
        const kline = message.k;
        const candlestick = {
            x: new Date(kline.t),  // Time of the kline
            o: parseFloat(kline.o), // Open price
            h: parseFloat(kline.h), // High price
            l: parseFloat(kline.l), // Low price
            c: parseFloat(kline.c)  // Close price
        };

        console.log('New candlestick:', candlestick); // Debug log

        // Only push new candlesticks, avoid duplicates
        const lastCandle = chartData[coin].length ? chartData[coin][chartData[coin].length - 1] : null;
        if (!lastCandle || lastCandle.x.getTime() !== candlestick.x.getTime()) {
            chartData[coin].push(candlestick);

            // Limit the number of data points on the chart for better performance
            if (chartData[coin].length > 100) {
                chartData[coin].shift();
            }

            // Update the chart with the new data
            updateChart(coin);
        }
    }
}

// Event listeners for dropdowns
document.getElementById('crypto-select').addEventListener('change', () => {
    const coin = document.getElementById('crypto-select').value;
    const interval = document.getElementById('time-interval').value;
    openWebSocket(coin, interval);
});

document.getElementById('time-interval').addEventListener('change', () => {
    const coin = document.getElementById('crypto-select').value;
    const interval = document.getElementById('time-interval').value;
    openWebSocket(coin, interval);
});

// Initialize the chart when the page loads
window.onload = () => {
    initChart();
    const coin = document.getElementById('crypto-select').value;
    const interval = document.getElementById('time-interval').value;
    openWebSocket(coin, interval);
};

// 1. Save data in localStorage
function saveChartData(coin, data) {
    localStorage.setItem(coin, JSON.stringify(data));
}

// 2. Retrieve data from localStorage
function getStoredChartData(coin) {
    const storedData = localStorage.getItem(coin);
    return storedData ? JSON.parse(storedData) : [];
}

// 3. Update the chart with stored data
function updateChartWithStoredData(coin) {
    const storedData = getStoredChartData(coin);
    if (storedData.length > 0) {
        chart.data.datasets[0].data = storedData;
        chart.update();
    }
}

// 4. Handle new WebSocket data
function handleNewWebSocketData(coin, newData) {
    let currentData = getStoredChartData(coin);
    currentData.push(newData);

    // Limit the stored data to the most recent 100 candles (optional)
    if (currentData.length > 100) {
        currentData.shift();
    }

    saveChartData(coin, currentData);

    // Update the chart with new data
    chart.data.datasets[0].data = currentData;
    chart.update();
}

// 5. Switch between coins and update chart
function switchCoin(coin) {
    // Fetch historical data for the new coin
    updateChartWithStoredData(coin);

    // Re-establish WebSocket connection for real-time updates
    connectWebSocketForCoin(coin);
}

// 6. WebSocket connection for selected coin
function connectWebSocketForCoin(coin) {
    const wsURL = getWebSocketURL(coin, '1m'); // Adjust interval if needed
    const ws = new WebSocket(wsURL);

    ws.onmessage = function (event) {
        const data = JSON.parse(event.data);
        const candlestickData = transformToCandlestickFormat(data); // Transform WebSocket data
        
        // Handle new data for the active coin
        handleNewWebSocketData(coin, candlestickData);
    };
}

