# Make Mano

Decide where to eat together in a 90-second round. Create a room, share its link, and vote on nearby restaurants. Diners join with a display name. Use the header’s **BM** or **EN** button to switch between Bahasa Melayu and English.

## Run locally

Requires Node.js 20.9 or newer.

```sh
npm ci
npm run dev
```

Open [Make Mano](http://localhost:3000) and select **Try a demo**. Create a sample room, copy its link, and open it in a separate browser profile or private window to join as a second diner. In the host window, select **Start round**.

With no database credentials, the app creates a local SQLite database called `bitesync.db`. Sample rooms use four fixtures and never call Geoapify. Sample photos illustrate cuisines.

## Enable live restaurant search

Copy `.env.example` to `.env.local`. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` from a Turso database and `GEOAPIFY_API_KEY` from a Geoapify project. The server initializes the tables on first use. Restart the app after editing environment variables.

Select **Create room**, then pick a city or neighborhood or use your current location. Make Mano uses Geoapify Geocoding and Places v2 to find up to eight named restaurants within the selected straight-line radius of 3, 5, 10, or 20 km. The default is 3 km. Live place cards include addresses and distances from the search center. Use HTTPS for location access from phones.

## Round rules

- Up to 16 diners can join before the host starts. The round ends when everyone has voted or after 90 seconds.
- Swipe right to like and left to pass, or use the four vote buttons. One like earns one point, one crave earns two points, and one veto removes a restaurant from contention. Each diner gets one crave and one veto per round.
- The highest score wins. Ties favor more diners who voted like or crave, then the closest restaurant, then the restaurant ID. There is no match when every restaurant was vetoed or received no positive vote.
- Rooms expire 24 hours after creation. The server deletes expired records when it creates a new room.

## Production and installation

```sh
npm run typecheck
npm test
npm run build
npm start
```

Use a Next.js host with a free Node.js tier, such as Vercel Hobby for eligible personal projects. Add the four environment variables in the provider’s settings and set `NEXT_PUBLIC_APP_URL` to the public HTTPS origin. Use remote Turso for shared state across instances. Small groups can run within the providers’ free-tier quotas. Make Mano uses Google Maps links for directions.

Use the browser’s install action, or **Share > Add to Home Screen** on iOS. The production app includes a manifest and an offline screen in both languages. Room updates and votes require an internet connection.

Homepage photos from the [Pak Gembus Malaysia website](https://ayamgepukpakgembus.com.my/). Other photos from [Unsplash](https://unsplash.com/license). Locally hosted DM Sans and Instrument Serif fonts are distributed under the SIL Open Font License. Restaurant data is provided by [Geoapify](https://www.geoapify.com/) and [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
