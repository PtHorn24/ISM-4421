# Owl Weather: ISM-4421

An FAU-themed weather app that defaults to **Florida Atlantic University's Boca Raton campus**. It uses the free [Open-Meteo](https://open-meteo.com/) APIs, so you don't need an API key or an account.

## Features

- Current conditions: temperature, feels-like, high/low, humidity, wind, rain chance, UV index, sunrise and sunset
- Hourly forecast for the next 24 hours
- 7-day forecast with temperature range bars
- City search (Open-Meteo Geocoding API). Type `Miami` or `Miami, Florida`
- "Use my location" button (browser geolocation)
- °F / °C toggle
- Remembers your last location and unit choice
- FAU branding: FAU Blue `#003366`, FAU Red `#CC0000`, FAU Silver `#CCCCCC`, and the FAU logo
- Works on phone, tablet and desktop

## Project structure

```
index.html          Page markup
css/styles.css      FAU-themed styles
js/app.js           App logic (Open-Meteo calls and rendering)
assets/             Favicon and fallback FAU wordmark
netlify.toml        Netlify config (publish settings and security headers)
```

This is plain HTML, CSS and JavaScript with **no build step and no dependencies**.

## Run it locally

Any static file server works. For example:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy to Netlify

### Option A: Connect the GitHub repo (recommended, auto-deploys on every push)

1. Log in at <https://app.netlify.com>.
2. Click **Add new site → Import an existing project → GitHub**.
3. Pick the **`ISM-4421`** repository and the branch you want to deploy.
4. Netlify reads `netlify.toml` automatically. The settings should already show:
   - **Build command:** *(leave empty)*
   - **Publish directory:** `.`
5. Click **Deploy**. In about 30 seconds you'll get a URL like `https://<random-name>.netlify.app`.
6. Optional: **Site configuration → Change site name** to something like `fau-owl-weather`.

### Option B: Drag and drop

1. Download this repo as a ZIP (GitHub → **Code → Download ZIP**) and unzip it.
2. Go to <https://app.netlify.com/drop>.
3. Drag the unzipped folder, the one containing `index.html`, onto the page.

### Option C: Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir .
```

## About the logo

The header shows the official FAU logo from Wikimedia Commons
(`https://upload.wikimedia.org/wikipedia/commons/b/b3/Florida_Atlantic_University_logo.svg`).
If that image can't load, the app falls back to the local wordmark at `assets/fau-wordmark.svg`.
To host the logo yourself, save the file into `assets/` and change the `src` of `.brand-logo` in `index.html`.

## Credits

Weather data by [Open-Meteo.com](https://open-meteo.com/), licensed under CC BY 4.0.

Background photo: [Mizner Park, Boca Raton](https://commons.wikimedia.org/wiki/File:Mizner_Park_Boca_June_2010_Palms.jpg)
by Infrogmation of New Orleans, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), loaded from Wikimedia Commons.
If it can't load, the illustrated beach scene in `assets/boca-beach.svg` is shown instead.

This is a student project for ISM 4421 and is not an official FAU website.
