import express from "express";
import cors from "cors";
import sqlite3Package from "sqlite3";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlite3 = sqlite3Package.verbose();
const app = express();

const PORT = process.env.PORT || 5000;
const DATABASE_FILE =
    process.env.DATABASE_FILE || path.join(__dirname, "bodasmart.db");
const NOMINATIM_URL =
    process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org";
const PHOTON_URL =
    process.env.PHOTON_URL || "https://photon.komoot.io/api/";
const OSRM_URL =
    process.env.OSRM_URL || "https://router.project-osrm.org";
const NOMINATIM_USER_AGENT =
    process.env.NOMINATIM_USER_AGENT || "BodaSmartRiderPortal/1.0";
const SESSION_COOKIE = "bodasmart_session";
const ADMIN_SESSION_COOKIE = "bodasmart_admin_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const geocodeCache = new Map();
let lastGeocodingRequest = 0;
let geocodingQueue = Promise.resolve();

const db = new sqlite3.Database(DATABASE_FILE, (error) => {
    if (error) {
        console.error("Database connection error:", error.message);
    } else {
        console.log("Connected to SQLite database.");
    }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname));

/*
|--------------------------------------------------------------------------
| Database setup and migration
|--------------------------------------------------------------------------
*/

db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON");

    db.run(
        `
        CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value REAL NOT NULL
        )
        `,
        (error) => {
            if (error) {
                console.error("Config table error:", error.message);
                return;
            }

            db.run(
                `
                INSERT OR IGNORE INTO config (key, value)
                VALUES ('fuel_price', 200.0)
                `,
                (insertError) => {
                    if (insertError) {
                        console.error(
                            "Fuel price setup error:",
                            insertError.message
                        );
                    }
                }
            );
        }
    );

    db.run(
        `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            id_number TEXT NOT NULL,
            bike_model TEXT DEFAULT 'Standard',
            number_plate TEXT UNIQUE NOT NULL,
            phone_number TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            reset_token TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        `,
        (error) => {
            if (error) {
                console.error("Users table error:", error.message);
            }
        }
    );

    db.run(
        `
        CREATE TABLE IF NOT EXISTS trips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            rider_name TEXT NOT NULL,
            rider_id_number TEXT,
            distance_km REAL DEFAULT 0,
            fare REAL DEFAULT 0,
            profit REAL DEFAULT 0,
            pickup_lat REAL NOT NULL,
            pickup_lon REAL NOT NULL,
            dropoff_lat REAL DEFAULT 0,
            dropoff_lon REAL DEFAULT 0,
            timestamp TEXT NOT NULL
        )
        `,
        (error) => {
            if (error) {
                console.error("Trips table error:", error.message);
                return;
            }

            /*
             * Migration for old bodasmart.db files.
             * Older databases may have a trips table without user_id.
             */
            db.all(
                "PRAGMA table_info(trips)",
                (schemaError, columns) => {
                    if (schemaError) {
                        console.error(
                            "Could not inspect trips table:",
                            schemaError.message
                        );
                        return;
                    }

                    const hasUserId = columns.some(
                        (column) => column.name === "user_id"
                    );

                    if (!hasUserId) {
                        db.run(
                            "ALTER TABLE trips ADD COLUMN user_id INTEGER",
                            (migrationError) => {
                                if (migrationError) {
                                    console.error(
                                        "Could not add user_id column:",
                                        migrationError.message
                                    );
                                } else {
                                    console.log(
                                        "Migration complete: trips.user_id added."
                                    );
                                }
                            }
                        );
                    } else {
                        console.log(
                            "Database verified: trips.user_id already exists."
                        );
                    }
                }
            );
        }
    );

    db.run(
        `
        CREATE TABLE IF NOT EXISTS auth_sessions (
            token_hash TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            expires_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        `,
        (error) => {
            if (error) {
                console.error("Auth sessions table error:", error.message);
            }
        }
    );

    db.run(
        `
        CREATE TABLE IF NOT EXISTS admin_sessions (
            token_hash TEXT PRIMARY KEY,
            expires_at INTEGER NOT NULL
        )
        `,
        (error) => {
            if (error) {
                console.error("Admin sessions table error:", error.message);
            }
        }
    );

    console.log("Database setup started.");
});

/*
|--------------------------------------------------------------------------
| General helpers
|--------------------------------------------------------------------------
*/

function cleanText(value) {
    return String(value || "").trim();
}

function normalizeEmail(email) {
    return cleanText(email).toLowerCase();
}

function normalizePlate(plate) {
    return cleanText(plate).toUpperCase();
}

function isValidNumber(value) {
    return (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        Number.isFinite(Number(value))
    );
}

function getCurrentTimestamp() {
    return new Date().toISOString();
}

