# CivicSnap \- Community Issue Reporter

One folder, one server. The server serves the web pages **and** the API, so you only run one command.

```
CivicSnap/
├── server.js              starts everything (web pages + API + database connection)
├── seed.js                OPTIONAL demo data (npm run seed)
├── package.json           list of libraries to install
├── .env                   your private settings (database link, secret)   <- never share / upload this
├── .env.example           template of .env
├── models/                the 3 database collections
│   ├── Admin.js           -> "admins"
│   ├── Citizen.js         -> "citizens"
│   └── Report.js          -> "reports"
├── routes/
│   ├── auth.js            register / login / create admin
│   └── reports.js         create, read, update, delete reports
├── middleware/auth.js     checks the login token on protected routes
└── public/                the web pages
    ├── login.html             choose Admin or Citizen
    ├── citizen.html           citizen login
    ├── citizen_register.html  citizen sign-up
    ├── citizen_report.html    COMMUNITY MAP  (shows ALL reports)
    ├── add-issue.html         report an issue (photo + map pin)
    ├── my_reports.html        MY REPORTS     (shows ONLY your reports)
    ├── admin.html             admin login
    └── admin_dashboard.html   ADMIN: see every report, change status, delete, add admins
```

## The database: 1 database, 3 collections

In MongoDB you do not make 3 separate databases. You make **one database (`civic_snap`) with 3 collections** (think of them as 3 tables):

| Collection | What is stored | Used by |
| :---- | :---- | :---- |
| `admins` | admin username \+ hashed password | admin login, "Add New Admin" |
| `citizens` | citizen username \+ hashed password | citizen register / login |
| `reports` | every issue: title, category, description, address, lat/lng pin, photo, status, severity, reportedBy, admin note, dates | map, My Reports, admin dashboard |

## What you need to install

