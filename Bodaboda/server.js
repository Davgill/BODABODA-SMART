Here is your fully updated `server.js` fiimport express from 'express';
import cors from 'cors';
import sqlite3Package from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// Fix __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize sqlite3 with verbose tracing
const sqlite3 = sqlite3Package.verbose();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware configuration
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from project directory
app.use(express.static(__dirname));

// Initialize persistent SQLite database connection
const db = new sqlite3.Database('bodasmart.db', (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected successfully to the persistent SQLite database (bodasmart.db).');
    }
});

// Database schema setup & default seeding
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY, 
        value REAL
    )`, (err) => {
        if (!err) {
            db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('fuel_price', 200.0)`);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        user_id INTEGER,
        rider_name TEXT,
        rider_id_number TEXT,
        distance_km REAL, 
        fare REAL, 
        profit REAL, 
        pickup_lat REAL, 
        pickup_lon REAL, 
        dropoff_lat REAL, 
        dropoff_lon REAL, 
        timestamp TEXT
    )`, (err) => {
        if (err) console.error("Error creating trips table:", err.message);
    });
    
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        id_number TEXT NOT NULL,
        bike_model TEXT,
        number_plate TEXT UNIQUE NOT NULL,
        phone_number TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        reset_token TEXT,
        created_at DATETIME DEFAULT (DATETIME('now', 'localtime'))
    )`, (err) => {
        if (err) console.error("Error creating users table:", err.message);
    });

    console.log('Database tables and initial configurations verified.');
});

// Utility: Calculate great-circle distance using the Haversine formula
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in kilometers
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// ==========================================
// VIEW / PAGE ROUTES
// ==========================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'), (err) => {
        if (err) {
            res.status(500).send("Error loading rider portal interface (index.html).");
        }
    });
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'), (err) => {
        if (err) {
            res.status(404).send("Authentication interface (login.html) not found.");
        }
    });
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'), (err) => {
        if (err) {
            res.status(404).send("Admin audit dashboard interface (admin.html) not found.");
        }
    });
});

// ==========================================
// AUTHENTICATION API ENDPOINTS (Dual paths supported)
// ==========================================

function handleRegistration(req, res) {
    const name = req.body.name || req.body.full_name;
    const id_number = req.body.id_number || req.body.national_id;
    const bike_model = req.body.bike_model;
    const number_plate = req.body.number_plate;
    const phone_number = req.body.phone_number;
    const email = req.body.email;
    const password = req.body.password;
    
    if (!name || !id_number || !number_plate || !phone_number || !email || !password) {
        return res.status(400).json({ error: "All required registration fields must be completed." });
    }

    const query = `INSERT INTO users (name, id_number, bike_model, number_plate, phone_number, email, password) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [name, id_number, bike_model || 'Standard', number_plate.toUpperCase(), phone_number, email, password];

    db.run(query, params, function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: "An account with this email or number plate already exists." });
            }
            return res.status(500).json({ error: "Database error during registration: " + err.message });
        }
        res.status(201).json({ 
            message: "Rider registration successful!", 
            userId: this.lastID 
        });
    });
}

function handleLogin(req, res) {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required for login." });
    }

    const query = `SELECT * FROM users WHERE email = ? AND password = ?`;
    db.get(query, [email, password], (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Database error during authentication: " + err.message });
        }
        if (!row) {
            return res.status(401).json({ error: "Invalid login credentials provided." });
        }
        
        res.json({ 
            message: "Login successful", 
            id: row.id,
            name: row.name,
            email: row.email, 
            id_number: row.id_number,
            number_plate: row.number_plate,
            bike_model: row.bike_model,
            phone_number: row.phone_number
        });
    });
}

app.post('/api/auth/register', handleRegistration);
app.post('/api/register', handleRegistration);

app.post('/api/auth/login', handleLogin);
app.post('/api/login', handleLogin);

// ==========================================
// TRIP CALCULATION & LOGGING API ENDPOINTS
// ==========================================

app.get('/api/dashboard', (req, res) => {
    db.get(`SELECT value FROM config WHERE key = 'fuel_price'`, [], (err, fuelRow) => {
        if (err) return res.status(500).json({ error: err.message });

        db.get(`SELECT AVG(fare) as avg_fare FROM trips`, [], (err, tripRow) => {
            if (err) return res.status(500).json({ error: err.message });

            res.json({
                fuel_price_ksh: fuelRow ? fuelRow.value : 200.0,
                avg_fare_ksh: tripRow?.avg_fare ? Math.round(tripRow.avg_fare) : 0
            });
        });
    });
});

app.post('/api/trips/calculate', (req, res) => {
    const { pickup_lat, pickup_lon, dropoff_lat, dropoff_lon } = req.body;

    if ([pickup_lat, pickup_lon, dropoff_lat, dropoff_lon].some(coord => coord === undefined || isNaN(coord))) {
        return res.status(400).json({ error: "Incomplete or invalid GPS coordinate parameters supplied." });
    }

    let distanceKm = calculateDistanceKm(pickup_lat, pickup_lon, dropoff_lat, dropoff_lon);
    if (distanceKm < 0.2) distanceKm = 0.5;

    db.get(`SELECT value FROM config WHERE key = 'fuel_price'`, [], (err, fuelRow) => {
        if (err) return res.status(500).json({ error: "Failed to retrieve global fuel configurations." });

        const fuelPrice = fuelRow ? fuelRow.value : 200.0;
        const estimatedFare = 50 + (distanceKm * (fuelPrice * 0.2));

        res.json({
            distance_km: parseFloat(distanceKm.toFixed(2)),
            estimated_fare_ksh: Math.round(estimatedFare),
            current_fuel_index_used: fuelPrice
        });
    });
});

app.post('/api/trips/log', (req, res) => {
    const resolvedUserId = req.body.user_id || req.body.id || null;
    const resolvedRiderName = req.body.rider_name || req.body.name || req.body.username || 'Guest Rider';
    const resolvedRiderId = req.body.rider_id_number || req.body.national_id || req.body.id_number || req.body.id || 'N/A';

    const { distance_km, fare, pickup_lat, pickup_lon, dropoff_lat, dropoff_lon } = req.body;

    if (pickup_lat === undefined || pickup_lon === undefined) {
        return res.status(400).json({ error: "Trip logging requires mandatory pickup GPS coordinates." });
    }

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const query = `INSERT INTO trips (user_id, rider_name, rider_id_number, distance_km, fare, profit, pickup_lat, pickup_lon, dropoff_lat, dropoff_lon, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
        resolvedUserId,
        resolvedRiderName,
        resolvedRiderId,
        distance_km || 0,
        fare || 0,
        fare || 0,
        pickup_lat,
        pickup_lon,
        dropoff_lat || 0,
        dropoff_lon || 0,
        timestamp
    ];

    db.run(query, params, function(err) {
        if (err) {
            return res.status(500).json({ error: "Failed to save trip log entry: " + err.message });
        }
        res.status(201).json({ 
            message: "Trip successfully logged to database audit logs.", 
            tripId: this.lastID 
        });
    });
});