function sendDatabaseError(res, error, message) {
    console.error(message, error.message);

    return res.status(500).json({
        error: `${message}: ${error.message}`
    });
}

function isValidCoordinates(latitude, longitude) {
    return (
        isValidNumber(latitude) &&
        isValidNumber(longitude) &&
        Number(latitude) >= -90 &&
        Number(latitude) <= 90 &&
        Number(longitude) >= -180 &&
        Number(longitude) <= 180
    );
}

function getCookie(req, name) {
    const cookieHeader = req.headers.cookie || "";
    const cookie = cookieHeader
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${name}=`));

    return cookie
        ? decodeURIComponent(cookie.slice(name.length + 1))
        : "";
}

function setSessionCookie(res, token, cookieName = SESSION_COOKIE) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    const maxAge = Math.floor(SESSION_DURATION_MS / 1000);

    res.setHeader(
        "Set-Cookie",
        `${cookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`
    );
}

function clearSessionCookie(res, cookieName = SESSION_COOKIE) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

    res.setHeader(
        "Set-Cookie",
        `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`
    );
}

function createSession(userId, callback) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
    const expiresAt = Date.now() + SESSION_DURATION_MS;

    db.run(
        `
        INSERT INTO auth_sessions (token_hash, user_id, expires_at)
        VALUES (?, ?, ?)
        `,
        [tokenHash, userId, expiresAt],
        (error) => callback(error, token)
    );
}

function withNominatimRequest(url) {
    const cacheKey = url.toString();
    const cached = geocodeCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
        return Promise.resolve(cached.value);
    }

    const request = geocodingQueue.then(async () => {
        const waitMs = Math.max(
            0,
            1100 - (Date.now() - lastGeocodingRequest)
        );

        if (waitMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, waitMs));
        }

        lastGeocodingRequest = Date.now();
        const response = await fetch(url, {
            headers: {
                "User-Agent": NOMINATIM_USER_AGENT,
                Accept: "application/json"
            },
            signal: AbortSignal.timeout(12000)
        });

        if (response.status === 429) {
            const error = new Error("Geocoding provider rate limit reached.");
            error.status = 429;
            throw error;
        }

        if (!response.ok) {
            const error = new Error(
                `Geocoding provider returned HTTP ${response.status}.`
            );
            error.status = 502;
            throw error;
        }

        const value = await response.json();

        if (geocodeCache.size >= 500) {
            geocodeCache.delete(geocodeCache.keys().next().value);
        }

        geocodeCache.set(cacheKey, {
            value,
            expiresAt: Date.now() + 60 * 60 * 1000
        });
        return value;
    });

    geocodingQueue = request.catch(() => {});
    return request;
}

function geocodingErrorResponse(res, error, context) {
    console.error(`${context}:`, error.message);

    if (error.status === 429) {
        return res.status(429).json({
            error: "The place search service is rate limited. Please retry shortly.",
            code: "RATE_LIMITED"
        });
    }

    if (error.name === "TimeoutError" || error.name === "AbortError") {
        return res.status(504).json({
            error: "The place search service timed out. Please retry.",
            code: "PROVIDER_TIMEOUT"
        });
    }

    return res.status(502).json({
        error: "The place search service is unavailable. Please retry or select a point on the map.",
        code: "PROVIDER_UNAVAILABLE"
    });
}

async function requestPhotonPlaces(query, latitude, longitude) {
    const url = new URL(PHOTON_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "10");
    url.searchParams.set("lang", "en");

    if (isValidCoordinates(latitude, longitude)) {
        url.searchParams.set("lat", String(Number(latitude)));
        url.searchParams.set("lon", String(Number(longitude)));
    }

    const response = await fetch(url, {
        headers: {
            "User-Agent": NOMINATIM_USER_AGENT,
            Accept: "application/json"
        },
        signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
        const error = new Error(
            `Photon provider returned HTTP ${response.status}.`
        );
        error.status = response.status === 429 ? 429 : 502;
        throw error;
    }

    const data = await response.json();
    const features = Array.isArray(data.features) ? data.features : [];

    return features
        .filter((feature) =>
            feature.properties &&
            String(feature.properties.countrycode || "").toUpperCase() === "KE" &&
            Array.isArray(feature.geometry?.coordinates) &&
            isValidCoordinates(
                feature.geometry.coordinates[1],
                feature.geometry.coordinates[0]
            )
        )
        .map((feature) => {
            const properties = feature.properties;
            const name = cleanText(properties.name) ||
                cleanText(properties.street) ||
                "Mapped location";
            const address = [
                name,
                properties.street,
                properties.locality,
                properties.district,
                properties.city,
                properties.county,
                properties.state,
                properties.country
            ]
                .map(cleanText)
                .filter((part, index, parts) =>
                    part && parts.indexOf(part) === index
                )
                .join(", ");

            return {
                name,
                address,
                latitude: Number(feature.geometry.coordinates[1]),
                longitude: Number(feature.geometry.coordinates[0]),
                type: cleanText(properties.type || properties.osm_value)
            };
        });
}

/*
|--------------------------------------------------------------------------
| Password helpers
|--------------------------------------------------------------------------
*/

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");

    const passwordHash = crypto
        .scryptSync(password, salt, 64)
        .toString("hex");

    return `scrypt:${salt}:${passwordHash}`;
}

function verifyPassword(password, savedPassword) {
    if (!savedPassword) {
        return {
            valid: false,
            needsUpgrade: false
        };
    }

    /*
     * Supports old plaintext passwords.
     * Successful old-password logins are upgraded automatically.
     */
    if (!savedPassword.startsWith("scrypt:")) {
        return {
            valid: password === savedPassword,
            needsUpgrade: password === savedPassword
        };
    }

    const parts = savedPassword.split(":");

    if (parts.length !== 3) {
        return {
            valid: false,
            needsUpgrade: false
        };
    }

    const salt = parts[1];
    const savedHash = parts[2];

    try {
        const calculatedHash = crypto
            .scryptSync(password, salt, 64)
            .toString("hex");

        const savedBuffer = Buffer.from(savedHash, "hex");
        const calculatedBuffer = Buffer.from(calculatedHash, "hex");

        if (savedBuffer.length !== calculatedBuffer.length) {
            return {
                valid: false,
                needsUpgrade: false
            };
        }

        const valid = crypto.timingSafeEqual(
            savedBuffer,
            calculatedBuffer
        );

        return {
            valid,
            needsUpgrade: false
        };
    } catch (error) {
        console.error("Password verification error:", error.message);

        return {
            valid: false,
            needsUpgrade: false
        };
    }
}

/*
|--------------------------------------------------------------------------
| Page routes
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"), (error) => {
        if (error) {
            res.status(500).send("Unable to load index.html.");
        }
    });
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "login.html"), (error) => {
        if (error) {
            res.status(404).send("Unable to load login.html.");
        }
    });
});

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "admin.html"), (error) => {
        if (error) {
            res.status(404).send("Unable to load admin.html.");
        }
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        service: "BodaSmart API",
        timestamp: getCurrentTimestamp()
    });
});

/*
|--------------------------------------------------------------------------
| Registration
|--------------------------------------------------------------------------
*/

function handleRegistration(req, res) {
    const name = cleanText(
        req.body.name || req.body.full_name
    );

    const idNumber = cleanText(
        req.body.id_number || req.body.national_id
    );

    const bikeModel = cleanText(
        req.body.bike_model || "Standard"
    );

    const numberPlate = normalizePlate(
        req.body.number_plate
    );

    const phoneNumber = cleanText(
        req.body.phone_number
    );

    const email = normalizeEmail(
        req.body.email
    );

    const password = String(
        req.body.password || ""
    );

    if (
        !name ||
        !idNumber ||
        !numberPlate ||
        !phoneNumber ||
        !email ||
        !password
    ) {
        return res.status(400).json({
            error: "All required registration fields must be completed."
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            error: "Password must contain at least 6 characters."
        });
    }

    const securePassword = hashPassword(password);

    const query = `
        INSERT INTO users (
            name,
            id_number,
            bike_model,
            number_plate,
            phone_number,
            email,
            password
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        name,
        idNumber,
        bikeModel,
        numberPlate,
        phoneNumber,
        email,
        securePassword
    ];

    db.run(query, values, function (error) {
        if (error) {
            if (
                error.message.includes("UNIQUE constraint failed") &&
                error.message.includes("users.email")
            ) {
                return res.status(400).json({
                    error: "An account with this email already exists."
                });
            }

            if (
                error.message.includes("UNIQUE constraint failed") &&
                error.message.includes("users.number_plate")
            ) {
                return res.status(400).json({
                    error: "This number plate is already registered."
                });
            }

            return sendDatabaseError(
                res,
                error,
                "Database error during registration"
            );
        }

        return res.status(201).json({
            message: "Rider registration successful.",
            userId: this.lastID
        });
    });
}

app.post("/api/auth/register", handleRegistration);
app.post("/api/register", handleRegistration);

/*
|--------------------------------------------------------------------------
| Login
|--------------------------------------------------------------------------
*/

function handleLogin(req, res, { mobile = false } = {}) {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password) {
        return res.status(400).json({
            error: "Email and password are required."
        });
    }

    const query = `
        SELECT
            id,
            name,
            id_number,
            bike_model,
            number_plate,
            phone_number,
            email,
            password
        FROM users
        WHERE email = ?
        LIMIT 1
    `;

    db.get(query, [email], (error, user) => {
        if (error) {
            return sendDatabaseError(
                res,
                error,
                "Database error during login"
            );
        }

        if (!user) {
            return res.status(401).json({
                error: "Invalid email or password."
            });
        }

        const result = verifyPassword(
            password,
            user.password
        );

        if (!result.valid) {
            return res.status(401).json({
                error: "Invalid email or password."
            });
        }

        /*
         * Upgrade an old plaintext password after successful login.
         */
        if (result.needsUpgrade) {
            const upgradedPassword = hashPassword(password);

            db.run(
                `
                UPDATE users
                SET password = ?
                WHERE id = ?
                `,
                [upgradedPassword, user.id],
                (upgradeError) => {
                    if (upgradeError) {
                        console.error(
                            "Password upgrade warning:",
                            upgradeError.message
                        );
                    }
                }
            );
        }

        createSession(user.id, (sessionError, token) => {
            if (sessionError) {
                return sendDatabaseError(
                    res,
                    sessionError,
                    "Could not create login session"
                );
            }

            if (!mobile) {
                setSessionCookie(res, token);
            }

            const response = {
                message: "Login successful.",
                id: user.id,
                name: user.name,
                email: user.email,
                id_number: user.id_number,
                number_plate: user.number_plate,
                bike_model: user.bike_model,
                phone_number: user.phone_number
            };

            if (mobile) {
                response.sessionToken = token;
                response.user = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    number_plate: user.number_plate,
                    bike_model: user.bike_model,
                    phone_number: user.phone_number
                };
            }

            return res.json(response);
        });
    });
}

