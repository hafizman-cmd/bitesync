export const errors = {
  jsonRequired: { en: "Send an application/json request.", ms: "Hantar permintaan dalam format application/json." },
  bodyTooLarge: { en: "Request is too large.", ms: "Permintaan terlalu besar." },
  invalidRequest: { en: "The request is invalid.", ms: "Permintaan tidak sah." },
  invalidName: { en: "Enter a name with 1 to 32 characters.", ms: "Masukkan nama antara 1 hingga 32 aksara." },
  invalidLink: { en: "This room link is invalid.", ms: "Pautan bilik ini tidak sah." },
  invalidQuery: { en: "Enter an area with 2 to 100 characters.", ms: "Masukkan nama kawasan antara 2 hingga 100 aksara." },
  missingArea: { en: "Choose an area first.", ms: "Pilih kawasan dahulu." },
  invalidArea: { en: "Choose a valid area.", ms: "Pilih kawasan yang sah." },
  invalidSearchDistance: { en: "Choose a search distance of 3, 5, 10, or 20 km.", ms: "Pilih jarak carian 3, 5, 10 atau 20 km." },
  tooFewPlaces: { en: "There aren't enough restaurants nearby. Try a longer search distance or a different area.", ms: "Restoran berdekatan tidak mencukupi. Cuba jarak carian yang lebih jauh atau kawasan lain." },
  invalidAction: { en: "That room action is invalid.", ms: "Tindakan dalam bilik itu tidak sah." },
  placesUnconfigured: { en: "Nearby search needs a Geoapify API key. You can still try a sample room.", ms: "Carian berdekatan memerlukan kunci API Geoapify. Anda masih boleh mencuba bilik contoh." },
  placesUnavailable: { en: "Nearby search is temporarily unavailable. Try again or use a sample room.", ms: "Carian berdekatan tidak tersedia buat sementara waktu. Cuba lagi atau guna bilik contoh." },
  roomExpired: { en: "This room is unavailable or has expired.", ms: "Bilik ini tidak tersedia atau sudah tamat tempoh." },
  alreadyStarted: { en: "The round has already started. You can follow the result.", ms: "Pusingan sudah bermula. Anda masih boleh melihat keputusannya." },
  roomFull: { en: "This room is full.", ms: "Bilik ini sudah penuh." },
  joinFirst: { en: "Join the room first.", ms: "Sertai bilik dahulu." },
  hostOnly: { en: "Only the host can start the round.", ms: "Hanya hos boleh memulakan pusingan." },
  unknownPlace: { en: "That restaurant is outside this round.", ms: "Restoran itu tidak termasuk dalam pusingan ini." },
  votingClosed: { en: "Voting is closed.", ms: "Undian sudah ditutup." },
  duplicateVote: { en: "You already voted on this restaurant.", ms: "Anda sudah mengundi restoran ini." },
  specialVoteUsed: { en: "You already used that vote this round.", ms: "Anda sudah menggunakan undi itu dalam pusingan ini." },
  serverError: { en: "Something went wrong. Try again in a moment.", ms: "Ada masalah. Cuba lagi sebentar lagi." },
  networkError: { en: "Couldn't reach Make Mano. Check your connection and try again.", ms: "Tak dapat menyambung ke Make Mano. Semak sambungan anda dan cuba lagi." },
  locationUnavailable: { en: "Location is unavailable. Search for your area instead.", ms: "Lokasi tidak tersedia. Cari kawasan anda secara manual." },
  locationDenied: { en: "Location access was denied. Search for your area instead.", ms: "Akses lokasi disekat. Cari kawasan anda secara manual." },
  locationNotFound: { en: "Couldn't find your location. Search for your area instead.", ms: "Lokasi anda tidak dapat dikesan. Cari kawasan anda secara manual." },
  chooseArea: { en: "Choose an area or use your location.", ms: "Pilih kawasan atau gunakan lokasi anda." },
};

export type ErrorCode = keyof typeof errors;

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && Object.hasOwn(errors, value);
}

export class RoomError extends Error {
  constructor(public code: ErrorCode, public status = 400) {
    super(errors[code].en);
  }
}
