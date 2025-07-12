const apiKey = 'e70a4b3a1bd06d0687aea005dde94afa'; // Your OpenWeatherMap API key
const cityInput = document.getElementById('cityInput');
const citiesListDiv = document.getElementById('citiesList');
const errorMessageElement = document.getElementById('errorMessage');
let citiesWeatherData = JSON.parse(localStorage.getItem('citiesWeatherData')) || [];

// Display saved cities on page load
window.onload = () => {
    if (citiesWeatherData.length > 0) {
        displayCities();
    }
};

// Add Enter key support for search
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        fetchWeather();
    }
});

async function fetchWeather() {
    const city = cityInput.value.trim();
    if (!city) {
        showError('Please enter a city name.');
        return;
    }

    // Validate city input
    if (!/^[a-zA-Z\s,]+$/.test(city)) {
        showError('City name should only contain letters, spaces, or commas (e.g., "New York,US").');
        return;
    }

    // Normalize city name for duplicate check
    const normalizedCity = city.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (citiesWeatherData.some(data => data.normalizedCity === normalizedCity)) {
        showError('City already added.');
        return;
    }

    try {
        // Add a delay to avoid hitting API rate limits
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Fetch current weather
        const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;
        let currentResponse;
        try {
            currentResponse = await fetch(currentWeatherUrl);
        } catch (networkError) {
            throw new Error(`Network error while fetching current weather: ${networkError.message}. Please check your internet connection.`);
        }
        if (!currentResponse.ok) {
            const errorData = await currentResponse.json();
            throw new Error(`Current weather fetch failed (Status: ${currentResponse.status}, Message: ${errorData.message}). Possible causes: Invalid API key, rate limit exceeded, or API service issue.`);
        }
        const currentData = await currentResponse.json();
        console.log(`Current weather for ${city}:`, currentData);

        // Fetch 5-day forecast
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${apiKey}`;
        let forecastResponse;
        try {
            forecastResponse = await fetch(forecastUrl);
        } catch (networkError) {
            throw new Error(`Network error while fetching forecast: ${networkError.message}. Please check your internet connection.`);
        }
        if (!forecastResponse.ok) {
            const errorData = await forecastResponse.json();
            throw new Error(`Forecast fetch failed (Status: ${forecastResponse.status}, Message: ${errorData.message}). Possible causes: Invalid API key, rate limit exceeded, or API service issue.`);
        }
        const forecastData = await forecastResponse.json();
        console.log(`Forecast for ${city}:`, forecastData);

        // Add city data to the list
        citiesWeatherData.push({
            city: city,
            normalizedCity: normalizedCity,
            current: currentData,
            forecast: forecastData
        });

        // Save to localStorage
        localStorage.setItem('citiesWeatherData', JSON.stringify(citiesWeatherData));

        // Update background based on the first city's weather
        if (citiesWeatherData.length > 0) {
            const weatherMain = citiesWeatherData[0].current.weather[0].main.toLowerCase();
            document.body.setAttribute('data-weather', weatherMain);
        }

        // Display all cities
        displayCities();
        errorMessageElement.style.display = 'none';
    } catch (error) {
        console.error(`Error fetching data for ${city}:`, error.message);
        showError(error.message.includes('City not found') ? 'City not found. Please try again with a valid city name (e.g., "New York,US").' : `Error: ${error.message}`);
    }

    // Clear input field
    cityInput.value = '';
}

function displayCities() {
    citiesListDiv.innerHTML = '';
    citiesWeatherData.forEach((cityData, index) => {
        // Check if cityData has valid data
        if (!cityData.current || !cityData.forecast) {
            console.warn(`Invalid data for city at index ${index}:`, cityData);
            return;
        }

        const cityDiv = document.createElement('div');
        cityDiv.classList.add('city-weather');
        cityDiv.innerHTML = `
            <button class="remove-btn" onclick="removeCity(${index})">×</button>
            <div class="current-weather">
                <div class="weather-info">
                    <h2>${cityData.current.name}</h2>
                    <div class="temp">${Math.round(cityData.current.main.temp)}°C</div>
                    <div class="description">${cityData.current.weather[0].description.charAt(0).toUpperCase() + cityData.current.weather[0].description.slice(1)}</div>
                    <div class="details">
                        <p>Humidity: <span>${cityData.current.main.humidity}%</span></p>
                        <p>Wind Speed: <span>${cityData.current.wind.speed} m/s</span></p>
                    </div>
                </div>
                <img src="http://openweathermap.org/img/wn/${cityData.current.weather[0].icon}@2x.png" alt="Weather Icon">
            </div>
            <div class="forecast" id="forecast-${index}">
                <!-- Forecast cards will be added here -->
            </div>
        `;
        citiesListDiv.appendChild(cityDiv);

        // Display forecast for this city
        const forecastDiv = document.getElementById(`forecast-${index}`);
        const dailyData = cityData.forecast.list.filter(reading => reading.dt_txt.includes('12:00:00')).slice(0, 5);
        dailyData.forEach((day, dayIndex) => {
            // Use current date to calculate forecast dates
            const currentDate = new Date('2025-06-03T02:47:00+05:30'); // Current date and time in IST
            const forecastDate = new Date(currentDate);
            forecastDate.setDate(currentDate.getDate() + dayIndex);
            const dayElement = document.createElement('div');
            dayElement.classList.add('forecast-day');
            dayElement.innerHTML = `
                <div class="date">${forecastDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                <img src="http://openweathermap.org/img/wn/${day.weather[0].icon}.png" alt="Weather Icon">
                <div class="temp">${Math.round(day.main.temp)}°C</div>
            `;
            forecastDiv.appendChild(dayElement);
        });
    });
}

function removeCity(index) {
    citiesWeatherData.splice(index, 1);
    localStorage.setItem('citiesWeatherData', JSON.stringify(citiesWeatherData));
    // Update background after removal
    if (citiesWeatherData.length > 0) {
        const weatherMain = citiesWeatherData[0].current.weather[0].main.toLowerCase();
        document.body.setAttribute('data-weather', weatherMain);
    } else {
        document.body.setAttribute('data-weather', 'clear');
    }
    displayCities();
}

function showError(message) {
    errorMessageElement.textContent = message;
    errorMessageElement.style.display = 'block';
}