app.post("/api/auth/login", handleLogin);
app.post("/api/login", handleLogin);
app.post("/api/mobile/auth/login", (req, res) =>
    handleLogin(req, res, { mobile: true })
);

app.post("/api/auth/logout", (req, res) => {
    const token = getSessionToken(req);

    clearSessionCookie(res);

    if (!token) {
        return res.json({ message: "Logged out successfully." });
    }

    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    db.run(
        "DELETE FROM auth_sessions WHERE token_hash = ?",
        [tokenHash],
        (error) => {
            if (error) {
                return sendDatabaseError(
                    res,
                    error,
                    "Could not end login session"
                );
            }

            return res.json({ message: "Logged out successfully." });
        }
    );
});

app.get("/api/auth/session", (req, res) => {
    getAuthenticatedUser(req, (error, rider) => {
        if (error) {
            return sendDatabaseError(
                res,
                error,
                "Could not verify rider session"
            );
        }

        if (!rider) {
            return res.status(401).json({
                error: "Please sign in to continue."
            });
        }

        return res.json({ user: rider });
    });
});

/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/

app.get("/api/dashboard", (req, res) => {
    db.get(
        `
        SELECT value
        FROM config
        WHERE key = 'fuel_price'
        `,
        [],
        (fuelError, fuelRow) => {
            if (fuelError) {
                return sendDatabaseError(
                    res,
                    fuelError,
                    "Failed to load fuel price"
                );
            }

            db.get(
                `
                SELECT AVG(fare) AS average_fare
                FROM trips
                `,
                [],
                (fareError, fareRow) => {
                    if (fareError) {
                        return sendDatabaseError(
                            res,
                            fareError,
                            "Failed to load average fare"
                        );
                    }

                    return res.json({
                        fuel_price_ksh: fuelRow
                            ? Number(fuelRow.value)
                            : 200,

                        avg_fare_ksh:
                            fareRow &&
                            fareRow.average_fare !== null
                                ? Math.round(
                                      Number(fareRow.average_fare)
                                  )
                                : 0
                    });
                }
            );
        }
    );
});

