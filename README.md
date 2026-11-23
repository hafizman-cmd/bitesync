# Make Mano

Decide where to eat together in a 90-second round. Create a room, share its link, and vote on nearby restaurants. Diners join with a display name. Use the header’s **BM** or **EN** button to switch between Bahasa Melayu and English.

## Run locally

Requires Node.js 20.9 or newer.

```sh
npm ci
npm run dev
```

Open [Make Mano](http://localhost:3000) and select **Try a demo**. Copy the room link into a separate browser profile or private window to join as a second diner, then select **Start round** as host.

Without a Turso URL, the app uses local SQLite (`bitesync.db`). Demo rooms use four sample restaurants with illustrative photos and require no API key.

## Enable live restaurant search

Set `TAVILY_API_KEY` in `.env.local` using `.env.example` as a template. [Tavily's free plan](https://www.tavily.com/pricing) has a monthly usage allowance. Restart the app after editing environment variables. The server initializes the tables on first use.

Select **Create room**, then type a city or neighborhood or use **Use my location**. The location button sends the browser's coordinates to [BigDataCloud](https://www.bigdatacloud.com/geocoding-apis/free-reverse-geocode-to-city-api) to fill in the area. Phone geolocation requires HTTPS. Each automatic room runs one Tavily search and stores up to 10 restaurant names and source links. The cuisine preference guides the query. The host can add their own restaurant names to the same round or turn off automatic suggestions to play with at least two host suggestions. A winner can be opened with a regular Google Maps link.

Rooms containing Google Places references from the previous version must be recreated. The app used to save only the Google IDs for those restaurants.

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

Deploy to a Next.js host. Use remote Turso for shared state across instances and set `NEXT_PUBLIC_APP_URL` to the public HTTPS origin. Configure the variables from `.env.example` in the host’s settings.

Use the browser’s install action, or **Share > Add to Home Screen** on iOS. The production app has a bilingual offline screen. Room updates and votes require a network connection.

Homepage photos from the [Pak Gembus Malaysia website](https://ayamgepukpakgembus.com.my/). Other photos from [Unsplash](https://unsplash.com/license). Locally hosted DM Sans and Instrument Serif fonts are distributed under the SIL Open Font License. Web suggestions link to the dining guides returned by Tavily. Older rooms with complete Geoapify snapshots still credit [Geoapify](https://www.geoapify.com/) and [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
