let chart; 
let ws; 
const chartData = { ETH: [], BNB: [], DOT: [] }; // Store data for each coin

// Function to generate WebSocket URL dynamically based on coin and interval
function getWebSocketURL(coin, interval) {
    return `wss://stream.binance.com:9443/ws/${coin.toLowerCase()}usdt@kline_${interval}`;
}

// Function to initialize the candlestick chart
function initChart() {
    const ctx = document.getElementById('chart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'candlestick', 
                data: {
            datasets: [{
                label: 'Candlestick Chart',
                data: [] 
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
                        tooltipFormat: 'MMM dd, hh:mm a'
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
    console.log('Updating chart with data:', chartData[coin]);
    chart.data.datasets[0].data = chartData[coin];
    chart.update();
}

// Function to open a WebSocket connection for the selected coin and interval
function openWebSocket(coin, interval) {
    const wsURL = getWebSocketURL(coin, interval);
    if (ws) {
        ws.close(); 
    }
    ws = new WebSocket(wsURL);

    ws.onopen = () => {
        console.log(`WebSocket connected for ${coin} at ${interval} interval`);
    };

    ws.onmessage = (event) => {
        console.log('Received message:', event.data); 
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

    if (message.k) { 
        const kline = message.k;
        const candlestick = {
            x: new Date(kline.t), 
            o: parseFloat(kline.o), 
            h: parseFloat(kline.h), 
            l: parseFloat(kline.l), 
            c: parseFloat(kline.c)          };

        console.log('New candlestick:', candlestick);

        const lastCandle = chartData[coin].length ? chartData[coin][chartData[coin].length - 1] : null;
        if (!lastCandle || lastCandle.x.getTime() !== candlestick.x.getTime()) {
            chartData[coin].push(candlestick);

            if (chartData[coin].length > 100) {
                chartData[coin].shift();
            }

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

// Save data in localStorage
function saveChartData(coin, data) {
    localStorage.setItem(coin, JSON.stringify(data));
}

// Retrieve data from localStorage
function getStoredChartData(coin) {
    const storedData = localStorage.getItem(coin);
    return storedData ? JSON.parse(storedData) : [];
}

// Update the chart with stored data
function updateChartWithStoredData(coin) {
    const storedData = getStoredChartData(coin);
    if (storedData.length > 0) {
        chart.data.datasets[0].data = storedData;
        chart.update();
    }
}

// Handle new WebSocket data
function handleNewWebSocketData(coin, newData) {
    let currentData = getStoredChartData(coin);
    currentData.push(newData);
    if (currentData.length > 100) {
        currentData.shift();
    }

    saveChartData(coin, currentData);

    // Update the chart with new data
    chart.data.datasets[0].data = currentData;
    chart.update();
}

// Switch between coins and update chart
function switchCoin(coin) {
    updateChartWithStoredData(coin);
    connectWebSocketForCoin(coin);
}

// WebSocket connection for selected coin
function connectWebSocketForCoin(coin) {
    const wsURL = getWebSocketURL(coin, '1m'); 
    const ws = new WebSocket(wsURL);

    ws.onmessage = function (event) {
        const data = JSON.parse(event.data);
        const candlestickData = transformToCandlestickFormat(data); 
        
        handleNewWebSocketData(coin, candlestickData);
    };
}