/*
|--------------------------------------------------------------------------
| Geocoding and routing
|--------------------------------------------------------------------------
*/

app.get("/api/places/search", async (req, res) => {
    const query = cleanText(req.query.q);
    const nearLatitude = req.query.lat;
    const nearLongitude = req.query.lon;

    if (query.length < 3 || query.length > 160) {
        return res.status(400).json({
            error: "Enter a destination between 3 and 160 characters.",
            code: "INVALID_QUERY"
        });
    }

    const searchQuery = /,\s*kenya\s*$/i.test(query)
        ? query
        : `${query}, Kenya`;
    const url = new URL("/search", NOMINATIM_URL);

    url.search = new URLSearchParams({
        format: "jsonv2",
        q: searchQuery,
        countrycodes: "ke",
        addressdetails: "1",
        limit: "10",
        "accept-language": "en"
    });
    if (
        isValidCoordinates(nearLatitude, nearLongitude)
    ) {
        const latitude = Number(nearLatitude);
        const longitude = Number(nearLongitude);
        const top = Math.min(90, latitude + 0.25);
        const bottom = Math.max(-90, latitude - 0.25);
        const left = Math.max(-180, longitude - 0.25);
        const right = Math.min(180, longitude + 0.25);
        url.searchParams.set(
            "viewbox",
            `${left},${top},${right},${bottom}`
        );
    }

    try {
        const results = await withNominatimRequest(url);
        let places = results
            .filter((place) =>
                isValidCoordinates(place.lat, place.lon)
            )
            .map((place) => ({
                name: cleanText(place.name) ||
                    cleanText(place.display_name).split(",")[0],
                address: cleanText(place.display_name),
                latitude: Number(place.lat),
                longitude: Number(place.lon),
                type: cleanText(place.type)
            }));
        let provider = "Nominatim";

        if (places.length === 0) {
            places = await requestPhotonPlaces(
                searchQuery,
                nearLatitude,
                nearLongitude
            );
            provider = "Photon";
        }

        return res.json({ results: places, provider });
    } catch (error) {
        return geocodingErrorResponse(res, error, "Place search failed");
    }
});