// ==========================================
// ADMIN DASHBOARD & AUDIT API ENDPOINTS
// ==========================================

app.get('/api/admin/metrics', (req, res) => {
    const query = `SELECT COUNT(*) as total_trips, SUM(fare) as total_revenue, SUM(distance_km) as total_distance FROM trips`;
    db.get(query, [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            total_trips: row.total_trips || 0,
            total_revenue_ksh: Math.round(row.total_revenue || 0),
            total_distance_km: parseFloat((row.total_distance || 0).toFixed(2))
        });
    });
});

app.get('/api/admin/trips', (req, res) => {
    db.all(`SELECT * FROM trips ORDER BY id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ 
            total_trips_logged: rows.length, 
            trips: rows 
        });
    });
});

app.delete('/api/admin/trips/:id', (req, res) => {
    const tripId = req.params.id;
    db.run(`DELETE FROM trips WHERE id = ?`, [tripId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Trip record deleted successfully.", deletedId: tripId });
    });
});

app.get('/api/admin/users', (req, res) => {
    db.all(`SELECT id, name, id_number, bike_model, number_plate, phone_number, email, created_at FROM users ORDER BY id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ 
            total_users: rows.length, 
            users: rows 
        });
    });
});

app.delete('/api/admin/users/:id', (req, res) => {
    const userId = req.params.id;
    db.run(`DELETE FROM users WHERE id = ?`, [userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Registered user account deleted successfully.", deletedId: userId });
    });
});

app.post('/api/admin/config/fuel', (req, res) => {
    const { fuel_price } = req.body;

    if (fuel_price === undefined || isNaN(fuel_price) || fuel_price <= 0) {
        return res.status(400).json({ error: "A valid numerical fuel price value is required." });
    }

    const query = `INSERT OR REPLACE INTO config (key, value) VALUES ('fuel_price', ?)`;
    db.run(query, [parseFloat(fuel_price)], (err) => {
        if (err) {
            return res.status(500).json({ error: "Failed to update global fuel price setting: " + err.message });
        }
        res.json({ 
            message: "Global fuel price configuration updated successfully.", 
            fuel_price: parseFloat(fuel_price) 
        });
    });
});

app.use((req, res) => {
    res.status(404).json({ error: "Requested API endpoint not found on BodaSmart server." });
});

app.listen(PORT, () => {
    console.log(`BodaSmart backend server running live at http://localhost:${PORT}`);
});