**1\. Node.js (LTS)** \- [https\://nodejs.org](https://nodejs.org) (download, install, keep clicking Next). Check with `node -v` in a terminal.

**2\. A MongoDB database. You do NOT have to install MongoDB. Pick one:**

### Option A \- MongoDB Atlas (cloud, in the browser, nothing to install)  \<- already set up in `.env`

1. Log in at [https\://cloud.mongodb.com](https://cloud.mongodb.com)  
2. Left menu **Security \> Network Access \> Add IP Address \> "Allow access from anywhere" (0.0.0.0/0)** \> Confirm. (Without this the server cannot connect.)  
3. That's it. Your connection string is already inside `.env`.

### Option B \- install MongoDB on this PC

1. Download **MongoDB Community Server** ([https\://www\.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)), run the installer, tick **"Install MongoDB Compass"**, and keep "Run as a Service" ticked.  
2. Open `.env`, put `#` in front of the Atlas `MONGO_URI` line and remove the `#` from the `mongodb://127.0.0.1:27017/civic_snap` line.

## Run it

```
npm install
npm start
```

You should see `Connected to MongoDB: civic_snap` and `CivicSnap running at http://localhost:3000`.

Then open [**http\://localhost:3000**](http://localhost:3000) in your browser. (Do not double-click the .html files. They only work when opened through the server.)

Optional demo data (so the map and dashboard are not empty):

```
npm run seed
```

## Logins

| Who | Username | Password |
| :---- | :---- | :---- |
| Admin (created automatically on first start) | `admin` | `admin123` |
| Citizen (after `npm run seed`) | `priya` / `arjun` | `priya123` / `arjun123` |
| New citizen | click "Register New User" on the citizen login page |  |
| New admin | log in as admin \> dashboard \> "Add New Admin" |  |

## How to VIEW and EDIT the database

**In the browser (Atlas):** cloud.mongodb.com \> your cluster \> **Browse Collections** \> database `civic_snap` \> click `admins`, `citizens` or `reports`.

- Edit: hover a document, click the pencil, change the value, **Update**.  
- Delete: hover a document, click the bin.  
- Add: **Insert Document**.

**On your PC (MongoDB Compass, free app):** download from [https\://www\.mongodb.com/try/download/compass](https://www.mongodb.com/try/download/compass), click **Add new connection**, paste the `MONGO_URI` value from `.env` (or `mongodb://127.0.0.1:27017` for Option B), **Connect**, then open `civic_snap`. Same pencil / bin / Add Data controls.

Notes:

- Passwords are stored **hashed** (long scrambled text starting with `$2a$`). You cannot type a normal password into the database by hand. To reset a user: delete their document and register again.  
- Changing a report's `status` in the database shows up on the My Reports page and dashboard immediately after a refresh.

## What each page does

| Page | Who | What it does |
| :---- | :---- | :---- |
| Community Map (`citizen_report.html`) | citizen | Every report from the `reports` collection as a pin, coloured by status. Click a pin for photo, details, who reported it. |
| My Reports (`my_reports.html`) | citizen | Only the reports **you** submitted, with status, admin note and "after" photo. The server decides who you are from your login token, so nobody can see another citizen's list. |
| Add Issue (`add-issue.html`) | citizen | Category, photo (auto-shrunk), description, address, map pin (GPS or tap/drag). Saves to `reports`. |
| Admin Dashboard (`admin_dashboard.html`) | admin | Stats, category chart, searchable table of all reports, change status/category/note, upload "after" photo, delete report, add another admin. |

## API (for your report / viva)

| Method \+ URL | Who can call it | Purpose |
| :---- | :---- | :---- |
| POST `/api/register` | anyone | create a citizen |
| POST `/api/login` | anyone | log in (send `role: "admin"` or `"citizen"`), returns a JWT token |
| POST `/api/admin/create` | admin | create another admin |
| GET `/api/reports` | any logged-in user | all reports (map \+ dashboard) |
| GET `/api/reports/mine` | citizen | only my reports |
| POST `/api/reports` | citizen | submit a report |
| PUT `/api/reports/:id` | admin | update status / category / note / after photo |
| DELETE `/api/reports/:id` | admin | delete a report |

## What was changed from the team's original files (so everyone is in the loop)

- **One server on port 3000** serves the pages from `public/`. Before, `server.js` served the whole project folder, which would also have exposed `server.js` and `package.json` in the browser.  
- **3 collections** (`admins`, `citizens`, `reports`) instead of one `users` collection.  
- **Passwords are hashed (bcrypt)** and login uses a **JWT token**. Admin-only actions (update / delete / create admin) are now enforced on the **server**, not just by hiding buttons.  
- Registration always creates a **citizen** (before, anyone could send `role: "admin"` and make themselves an admin).  
- `reportedBy` is taken from the login token, so it cannot be faked.  
- Add Issue now has the **7 categories** the dashboard uses, a **map pin** (so reports appear on the Community Map), and photos are **shrunk** before upload (phone photos can be 5-10 MB).  
- `admin_dashboard.html` now has a login guard and sends the token; it sends only the fields an admin may change.  
- New pages: `my_reports.html`; rewritten `citizen_report.html` (real data instead of the hard-coded list).  
- Express 4 / Mongoose 8 are used (the earlier `package.json` listed Express 5 / Mongoose 9).

## Troubleshooting

| Message | Fix |
| :---- | :---- |
| `Could not connect to MongoDB ... ENOTFOUND / timed out / not authorized` | Atlas: add your IP under Network Access (Option A step 2\) and check the user/password in `.env`. |
| `connect ECONNREFUSED 127.0.0.1:27017` | You chose Option B but MongoDB is not running. Start the "MongoDB" Windows service, or switch to Option A. |
| `Missing JWT_SECRET in .env` | Copy `.env.example` to `.env` and fill it in. |
| `EADDRINUSE :::3000` | Something else uses port 3000\. Change `PORT` in `.env` (e.g. 3001\) and open that port. |
| Map is grey / blank | Needs internet (map tiles \+ Leaflet load from the web). |
| Pin address not auto-filled | Needs internet; you can type the address yourself. |
| "Please log in first" / sent back to login | Your 8-hour login expired. Log in again. |

## Security notes

- The Atlas password that was in the shared `_env` file has been pasted in plain text in a chat. After your demo, change it: Atlas \> **Database Access** \> Edit user \> **Edit Password**, then update `.env`.  
- `.env` is listed in `.gitignore`. Never upload it to GitHub.  
- Before any real use, replace the default `admin / admin123`: create your own admin from the dashboard, then delete the `admin` document in Atlas/Compass.