app.get("/api/places/reverse", async (req, res) => {
    const { lat, lon } = req.query;

    if (!isValidCoordinates(lat, lon)) {
        return res.status(400).json({
            error: "Valid latitude and longitude are required.",
            code: "INVALID_COORDINATES"
        });
    }

    const url = new URL("/reverse", NOMINATIM_URL);
    url.search = new URLSearchParams({
        format: "jsonv2",
        lat: String(Number(lat)),
        lon: String(Number(lon)),
        zoom: "18",
        "accept-language": "en"
    });

    try {
        const result = await withNominatimRequest(url);

        return res.json({
            address: cleanText(result.display_name) ||
                "Current GPS position"
        });
    } catch (error) {
        return geocodingErrorResponse(
            res,
            error,
            "Reverse geocoding failed"
        );
    }
});

async function requestRoadRoute(
    pickupLat,
    pickupLon,
    dropoffLat,
    dropoffLon
) {
    const baseUrl = OSRM_URL.replace(/\/+$/, "");
    const coordinates = [
        `${Number(pickupLon)},${Number(pickupLat)}`,
        `${Number(dropoffLon)},${Number(dropoffLat)}`
    ].join(";");
    const url =
        `${baseUrl}/route/v1/driving/${coordinates}` +
        "?overview=full&geometries=geojson&steps=false";
    const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000)
    });

    if (response.status === 429) {
        const error = new Error("Routing provider rate limit reached.");
        error.status = 429;
        throw error;
    }

    if (!response.ok) {
        const error = new Error(
            `Routing provider returned HTTP ${response.status}.`
        );
        error.status = 502;
        throw error;
    }

    const data = await response.json();
    const route = data.routes && data.routes[0];

    if (
        data.code !== "Ok" ||
        !route ||
        !Number.isFinite(route.distance) ||
        !Number.isFinite(route.duration) ||
        !route.geometry ||
        route.geometry.type !== "LineString" ||
        !Array.isArray(route.geometry.coordinates) ||
        route.geometry.coordinates.length < 2 ||
        !route.geometry.coordinates.every((coordinate) =>
            Array.isArray(coordinate) &&
            coordinate.length >= 2 &&
            isValidCoordinates(coordinate[1], coordinate[0])
        )
    ) {
        const error = new Error(
            `No drivable road route was returned (${data.code || "unknown"}).`
        );
        error.status = 422;
        throw error;
    }

    return {
        distance_km: Number((route.distance / 1000).toFixed(3)),
        duration_minutes: Math.round(route.duration / 60),
        geometry: route.geometry,
        provider: "OSRM"
    };
}

app.post("/api/trips/calculate", async (req, res) => {
    const {
        pickup_lat,
        pickup_lon,
        dropoff_lat,
        dropoff_lon
    } = req.body;

    if (
        !isValidCoordinates(pickup_lat, pickup_lon) ||
        !isValidCoordinates(dropoff_lat, dropoff_lon)
    ) {
        return res.status(400).json({
            error: "Valid pickup and dropoff coordinates are required.",
            code: "INVALID_COORDINATES"
        });
    }

    try {
        const route = await requestRoadRoute(
            pickup_lat,
            pickup_lon,
            dropoff_lat,
            dropoff_lon
        );

        db.get(
            `
            SELECT value
            FROM config
            WHERE key = 'fuel_price'
            `,
            [],
            (error, fuelRow) => {
                if (error) {
                    return sendDatabaseError(
                        res,
                        error,
                        "Failed to retrieve fuel price"
                    );
                }

                const fuelPrice = fuelRow
                    ? Number(fuelRow.value)
                    : 200;

                // Preserve the existing business rule: KSh 50 base plus
                // 20% of the configured fuel index per road kilometre.
                const estimatedFare =
                    50 + route.distance_km * (fuelPrice * 0.2);

                return res.json({
                    ...route,
                    estimated_fare_ksh: Math.round(estimatedFare),
                    current_fuel_index_used: fuelPrice
                });
            }
        );
    } catch (error) {
        console.error("Road route calculation failed:", error.message);

        const status = error.status || (
            error.name === "TimeoutError" ||
            error.name === "AbortError"
                ? 504
                : 502
        );

        return res.status(status).json({
            error: error.status === 422
                ? "No road route was found for these points. Choose another destination or pickup."
                : error.status === 429
                  ? "The routing service is rate limited. Please retry shortly."
                  : status === 504
                    ? "The routing service timed out. Please retry."
                    : "The routing service is unavailable. No road distance or fare estimate was created.",
            code: error.status === 422
                ? "ROUTE_NOT_FOUND"
                : error.status === 429
                  ? "RATE_LIMITED"
                  : status === 504
                    ? "PROVIDER_TIMEOUT"
                    : "PROVIDER_UNAVAILABLE"
        });
    }
});

function getAuthenticatedUser(req, callback) {
    const token = getSessionToken(req);

    if (!token) {
        callback(null, null);
        return;
    }

    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    db.get(
        `
        SELECT
            users.id,
            users.name,
            users.id_number,
            users.number_plate,
            users.email,
            users.bike_model,
            users.phone_number
        FROM auth_sessions
        JOIN users ON users.id = auth_sessions.user_id
        WHERE auth_sessions.token_hash = ?
          AND auth_sessions.expires_at > ?
        LIMIT 1
        `,
        [tokenHash, Date.now()],
        callback
    );
}

function getSessionToken(req) {
    const authorization = req.headers.authorization || "";
    const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
    return bearerMatch
        ? bearerMatch[1].trim()
        : getCookie(req, SESSION_COOKIE);
}

/*
|--------------------------------------------------------------------------
| Trip logging
|--------------------------------------------------------------------------
*/

app.get("/api/trips", (req, res) => {
    getAuthenticatedUser(req, (authError, rider) => {
        if (authError) {
            return sendDatabaseError(
                res,
                authError,
                "Could not verify rider session"
            );
        }

        if (!rider) {
            return res.status(401).json({
                error: "Please sign in to view your trip history."
            });
        }

        db.all(
            `
            SELECT
                id,
                distance_km,
                fare,
                profit,
                timestamp
            FROM trips
            WHERE user_id = ?
            ORDER BY timestamp DESC, id DESC
            LIMIT 100
            `,
            [rider.id],
            (error, trips) => {
                if (error) {
                    return sendDatabaseError(
                        res,
                        error,
                        "Failed to load rider trip history"
                    );
                }

                return res.json({ trips });
            }
        );
    });
});

app.post("/api/trips/log", (req, res) => {
    const distanceKm = Number(
        req.body.distance_km
    );

    const pickupLat = req.body.pickup_lat;
    const pickupLon = req.body.pickup_lon;
    const dropoffLat = req.body.dropoff_lat;
    const dropoffLon = req.body.dropoff_lon;

    if (
        !Number.isFinite(distanceKm) ||
        distanceKm < 0 ||
        distanceKm > 1000
    ) {
        return res.status(400).json({
            error: "Trip distance must be between 0 and 1,000 kilometres."
        });
    }

    if (
        !isValidCoordinates(pickupLat, pickupLon) ||
        !isValidCoordinates(dropoffLat, dropoffLon)
    ) {
        return res.status(400).json({
            error: "Valid pickup and destination coordinates are required."
        });
    }

    getAuthenticatedUser(req, (authError, rider) => {
        if (authError) {
            return sendDatabaseError(
                res,
                authError,
                "Could not verify rider session"
            );
        }

        if (!rider) {
            return res.status(401).json({
                error: "Please sign in again before recording a trip.",
                code: "AUTH_REQUIRED"
            });
        }

        db.get(
            "SELECT value FROM config WHERE key = 'fuel_price'",
            [],
            (fuelError, fuelRow) => {
                if (fuelError) {
                    return sendDatabaseError(
                        res,
                        fuelError,
                        "Failed to retrieve fuel price"
                    );
                }

                const fuelPrice = fuelRow
                    ? Number(fuelRow.value)
                    : 200;
                const fare = Math.round(
                    50 + distanceKm * (fuelPrice * 0.2)
                );
                const query = `
                    INSERT INTO trips (
                        user_id,
                        rider_name,
                        rider_id_number,
                        distance_km,
                        fare,
                        profit,
                        pickup_lat,
                        pickup_lon,
                        dropoff_lat,
                        dropoff_lon,
                        timestamp
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                const values = [
                    rider.id,
                    `${rider.name} (${rider.number_plate})`,
                    rider.id_number,
                    distanceKm,
                    fare,
                    fare,
                    Number(pickupLat),
                    Number(pickupLon),
                    Number(dropoffLat),
                    Number(dropoffLon),
                    getCurrentTimestamp()
                ];

                db.run(query, values, function (error) {
                    if (error) {
                        return sendDatabaseError(
                            res,
                            error,
                            "Failed to save trip"
                        );
                    }

                    return res.status(201).json({
                        message: "Trip recorded successfully.",
                        tripId: this.lastID,
                        distance_km: distanceKm,
                        fare_ksh: fare,
                        rider: {
                            user_id: rider.id,
                            name: rider.name
                        }
                    });
                });
        });
    });
});

/*
|--------------------------------------------------------------------------
| Admin metrics
|--------------------------------------------------------------------------
*/

app.get("/api/admin/auth/session", (req, res) => {
    const token = getCookie(req, ADMIN_SESSION_COOKIE);

    if (!token) {
        return res.json({ authenticated: false });
    }

    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    db.get(
        "SELECT 1 AS valid FROM admin_sessions WHERE token_hash = ? AND expires_at > ?",
        [tokenHash, Date.now()],
        (error, session) => {
            if (error) {
                return sendDatabaseError(
                    res,
                    error,
                    "Could not verify admin session"
                );
            }

            return res.json({ authenticated: Boolean(session) });
        }
    );
});

app.post("/api/admin/auth/login", (req, res) => {
    const configuredPasscode = process.env.ADMIN_PASSCODE;

    if (!configuredPasscode) {
        return res.status(503).json({
            error: "Admin access is not configured. Set ADMIN_PASSCODE on the server.",
            code: "ADMIN_AUTH_NOT_CONFIGURED"
        });
    }

    const passcode = String(req.body.passcode || "");
    const expectedHash = crypto
        .createHash("sha256")
        .update(configuredPasscode)
        .digest();
    const suppliedHash = crypto
        .createHash("sha256")
        .update(passcode)
        .digest();

    if (!crypto.timingSafeEqual(expectedHash, suppliedHash)) {
        return res.status(401).json({
            error: "Incorrect admin passcode.",
            code: "INVALID_PASSCODE"
        });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
    const expiresAt = Date.now() + SESSION_DURATION_MS;

    db.run(
        "INSERT INTO admin_sessions (token_hash, expires_at) VALUES (?, ?)",
        [tokenHash, expiresAt],
        (error) => {
            if (error) {
                return sendDatabaseError(
                    res,
                    error,
                    "Could not create admin session"
                );
            }

            setSessionCookie(res, token, ADMIN_SESSION_COOKIE);
            return res.json({ message: "Admin authentication successful." });
        }
    );
});

app.post("/api/admin/auth/logout", (req, res) => {
    const token = getCookie(req, ADMIN_SESSION_COOKIE);
    clearSessionCookie(res, ADMIN_SESSION_COOKIE);

    if (!token) {
        return res.json({ message: "Admin session ended." });
    }

    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    db.run(
        "DELETE FROM admin_sessions WHERE token_hash = ?",
        [tokenHash],
        (error) => {
            if (error) {
                return sendDatabaseError(
                    res,
                    error,
                    "Could not end admin session"
                );
            }
            return res.json({ message: "Admin session ended." });
        }
    );
});

function requireAdminSession(req, res, next) {
    const token = getCookie(req, ADMIN_SESSION_COOKIE);

    if (!token) {
        return res.status(401).json({
            error: "Admin authentication is required.",
            code: "ADMIN_AUTH_REQUIRED"
        });
    }

    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    db.get(
        "SELECT 1 AS valid FROM admin_sessions WHERE token_hash = ? AND expires_at > ?",
        [tokenHash, Date.now()],
        (error, session) => {
            if (error) {
                return sendDatabaseError(
                    res,
                    error,
                    "Could not verify admin session"
                );
            }

            if (!session) {
                return res.status(401).json({
                    error: "Admin session expired. Authenticate again.",
                    code: "ADMIN_AUTH_REQUIRED"
                });
            }

            return next();
        }
    );
}

app.use("/api/admin", requireAdminSession);

app.get("/api/admin/metrics", (req, res) => {
    db.get(
        `
        SELECT
            COUNT(*) AS total_trips,
            COALESCE(SUM(fare), 0) AS total_revenue,
            COALESCE(SUM(distance_km), 0) AS total_distance
        FROM trips
        `,
        [],
        (error, row) => {
            if (error) {
                return sendDatabaseError(
                    res,
                    error,
                    "Failed to load admin metrics"
                );
            }

            return res.json({
                total_trips: Number(row.total_trips || 0),
                total_revenue_ksh: Math.round(
                    Number(row.total_revenue || 0)
                ),
                total_distance_km: Number(
                    Number(row.total_distance || 0).toFixed(2)
                )
            });
        }
    );
});

/*
|--------------------------------------------------------------------------
| Admin trip logs
|--------------------------------------------------------------------------
*/

app.get("/api/admin/trips", (req, res) => {
    const query = `
        SELECT
            trips.id,
            trips.user_id,
            trips.rider_name,
            trips.rider_id_number,
            trips.distance_km,
            trips.fare,
            trips.profit,
            trips.pickup_lat,
            trips.pickup_lon,
            trips.dropoff_lat,
            trips.dropoff_lon,
            trips.timestamp,
            users.phone_number AS rider_phone,
            users.email AS rider_email,
            users.number_plate AS rider_plate,
            users.bike_model AS rider_bike_model
        FROM trips
        LEFT JOIN users
            ON users.id = trips.user_id
        ORDER BY trips.id DESC
    `;

    db.all(query, [], (error, rows) => {
        if (error) {
            return sendDatabaseError(
                res,
                error,
                "Failed to load trip logs"
            );
        }

        return res.json({
            total_trips_logged: rows.length,
            trips: rows
        });
    });
});

app.get("/api/admin/users/:id/trips", (req, res) => {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            error: "A valid user ID is required."
        });
    }

    db.all(
        `
        SELECT *
        FROM trips
        WHERE user_id = ?
        ORDER BY id DESC
        `,
        [userId],
        (error, rows) => {
            if (error) {
                return sendDatabaseError(
                    res,
                    error,
                    "Failed to load rider trips"
                );
            }

            return res.json({
                user_id: userId,
                trips: rows
            });
        }
    );
});

app.delete("/api/admin/trips/:id", (req, res) => {
    const tripId = Number(req.params.id);

    if (!Number.isInteger(tripId) || tripId <= 0) {
        return res.status(400).json({
            error: "A valid trip ID is required."
        });
    }

    db.run(
        `
        DELETE FROM trips
        WHERE id = ?
        `,
        [tripId],
        function (error) {
            if (error) {
                return sendDatabaseError(
                    res,
                    error,
                    "Failed to delete trip"
                );
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    error: "Trip was not found."
                });
            }

            return res.json({
                message: "Trip deleted successfully.",
                deletedId: tripId
            });
        }
    );
});

/*
|--------------------------------------------------------------------------
| Admin riders
|--------------------------------------------------------------------------
*/

app.get("/api/admin/users", (req, res) => {
    db.all(
        `
        SELECT
            id,
            name,
            id_number,
            bike_model,
            number_plate,
            phone_number,
            email,
            created_at
        FROM users
        ORDER BY id DESC
        `,
        [],
        (error, rows) => {
            if (error) {
                return sendDatabaseError(
                    res,
                    error,
                    "Failed to load riders"
                );
            }

            return res.json({
                total_users: rows.length,
                users: rows
            });
        }
    );
});

app.delete("/api/admin/users/:id", (req, res) => {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            error: "A valid user ID is required."
        });
    }

    db.run(
        `
        DELETE FROM users
        WHERE id = ?
        `,
        [userId],
        function (error) {
            if (error) {
                return sendDatabaseError(
                    res,
                    error,
                    "Failed to delete rider"
                );
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    error: "Rider was not found."
                });
            }

            return res.json({
                message: "Rider deleted successfully.",
                deletedId: userId
            });
        }
    );
});

/*
|--------------------------------------------------------------------------
| Fuel price configuration
|--------------------------------------------------------------------------
*/

app.post("/api/admin/config/fuel", (req, res) => {
    const fuelPrice = Number(
        req.body.fuel_price
    );

    if (
        !Number.isFinite(fuelPrice) ||
        fuelPrice <= 0
    ) {
        return res.status(400).json({
            error: "Enter a valid fuel price greater than zero."
        });
    }

    db.run(
        `
        INSERT OR REPLACE INTO config (key, value)
        VALUES ('fuel_price', ?)
        `,
        [fuelPrice],
        (error) => {
            if (error) {
                return sendDatabaseError(
                    res,
                    error,
                    "Failed to update fuel price"
                );
            }

            return res.json({
                message: "Fuel price updated successfully.",
                fuel_price: fuelPrice
            });
        }
    );
});

/*
|--------------------------------------------------------------------------
| Unknown routes and server errors
|--------------------------------------------------------------------------
*/

app.use("/api", (req, res) => {
    res.status(404).json({
        error: "API endpoint not found."
    });
});

app.use((req, res) => {
    res.status(404).json({
        error: "Requested page was not found."
    });
});

app.use((error, req, res, next) => {
    console.error("Unexpected server error:", error);

    res.status(500).json({
        error: "Unexpected server error."
    });
});

/*
|--------------------------------------------------------------------------
| Start server
|--------------------------------------------------------------------------
*/

app.listen(PORT, () => {
    console.log(
        `BodaSmart server running at http://localhost:${PORT}`
    );
});